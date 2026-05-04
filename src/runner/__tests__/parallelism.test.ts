import { resolveParallelism } from "../parallelism.js";

describe("resolveParallelism", () => {
  test("uses explicit numeric values", () => {
    expect(resolveParallelism("3", {})).toBe(3);
    expect(resolveParallelism(2, {})).toBe(2);
  });

  test("uses 1 as the minimum", () => {
    expect(resolveParallelism("0", {})).toBeGreaterThanOrEqual(1);
    expect(resolveParallelism(-5, {})).toBe(1);
  });

  test("defaults to 2 in CI", () => {
    expect(resolveParallelism("auto", { CI: "true" })).toBe(2);
    expect(resolveParallelism(undefined, { GITHUB_ACTIONS: "true" })).toBe(2);
  });
});

