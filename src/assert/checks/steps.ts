import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkSteps(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];

  // Collect hooks that both started and succeeded (first occurrence of each)
  const succeeded = new Set(
    trace.events.filter((e) => e.type === "hook.succeeded").map((e) => e.name),
  );
  const started = new Set(
    trace.events.filter((e) => e.type === "hook.started").map((e) => e.name),
  );

  if (test.steps && test.steps.length > 0) {
    // Check presence: each step must have started + succeeded
    for (const step of test.steps) {
      if (!succeeded.has(step)) {
        findings.push({
          rule: "assert.steps.missing",
          severity: "error",
          message: started.has(step)
            ? `Step "${step}" started but did not succeed.`
            : `Required step "${step}" never ran.`,
          test_id: test.id,
        });
      }
    }

    // Check order: steps must appear as subsequence of hook.succeeded events
    const succeededOrder = trace.events
      .filter((e) => e.type === "hook.succeeded")
      .map((e) => e.name);

    // Use first occurrence of each step name
    const firstIndex = new Map<string, number>();
    for (let i = 0; i < succeededOrder.length; i++) {
      if (!firstIndex.has(succeededOrder[i])) {
        firstIndex.set(succeededOrder[i], i);
      }
    }

    let prevStep: string | null = null;
    let prevIdx = -1;
    for (const step of test.steps) {
      const idx = firstIndex.get(step);
      if (idx === undefined) continue; // already reported as missing
      if (prevStep !== null && idx <= prevIdx) {
        findings.push({
          rule: "assert.steps.order",
          severity: "error",
          message: `Step "${step}" ran before "${prevStep}" but was expected after it.`,
          test_id: test.id,
        });
        break;
      }
      prevStep = step;
      prevIdx = idx;
    }
  }

  // Forbidden hooks
  for (const step of test.should_not_run ?? []) {
    if (started.has(step)) {
      findings.push({
        rule: "assert.should_not_run",
        severity: "error",
        message: `Step "${step}" ran but was expected NOT to.`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
