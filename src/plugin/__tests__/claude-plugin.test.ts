import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const pluginRoot = path.join(repoRoot, "plugins", "skill-trust");
const pluginManifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");
const pluginSkillPath = path.join(pluginRoot, "skills", "skill-trust", "SKILL.md");
const pluginBinPath = path.join(pluginRoot, "bin", "skill-trust");
const readmePath = path.join(repoRoot, "README.md");
const pluginDocsPath = path.join(repoRoot, "docs", "claude-plugin.md");

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

describe("Claude Code plugin", () => {
  test("declares a repo marketplace with the skill-trust plugin", () => {
    const marketplace = readJson(marketplacePath);

    expect(marketplace.name).toBe("skill-trust");
    expect(marketplace.owner.name).toBe("skill-trust maintainers");
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: "skill-trust",
      source: "./plugins/skill-trust",
      description: expect.stringContaining("skill-trust"),
    });
    expect(fs.existsSync(path.join(repoRoot, marketplace.plugins[0].source))).toBe(true);
  });

  test("declares a valid plugin manifest that uses in-plugin skill paths", () => {
    const manifest = readJson(pluginManifestPath);

    expect(manifest).toMatchObject({
      name: "skill-trust",
      version: "0.3.0",
      license: "MIT",
      skills: "./skills/",
    });
    expect(fs.existsSync(path.join(pluginRoot, "skills", "skill-trust", "SKILL.md"))).toBe(true);
  });

  test("ships the setup-aware /skill-trust skill", () => {
    const skill = fs.readFileSync(pluginSkillPath, "utf8");

    expect(skill).toContain("name: skill-trust");
    expect(skill).toContain("### setup");
    expect(skill).toContain("skill-trust --version");
    expect(skill).toContain("skill-trust lint <skill-path>");
    expect(skill).toContain("### init");
    expect(skill).toContain("### test");
    expect(skill).toContain("### record");
    expect(skill).toContain("CLAUDE_CODE_OAUTH_TOKEN");
  });

  test("ships an executable wrapper for the npm CLI", () => {
    const wrapper = fs.readFileSync(pluginBinPath, "utf8");
    const mode = fs.statSync(pluginBinPath).mode;

    expect(wrapper).toContain("#!/usr/bin/env bash");
    expect(wrapper).toContain("./node_modules/.bin/skill-trust");
    expect(wrapper).toContain("./dist/cli.js");
    expect(wrapper).toContain("SKILL_TRUST_PACKAGE_SPEC");
    expect(wrapper).toContain("@mnvsk97/skill-trust@latest");
    expect(mode & 0o111).not.toBe(0);
  });

  test("documents Cursor and Codex fallback usage", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    const docs = fs.readFileSync(pluginDocsPath, "utf8");
    const skill = fs.readFileSync(pluginSkillPath, "utf8");

    for (const content of [readme, docs, skill]) {
      expect(content).toContain("Cursor");
      expect(content).toContain("Codex");
      expect(content).toContain("npx -y @mnvsk97/skill-trust@latest lint ./my-skill");
    }
  });
});
