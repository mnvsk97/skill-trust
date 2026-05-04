import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseSkillMd, resolveSkillMd } from "../lint/parse.js";

export interface ResolvedSkillTarget {
  skillPath: string;
  targetLabel: string;
  cleanup?: () => void;
}

interface RemoteSkillSpec {
  source: string;
  skill?: string;
  repoUrl: string;
}

function isLikelyLocalTarget(target: string): boolean {
  return target.startsWith(".") ||
    target.startsWith("/") ||
    target.endsWith("SKILL.md") ||
    fs.existsSync(path.resolve(target));
}

function parseRemoteSkillSpec(target: string, skill?: string): RemoteSkillSpec | null {
  let source = target.trim();
  let skillName = skill?.trim() || undefined;

  const atIndex = source.lastIndexOf("@");
  if (!skillName && atIndex > 0 && !source.startsWith("@")) {
    skillName = source.slice(atIndex + 1);
    source = source.slice(0, atIndex);
  }

  const githubMatch = /^(?:https:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(source);
  if (!githubMatch) return null;

  const [, owner, repo] = githubMatch;
  return {
    source,
    skill: skillName,
    repoUrl: `https://github.com/${owner}/${repo}.git`,
  };
}

function walkSkillFiles(root: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === "SKILL.md") {
        files.push(full);
      }
    }
  }

  walk(root);
  return files;
}

function findSkillInRepo(repoRoot: string, requestedSkill?: string): string {
  const skillFiles = walkSkillFiles(repoRoot);
  if (skillFiles.length === 0) {
    throw new Error("No SKILL.md files found in cloned repository.");
  }

  if (!requestedSkill) {
    if (skillFiles.length === 1) return skillFiles[0];
    throw new Error(
      `Repository contains ${skillFiles.length} skills. Pass --skill <name> or use <owner/repo@skill>.`,
    );
  }

  const normalized = requestedSkill.toLowerCase();
  for (const file of skillFiles) {
    const parsed = parseSkillMd(file);
    const frontmatterName = String(parsed.frontmatter.name ?? "").toLowerCase();
    const dirName = path.basename(path.dirname(file)).toLowerCase();
    const rel = path.relative(repoRoot, file).toLowerCase();
    if (
      frontmatterName === normalized ||
      dirName === normalized ||
      rel.includes(`/skills/${normalized}/skill.md`) ||
      rel.includes(`/${normalized}/skill.md`)
    ) {
      return file;
    }
  }

  throw new Error(`Skill "${requestedSkill}" was not found in cloned repository.`);
}

export function resolveSkillTarget(target: string, opts: { skill?: string } = {}): ResolvedSkillTarget {
  if (isLikelyLocalTarget(target)) {
    const skillPath = resolveSkillMd(path.resolve(target));
    return {
      skillPath,
      targetLabel: target,
    };
  }

  const remote = parseRemoteSkillSpec(target, opts.skill);
  if (!remote) {
    throw new Error(
      `Unsupported skill target "${target}". Use a local path, <owner/repo@skill>, or https://github.com/<owner>/<repo> --skill <name>.`,
    );
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-trust-remote-"));
  const clone = spawnSync("git", ["clone", "--depth", "1", remote.repoUrl, tmpRoot], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (clone.status !== 0) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    throw new Error(`Failed to fetch ${remote.source}: ${clone.stderr || clone.stdout}`);
  }

  try {
    const skillPath = findSkillInRepo(tmpRoot, remote.skill);
    return {
      skillPath,
      targetLabel: remote.skill ? `${remote.source}@${remote.skill}` : remote.source,
      cleanup: () => fs.rmSync(tmpRoot, { recursive: true, force: true }),
    };
  } catch (err) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    throw err;
  }
}
