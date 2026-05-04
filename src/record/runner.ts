/**
 * Per-test orchestration: sets up a fixture workspace, runs a test in Docker,
 * and collects the resulting trace.
 */

import fs from "node:fs";
import path from "node:path";
import type { TestCase, Suite, RecordingResult } from "../types.js";
import { generateHooksConfig } from "./hooks.js";
import { runInContainer } from "./docker.js";
import { normalizeTrace } from "./collector.js";

/**
 * Run a single test case inside a Docker container and return the recording result.
 */
export async function runTest(
  test: TestCase,
  suite: Suite,
  suiteDir: string,
  image: string,
  opts: { outputDir?: string; runIndex?: number; env?: Record<string, string> },
): Promise<RecordingResult> {
  const startTime = Date.now();
  const runIndex = opts.runIndex ?? 1;
  const runId = `run-${test.id}-${runIndex}-${Date.now()}`;

  try {
    // 1. Resolve fixture
    const fixtureDir = resolveFixture(test, suite, suiteDir);

    // 2. Copy fixture to a temp directory
    const tmpDir = fs.mkdtempSync(
      path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), `skill-trust-ws-`),
    );
    if (fixtureDir) {
      fs.cpSync(fixtureDir, tmpDir, { recursive: true });
    }

    // 3. Generate hooks config
    const traceOutputPath = "/tmp/traces/trace.jsonl";
    const hooksConfig = generateHooksConfig(traceOutputPath);
    const settingsContent = JSON.stringify(hooksConfig, null, 2);

    // 4. Determine prompt
    const prompt = test.prompt ?? `Execute the skill test: ${test.description ?? test.id}`;

    // 5. Determine timeout
    const timeoutMs = test.timeout_ms ?? suite.defaults?.timeout_ms ?? 120_000;

    // 6. Build env vars
    const env: Record<string, string> = { ...(opts.env ?? {}) };
    if (!env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY) {
      env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    }
    if (!env.CLAUDE_CODE_OAUTH_TOKEN && process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }

    // 7. Run in container
    const result = await runInContainer({
      image,
      workspaceDir: tmpDir,
      env,
      settingsContent,
      prompt,
      timeoutMs,
      traceOutputPath,
    });

    // 8. Normalize trace
    const agent = suite.defaults?.agent;
    const model = suite.defaults?.model;
    const trace = normalizeTrace(result.traceLines, runId, test.id, agent, model);

    // 9. Write trace to output directory
    const outputDir = opts.outputDir ?? path.join(suiteDir, "traces");
    fs.mkdirSync(outputDir, { recursive: true });
    const traceName = runIndex === 1 ? `${test.id}.trace.json` : `${test.id}.${runIndex}.trace.json`;
    const tracePath = path.join(outputDir, traceName);
    fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2), "utf8");

    // 10. Clean up temp workspace
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const durationMs = Date.now() - startTime;

    return {
      test_id: test.id,
      run_index: runIndex,
      tracePath,
      success: result.exitCode === 0,
      error: result.exitCode !== 0 ? `Container exited with code ${result.exitCode}` : undefined,
      duration_ms: durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      test_id: test.id,
      run_index: runIndex,
      tracePath: "",
      success: false,
      error: (err as Error).message,
      duration_ms: durationMs,
    };
  }
}

/**
 * Resolve the fixture directory for a test case.
 * Returns the absolute path to the fixture, or undefined if no fixture is specified.
 */
function resolveFixture(
  test: TestCase,
  suite: Suite,
  suiteDir: string,
): string | undefined {
  if (!test.workspace_fixture) return undefined;

  // Look up in suite fixtures
  const fixture = suite.fixtures?.find((f) => f.id === test.workspace_fixture);
  if (!fixture) {
    throw new Error(
      `Test "${test.id}" references fixture "${test.workspace_fixture}" but it was not found in suite fixtures.`,
    );
  }

  const fixturePath = path.resolve(suiteDir, fixture.path);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Fixture path "${fixture.path}" (resolved to ${fixturePath}) does not exist.`,
    );
  }

  return fixturePath;
}
