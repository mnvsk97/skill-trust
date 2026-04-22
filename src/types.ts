// ─── Lint result types ────────────────────────────────────────────────────────

export type Severity = "error" | "warn" | "info";

export interface LintFinding {
  /** Short machine-readable rule identifier, e.g. "schema.missing_name" */
  rule: string;
  severity: Severity;
  /** Human-readable description of what went wrong */
  message: string;
  /** File the finding applies to (relative to skill root) */
  file?: string;
  /** Line number within the file, 1-based */
  line?: number;
}

export interface LintResult {
  /** Absolute path to the skill root that was linted */
  skillRoot: string;
  /** All findings from all checks */
  findings: LintFinding[];
  /** True when there are zero error-severity findings */
  passed: boolean;
}

// ─── SKILL.md frontmatter types ───────────────────────────────────────────────

export interface SkillFrontmatter {
  /** Unique skill name slug, e.g. "tfy-deploy" */
  name: string;
  /** One-line human description */
  description: string;
  /** Semver skill version */
  version?: string;
  /** List of tool names the skill is allowed to use */
  "allowed-tools"?: string[];
  /** Additional arbitrary fields (not validated, passed through) */
  [key: string]: unknown;
}

export interface ParsedSkill {
  /** Absolute path to SKILL.md */
  skillMdPath: string;
  /** Absolute path to the skill root directory */
  skillRoot: string;
  /** Parsed frontmatter (may be partial if parsing failed) */
  frontmatter: Partial<SkillFrontmatter>;
  /** Body text after the frontmatter delimiter */
  body: string;
  /** Raw frontmatter YAML string (for line-number reporting) */
  rawFrontmatter: string;
}
