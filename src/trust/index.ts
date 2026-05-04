import path from "node:path";
import chalk from "chalk";
import { lint } from "../lint/index.js";
import { scanSkill } from "../scan/index.js";
import { resolveSkillTarget } from "../shared/skill-target.js";
import type { LintFinding, LintResult, ScanResult, ScoreComponent, TrustReview, TrustVerdict } from "../types.js";

export interface VetOptions {
  scan?: boolean;
  model?: string;
  skill?: string;
}

export type TrustReportFormat = "pretty" | "json";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hasRule(findings: LintFinding[], prefixOrRule: string): boolean {
  return findings.some((f) => f.rule === prefixOrRule || f.rule.startsWith(prefixOrRule));
}

function severityPenalty(findings: LintFinding[]): number {
  return findings.reduce((total, f) => {
    if (f.severity === "error") return total + 18;
    if (f.severity === "warn") return total + 8;
    return total + 2;
  }, 0);
}

function safetyComponent(lintResult: LintResult, scanResult?: ScanResult): ScoreComponent {
  const findings = [...lintResult.findings, ...(scanResult?.findings ?? [])];
  const reasons: string[] = [];
  let score = 100 - severityPenalty(findings);

  if (hasRule(findings, "security.prompt_injection")) reasons.push("prompt-injection signature found");
  if (hasRule(findings, "security.exfil_url")) reasons.push("suspicious outbound exfiltration pattern found");
  if (hasRule(findings, "security.hardcoded_secret")) reasons.push("hardcoded secret detected");
  if (hasRule(findings, "security.overly_broad_tools")) reasons.push("wildcard or catch-all tool grant");
  if (hasRule(findings, "security.toxic_flow")) reasons.push("read + write/exec + network capability combination");
  if (hasRule(findings, "scan.")) reasons.push("semantic scan reported risk");
  if (reasons.length === 0) reasons.push("no blocking safety findings from enabled checks");

  return {
    name: "safety",
    score: clamp(score),
    max: 100,
    reasons,
  };
}

function qualityComponent(lintResult: LintResult): ScoreComponent {
  const qualityFindings = lintResult.findings.filter((f) =>
    f.rule.startsWith("schema.") ||
    f.rule.startsWith("desc.") ||
    f.rule.startsWith("files.") ||
    f.rule.startsWith("scripts."),
  );
  const reasons = qualityFindings.length === 0
    ? ["schema, description, file references, and scripts look consistent"]
    : qualityFindings.slice(0, 4).map((f) => `${f.rule}: ${f.message}`);

  return {
    name: "quality",
    score: clamp(100 - severityPenalty(qualityFindings)),
    max: 100,
    reasons,
  };
}

function provenanceComponent(target: string): ScoreComponent {
  const lower = target.toLowerCase();
  const officialSources = [
    "anthropics/", "openai/", "vercel-labs/", "microsoft/", "facebook/",
    "firebase/", "supabase/", "stripe/", "github/", "cloudflare/",
    "langchain-ai/", "remotion-dev/", "getsentry/",
  ];
  const trusted = officialSources.some((source) => lower.includes(source));
  const local = lower.startsWith(".") || lower.startsWith("/") || lower.endsWith("skill.md");

  return {
    name: "provenance",
    score: trusted ? 90 : local ? 70 : 55,
    max: 100,
    reasons: [
      trusted
        ? "source matches a known official or high-signal publisher"
        : local
          ? "local skill; repository provenance not evaluated"
          : "publisher reputation is not on the built-in high-signal list",
    ],
  };
}

function verdictFor(score: number, findings: LintFinding[]): TrustVerdict {
  if (
    findings.some((f) => f.severity === "error") ||
    hasRule(findings, "security.prompt_injection") ||
    hasRule(findings, "security.exfil_url") ||
    hasRule(findings, "security.hardcoded_secret") ||
    hasRule(findings, "security.overly_broad_tools")
  ) {
    return "blocked";
  }

  if (score >= 80 && !hasRule(findings, "security.toxic_flow")) return "recommended";
  return "review";
}

export async function vetSkill(target: string, opts: VetOptions = {}): Promise<TrustReview> {
  const resolved = resolveSkillTarget(target, { skill: opts.skill });

  try {
    const skillRoot = path.dirname(resolved.skillPath);
    const lintResult = lint(skillRoot);
    const scanResult = opts.scan
      ? await scanSkill(target, { model: opts.model, skill: opts.skill })
      : undefined;

    const components = [
      safetyComponent(lintResult, scanResult),
      qualityComponent(lintResult),
      provenanceComponent(resolved.targetLabel),
    ];

    const score = clamp(
      components.reduce((total, c) => total + c.score, 0) / components.length,
    );
    const findings = [...lintResult.findings, ...(scanResult?.findings ?? [])];
    const verdict = verdictFor(score, findings);

    return {
      target: resolved.targetLabel,
      skillRoot,
      score,
      verdict,
      summary: opts.scan
        ? "Full trust review completed with lint and semantic scan."
        : "Trust review completed with deterministic lint checks. Run with --scan for semantic review.",
      components,
      lint: lintResult,
      scan: scanResult,
    };
  } finally {
    resolved.cleanup?.();
  }
}

export function reportTrust(review: TrustReview, format: TrustReportFormat = "pretty"): void {
  if (format === "json") {
    console.log(JSON.stringify(review, null, 2));
    return;
  }

  const verdictColor = review.verdict === "recommended"
    ? chalk.green
    : review.verdict === "review"
      ? chalk.yellow
      : chalk.red;

  console.log();
  console.log(chalk.bold(`Trust review: ${review.target}`));
  console.log(`${verdictColor.bold(review.verdict.toUpperCase())}  score ${review.score}/100`);
  console.log(chalk.dim(review.summary));
  console.log();

  for (const component of review.components) {
    console.log(`${chalk.bold(component.name)} ${component.score}/${component.max}`);
    for (const reason of component.reasons.slice(0, 3)) {
      console.log(`  - ${reason}`);
    }
  }

  const findings = [
    ...(review.lint?.findings ?? []),
    ...(review.scan?.findings ?? []),
  ];
  if (findings.length > 0) {
    console.log();
    console.log(chalk.bold("Findings"));
    for (const finding of findings.slice(0, 12)) {
      const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : "";
      console.log(`  ${finding.severity.toUpperCase().padEnd(5)} ${location} ${finding.message} (${finding.rule})`);
    }
  }
  console.log();
}
