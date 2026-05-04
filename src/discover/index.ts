import { execFileSync } from "node:child_process";
import chalk from "chalk";
import type { CandidateRecommendation, SkillCandidate, TrustVerdict } from "../types.js";

export type DiscoveryReportFormat = "pretty" | "json";

const ANSI_RE = /\x1B\[[0-?]*[ -/]*[@-~]/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

function parseInstallCount(raw: string): number {
  const match = /^([\d.]+)([KMB])?$/i.exec(raw.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "B") return Math.round(value * 1_000_000_000);
  if (suffix === "M") return Math.round(value * 1_000_000);
  if (suffix === "K") return Math.round(value * 1_000);
  return Math.round(value);
}

export function parseSkillsFindOutput(output: string): SkillCandidate[] {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: SkillCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = /^([^\s]+@[^ \t]+)\s+([\d.]+[KMB]?)\s+installs$/i.exec(lines[i]);
    if (!match) continue;

    const pkg = match[1];
    const at = pkg.lastIndexOf("@");
    const source = pkg.slice(0, at);
    const skill = pkg.slice(at + 1);
    const nextLine = lines[i + 1] ?? "";
    const url = nextLine.startsWith("└ ") ? nextLine.slice(2).trim() : undefined;

    candidates.push({
      package: pkg,
      source,
      skill,
      installs: parseInstallCount(match[2]),
      installText: `npx skills add ${source} --skill ${skill}`,
      url,
    });
  }

  return candidates;
}

export function findSkillCandidates(query: string): SkillCandidate[] {
  const output = execFileSync("npx", ["skills", "find", query], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 5,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseSkillsFindOutput(output);
}

function sourceReason(source: string): { score: number; reason: string } {
  const highSignalOwners = [
    "anthropics", "openai", "vercel-labs", "microsoft", "facebook",
    "firebase", "supabase", "stripe", "github", "cloudflare",
    "langchain-ai", "remotion-dev", "getsentry", "shadcn",
  ];
  const owner = source.split("/")[0].toLowerCase();
  if (highSignalOwners.includes(owner)) {
    return { score: 35, reason: "high-signal publisher" };
  }
  return { score: 15, reason: "publisher needs review" };
}

function popularityScore(installs: number): { score: number; reason: string } {
  if (installs >= 100_000) return { score: 35, reason: "very high install count" };
  if (installs >= 10_000) return { score: 28, reason: "strong install count" };
  if (installs >= 1_000) return { score: 20, reason: "meaningful install count" };
  if (installs >= 100) return { score: 10, reason: "limited install signal" };
  return { score: 2, reason: "very low install signal" };
}

export function recommendCandidates(candidates: SkillCandidate[]): CandidateRecommendation[] {
  return candidates.map((candidate) => {
    const provenance = sourceReason(candidate.source);
    const popularity = popularityScore(candidate.installs);
    const score = Math.min(100, 30 + provenance.score + popularity.score);
    let verdict: TrustVerdict = "review";
    if (score >= 80) verdict = "recommended";
    if (score < 45) verdict = "review";

    return {
      candidate,
      score,
      verdict,
      reasons: [
        provenance.reason,
        popularity.reason,
        "metadata recommendation only; run vet for file-level checks",
      ],
    };
  }).sort((a, b) => b.score - a.score);
}

export function reportDiscovery(candidates: SkillCandidate[], format: DiscoveryReportFormat = "pretty"): void {
  if (format === "json") {
    console.log(JSON.stringify({ candidates }, null, 2));
    return;
  }

  if (candidates.length === 0) {
    console.log(chalk.yellow("No skills found."));
    return;
  }

  console.log();
  console.log(chalk.bold("Skills found"));
  console.log(chalk.dim("Search results from npx skills find. Run skill-trust recommend for ranking or skill-trust vet for a trust review."));
  console.log();

  for (const candidate of candidates) {
    console.log(`${chalk.cyan(candidate.package)} ${chalk.dim(`${candidate.installs.toLocaleString()} installs`)}`);
    console.log(`  ${candidate.installText}`);
    if (candidate.url) console.log(`  ${chalk.dim(candidate.url)}`);
  }
  console.log();
}

export function reportRecommendations(recommendations: CandidateRecommendation[], format: DiscoveryReportFormat = "pretty"): void {
  if (format === "json") {
    console.log(JSON.stringify({ recommendations }, null, 2));
    return;
  }

  if (recommendations.length === 0) {
    console.log(chalk.yellow("No skills found."));
    return;
  }

  const groups: Array<[TrustVerdict, string]> = [
    ["recommended", "Recommended"],
    ["review", "Review first"],
    ["blocked", "Blocked"],
  ];

  console.log();
  for (const [verdict, title] of groups) {
    const items = recommendations.filter((r) => r.verdict === verdict);
    if (items.length === 0) continue;
    console.log(chalk.bold(title));
    for (const item of items.slice(0, 5)) {
      console.log(`${item.candidate.package}  ${chalk.dim(`score ${item.score}/100`)}`);
      console.log(`  Why: ${item.reasons.join("; ")}`);
      console.log(`  Vet: skill-trust vet ${item.candidate.package}`);
      console.log(`  Install: ${item.candidate.installText}`);
    }
    console.log();
  }
}
