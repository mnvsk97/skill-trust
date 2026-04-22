/**
 * Parses a SKILL.md file into frontmatter + body.
 *
 * SKILL.md format (agentskills.io spec):
 *   ---
 *   name: my-skill
 *   description: ...
 *   allowed-tools: [Read, Bash]
 *   ---
 *   # My Skill
 *   ... body ...
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { ParsedSkill, SkillFrontmatter } from "../types.js";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/;

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly file: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Reads and parses SKILL.md at the given path.
 * Returns a ParsedSkill regardless of whether frontmatter is valid —
 * callers use frontmatter.name === undefined to detect missing fields.
 */
export function parseSkillMd(skillMdPath: string): ParsedSkill {
  const skillRoot = path.dirname(skillMdPath);

  let raw: string;
  try {
    raw = fs.readFileSync(skillMdPath, "utf8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ParseError(`Cannot read SKILL.md: ${msg}`, skillMdPath);
  }

  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return {
      skillMdPath,
      skillRoot,
      frontmatter: {},
      body: raw,
      rawFrontmatter: "",
    };
  }

  const [, rawFrontmatter, body] = match;

  let parsed: unknown;
  try {
    parsed = yaml.load(rawFrontmatter);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ParseError(`Invalid YAML frontmatter: ${msg}`, skillMdPath);
  }

  const frontmatter =
    parsed !== null && typeof parsed === "object"
      ? (parsed as Partial<SkillFrontmatter>)
      : {};

  return {
    skillMdPath,
    skillRoot,
    frontmatter,
    body: body ?? "",
    rawFrontmatter,
  };
}

/**
 * Resolves the SKILL.md path from a skill root directory or an explicit path.
 * Throws if SKILL.md does not exist.
 */
export function resolveSkillMd(inputPath: string): string {
  const stat = (() => {
    try {
      return fs.statSync(inputPath);
    } catch {
      return null;
    }
  })();

  if (stat?.isDirectory()) {
    const candidate = path.join(inputPath, "SKILL.md");
    if (!fs.existsSync(candidate)) {
      throw new ParseError(
        `No SKILL.md found in directory: ${inputPath}`,
        inputPath,
      );
    }
    return candidate;
  }

  if (!stat) {
    throw new ParseError(`Path does not exist: ${inputPath}`, inputPath);
  }

  return inputPath;
}
