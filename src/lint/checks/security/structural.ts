/**
 * Structural security checks (offline graph analysis of allowed-tools).
 *
 * The "toxic flow" (lethal trifecta) analysis:
 *   A skill is high-risk when it simultaneously has:
 *     1. A READ capability  — can access sensitive data (files, env, memory)
 *     2. A WRITE/EXEC capability — can modify system state
 *     3. A NETWORK capability — can exfiltrate data or fetch remote content
 *
 * This does NOT trigger if any leg is missing.
 *
 * Additional structural rules:
 *   - Tool shadowing: a skill's allowed-tools includes tools from other skills
 *     (cross-origin escalation vector)
 *
 * Rules:
 *   security.toxic_flow         — all three trifecta legs present
 *   security.overly_broad_tools — wildcard or catch-all tool grants
 *   security.cross_skill_tools  — allowed-tools includes another skill's tools
 */

import type { LintFinding, ParsedSkill } from "../../../types.js";

// ─── Tool capability classification ──────────────────────────────────────────

const READ_TOOLS = new Set([
  "Read", "Glob", "Grep", "LS", "Cat",
  "mcp__filesystem__read_file",
  "mcp__filesystem__list_directory",
  "mcp__filesystem__read_multiple_files",
]);

const EXEC_TOOLS = new Set([
  "Bash", "Execute", "Shell", "RunScript",
  "mcp__bash__run_command",
]);

const WRITE_TOOLS = new Set([
  "Write", "Edit", "Create", "Delete", "Move", "Rename",
  "mcp__filesystem__write_file",
  "mcp__filesystem__create_directory",
  "mcp__filesystem__delete_file",
  "mcp__filesystem__move_file",
]);

const NETWORK_TOOLS = new Set([
  "WebFetch", "WebSearch", "Fetch", "HttpRequest",
  "mcp__fetch__fetch",
  "mcp__browser__navigate",
  "mcp__browser__screenshot",
]);

// Bash is both exec AND implicitly read/write/network — covers all legs solo
const OMNIBUS_TOOLS = new Set(["Bash", "Shell", "Execute"]);

// Shared MCP server namespaces are infrastructure, not skill-owned namespaces.
const SHARED_MCP_SERVER_NAMESPACES = new Set([
  "filesystem",
  "fetch",
  "browser",
  "bash",
]);

function classifyTools(tools: string[]): {
  hasRead: boolean;
  hasExec: boolean;
  hasWrite: boolean;
  hasNetwork: boolean;
  hasOmnibus: boolean;
} {
  let hasRead = false;
  let hasExec = false;
  let hasWrite = false;
  let hasNetwork = false;
  let hasOmnibus = false;

  for (const t of tools) {
    if (OMNIBUS_TOOLS.has(t)) hasOmnibus = true;
    if (READ_TOOLS.has(t)) hasRead = true;
    if (EXEC_TOOLS.has(t)) hasExec = true;
    if (WRITE_TOOLS.has(t)) hasWrite = true;
    if (NETWORK_TOOLS.has(t)) hasNetwork = true;
  }

  return { hasRead, hasExec, hasWrite, hasNetwork, hasOmnibus };
}

// ─── Cross-skill tool detection ───────────────────────────────────────────────

// MCP tools from known external skill namespaces look like mcp__<skill>__<op>
// where <skill> doesn't match the current skill's own name.
function detectCrossSkillTools(
  tools: string[],
  skillName: string,
): string[] {
  const ownNamespace = skillName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  return tools.filter((t) => {
    const match = /^mcp__([^_]+(?:_[^_]+)*)__/.exec(t);
    if (!match) return false;
    const ns = match[1].toLowerCase();
    if (SHARED_MCP_SERVER_NAMESPACES.has(ns)) return false;
    // Flag if namespace clearly doesn't match this skill
    return !ns.includes(ownNamespace) && !ownNamespace.includes(ns);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function checkSecurityStructural(skill: ParsedSkill): LintFinding[] {
  const findings: LintFinding[] = [];
  const file = "SKILL.md";

  const tools = skill.frontmatter["allowed-tools"];
  if (!Array.isArray(tools) || tools.length === 0) return findings;

  const toolNames = tools.filter((t) => typeof t === "string") as string[];

  // ── Wildcard / overly broad grants ────────────────────────────────────────
  const wildcards = toolNames.filter((t) => t.includes("*") || t === "ALL");
  if (wildcards.length > 0) {
    findings.push({
      rule: "security.overly_broad_tools",
      severity: "error",
      message: `\`allowed-tools\` contains wildcard or catch-all entries: ${wildcards.map((t) => `"${t}"`).join(", ")}. Grant only the specific tools this skill needs.`,
      file,
    });
  }

  // ── Toxic flow trifecta ───────────────────────────────────────────────────
  const { hasRead, hasExec, hasWrite, hasNetwork, hasOmnibus } =
    classifyTools(toolNames);

  const effectiveRead = hasRead || hasOmnibus;
  const effectiveWrite = hasWrite || hasExec || hasOmnibus;
  const effectiveNetwork = hasNetwork || hasOmnibus;

  if (effectiveRead && effectiveWrite && effectiveNetwork) {
    findings.push({
      rule: "security.toxic_flow",
      severity: "warn",
      message:
        "This skill has all three capability legs (read, write/exec, network), which enables the \"toxic flow\" exfiltration pattern: " +
        "sensitive data can be read, then sent over the network. " +
        "Review whether all three capability types are truly necessary.",
      file,
    });
  }

  // ── Cross-skill tool shadowing ────────────────────────────────────────────
  const skillName = String(skill.frontmatter.name ?? "unknown");
  const crossSkillTools = detectCrossSkillTools(toolNames, skillName);
  if (crossSkillTools.length > 0) {
    findings.push({
      rule: "security.cross_skill_tools",
      severity: "warn",
      message:
        `\`allowed-tools\` references tools that appear to belong to other skill namespaces: ` +
        crossSkillTools.map((t) => `"${t}"`).join(", ") +
        ". This is a potential tool-shadowing vector where one skill's instructions can modify another skill's behavior.",
      file,
    });
  }

  return findings;
}
