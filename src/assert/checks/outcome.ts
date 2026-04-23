import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkOutcome(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];

  // Find outcome event (outcome.pass, outcome.fail, outcome.error, outcome.timeout)
  const outcomeEvent = trace.events.find((e) => e.type.startsWith("outcome."));

  // exit_code check (for install tests)
  if (test.exit_code !== undefined) {
    const installEvent = trace.events.find(
      (e) =>
        e.type === "lifecycle.install.succeeded" ||
        e.type === "lifecycle.install.failed",
    );
    if (!installEvent) {
      findings.push({
        rule: "assert.exit_code",
        severity: "error",
        message: `Expected exit_code ${test.exit_code} but no install lifecycle event found.`,
        test_id: test.id,
      });
    } else {
      const actual = (installEvent.data as Record<string, unknown>)?.exit_code;
      if (actual !== test.exit_code) {
        findings.push({
          rule: "assert.exit_code",
          severity: "error",
          message: `Expected exit_code ${test.exit_code} but got ${actual}.`,
          test_id: test.id,
        });
      }
    }
  }

  // outcome status check (hard gate)
  if (test.outcome !== undefined) {
    if (!outcomeEvent) {
      findings.push({
        rule: "assert.outcome",
        severity: "error",
        message: `Expected outcome "${test.outcome}" but no outcome event found in the trace.`,
        test_id: test.id,
      });
    } else {
      const actual = outcomeEvent.type.replace("outcome.", "");
      if (actual !== test.outcome) {
        findings.push({
          rule: "assert.outcome",
          severity: "error",
          message: `Expected outcome "${test.outcome}" but got "${actual}".`,
          test_id: test.id,
        });
      }
    }
  }

  // outcome_contains (soft — warn only)
  if (test.outcome_contains && outcomeEvent) {
    const data = outcomeEvent.data ?? {};
    const message = String(data.message ?? "");
    const containsArr = Array.isArray(data.contains) ? data.contains.map(String) : [];
    const searchText = [message, ...containsArr].join(" ");

    for (const str of test.outcome_contains) {
      if (!searchText.includes(str)) {
        findings.push({
          rule: "assert.outcome_contains",
          severity: "warn",
          message: `Outcome data does not contain "${str}".`,
          test_id: test.id,
        });
      }
    }
  }

  // outcome_not_contains (soft — warn only)
  if (test.outcome_not_contains && outcomeEvent) {
    const data = outcomeEvent.data ?? {};
    const message = String(data.message ?? "");
    const containsArr = Array.isArray(data.contains) ? data.contains.map(String) : [];
    const searchText = [message, ...containsArr].join(" ");

    for (const str of test.outcome_not_contains) {
      if (searchText.includes(str)) {
        findings.push({
          rule: "assert.outcome_not_contains",
          severity: "warn",
          message: `Outcome data contains "${str}" but was expected not to.`,
          test_id: test.id,
        });
      }
    }
  }

  return findings;
}
