import { expandJobs, testMinPassRate } from "../plan.js";
import type { Suite } from "../../types.js";

const suite: Suite = {
  version: "0.1",
  suite: "sample",
  defaults: {
    eval_runs: 3,
    min_pass_rate: 0.75,
  },
  tests: [
    { id: "a", kind: "activation", prompt: "a" },
    { id: "b", kind: "end_to_end", prompt: "b", min_pass_rate: 1 },
  ],
};

describe("runner plan", () => {
  test("expands tests into repeated jobs", () => {
    const jobs = expandJobs(suite);
    expect(jobs).toHaveLength(6);
    expect(jobs.map((job) => `${job.test.id}:${job.runIndex}`)).toEqual([
      "a:1",
      "a:2",
      "a:3",
      "b:1",
      "b:2",
      "b:3",
    ]);
  });

  test("filters by test id", () => {
    const jobs = expandJobs(suite, "b");
    expect(jobs).toHaveLength(3);
    expect(jobs.every((job) => job.test.id === "b")).toBe(true);
  });

  test("uses test-level min pass rate before defaults", () => {
    expect(testMinPassRate(suite.tests[0], suite)).toBe(0.75);
    expect(testMinPassRate(suite.tests[1], suite)).toBe(1);
  });
});

