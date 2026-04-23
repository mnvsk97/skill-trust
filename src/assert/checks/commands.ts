import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkCommands(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];
  const executed = trace.events
    .filter((e) => e.type === "command.executed")
    .map((e) => e.name);

  for (const cmd of test.commands ?? []) {
    if (!executed.some((e) => e === cmd)) {
      findings.push({
        rule: "assert.commands",
        severity: "error",
        message: `Expected command "${cmd}" to be executed, but it was not.`,
        test_id: test.id,
      });
    }
  }

  // Dangerous: substring match against all executed commands
  for (const pattern of test.dangerous ?? []) {
    const match = executed.find((e) => e.includes(pattern));
    if (match) {
      findings.push({
        rule: "assert.dangerous",
        severity: "error",
        message: `Dangerous command pattern "${pattern}" was found in executed command "${match}".`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
