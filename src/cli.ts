#!/usr/bin/env node
/**
 * skill-trust CLI
 *
 * Commands:
 *   lint [path]      — static offline checks for a skill
 *   scan [path]      — LLM-powered semantic security scan
 *   vet <target>     — trust review for local or GitHub skills
 *   score <target>   — JSON trust scorecard
 *   find <query>     — skills.sh discovery via npx skills find
 *   recommend <query> — metadata-based candidate ranking
 *   init             — create a starter skill-test.yaml
 *   auth claude      — check Claude auth for behavior tests
 *   test [suite]     — run Docker-first behavior tests
 *   assert <suite>   — validate traces against a spec file
 *   record <suite>   — run skills in Docker and capture traces
 */

import path from "node:path";
import { Command } from "commander";
import { lint, report } from "./lint/index.js";
import type { ReportFormat } from "./lint/index.js";
import { assertSuite, reportAssert } from "./assert/index.js";
import type { ReportFormat as AssertReportFormat } from "./assert/reporter.js";
import { scanSkill, reportScan } from "./scan/index.js";
import { vetSkill, reportTrust } from "./trust/index.js";
import { findSkillCandidates, recommendCandidates, reportDiscovery, reportRecommendations } from "./discover/index.js";
import type { CandidateRecommendation } from "./types.js";
import { getClaudeAuthStatus } from "./auth/claude.js";

const program = new Command();

program
  .name("skill-trust")
  .description("Trust checks and recommendations for the skills.sh agent-skill ecosystem")
  .version("0.3.0");

function fail(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
}

// ─── init command ─────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Create a starter skill-test.yaml behavior test suite.")
  .option("-o, --output <path>", "Output suite path", "skill-test.yaml")
  .option("--skill <name>", "Skill name to use in starter tests", "my-skill")
  .option("--force", "Overwrite an existing suite file", false)
  .action(async (options: { output: string; skill: string; force: boolean }) => {
    try {
      const { initSuite } = await import("./init/index.js");
      const result = initSuite({
        output: options.output,
        skill: options.skill,
        force: options.force,
      });
      console.log(`Created ${result.path}`);
    } catch (err) {
      fail(err);
    }
  });

// ─── auth command ─────────────────────────────────────────────────────────────

const auth = program.command("auth").description("Check authentication for behavior test runtimes.");

auth
  .command("claude")
  .description("Check Claude auth used by Docker behavior tests.")
  .action(() => {
    const status = getClaudeAuthStatus();
    if (status.ok) {
      console.log(status.message);
      return;
    }
    console.error(status.message);
    process.exitCode = 1;
  });

// ─── test command ─────────────────────────────────────────────────────────────

program
  .command("test [suite]")
  .description("Run Docker-first skill behavior tests and assertions.")
  .option("-t, --test <id>", "Run only this test ID")
  .option("--image <image>", "Docker image to use")
  .option("-o, --output <dir>", "Output directory for run artifacts")
  .option("--parallel <n>", "Number of tests to run concurrently, or auto", "auto")
  .option("--run-in-band", "Run tests serially; alias for --parallel 1", false)
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .action(async (suitePath: string | undefined, options: {
    test?: string;
    image?: string;
    output?: string;
    parallel: string;
    runInBand: boolean;
    format: string;
  }) => {
    try {
      const { findDefaultSuite, runBehaviorTests, reportBehaviorTest } = await import("./runner/index.js");
      const suite = suitePath ? path.resolve(suitePath) : findDefaultSuite();
      const result = await runBehaviorTests(suite, {
        testId: options.test,
        image: options.image,
        outputDir: options.output ? path.resolve(options.output) : undefined,
        parallel: options.parallel,
        runInBand: options.runInBand,
      });
      reportBehaviorTest(result, options.format === "json" ? "json" : "pretty");
      if (!result.passed) process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

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
    "Requires Claude auth and Docker.",
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
  .description("Run an LLM-powered semantic security scan against a skill.")
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .option("--model <model>", "Override LLM_MODEL")
  .option("--skill <name>", "Skill name when scanning a repository target")
  .action(async (skillPath: string | undefined, options: {
    format: string;
    model?: string;
    skill?: string;
  }) => {
    try {
      const result = await scanSkill(skillPath ?? process.cwd(), {
        model: options.model,
        skill: options.skill,
      });
      reportScan(result, options.format === "json" ? "json" : "pretty");
      if (!result.passed) process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

program
  .command("vet <target>")
  .description("Run a trust review for a local skill or GitHub skill target.")
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .option("--scan", "Include LLM semantic scan", false)
  .option("--model <model>", "Override LLM_MODEL when --scan is used")
  .option("--skill <name>", "Skill name when vetting a repository target")
  .action(async (target: string, options: {
    format: string;
    scan: boolean;
    model?: string;
    skill?: string;
  }) => {
    try {
      const review = await vetSkill(target, {
        scan: options.scan,
        model: options.model,
        skill: options.skill,
      });
      reportTrust(review, options.format === "json" ? "json" : "pretty");
      if (review.verdict === "blocked") process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

program
  .command("score <target>")
  .description("Emit a machine-readable trust score for CI and dashboards.")
  .option("--scan", "Include LLM semantic scan", false)
  .option("--model <model>", "Override LLM_MODEL when --scan is used")
  .option("--skill <name>", "Skill name when scoring a repository target")
  .action(async (target: string, options: {
    scan: boolean;
    model?: string;
    skill?: string;
  }) => {
    try {
      const review = await vetSkill(target, {
        scan: options.scan,
        model: options.model,
        skill: options.skill,
      });
      reportTrust(review, "json");
      if (review.verdict === "blocked") process.exitCode = 1;
    } catch (err) {
      fail(err);
    }
  });

program
  .command("find <query>")
  .description("Search skills.sh via npx skills find and show install commands.")
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .action((query: string, options: { format: string }) => {
    try {
      const candidates = findSkillCandidates(query);
      reportDiscovery(candidates, options.format === "json" ? "json" : "pretty");
    } catch (err) {
      fail(err);
    }
  });

program
  .command("recommend <query>")
  .description("Recommend skill candidates using search, popularity, and provenance signals.")
  .option(
    "-f, --format <format>",
    "Output format: pretty (default) or json",
    "pretty",
  )
  .option("--vet", "Run file-level vetting on top candidates", false)
  .option("--scan", "Run file-level vetting plus LLM semantic scan on top candidates", false)
  .option("--limit <n>", "Number of top candidates to vet when --vet or --scan is used", "3")
  .option("--model <model>", "Override LLM_MODEL when --scan is used")
  .action(async (query: string, options: {
    format: string;
    vet: boolean;
    scan: boolean;
    limit: string;
    model?: string;
  }) => {
    try {
      let recommendations = recommendCandidates(findSkillCandidates(query));
      if (options.vet || options.scan) {
        const limit = Number.parseInt(options.limit, 10);
        const bounded = Number.isFinite(limit) && limit > 0 ? limit : 3;
        const reviewed: CandidateRecommendation[] = [];
        for (const item of recommendations.slice(0, bounded)) {
          try {
            const review = await vetSkill(item.candidate.package, {
              scan: options.scan,
              model: options.model,
            });
            reviewed.push({
              candidate: item.candidate,
              score: review.score,
              verdict: review.verdict,
              reasons: [
                options.scan ? "file-level vet plus semantic scan completed" : "file-level vet completed",
                ...review.components.flatMap((c) => c.reasons.slice(0, 1)),
              ].slice(0, 4),
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            reviewed.push({
              ...item,
              verdict: "review",
              reasons: [`vetting failed: ${message}`],
            });
          }
        }
        recommendations = [
          ...reviewed,
          ...recommendations.slice(bounded),
        ];
      }
      reportRecommendations(recommendations, options.format === "json" ? "json" : "pretty");
    } catch (err) {
      fail(err);
    }
  });

program.parse();
