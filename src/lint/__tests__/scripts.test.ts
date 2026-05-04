import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkScripts } from "../checks/scripts.js";
import type { ParsedSkill } from "../../types.js";

function makeTempSkill(): { skill: ParsedSkill; cleanup: () => void } {
  const skillRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-"));
  const skill: ParsedSkill = {
    skillMdPath: path.join(skillRoot, "SKILL.md"),
    skillRoot,
    frontmatter: { name: "test-skill", description: "A test skill" } as any,
    body: "# Test\n\nSome body text that is long enough.",
    rawFrontmatter: "x",
  };
  const cleanup = () => {
    fs.rmSync(skillRoot, { recursive: true, force: true });
  };
  return { skill, cleanup };
}

describe("checkScripts", () => {
  // --- scripts.not_executable ---
  test("warns when a shell script lacks the executable bit", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "run.sh");
      fs.writeFileSync(scriptPath, "#!/usr/bin/env bash\necho hello\n");
      fs.chmodSync(scriptPath, 0o644); // not executable
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.not_executable")).toBe(
        true,
      );
      expect(
        findings.find((f) => f.rule === "scripts.not_executable")!.severity,
      ).toBe("warn");
    } finally {
      cleanup();
    }
  });

  test("does not warn when shell script has executable bit", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "run.sh");
      fs.writeFileSync(scriptPath, "#!/usr/bin/env bash\necho hello\n");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.not_executable")).toBe(
        false,
      );
    } finally {
      cleanup();
    }
  });

  // --- scripts.missing_shebang ---
  test("warns when a shell script has no shebang line", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "run.sh");
      fs.writeFileSync(scriptPath, "echo hello\n");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.missing_shebang")).toBe(
        true,
      );
      expect(
        findings.find((f) => f.rule === "scripts.missing_shebang")!.severity,
      ).toBe("warn");
    } finally {
      cleanup();
    }
  });

  test("does not warn when shell script starts with shebang", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "run.bash");
      fs.writeFileSync(scriptPath, "#!/bin/bash\necho hello\n");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.missing_shebang")).toBe(
        false,
      );
    } finally {
      cleanup();
    }
  });

  // --- scripts.empty_script ---
  test("warns when a script file is empty", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "empty.sh");
      fs.writeFileSync(scriptPath, "");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.empty_script")).toBe(
        true,
      );
      expect(
        findings.find((f) => f.rule === "scripts.empty_script")!.severity,
      ).toBe("warn");
    } finally {
      cleanup();
    }
  });

  test("warns when a script file is only whitespace", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "blank.sh");
      fs.writeFileSync(scriptPath, "   \n\n  ");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.empty_script")).toBe(
        true,
      );
    } finally {
      cleanup();
    }
  });

  // --- empty_script skips further checks ---
  test("does not report shebang or executable for empty scripts", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "empty.sh");
      fs.writeFileSync(scriptPath, "");
      fs.chmodSync(scriptPath, 0o644);
      const findings = checkScripts(skill);
      expect(findings.some((f) => f.rule === "scripts.empty_script")).toBe(
        true,
      );
      expect(findings.some((f) => f.rule === "scripts.missing_shebang")).toBe(
        false,
      );
      expect(findings.some((f) => f.rule === "scripts.not_executable")).toBe(
        false,
      );
    } finally {
      cleanup();
    }
  });

  // --- finds scripts in subdirectories ---
  test("finds scripts recursively in subdirectories", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptsDir = path.join(skill.skillRoot, "scripts");
      fs.mkdirSync(scriptsDir);
      const scriptPath = path.join(scriptsDir, "nested.sh");
      fs.writeFileSync(scriptPath, "#!/usr/bin/env bash\necho nested\n");
      fs.chmodSync(scriptPath, 0o644);
      const findings = checkScripts(skill);
      expect(
        findings.some(
          (f) =>
            f.rule === "scripts.not_executable" &&
            f.file!.includes("nested.sh"),
        ),
      ).toBe(true);
    } finally {
      cleanup();
    }
  });

  // --- no scripts ---
  test("returns no findings when there are no script files", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const findings = checkScripts(skill);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  // --- clean pass ---
  test("returns no findings for a well-formed shell script", () => {
    const { skill, cleanup } = makeTempSkill();
    try {
      const scriptPath = path.join(skill.skillRoot, "deploy.sh");
      fs.writeFileSync(scriptPath, "#!/usr/bin/env bash\nset -e\necho ok\n");
      fs.chmodSync(scriptPath, 0o755);
      const findings = checkScripts(skill);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
