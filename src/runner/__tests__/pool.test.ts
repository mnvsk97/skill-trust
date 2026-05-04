import { runPool } from "../pool.js";

describe("runPool", () => {
  test("preserves input order in returned results", async () => {
    const result = await runPool([3, 1, 2], 2, async (item) => item * 2);
    expect(result).toEqual([6, 2, 4]);
  });

  test("does not exceed the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    await runPool([1, 2, 3, 4], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return true;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

