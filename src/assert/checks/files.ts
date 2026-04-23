import type { AssertFinding, TestCase, Trace } from "../../types.js";

export function checkFiles(test: TestCase, trace: Trace): AssertFinding[] {
  const findings: AssertFinding[] = [];

  const byType = (type: string) =>
    new Set(trace.events.filter((e) => e.type === type).map((e) => e.name));

  const created = byType("file.created");
  const modified = byType("file.modified");
  const deleted = byType("file.deleted");

  for (const f of test.creates ?? []) {
    if (!created.has(f)) {
      findings.push({
        rule: "assert.creates",
        severity: "error",
        message: `Expected file "${f}" to be created, but no file.created event found.`,
        test_id: test.id,
      });
    }
  }

  for (const f of test.modifies ?? []) {
    if (!modified.has(f)) {
      findings.push({
        rule: "assert.modifies",
        severity: "error",
        message: `Expected file "${f}" to be modified, but no file.modified event found.`,
        test_id: test.id,
      });
    }
  }

  for (const f of test.deletes ?? []) {
    if (!deleted.has(f)) {
      findings.push({
        rule: "assert.deletes",
        severity: "error",
        message: `Expected file "${f}" to be deleted, but no file.deleted event found.`,
        test_id: test.id,
      });
    }
  }

  for (const f of test.should_not_create ?? []) {
    if (created.has(f)) {
      findings.push({
        rule: "assert.should_not_create",
        severity: "error",
        message: `File "${f}" was created but was expected NOT to be.`,
        test_id: test.id,
      });
    }
  }

  return findings;
}
