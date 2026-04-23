import fs from "node:fs";
import path from "node:path";
import type { Trace } from "../types.js";

export class TraceParseError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = "TraceParseError";
  }
}

export function loadTrace(tracePath: string, suiteDir: string): Trace {
  const resolved = path.resolve(suiteDir, tracePath);

  let content: string;
  try {
    content = fs.readFileSync(resolved, "utf8");
  } catch {
    throw new TraceParseError(`Cannot read trace file: ${resolved}`, resolved);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new TraceParseError(
      `Invalid JSON in trace file: ${(e as Error).message}`,
      resolved,
    );
  }

  return validateTraceStructure(raw, resolved);
}

function validateTraceStructure(raw: unknown, filePath: string): Trace {
  if (!raw || typeof raw !== "object") {
    throw new TraceParseError("Trace file is empty or not an object.", filePath);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.version !== "string") {
    throw new TraceParseError('Missing required field "version".', filePath);
  }

  if (typeof obj.run_id !== "string") {
    throw new TraceParseError('Missing required field "run_id".', filePath);
  }

  if (!Array.isArray(obj.events)) {
    throw new TraceParseError('"events" must be an array.', filePath);
  }

  return obj as unknown as Trace;
}
