/**
 * record command entrypoint.
 *
 * Runs skills inside Docker containers and captures execution traces via
 * Claude Code hooks. Requires ANTHROPIC_API_KEY and Docker.
 */

import path from "node:path";
import chalk from "chalk";
import type { RecordResult, RecordingResult } from "../types.js";
import { loadSuite } from "../shared/parse-suite.js";
import { assertSuite, reportAssert } from "../assert/index.js";
import { getClaudeAuthStatus } from "../auth/claude.js";
import { checkDockerAvailable, ensureImage } from "./docker.js";
import { runTest } from "./runner.js";

export interface RecordOptions {
  testId?: string;
  assertAfter?: boolean;
  image?: string;
  outputDir?: string;
}

/**
 * Run all (or filtered) tests in a suite, recording traces for each.
 */
export async function recordSuite(
  suitePath: string,
  opts?: RecordOptions,
): Promise<RecordResult> {
  const suite = loadSuite(suitePath);
  const suiteDir = path.dirname(suitePath);

  const docker = await checkDockerAvailable();
  if (!docker.ok) {
    throw new Error(docker.message);
  }

  const auth = getClaudeAuthStatus();
  if (!auth.ok) {
    throw new Error(auth.message);
  }

  // Ensure Docker image is available
  const image = await ensureImage({ image: opts?.image });

  // Filter tests if a specific testId is requested
  let tests = suite.tests;
  if (opts?.testId) {
    tests = tests.filter((t) => t.id === opts.testId);
    if (tests.length === 0) {
      throw new Error(
        `Test "${opts.testId}" not found in suite "${suite.suite}".`,
      );
    }
  }

  // Run each test
  const recordings: RecordingResult[] = [];
  for (const test of tests) {
    const result = await runTest(test, suite, suiteDir, image, {
      outputDir: opts?.outputDir,
      env: auth.env,
    });
    recordings.push(result);
  }

  // Optionally run assertions after recording
  let assertResult;
  if (opts?.assertAfter) {
    assertResult = assertSuite(suitePath);
  }

  return {
    suitePath,
    suiteName: suite.suite,
    recordings,
    assertResult,
  };
}

/**
 * Print a record result to the console.
 */
export function reportRecord(
  result: RecordResult,
  format: "pretty" | "json",
): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const total = result.recordings.length;
  const succeeded = result.recordings.filter((r) => r.success).length;
  const failed = total - succeeded;

  console.log();
  console.log(chalk.bold(`Suite: ${result.suiteName}`));
  console.log();

  for (const rec of result.recordings) {
    const badge = rec.success
      ? chalk.green.bold("  REC  ")
      : chalk.red.bold("  ERR  ");
    const timing = chalk.dim(`(${(rec.duration_ms / 1000).toFixed(1)}s)`);
    console.log(`${badge} ${rec.test_id} ${timing}`);

    if (rec.success) {
      console.log(`    ${chalk.dim(`trace: ${rec.tracePath}`)}`);
    } else {
      console.log(`    ${chalk.red(rec.error ?? "Unknown error")}`);
    }
  }

  console.log();
  if (failed === 0) {
    console.log(
      chalk.green.bold(`  RECORDED  ${succeeded}/${total} tests`),
    );
  } else {
    console.log(
      chalk.red.bold(`  FAILED  ${failed}/${total} recordings failed`),
    );
  }
  console.log(`  Suite: ${result.suitePath}`);
  console.log();

  // Also report assert results if present
  if (result.assertResult) {
    reportAssert(result.assertResult, "pretty");
  }
}
