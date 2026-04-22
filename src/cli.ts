#!/usr/bin/env node
/**
 * skill-check CLI
 *
 * Commands:
 *   lint [path]    — static offline checks for a skill
 *   (scan, assert, record — coming in V0.1 next phases)
 */

import { Command } from "commander";
import { lint, report } from "./lint/index.js";
import type { ReportFormat } from "./lint/index.js";

const program = new Command();

program
  .name("skill-check")
  .description("Skill contract testing for the agentskills.io ecosystem")
  .version("0.1.0");

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

// ─── Placeholder stubs (implemented in later phases) ─────────────────────────

program
  .command("scan [path]")
  .description("[V0.1 upcoming] LLM-powered security scan (requires API key)")
  .action(() => {
    console.error("skill-check scan is not yet implemented. Coming soon.");
    process.exitCode = 1;
  });

program
  .command("assert <suite>")
  .description("[V0.1 upcoming] Run assertion checks against a trace file")
  .action(() => {
    console.error("skill-check assert is not yet implemented. Coming soon.");
    process.exitCode = 1;
  });

program
  .command("record <suite>")
  .description("[V0.1 upcoming] Record a live skill execution trace")
  .action(() => {
    console.error("skill-check record is not yet implemented. Coming soon.");
    process.exitCode = 1;
  });

program.parse();
