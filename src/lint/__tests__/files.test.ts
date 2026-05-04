import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lint } from "../index.js";

describe("checkFiles", () => {
  test("errors when a referenced path escapes to a sibling directory", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-files-"));
    const skillRoot = path.join(tempRoot, "skill");
    const siblingRoot = path.join(tempRoot, "skill-evil");

    fs.mkdirSync(skillRoot, { recursive: true });
    fs.mkdirSync(siblingRoot, { recursive: true });
    fs.writeFileSync(path.join(siblingRoot, "secret.txt"), "top secret");
    fs.writeFileSync(
      path.join(skillRoot, "SKILL.md"),
      `---
name: test-skill
description: A valid description that is long enough
---
# Test Skill

See [secret](../skill-evil/secret.txt).

This body is definitely long enough to avoid description warnings.
`,
    );

    const result = lint(skillRoot);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "files.outside_root",
          severity: "error",
        }),
      ]),
    );
  });
});
