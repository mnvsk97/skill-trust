import { checkSecurityStructural } from "../checks/security/structural.js";
import type { ParsedSkill } from "../../types.js";

function makeSkill(tools: string[], name = "my-skill"): ParsedSkill {
  return {
    skillMdPath: "/tmp/skill/SKILL.md",
    skillRoot: "/tmp/skill",
    frontmatter: { name, description: "Test", "allowed-tools": tools },
    body: "# My Skill\n\nSome instructions here.",
    rawFrontmatter: "name: my-skill",
  };
}

describe("checkSecurityStructural – toxic flow", () => {
  test("no finding when only read tools present", () => {
    const skill = makeSkill(["Read", "Grep", "Glob"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.toxic_flow")).toBe(false);
  });

  test("no finding when read + write but no network", () => {
    const skill = makeSkill(["Read", "Write"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.toxic_flow")).toBe(false);
  });

  test("warns when all three legs present", () => {
    const skill = makeSkill(["Read", "Write", "WebFetch"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.toxic_flow")).toBe(true);
  });

  test("warns when Bash alone is present (omnibus)", () => {
    const skill = makeSkill(["Bash"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.toxic_flow")).toBe(true);
  });
});

describe("checkSecurityStructural – wildcard tools", () => {
  test("errors on wildcard entry", () => {
    const skill = makeSkill(["Read", "*"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.overly_broad_tools")).toBe(true);
  });

  test("errors on ALL entry", () => {
    const skill = makeSkill(["ALL"]);
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.overly_broad_tools")).toBe(true);
  });
});

describe("checkSecurityStructural – cross-skill tools", () => {
  test("warns when allowed-tools references another skill namespace", () => {
    // my-skill trying to use tfy-logs tools
    const skill = makeSkill(
      ["Read", "mcp__tfy_logs__get_logs"],
      "my-skill",
    );
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.cross_skill_tools")).toBe(true);
  });

  test("no warning when tool namespace matches skill name", () => {
    const skill = makeSkill(
      ["Read", "mcp__my_skill__do_thing"],
      "my-skill",
    );
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.cross_skill_tools")).toBe(false);
  });

  test("does not warn on shared MCP server namespaces", () => {
    const skill = makeSkill(
      ["Read", "mcp__filesystem__read_file", "mcp__fetch__fetch"],
      "my-skill",
    );
    const findings = checkSecurityStructural(skill);
    expect(findings.some((f) => f.rule === "security.cross_skill_tools")).toBe(false);
  });
});
