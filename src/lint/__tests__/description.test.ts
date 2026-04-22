import { checkDescription } from "../checks/description.js";
import type { ParsedSkill } from "../../types.js";

function makeSkill(
  overrides: Partial<Pick<ParsedSkill, "frontmatter" | "body">> = {},
): ParsedSkill {
  return {
    skillMdPath: "/tmp/skill/SKILL.md",
    skillRoot: "/tmp/skill",
    frontmatter: {
      name: "test-skill",
      description: "A perfectly adequate description",
      ...overrides.frontmatter,
    } as any,
    body:
      overrides.body !== undefined
        ? overrides.body
        : "# My Skill\n\nSome body text here that is definitely long enough to pass.",
    rawFrontmatter: "x",
  };
}

describe("checkDescription", () => {
  // --- desc.too_short ---
  test("warns when description is under 20 chars", () => {
    const skill = makeSkill({ frontmatter: { description: "Short" } });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.too_short")).toBe(true);
    expect(findings.find((f) => f.rule === "desc.too_short")!.severity).toBe(
      "warn",
    );
  });

  test("does not warn when description is 20+ chars", () => {
    const skill = makeSkill({
      frontmatter: { description: "This description is long enough" },
    });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.too_short")).toBe(false);
  });

  test("does not warn on too_short when description is missing", () => {
    const skill = makeSkill({ frontmatter: { description: undefined as any } });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.too_short")).toBe(false);
  });

  // --- desc.no_body ---
  test("warns when body is empty", () => {
    const skill = makeSkill({ body: "" });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.no_body")).toBe(true);
    expect(findings.find((f) => f.rule === "desc.no_body")!.severity).toBe(
      "warn",
    );
  });

  test("warns when body is only whitespace", () => {
    const skill = makeSkill({ body: "   \n\n  " });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.no_body")).toBe(true);
  });

  test("returns early when body is empty (no body_too_short or missing_h1)", () => {
    const skill = makeSkill({ body: "" });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.body_too_short")).toBe(false);
    expect(findings.some((f) => f.rule === "desc.missing_h1")).toBe(false);
  });

  // --- desc.body_too_short ---
  test("warns when body is under 50 chars", () => {
    const skill = makeSkill({ body: "# Title\n\nToo short." });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.body_too_short")).toBe(true);
    expect(
      findings.find((f) => f.rule === "desc.body_too_short")!.severity,
    ).toBe("warn");
  });

  test("does not warn when body is 50+ chars", () => {
    const skill = makeSkill({
      body: "# Title\n\nThis is a body that has enough characters to pass the fifty char minimum.",
    });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.body_too_short")).toBe(false);
  });

  // --- desc.missing_h1 ---
  test("reports info when body has no H1 heading", () => {
    const skill = makeSkill({
      body: "This is a body without any heading but it is long enough to pass the minimum.",
    });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.missing_h1")).toBe(true);
    expect(findings.find((f) => f.rule === "desc.missing_h1")!.severity).toBe(
      "info",
    );
  });

  test("does not report missing_h1 when body contains an H1", () => {
    const skill = makeSkill({
      body: "# My Skill\n\nSome body text here that is definitely long enough to pass.",
    });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.missing_h1")).toBe(false);
  });

  test("does not match H2 or deeper headings as H1", () => {
    const skill = makeSkill({
      body: "## Not an H1\n\nSome body text here that is definitely long enough to pass the check.",
    });
    const findings = checkDescription(skill);
    expect(findings.some((f) => f.rule === "desc.missing_h1")).toBe(true);
  });

  // --- clean pass ---
  test("returns no findings for a well-formed skill", () => {
    const skill = makeSkill();
    const findings = checkDescription(skill);
    expect(findings).toHaveLength(0);
  });
});
