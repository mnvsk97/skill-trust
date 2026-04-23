#!/usr/bin/env node
/**
 * skill-check CLI
 *
 * Commands:
 *   lint [path]      — static offline checks for a skill
 *   assert <suite>   — validate traces against a spec file
 *   record <suite>   — run skills in Docker and capture traces
 *   scan [path]      — (planned) LLM-powered security scan
 */

import path from "node:path";
import { Command } from "commander";
import { lint, report } from "./lint/index.js";
import type { ReportFormat } from "./lint/index.js";
import { assertSuite, reportAssert } from "./assert/index.js";
import type { ReportFormat as AssertReportFormat } from "./assert/reporter.js";

const program = new Command();

program
  .name("skill-check")
  .description("Skill contract testing for the agentskills.io ecosystem")
  .version("0.2.1");

// ─── lint command ─────────────────────────────────────────────────────────────

program
  .command("lint [path]")
  .description(
    "Run static checks on a skill directory or SKILL.md file. " +
    "Completely offline — no API keys required.",
  )
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .option("--no-security", "Skip security checks (schema + description only)")
  .action((skillPath: string | undefined, options: { format: string; security: boolean }) => {
    const target = skillPath ?? process.cwd();
    const format = (options.format === "json" ? "json" : "pretty") as ReportFormat;

    const result = lint(target, {
      noSecurity: !options.security,
    });

    report(result, format);

    if (!result.passed) {
      process.exitCode = 1;
    }
  });

// ─── assert command ───────────────────────────────────────────────────────────

program
  .command("assert <suite>")
  .description(
    "Validate pre-recorded traces against a spec YAML file. " +
    "Offline — no API keys required.",
  )
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .option("--trace <path>", "Override trace file for all tests")
  .action((suitePath: string, options: { format: string; trace?: string }) => {
    const format = (options.format === "json" ? "json" : "pretty") as AssertReportFormat;

    const result = assertSuite(path.resolve(suitePath), {
      traceOverride: options.trace ? path.resolve(options.trace) : undefined,
    });

    reportAssert(result, format);

    if (!result.passed) {
      process.exitCode = 1;
    }
  });

// ─── record command ───────────────────────────────────────────────────────────

program
  .command("record <suite>")
  .description(
    "Run skills in Docker, capture traces via Claude Code hooks. " +
    "Requires ANTHROPIC_API_KEY and Docker.",
  )
  .option("-t, --test <id>", "Run only this test ID")
  .option("--assert", "Run assert after recording", false)
  .option("--image <image>", "Docker image to use")
  .option("-o, --output <dir>", "Output directory for trace files")
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .action(async (suitePath: string, options: {
    test?: string;
    assert: boolean;
    image?: string;
    output?: string;
    format: string;
  }) => {
    // Dynamic import to avoid loading Docker deps for lint/assert
    const { recordSuite, reportRecord } = await import("./record/index.js");

    const result = await recordSuite(path.resolve(suitePath), {
      testId: options.test,
      assertAfter: options.assert,
      image: options.image,
      outputDir: options.output ? path.resolve(options.output) : undefined,
    });

    reportRecord(result, options.format === "json" ? "json" : "pretty");

    if (result.recordings.some((r) => !r.success)) process.exitCode = 1;
    if (result.assertResult && !result.assertResult.passed) process.exitCode = 1;
  });

// ─── Placeholder stubs ──────────────────────────────────────────────────────

program
  .command("scan [path]")
  .description("[Planned] LLM-powered security scan (requires API key)")
  .action(() => {
    console.error("skill-check scan is not yet implemented. Coming soon.");
    process.exitCode = 1;
  });

program.parse();
