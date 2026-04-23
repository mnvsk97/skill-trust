import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkSkills(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];
  const activated = new Set(
    trace.events.filter((e) => e.type === "skill.activated").map((e) => e.name),
  );
  const discovered = new Set(
    trace.events.filter((e) => e.type === "skill.discovered").map((e) => e.name),
  );

  for (const skill of test.should_activate ?? []) {
    if (!activated.has(skill)) {
      findings.push({
        rule: "assert.should_activate",
        severity: "error",
        message: `Expected skill "${skill}" to activate, but it did not.`,
        test_id: test.id,
      });
    }
  }

  for (const skill of test.should_not_activate ?? []) {
    if (activated.has(skill)) {
      findings.push({
        rule: "assert.should_not_activate",
        severity: "error",
        message: `Skill "${skill}" activated but was expected NOT to.`,
        test_id: test.id,
      });
    }
  }

  for (const skill of test.discovers ?? []) {
    if (!discovered.has(skill)) {
      findings.push({
        rule: "assert.discovers",
        severity: "error",
        message: `Expected skill "${skill}" to be discovered, but it was not.`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
