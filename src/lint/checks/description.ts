/**
 * Description quality checks.
 *
 * Rules:
 *   desc.too_short      — description < 20 chars (too vague for routing)
 *   desc.no_body        — SKILL.md body is empty after frontmatter
 *   desc.body_too_short — body < 50 chars (routing agents need context)
 *   desc.missing_h1     — body has no H1 heading
 */

import type { LintFinding, ParsedSkill } from "../../types.js";

const MIN_DESC_CHARS = 20;
const MIN_BODY_CHARS = 50;

export function checkDescription(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const file = "SKILL.md";

  const desc = skill.frontmatter.description;
  if (desc && typeof desc === "string" && desc.trim().length > 0) {
    if (desc.trim().length < MIN_DESC_CHARS) {
      findings.push({
        rule: "desc.too_short",
        severity: "warn",
        message: `\`description\` is only ${desc.trim().length} characters. Aim for at least ${MIN_DESC_CHARS} so routing models can match this skill accurately.`,
        file,
      });
    }
  }

  const body = skill.body.trim();

  if (body.length === 0) {
    findings.push({
      rule: "desc.no_body",
      severity: "warn",
      message:
        "SKILL.md has no body content after frontmatter. Add instructions so the agent knows how to use this skill.",
      file,
    });
    return findings;
  }

  if (body.length < MIN_BODY_CHARS) {
    findings.push({
      rule: "desc.body_too_short",
      severity: "warn",
      message: `SKILL.md body is very short (${body.length} chars). Routing agents need more context to activate this skill correctly.`,
      file,
    });
  }

  // Check for at least one H1 heading in the body
  const hasH1 = /^#\s+\S/m.test(body);
  if (!hasH1) {
    findings.push({
      rule: "desc.missing_h1",
      severity: "info",
      message:
        "SKILL.md body has no H1 heading (`# Title`). A clear heading helps routing agents and skill authors navigate the document.",
      file,
    });
  }

  return findings;
}
