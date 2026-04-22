import { checkSchema } from "../checks/schema.js";
import type { ParsedSkill } from "../../types.js";

function makeSkill(frontmatter: Record<string, unknown>, rawFrontmatter = "x"): ParsedSkill {
  return {
    skillMdPath: "/tmp/skill/SKILL.md",
    skillRoot: "/tmp/skill",
    frontmatter: frontmatter as any,
    body: "# My Skill\n\nSome body text here that is long enough.",
    rawFrontmatter,
  };
}

describe("checkSchema", () => {
  test("passes a valid frontmatter", () => {
    const skill = makeSkill({
      name: "my-skill",
      description: "A valid description that is long enough",
      version: "1.0.0",
      "allowed-tools": ["Read", "Bash"],
    });
    const findings = checkSchema(skill);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });

  test("errors on missing frontmatter block", () => {
    const skill = makeSkill({}, "");
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.no_frontmatter")).toBe(true);
  });

  test("errors on missing name", () => {
    const skill = makeSkill({ description: "A valid description" });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.missing_name")).toBe(true);
  });

  test("errors on invalid slug name", () => {
    const skill = makeSkill({ name: "My Skill!", description: "A valid description" });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.invalid_name")).toBe(true);
  });

  test("accepts hyphenated names", () => {
    const skill = makeSkill({ name: "tfy-deploy", description: "A valid description" });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.invalid_name")).toBe(false);
    expect(findings.some((f) => f.rule === "schema.missing_name")).toBe(false);
  });

  test("errors on missing description", () => {
    const skill = makeSkill({ name: "my-skill" });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.missing_desc")).toBe(true);
  });

  test("errors on allowed-tools as non-array", () => {
    const skill = makeSkill({
      name: "my-skill",
      description: "A valid description",
      "allowed-tools": "Read",
    });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.allowed_tools_type")).toBe(true);
  });

  test("warns on invalid version", () => {
    const skill = makeSkill({
      name: "my-skill",
      description: "A valid description",
      version: "not-a-version",
    });
    const findings = checkSchema(skill);
    expect(findings.some((f) => f.rule === "schema.invalid_version")).toBe(true);
  });
});
