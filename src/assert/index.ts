import path from "node:path";
import type { AssertResult, TestResult, AssertFinding, TestCase, Trace } from "../types.js";
import { loadSuite } from "../shared/parse-suite.js";
import { loadTrace } from "../shared/parse-trace.js";
import { checkSkills } from "./checks/skills.js";
import { checkSteps } from "./checks/steps.js";
import { checkCommands } from "./checks/commands.js";
import { checkTools } from "./checks/tools.js";
import { checkFiles } from "./checks/files.js";
import { checkApi } from "./checks/api.js";
import { checkOutcome } from "./checks/outcome.js";

export { reportAssert } from "./reporter.js";
export type { ReportFormat } from "./reporter.js";

export interface AssertOptions {
  traceOverride?: string;
}

function runChecks(test: TestCase, trace: Trace): AssertFinding[] {
  return [
    ...checkSkills(test, trace),
    ...checkSteps(test, trace),
    ...checkCommands(test, trace),
    ...checkTools(test, trace),
    ...checkFiles(test, trace),
    ...checkApi(test, trace),
    ...checkOutcome(test, trace),
  ];
}

export function assertSuite(
  suitePath: string,
  opts: AssertOptions = {},
): AssertResult {
  const suite = loadSuite(suitePath);
  const suiteDir = path.dirname(suitePath);
  const results: TestResult[] = [];

  for (const test of suite.tests) {
    const tracePath = opts.traceOverride ?? test.trace;

    if (!tracePath) {
      results.push({
        test_id: test.id,
        passed: false,
        findings: [
          {
            rule: "assert.no_trace",
            severity: "error",
            message: `No trace file specified for test "${test.id}". Set "trace:" in the spec or use --trace.`,
            test_id: test.id,
          },
        ],
      });
      continue;
    }

    let trace: Trace;
    try {
      trace = loadTrace(tracePath, suiteDir);
    } catch (e) {
      results.push({
        test_id: test.id,
        passed: false,
        findings: [
          {
            rule: "assert.trace_load_error",
            severity: "error",
            message: `Failed to load trace: ${(e as Error).message}`,
            test_id: test.id,
          },
        ],
      });
      continue;
    }

    const findings = runChecks(test, trace);
    const hasErrors = findings.some((f) => f.severity === "error");

    results.push({
      test_id: test.id,
      passed: !hasErrors,
      findings,
    });
  }

  return {
    suitePath,
    suiteName: suite.suite,
    results,
    passed: results.every((r) => r.passed),
  };
}
