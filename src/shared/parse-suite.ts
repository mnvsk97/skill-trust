import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Suite } from "../types.js";

export class SpecParseError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = "SpecParseError";
  }
}

export function loadSuite(suitePath: string): Suite {
  const resolved = path.resolve(suitePath);

  let content: string;
  try {
    content = fs.readFileSync(resolved, "utf8");
  } catch {
    throw new SpecParseError(`Cannot read suite file: ${resolved}`, resolved);
  }

  let raw: unknown;
  try {
    raw = yaml.load(content);
  } catch (e) {
    throw new SpecParseError(
      `Invalid YAML in suite file: ${(e as Error).message}`,
      resolved,
    );
  }

  return validateSuiteStructure(raw, resolved);
}

function validateSuiteStructure(raw: unknown, filePath: string): Suite {
  if (!raw || typeof raw !== "object") {
    throw new SpecParseError("Suite file is empty or not an object.", filePath);
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version !== "0.1") {
    throw new SpecParseError(
      `Unsupported suite version: "${obj.version}". Expected "0.1".`,
      filePath,
    );
  }

  if (typeof obj.suite !== "string" || obj.suite.trim() === "") {
    throw new SpecParseError('Missing required field "suite".', filePath);
  }

  if (!Array.isArray(obj.tests) || obj.tests.length === 0) {
    throw new SpecParseError(
      '"tests" must be a non-empty array.',
      filePath,
    );
  }

  for (const t of obj.tests) {
    if (!t || typeof t !== "object") {
      throw new SpecParseError("Each test must be an object.", filePath);
    }
    const test = t as Record<string, unknown>;
    if (typeof test.id !== "string" || test.id.trim() === "") {
      throw new SpecParseError("Each test must have a non-empty id.", filePath);
    }
    if (typeof test.kind !== "string") {
      throw new SpecParseError(
        `Test "${test.id}" is missing required field "kind".`,
        filePath,
      );
    }
  }

  return obj as unknown as Suite;
}
