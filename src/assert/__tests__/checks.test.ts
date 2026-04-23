import type { TestCase, Trace, TraceEvent } from "../../types.js";
import { checkSkills } from "../checks/skills.js";
import { checkSteps } from "../checks/steps.js";
import { checkCommands } from "../checks/commands.js";
import { checkTools } from "../checks/tools.js";
import { checkFiles } from "../checks/files.js";
import { checkApi } from "../checks/api.js";
import { checkOutcome } from "../checks/outcome.js";

function makeTrace(events: Partial<TraceEvent>[]): Trace {
  return {
    version: "0.1",
    run_id: "test_run",
    events: events.map((e, i) => ({
      id: `e${i + 1}`,
      type: e.type ?? "unknown",
      name: e.name ?? "",
      ts: e.ts ?? new Date().toISOString(),
      source: e.source ?? "native",
      confidence: e.confidence ?? "high",
      ...e,
    })) as TraceEvent[],
  };
}

function makeTest(overrides: Partial<TestCase> = {}): TestCase {
  return { id: "test_1", kind: "end_to_end", ...overrides };
}

// ─── Skills ───────────────────────────────────────────────────────────────────

describe("checkSkills", () => {
  test("passes when should_activate skill is activated", () => {
    const trace = makeTrace([{ type: "skill.activated", name: "cloud-deploy" }]);
    const findings = checkSkills(makeTest({ should_activate: ["cloud-deploy"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when should_activate skill is missing", () => {
    const trace = makeTrace([{ type: "skill.activated", name: "cloud-logs" }]);
    const findings = checkSkills(makeTest({ should_activate: ["cloud-deploy"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.should_activate");
  });

  test("fails when should_not_activate skill is present", () => {
    const trace = makeTrace([{ type: "skill.activated", name: "cloud-deploy" }]);
    const findings = checkSkills(makeTest({ should_not_activate: ["cloud-deploy"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.should_not_activate");
  });

  test("passes when discovers skill is discovered", () => {
    const trace = makeTrace([{ type: "skill.discovered", name: "my-skill" }]);
    const findings = checkSkills(makeTest({ discovers: ["my-skill"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when discovers skill is missing", () => {
    const trace = makeTrace([]);
    const findings = checkSkills(makeTest({ discovers: ["my-skill"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.discovers");
  });
});

// ─── Steps ────────────────────────────────────────────────────────────────────

describe("checkSteps", () => {
  test("passes when all steps present and ordered", () => {
    const trace = makeTrace([
      { type: "hook.started", name: "check-repo" },
      { type: "hook.succeeded", name: "check-repo" },
      { type: "hook.started", name: "deploy" },
      { type: "hook.succeeded", name: "deploy" },
    ]);
    const findings = checkSteps(makeTest({ steps: ["check-repo", "deploy"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when a required step never ran", () => {
    const trace = makeTrace([
      { type: "hook.started", name: "check-repo" },
      { type: "hook.succeeded", name: "check-repo" },
    ]);
    const findings = checkSteps(makeTest({ steps: ["check-repo", "deploy"] }), trace);
    expect(findings.some((f) => f.rule === "assert.steps.missing")).toBe(true);
  });

  test("fails when a step started but did not succeed", () => {
    const trace = makeTrace([
      { type: "hook.started", name: "deploy" },
      { type: "hook.failed", name: "deploy" },
    ]);
    const findings = checkSteps(makeTest({ steps: ["deploy"] }), trace);
    expect(findings.some((f) => f.message.includes("did not succeed"))).toBe(true);
  });

  test("fails when steps are out of order", () => {
    const trace = makeTrace([
      { type: "hook.started", name: "deploy" },
      { type: "hook.succeeded", name: "deploy" },
      { type: "hook.started", name: "check-repo" },
      { type: "hook.succeeded", name: "check-repo" },
    ]);
    const findings = checkSteps(makeTest({ steps: ["check-repo", "deploy"] }), trace);
    expect(findings.some((f) => f.rule === "assert.steps.order")).toBe(true);
  });

  test("fails when should_not_run step ran", () => {
    const trace = makeTrace([
      { type: "hook.started", name: "rollback" },
      { type: "hook.succeeded", name: "rollback" },
    ]);
    const findings = checkSteps(makeTest({ should_not_run: ["rollback"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.should_not_run");
  });

  test("passes when should_not_run step is absent", () => {
    const trace = makeTrace([]);
    const findings = checkSteps(makeTest({ should_not_run: ["rollback"] }), trace);
    expect(findings).toHaveLength(0);
  });
});

// ─── Commands ─────────────────────────────────────────────────────────────────

describe("checkCommands", () => {
  test("passes when required command is executed", () => {
    const trace = makeTrace([{ type: "command.executed", name: "cloud-cli deploy" }]);
    const findings = checkCommands(makeTest({ commands: ["cloud-cli deploy"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when required command is missing", () => {
    const trace = makeTrace([]);
    const findings = checkCommands(makeTest({ commands: ["cloud-cli deploy"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.commands");
  });

  test("fails when dangerous command substring is found", () => {
    const trace = makeTrace([{ type: "command.executed", name: "rm -rf .deploy" }]);
    const findings = checkCommands(makeTest({ dangerous: ["rm -rf"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.dangerous");
  });

  test("passes when dangerous pattern is absent", () => {
    const trace = makeTrace([{ type: "command.executed", name: "cloud-cli deploy" }]);
    const findings = checkCommands(makeTest({ dangerous: ["rm -rf"] }), trace);
    expect(findings).toHaveLength(0);
  });
});

// ─── Tools ────────────────────────────────────────────────────────────────────

describe("checkTools", () => {
  test("passes when required tool is called", () => {
    const trace = makeTrace([{ type: "tool.succeeded", name: "Read" }]);
    const findings = checkTools(makeTest({ tools: ["Read"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when required tool is missing", () => {
    const trace = makeTrace([]);
    const findings = checkTools(makeTest({ tools: ["Read"] }), trace);
    expect(findings).toHaveLength(1);
  });

  test("fails when forbidden tool is invoked", () => {
    const trace = makeTrace([{ type: "tool.called", name: "DangerousTool" }]);
    const findings = checkTools(makeTest({ forbidden_tools: ["DangerousTool"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.forbidden_tools");
  });
});

// ─── Files ────────────────────────────────────────────────────────────────────

describe("checkFiles", () => {
  test("passes when expected file is created", () => {
    const trace = makeTrace([{ type: "file.created", name: ".deploy/service.yaml" }]);
    const findings = checkFiles(makeTest({ creates: [".deploy/service.yaml"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when expected file is not created", () => {
    const trace = makeTrace([]);
    const findings = checkFiles(makeTest({ creates: [".deploy/service.yaml"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.creates");
  });

  test("fails when should_not_create file is created", () => {
    const trace = makeTrace([{ type: "file.created", name: ".env" }]);
    const findings = checkFiles(makeTest({ should_not_create: [".env"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.should_not_create");
  });
});

// ─── API ──────────────────────────────────────────────────────────────────────

describe("checkApi", () => {
  test("passes when required API is called", () => {
    const trace = makeTrace([{ type: "api.called", name: "create_service" }]);
    const findings = checkApi(makeTest({ api_calls: ["create_service"] }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails when required API is missing", () => {
    const trace = makeTrace([]);
    const findings = checkApi(makeTest({ api_calls: ["create_service"] }), trace);
    expect(findings).toHaveLength(1);
  });

  test("fails when forbidden API is called", () => {
    const trace = makeTrace([{ type: "api.called", name: "delete_service" }]);
    const findings = checkApi(makeTest({ forbidden_api_calls: ["delete_service"] }), trace);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("assert.forbidden_api_calls");
  });
});

// ─── Outcome ──────────────────────────────────────────────────────────────────

describe("checkOutcome", () => {
  test("passes when outcome matches", () => {
    const trace = makeTrace([{ type: "outcome.pass", name: "test_1" }]);
    const findings = checkOutcome(makeTest({ outcome: "pass" }), trace);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });

  test("fails when outcome mismatches", () => {
    const trace = makeTrace([{ type: "outcome.fail", name: "test_1" }]);
    const findings = checkOutcome(makeTest({ outcome: "pass" }), trace);
    expect(findings.some((f) => f.rule === "assert.outcome")).toBe(true);
  });

  test("fails when no outcome event exists", () => {
    const trace = makeTrace([]);
    const findings = checkOutcome(makeTest({ outcome: "pass" }), trace);
    expect(findings.some((f) => f.rule === "assert.outcome")).toBe(true);
  });

  test("warns when outcome_contains string is missing", () => {
    const trace = makeTrace([{
      type: "outcome.pass",
      name: "test_1",
      data: { message: "deployment succeeded" },
    }]);
    const findings = checkOutcome(makeTest({ outcome_contains: ["healthy"] }), trace);
    expect(findings.some((f) => f.rule === "assert.outcome_contains" && f.severity === "warn")).toBe(true);
  });

  test("outcome_contains is soft — does not produce errors", () => {
    const trace = makeTrace([{
      type: "outcome.pass",
      name: "test_1",
      data: { message: "done" },
    }]);
    const findings = checkOutcome(makeTest({ outcome_contains: ["missing"] }), trace);
    expect(findings.every((f) => f.severity === "warn")).toBe(true);
  });

  test("passes exit_code check", () => {
    const trace = makeTrace([{
      type: "lifecycle.install.succeeded",
      name: "install",
      data: { exit_code: 0 },
    }]);
    const findings = checkOutcome(makeTest({ exit_code: 0 }), trace);
    expect(findings).toHaveLength(0);
  });

  test("fails exit_code mismatch", () => {
    const trace = makeTrace([{
      type: "lifecycle.install.succeeded",
      name: "install",
      data: { exit_code: 1 },
    }]);
    const findings = checkOutcome(makeTest({ exit_code: 0 }), trace);
    expect(findings.some((f) => f.rule === "assert.exit_code")).toBe(true);
  });
});
