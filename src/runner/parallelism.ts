import os from "node:os";

export function isCi(env = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

export function resolveParallelism(value?: string | number, env = process.env): number {
  if (typeof value === "number") {
    return Math.max(1, Math.floor(value));
  }

  if (typeof value === "string" && value.trim() !== "" && value !== "auto") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  if (isCi(env)) return 2;

  const cpus = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.min(cpus, 4));
}

