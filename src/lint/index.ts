/**
 * lint command entrypoint.
 *
 * Runs all static checks against a skill directory (or explicit SKILL.md path)
 * and returns a LintResult. Completely offline — no API keys required.
 */

import path from "node:path";
import { resolveSkillMd, parseSkillMd, ParseError } from "./parse.js";
import { checkSchema } from "./checks/schema.js";
import { checkDescription } from "./checks/description.js";
import { checkFiles } from "./checks/files.js";
import { checkScripts } from "./checks/scripts.js";
import { checkSecurityStatic } from "./checks/security/static.js";
import { checkSecurityStructural } from "./checks/security/structural.js";
import type { LintFinding, LintResult } from "../types.js";

export interface LintOptions {
  /** If true, skip security checks (useful for quick schema validation) */
  noSecurity?: boolean;
}

export function lint(skillPath: string, opts: LintOptions = {}): LintResult {
  // Resolve SKILL.md path
  let skillMdPath: string;
  try {
    skillMdPath = resolveSkillMd(path.resolve(skillPath));
  } catch (err) {
    if (err instanceof ParseError) {
      return {
        skillRoot: path.resolve(skillPath),
        findings: [
          {
            rule: "lint.skill_not_found",
            severity: "error",
            message: err.message,
            file: "SKILL.md",
          },
        ],
        passed: false,
      };
    }
    throw err;
  }

  // Parse
  let skill;
  try {
    skill = parseSkillMd(skillMdPath);
  } catch (err) {
    if (err instanceof ParseError) {
      return {
        skillRoot: path.dirname(skillMdPath),
        findings: [
          {
            rule: "lint.parse_error",
            severity: "error",
            message: err.message,
            file: "SKILL.md",
          },
        ],
        passed: false,
      };
    }
    throw err;
  }

  // Run all checks
  const findings: LintFinding[] = [
    ...checkSchema(skill),
    ...checkDescription(skill),
    ...checkFiles(skill),
    ...checkScripts(skill),
    ...(opts.noSecurity
      ? []
      : [
          ...checkSecurityStatic(skill),
          ...checkSecurityStructural(skill),
        ]),
  ];

  const passed = findings.every((f) => f.severity !== "error");

  return {
    skillRoot: skill.skillRoot,
    findings,
    passed,
  };
}

// Re-export types used by callers
export type { LintResult, LintFinding } from "../types.js";
export { report } from "./reporter.js";
export type { ReportFormat } from "./reporter.js";
