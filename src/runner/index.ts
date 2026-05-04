import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { assertTestTrace } from "../assert/index.js";
import { getClaudeAuthStatus } from "../auth/claude.js";
import { checkDockerAvailable, ensureImage } from "../record/docker.js";
import { runTest } from "../record/runner.js";
import { loadSuite } from "../shared/parse-suite.js";
import { loadTrace } from "../shared/parse-trace.js";
import type {
  AggregatedTestResult,
  AssertFinding,
  BehaviorTestResult,
  RecordingResult,
  Suite,
  TestRunResult,
} from "../types.js";
import { expandJobs, testMinPassRate } from "./plan.js";
import { runPool } from "./pool.js";
import { resolveParallelism } from "./parallelism.js";

export interface BehaviorTestOptions {
  testId?: string;
  image?: string;
  outputDir?: string;
  parallel?: string | number;
  runInBand?: boolean;
}

export function findDefaultSuite(cwd = process.cwd()): string {
  const candidates = ["skill-test.yaml", "skill-test.yml", "skilltrust.yaml", ".skill-trust.yaml"];
  for (const candidate of candidates) {
    const fullPath = path.resolve(cwd, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  throw new Error(
    "No skill test suite found. Create one with `skill-trust init` or pass a suite path to `skill-trust test <suite>`.",
  );
}

export async function runBehaviorTests(
  suitePath: string,
  opts: BehaviorTestOptions = {},
): Promise<BehaviorTestResult> {
  const suite = loadSuite(suitePath);
  const suiteDir = path.dirname(path.resolve(suitePath));
  const runId = makeRunId();
  const outputDir = opts.outputDir
    ? path.resolve(opts.outputDir)
    : path.join(suiteDir, ".skill-trust", "runs", runId);
  const traceDir = path.join(outputDir, "traces");
  const jobs = expandJobs(suite, opts.testId);
  const parallelism = opts.runInBand ? 1 : resolveParallelism(opts.parallel ?? suite.defaults?.parallelism);

  const docker = await checkDockerAvailable();
  if (!docker.ok) throw new Error(docker.message);

  const auth = getClaudeAuthStatus();
  if (!auth.ok) throw new Error(auth.message);

  fs.mkdirSync(traceDir, { recursive: true });

  const image = await ensureImage({ image: opts.image });

  const runResults = await runPool(jobs, parallelism, async (job) => {
    const recording = await runTest(job.test, suite, suiteDir, image, {
      outputDir: traceDir,
      runIndex: job.runIndex,
      env: auth.env,
    });
    return {
      recording,
      result: assertRecording(job.test.id, job.runIndex, recording, suiteDir, job.test),
    };
  });

  const recordings = runResults.map((item) => item.recording);
  const results = aggregateResults(suite, runResults.map((item) => item.result));

  return {
    suitePath: path.resolve(suitePath),
    suiteName: suite.suite,
    runId,
    outputDir,
    parallelism,
    results,
    recordings,
    passed: results.every((result) => result.passed),
  };
}

export function reportBehaviorTest(result: BehaviorTestResult, format: "pretty" | "json"): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log();
  console.log(chalk.bold(`Suite: ${result.suiteName}`));
  console.log(chalk.dim(`Run: ${result.runId}`));
  console.log(chalk.dim(`Parallelism: ${result.parallelism}`));
  console.log();

  for (const test of result.results) {
    const badge = test.passed ? chalk.green.bold("PASS") : chalk.red.bold("FAIL");
    const runs = `${test.runs.filter((run) => run.passed).length}/${test.runs.length}`;
    const timing = `${(test.runs.reduce((sum, run) => sum + run.duration_ms, 0) / 1000).toFixed(1)}s`;
    console.log(`${badge} ${test.test_id} ${chalk.dim(`${runs} runs, ${timing}`)}`);

    for (const run of test.runs.filter((item) => !item.passed)) {
      const prefix = test.runs.length > 1 ? `run ${run.run_index}: ` : "";
      const message = run.findings.find((finding) => finding.severity === "error")?.message
        ?? run.recording_error
        ?? "failed";
      console.log(`  ${chalk.red(`${prefix}${message}`)}`);
    }
  }

  console.log();
  const passed = result.results.filter((test) => test.passed).length;
  const total = result.results.length;
  const summary = result.passed
    ? chalk.green.bold(`PASSED ${passed}/${total} tests`)
    : chalk.red.bold(`FAILED ${total - passed}/${total} tests`);
  console.log(summary);
  console.log(chalk.dim(`Artifacts: ${result.outputDir}`));
  console.log();
}

function assertRecording(
  testId: string,
  runIndex: number,
  recording: RecordingResult,
  suiteDir: string,
  test: Suite["tests"][number],
): TestRunResult {
  if (!recording.success) {
    return makeFailedRun(testId, runIndex, recording, [
      {
        rule: "record.failed",
        severity: "error",
        message: recording.error ?? "Recording failed.",
        test_id: testId,
      },
    ]);
  }

  try {
    const trace = loadTrace(recording.tracePath, suiteDir);
    const asserted = assertTestTrace(test, trace);
    return {
      ...asserted,
      run_index: runIndex,
      tracePath: recording.tracePath,
      recording_success: true,
      duration_ms: recording.duration_ms,
    };
  } catch (err) {
    return makeFailedRun(testId, runIndex, recording, [
      {
        rule: "assert.trace_load_error",
        severity: "error",
        message: `Failed to load recorded trace: ${(err as Error).message}`,
        test_id: testId,
      },
    ]);
  }
}

function makeFailedRun(
  testId: string,
  runIndex: number,
  recording: RecordingResult,
  findings: AssertFinding[],
): TestRunResult {
  return {
    test_id: testId,
    run_index: runIndex,
    tracePath: recording.tracePath,
    recording_success: false,
    recording_error: recording.error,
    duration_ms: recording.duration_ms,
    passed: false,
    findings,
  };
}

function aggregateResults(suite: Suite, runs: TestRunResult[]): AggregatedTestResult[] {
  return suite.tests
    .map((test) => {
      const testRuns = runs
        .filter((run) => run.test_id === test.id)
        .sort((a, b) => a.run_index - b.run_index);
      if (testRuns.length === 0) return undefined;

      const passRate = testRuns.filter((run) => run.passed).length / testRuns.length;
      const requiredPassRate = testMinPassRate(test, suite);
      return {
        test_id: test.id,
        passed: passRate >= requiredPassRate,
        pass_rate: passRate,
        required_pass_rate: requiredPassRate,
        runs: testRuns,
      };
    })
    .filter((result): result is AggregatedTestResult => Boolean(result));
}

function makeRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
