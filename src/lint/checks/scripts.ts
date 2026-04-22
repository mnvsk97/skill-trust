/**
 * Script validation checks.
 *
 * Finds script files in the skill directory (*.sh, *.py, *.js, *.ts, etc.)
 * that are referenced from SKILL.md or live in a `scripts/` subdirectory,
 * and validates them.
 *
 * Rules:
 *   scripts.not_executable — a .sh script file is not marked executable
 *   scripts.missing_shebang — a .sh script has no shebang line
 *   scripts.empty_script    — a referenced script file is empty
 */

import fs from "node:fs";
import path from "node:path";
import type { LintFinding, ParsedSkill } from "../../types.js";

const SCRIPT_EXTENSIONS = new Set([".sh", ".bash", ".py", ".js", ".ts"]);
const SHELL_EXTENSIONS = new Set([".sh", ".bash"]);

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function collectScripts(skillRoot: string): string[] {
  const scripts: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        SCRIPT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        scripts.push(full);
      }
    }
  }

  walk(skillRoot);
  return scripts;
}

export function checkScripts(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const { skillRoot } = skill;

  const scripts = collectScripts(skillRoot);

  for (const scriptPath of scripts) {
    const rel = path.relative(skillRoot, scriptPath);
    const ext = path.extname(scriptPath).toLowerCase();

    // Empty file check
    let content = "";
    try {
      content = fs.readFileSync(scriptPath, "utf8");
    } catch {
      continue; // can't read — files check will have caught the ref already
    }

    if (content.trim().length === 0) {
      findings.push({
        rule: "scripts.empty_script",
        severity: "warn",
        message: `Script file "${rel}" is empty.`,
        file: rel,
        line: 1,
      });
      continue;
    }

    if (SHELL_EXTENSIONS.has(ext)) {
      // Shebang check
      if (!content.startsWith("#!")) {
        findings.push({
          rule: "scripts.missing_shebang",
          severity: "warn",
          message: `Shell script "${rel}" is missing a shebang line (e.g. #!/usr/bin/env bash).`,
          file: rel,
          line: 1,
        });
      }

      // Executable bit (only meaningful on POSIX; skip on Windows)
      if (process.platform !== "win32" && !isExecutable(scriptPath)) {
        findings.push({
          rule: "scripts.not_executable",
          severity: "warn",
          message: `Shell script "${rel}" is not marked executable. Run: chmod +x ${rel}`,
          file: rel,
        });
      }
    }
  }

  return findings;
}
