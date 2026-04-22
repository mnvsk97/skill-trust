/**
 * File reference checks — ensures paths mentioned in SKILL.md actually exist.
 *
 * Scans the body for Markdown-style links and inline code paths that look
 * like relative file references (e.g. `./scripts/deploy.sh`, `[config](config.yaml)`).
 *
 * Rules:
 *   files.ref_not_found   — a referenced relative path does not exist on disk
 *   files.outside_root    — a referenced path escapes the skill root (../../../etc)
 */

import fs from "node:fs";
import path from "node:path";
import type { LintFinding, ParsedSkill } from "../../types.js";

// Match Markdown links: [text](./path/to/file)
const MD_LINK_RE = /\[.*?\]\(([^)]+)\)/g;
// Match explicit relative paths in backtick code spans or quoted strings
const INLINE_PATH_RE = /[`"'](\.[./\w-]+\.\w+)[`"']/g;

function extractReferencedPaths(body: string): string[] {
  const paths = new Set<string>();

  for (const match of body.matchAll(MD_LINK_RE)) {
    const href = match[1].trim().split("#")[0]; // strip fragment
    if (href.startsWith("./") || href.startsWith("../")) {
      paths.add(href);
    }
  }

  for (const match of body.matchAll(INLINE_PATH_RE)) {
    const p = match[1].trim();
    if (p.startsWith("./") || p.startsWith("../")) {
      paths.add(p);
    }
  }

  return [...paths];
}

export function checkFiles(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const { skillRoot, body } = skill;
  const file = "SKILL.md";
  const absoluteSkillRoot = path.resolve(skillRoot);

  const refs = extractReferencedPaths(body);

  for (const ref of refs) {
    // Resolve relative to skill root
    const resolved = path.resolve(absoluteSkillRoot, ref);
    const relativeToRoot = path.relative(absoluteSkillRoot, resolved);

    // Escape check
    if (
      relativeToRoot.startsWith("..") ||
      path.isAbsolute(relativeToRoot)
    ) {
      findings.push({
        rule: "files.outside_root",
        severity: "error",
        message: `Referenced path "${ref}" escapes the skill root directory. Skills must not reference files outside their own directory.`,
        file,
      });
      continue;
    }

    if (!fs.existsSync(resolved)) {
      findings.push({
        rule: "files.ref_not_found",
        severity: "error",
        message: `Referenced file "${ref}" does not exist.`,
        file,
      });
    }
  }

  return findings;
}
