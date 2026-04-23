import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkTools(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];
  const calledTools = new Set(
    trace.events
      .filter((e) => e.type === "tool.called" || e.type === "tool.succeeded")
      .map((e) => e.name),
  );
  const anyToolEvents = new Set(
    trace.events
      .filter((e) => e.type.startsWith("tool."))
      .map((e) => e.name),
  );

  for (const tool of test.tools ?? []) {
    if (!calledTools.has(tool)) {
      findings.push({
        rule: "assert.tools",
        severity: "error",
        message: `Expected tool "${tool}" to be invoked, but it was not.`,
        test_id: test.id,
      });
    }
  }

  for (const tool of test.forbidden_tools ?? []) {
    if (anyToolEvents.has(tool)) {
      findings.push({
        rule: "assert.forbidden_tools",
        severity: "error",
        message: `Tool "${tool}" was invoked but was expected NOT to be.`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
