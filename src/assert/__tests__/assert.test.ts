import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSuite } from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, "../../../examples/cloud-deploy");

describe("assertSuite integration — passing suite", () => {
  const result = assertSuite(path.join(EXAMPLES_DIR, "suite.yaml"));

  test("suite passes overall", () => {
    expect(result.passed).toBe(true);
  });

  test("all 4 tests pass", () => {
    expect(result.results).toHaveLength(4);
    for (const r of result.results) {
      expect(r.passed).toBe(true);
    }
  });

  test("install test finds all discovered skills", () => {
    const install = result.results.find((r) => r.test_id === "install_from_npx");
    expect(install).toBeDefined();
    expect(install!.findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });

  test("deploy_happy_path has no errors", () => {
    const deploy = result.results.find((r) => r.test_id === "deploy_happy_path");
    expect(deploy).toBeDefined();
    expect(deploy!.findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });
});

describe("assertSuite integration — failing suite", () => {
  const result = assertSuite(path.join(EXAMPLES_DIR, "failing-suite.yaml"));

  test("suite fails overall", () => {
    expect(result.passed).toBe(false);
  });

  test("hook_order_regression fails on step order", () => {
    const r = result.results.find((r) => r.test_id === "hook_order_regression");
    expect(r).toBeDefined();
    expect(r!.passed).toBe(false);
    expect(r!.findings.some((f) => f.rule === "assert.steps.order" || f.rule === "assert.outcome")).toBe(true);
  });

  test("missing_hook_regression fails on missing step", () => {
    const r = result.results.find((r) => r.test_id === "missing_hook_regression");
    expect(r).toBeDefined();
    expect(r!.passed).toBe(false);
    expect(r!.findings.some((f) => f.rule === "assert.steps.missing" || f.rule === "assert.outcome")).toBe(true);
  });

  test("forbidden_command_regression fails on dangerous command", () => {
    const r = result.results.find((r) => r.test_id === "forbidden_command_regression");
    expect(r).toBeDefined();
    expect(r!.passed).toBe(false);
    expect(r!.findings.some((f) => f.rule === "assert.dangerous")).toBe(true);
  });

  test("outcome_mismatch_regression fails on outcome", () => {
    const r = result.results.find((r) => r.test_id === "outcome_mismatch_regression");
    expect(r).toBeDefined();
    expect(r!.passed).toBe(false);
    expect(r!.findings.some((f) => f.rule === "assert.outcome")).toBe(true);
  });
});
