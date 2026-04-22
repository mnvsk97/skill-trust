/**
 * Terminal reporter for lint results.
 *
 * Formats:
 *   "pretty"  — human-readable coloured output (default)
 *   "json"    — machine-readable JSON (for CI integrations)
 */

import chalk from "chalk";
import type { LintFinding, LintResult, Severity } from "../types.js";

// ─── Severity formatting ───────────────────────────────────────────────────────

const SEVERITY_ICON: Record<Severity, string> = {
  error: "✖",
  warn:  "⚠",
  info:  "ℹ",
};

const SEVERITY_COLOR: Record<Severity, (s: string) => string> = {
  error: chalk.red,
  warn:  chalk.yellow,
  info:  chalk.cyan,
};

function formatFinding(f: LintFinding): string {
  const icon = SEVERITY_COLOR[f.severity](SEVERITY_ICON[f.severity]);
  const severity = SEVERITY_COLOR[f.severity](f.severity.toUpperCase().padEnd(5));
  const location = f.file
    ? chalk.dim(`${f.file}${f.line != null ? `:${f.line}` : ""}`)
    : "";
  const rule = chalk.dim(`(${f.rule})`);

  const parts = [icon, severity, f.message, rule];
  if (location) parts.splice(2, 0, location);

  return parts.join("  ");
}

// ─── Pretty reporter ──────────────────────────────────────────────────────────

function reportPretty(result: LintResult): void {
  const { findings, skillRoot, passed } = result;

  if (findings.length === 0) {
    console.log(chalk.green("✔") + "  " + chalk.bold("No issues found."));
    console.log(chalk.dim(`   Skill root: ${skillRoot}`));
    return;
  }

  // Group by severity
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warn");
  const infos = findings.filter((f) => f.severity === "info");

  const sorted = [...errors, ...warnings, ...infos];

  console.log();
  for (const f of sorted) {
    console.log(formatFinding(f));
  }
  console.log();

  // Summary line
  const parts: string[] = [];
  if (errors.length > 0)
    parts.push(chalk.red(`${errors.length} error${errors.length !== 1 ? "s" : ""}`));
  if (warnings.length > 0)
    parts.push(chalk.yellow(`${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`));
  if (infos.length > 0)
    parts.push(chalk.cyan(`${infos.length} info`));

  const summary = parts.join(chalk.dim(", "));
  const status = passed
    ? chalk.green("PASSED") + chalk.dim(" (warnings only)")
    : chalk.red("FAILED");

  console.log(`  ${status}  ${summary}`);
  console.log(chalk.dim(`  Skill root: ${skillRoot}`));
  console.log();
}

// ─── JSON reporter ────────────────────────────────────────────────────────────

function reportJson(result: LintResult): void {
  console.log(JSON.stringify(result, null, 2));
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export type ReportFormat = "pretty" | "json";

export function report(result: LintResult, format: ReportFormat = "pretty"): void {
  if (format === "json") {
    reportJson(result);
  } else {
    reportPretty(result);
  }
}
