import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lint } from "../index.js";

describe("lint", () => {
  test("reports malformed YAML frontmatter as a parse error", () => {
    const skillRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-lint-"));

    fs.writeFileSync(
      path.join(skillRoot, "SKILL.md"),
      `---
name: broken-skill
description: [unterminated
---
# Broken Skill

This body is long enough to avoid description warnings.
`,
    );

    const result = lint(skillRoot);

    expect(result.findings).toEqual([
      expect.objectContaining({
        rule: "lint.parse_error",
        severity: "error",
      }),
    ]);
  });
});
