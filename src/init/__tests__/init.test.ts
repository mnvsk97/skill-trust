import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initSuite } from "../index.js";

describe("initSuite", () => {
  test("creates a starter skill-test.yaml", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-init-"));
    const target = path.join(dir, "skill-test.yaml");

    const result = initSuite({ output: target, skill: "cloud-deploy" });

    expect(result.path).toBe(target);
    const content = fs.readFileSync(target, "utf8");
    expect(content).toContain('suite: "cloud-deploy-behavior"');
    expect(content).toContain("explicit_activation");
    expect(content).toContain("negative_activation");
    expect(content).toContain("happy_path");
  });

  test("does not overwrite by default", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-init-"));
    const target = path.join(dir, "skill-test.yaml");
    fs.writeFileSync(target, "existing", "utf8");

    expect(() => initSuite({ output: target })).toThrow(/already exists/);
  });
});

