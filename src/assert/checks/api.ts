import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkApi(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];
  const calledApis = new Set(
    trace.events
      .filter((e) => e.type === "api.called" || e.type === "api.succeeded")
      .map((e) => e.name),
  );
  const anyApiEvents = new Set(
    trace.events
      .filter((e) => e.type.startsWith("api."))
      .map((e) => e.name),
  );

  for (const api of test.api_calls ?? []) {
    if (!calledApis.has(api)) {
      findings.push({
        rule: "assert.api_calls",
        severity: "error",
        message: `Expected API call "${api}" but it was not found in the trace.`,
        test_id: test.id,
      });
    }
  }

  for (const api of test.forbidden_api_calls ?? []) {
    if (anyApiEvents.has(api)) {
      findings.push({
        rule: "assert.forbidden_api_calls",
        severity: "error",
        message: `API call "${api}" was made but was expected NOT to be.`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
