import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const pluginRoot = path.join(repoRoot, "plugins", "skill-check");
const pluginManifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");
const pluginSkillPath = path.join(pluginRoot, "skills", "skill-check", "SKILL.md");
const pluginBinPath = path.join(pluginRoot, "bin", "skill-check");
const readmePath = path.join(repoRoot, "README.md");
const pluginDocsPath = path.join(repoRoot, "docs", "claude-plugin.md");

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

describe("Claude Code plugin", () => {
  test("declares a repo marketplace with the skill-check plugin", () => {
    const marketplace = readJson(marketplacePath);

    expect(marketplace.name).toBe("skill-check");
    expect(marketplace.owner.name).toBe("skill-check maintainers");
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: "skill-check",
      source: "./plugins/skill-check",
      description: expect.stringContaining("skill-check"),
    });
    expect(fs.existsSync(path.join(repoRoot, marketplace.plugins[0].source))).toBe(true);
  });

  test("declares a valid plugin manifest that uses in-plugin skill paths", () => {
    const manifest = readJson(pluginManifestPath);

    expect(manifest).toMatchObject({
      name: "skill-check",
      version: "0.3.0",
      license: "MIT",
      skills: "./skills/",
    });
    expect(fs.existsSync(path.join(pluginRoot, "skills", "skill-check", "SKILL.md"))).toBe(true);
  });

  test("ships the setup-aware /skill-check skill", () => {
    const skill = fs.readFileSync(pluginSkillPath, "utf8");

    expect(skill).toContain("name: skill-check");
    expect(skill).toContain("### setup");
    expect(skill).toContain("skill-check --version");
    expect(skill).toContain("skill-check lint <skill-path>");
    expect(skill).toContain("### record");
    expect(skill).toContain("ANTHROPIC_API_KEY");
  });

  test("ships an executable wrapper for the npm CLI", () => {
    const wrapper = fs.readFileSync(pluginBinPath, "utf8");
    const mode = fs.statSync(pluginBinPath).mode;

    expect(wrapper).toContain("#!/usr/bin/env bash");
    expect(wrapper).toContain("./node_modules/.bin/skill-check");
    expect(wrapper).toContain("./dist/cli.js");
    expect(wrapper).toContain("SKILL_CHECK_PACKAGE_SPEC");
    expect(wrapper).toContain("@mnvsk97/skill-check@latest");
    expect(mode & 0o111).not.toBe(0);
  });

  test("documents Cursor and Codex fallback usage", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    const docs = fs.readFileSync(pluginDocsPath, "utf8");
    const skill = fs.readFileSync(pluginSkillPath, "utf8");

    for (const content of [readme, docs, skill]) {
      expect(content).toContain("Cursor");
      expect(content).toContain("Codex");
      expect(content).toContain("npx -y @mnvsk97/skill-check@latest lint ./my-skill");
    }
  });
});
