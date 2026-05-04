import type { Suite, TestCase } from "../types.js";

export interface TestJob {
  test: TestCase;
  runIndex: number;
}

export function expandJobs(suite: Suite, testId?: string): TestJob[] {
  const tests = testId ? suite.tests.filter((test) => test.id === testId) : suite.tests;
  if (testId && tests.length === 0) {
    throw new Error(`Test "${testId}" not found in suite "${suite.suite}".`);
  }

  return tests.flatMap((test) => {
    const runs = testEvalRuns(test, suite);
    return Array.from({ length: runs }, (_, index) => ({
      test,
      runIndex: index + 1,
    }));
  });
}

export function testEvalRuns(test: TestCase, suite: Suite): number {
  const raw = suite.defaults?.eval_runs ?? 1;
  return Math.max(1, Math.floor(raw));
}

export function testMinPassRate(test: TestCase, suite: Suite): number {
  const raw = test.min_pass_rate ?? suite.defaults?.min_pass_rate ?? 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0, Math.min(1, raw));
}

