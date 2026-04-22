/**
 * Static security pattern checks (fully offline, no API keys).
 *
 * Scans all text files in the skill directory for:
 *   1. Prompt injection patterns — attempts to override agent instructions
 *   2. Exfiltration patterns — URLs, data-sending commands in unexpected places
 *   3. Sensitive data patterns — hardcoded secrets, tokens, passwords
 *
 * Rules:
 *   security.prompt_injection   — text matches known injection trigger phrases
 *   security.exfil_url          — suspicious outbound URL or curl/wget in skill files
 *   security.hardcoded_secret   — token/password/key-like value detected
 */

import fs from "node:fs";
import path from "node:path";
import type { LintFinding, ParsedSkill } from "../../../types.js";

// ─── Pattern definitions ───────────────────────────────────────────────────────

interface SecurityPattern {
  rule: string;
  severity: "error" | "warn";
  label: string;
  pattern: RegExp;
}

const INJECTION_PATTERNS: SecurityPattern[] = [
  {
    rule: "security.prompt_injection",
    severity: "error",
    label: "Ignore previous instructions",
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  },
  {
    rule: "security.prompt_injection",
    severity: "error",
    label: "Disregard/forget instructions",
    pattern: /disregard|forget\s+(all\s+)?(previous|prior|above)/i,
  },
  {
    rule: "security.prompt_injection",
    severity: "error",
    label: "You are now / act as override",
    pattern: /you\s+are\s+now\s+(?:a|an)\s+\w|\bact\s+as\s+(?:a|an)\s+(?:different|new|unrestricted)/i,
  },
  {
    rule: "security.prompt_injection",
    severity: "error",
    label: "DAN / jailbreak pattern",
    pattern: /\bDAN\b|do\s+anything\s+now|jailbreak/i,
  },
  {
    rule: "security.prompt_injection",
    severity: "error",
    label: "Override system prompt",
    pattern: /override\s+(the\s+)?(system\s+prompt|instructions|rules)/i,
  },
  {
    rule: "security.prompt_injection",
    severity: "warn",
    label: "Hidden instruction comment",
    // HTML comment or zero-width chars used to hide instructions
    pattern: /<!--[\s\S]{0,500}(?:ignore|disregard|you are|act as)[\s\S]{0,500}-->/i,
  },
];

const EXFIL_PATTERNS: SecurityPattern[] = [
  {
    rule: "security.exfil_url",
    severity: "error",
    label: "curl/wget to external URL",
    pattern: /\b(?:curl|wget)\s+.*https?:\/\/(?!localhost|127\.0\.0\.1)/i,
  },
  {
    rule: "security.exfil_url",
    severity: "warn",
    label: "Suspicious external URL with data parameter",
    pattern: /https?:\/\/[^\s"'`]+[?&](?:data|token|key|secret|payload)=/i,
  },
  {
    rule: "security.exfil_url",
    severity: "warn",
    label: "DNS exfiltration pattern",
    pattern: /\$\([\w\s]+\)\.[a-z0-9-]{3,}\.[a-z]{2,}(?:\s|"|')/i,
  },
];

const SECRET_PATTERNS: SecurityPattern[] = [
  {
    rule: "security.hardcoded_secret",
    severity: "error",
    label: "Hardcoded API key",
    // Key-like values: alphanumeric strings 20-60 chars assigned to key/token/secret
    pattern: /(?:api[_-]?key|token|secret|password|passwd|pwd)\s*[=:]\s*["']?[A-Za-z0-9+/]{20,60}["']?/i,
  },
  {
    rule: "security.hardcoded_secret",
    severity: "error",
    label: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/,
  },
  {
    rule: "security.hardcoded_secret",
    severity: "error",
    label: "GitHub personal access token",
    pattern: /ghp_[A-Za-z0-9]{36}/,
  },
  {
    rule: "security.hardcoded_secret",
    severity: "error",
    label: "Slack bot token",
    pattern: /xoxb-[0-9]{11}-[0-9]{11}-[A-Za-z0-9]{24}/,
  },
];

const ALL_PATTERNS = [...INJECTION_PATTERNS, ...EXFIL_PATTERNS, ...SECRET_PATTERNS];

// ─── File collection ───────────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".yaml", ".yml", ".json", ".sh", ".bash",
  ".py", ".js", ".ts", ".toml", ".env", ".cfg", ".ini",
]);

// Files that should NEVER contain injection/exfil patterns
const SENSITIVE_FILES_RE = /SKILL\.md$/i;

function collectTextFiles(skillRoot: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".git")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        files.push(full);
      }
    }
  }

  walk(skillRoot);
  return files;
}

// ─── Line-by-line scanner ─────────────────────────────────────────────────────

function scanFile(
  filePath: string,
  skillRoot: string,
  patterns: SecurityPattern[],
): LintFinding[] {
  const findings: LintFinding[] = [];
  const rel = path.relative(skillRoot, filePath);

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return findings;
  }

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of patterns) {
      // Reset lastIndex before testing (guards against stateful global regexes)
      if (pat.pattern.global) pat.pattern.lastIndex = 0;
      if (pat.pattern.test(line)) {
        if (pat.pattern.global) pat.pattern.lastIndex = 0;
        findings.push({
          rule: pat.rule,
          severity: pat.severity,
          message: `[${pat.label}] Suspicious pattern detected in "${rel}".`,
          file: rel,
          line: i + 1,
        });
        break; // one finding per line per pattern group
      }
    }
  }

  return findings;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function checkSecurityStatic(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const { skillRoot } = skill;

  const files = collectTextFiles(skillRoot);

  for (const filePath of files) {
    // SKILL.md gets all patterns; other files get exfil + secret only
    const patterns = SENSITIVE_FILES_RE.test(filePath)
      ? ALL_PATTERNS
      : [...EXFIL_PATTERNS, ...SECRET_PATTERNS];

    findings.push(...scanFile(filePath, skillRoot, patterns));
  }

  return findings;
}
