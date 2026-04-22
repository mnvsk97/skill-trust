/**
 * Schema check — validates required frontmatter fields and their types.
 *
 * Rules:
 *   schema.no_frontmatter   — SKILL.md has no YAML front-matter block
 *   schema.missing_name     — `name` field absent or empty
 *   schema.invalid_name     — `name` is not a valid slug (lowercase, hyphens/underscores)
 *   schema.missing_desc     — `description` field absent or empty
 *   schema.allowed_tools_type — `allowed-tools` present but not an array of strings
 *   schema.invalid_version  — `version` present but not a semver-like string
 */

import type { LintFinding, ParsedSkill } from "../../types.js";

const SLUG_RE = /^[a-z][a-z0-9_-]*$/;
// Loose semver: 1, 1.2, 1.2.3, 1.2.3-beta.1
const VERSION_RE = /^\d+(\.\d+){0,2}(-[\w.]+)?$/;

export function checkSchema(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const fm = skill.frontmatter;
  const file = "SKILL.md";

  if (!skill.rawFrontmatter) {
    findings.push({
      rule: "schema.no_frontmatter",
      severity: "error",
      message:
        "SKILL.md has no YAML frontmatter block. Add a --- ... --- block at the top.",
      file,
      line: 1,
    });
    // No point checking individual fields if there's no frontmatter at all
    return findings;
  }

  // name
  if (!fm.name || typeof fm.name !== "string" || fm.name.trim() === "") {
    findings.push({
      rule: "schema.missing_name",
      severity: "error",
      message: "Frontmatter is missing required field `name`.",
      file,
    });
  } else if (!SLUG_RE.test(fm.name.trim())) {
    findings.push({
      rule: "schema.invalid_name",
      severity: "error",
      message: `Skill name "${fm.name}" is not a valid slug. Use lowercase letters, numbers, hyphens, or underscores (must start with a letter).`,
      file,
    });
  }

  // description
  if (
    !fm.description ||
    typeof fm.description !== "string" ||
    fm.description.trim() === ""
  ) {
    findings.push({
      rule: "schema.missing_desc",
      severity: "error",
      message: "Frontmatter is missing required field `description`.",
      file,
    });
  }

  // allowed-tools (optional — accepts array of strings or a single space-separated string)
  if (fm["allowed-tools"] !== undefined) {
    const at = fm["allowed-tools"];
    const isStringFormat = typeof at === "string" && at.trim() !== "";
    const isArrayFormat =
      Array.isArray(at) &&
      at.length > 0 &&
      at.every((t) => typeof t === "string" && t.trim() !== "");

    if (!isStringFormat && !isArrayFormat) {
      findings.push({
        rule: "schema.allowed_tools_type",
        severity: "error",
        message:
          "`allowed-tools` must be an array of strings or a space-separated string, " +
          'e.g. [Read, Bash] or "Bash(tfy*) Bash(curl *)".',
        file,
      });
    }
  }

  // version (optional, but must look like semver if present)
  if (fm.version !== undefined) {
    const v = String(fm.version).trim();
    if (!VERSION_RE.test(v)) {
      findings.push({
        rule: "schema.invalid_version",
        severity: "warn",
        message: `\`version\` value "${v}" does not look like a valid version (expected e.g. 1.0.0).`,
        file,
      });
    }
  }

  return findings;
}
