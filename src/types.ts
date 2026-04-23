// ─── Lint result types ────────────────────────────────────────────────────────

export type Severity = "error" | "warn" | "info";

export interface LintFinding {
  /** Short machine-readable rule identifier, e.g. "schema.missing_name" */
  rule: string;
  severity: Severity;
  /** Human-readable description of what went wrong */
  message: string;
  /** File the finding applies to (relative to skill root) */
  file?: string;
  /** Line number within the file, 1-based */
  line?: number;
}

export interface LintResult {
  /** Absolute path to the skill root that was linted */
  skillRoot: string;
  /** All findings from all checks */
  findings: LintFinding[];
  /** True when there are zero error-severity findings */
  passed: boolean;
}

// ─── SKILL.md frontmatter types ───────────────────────────────────────────────

export interface SkillFrontmatter {
  /** Unique skill name slug, e.g. "cloud-deploy" */
  name: string;
  /** One-line human description */
  description: string;
  /** Semver skill version */
  version?: string;
  /** Tool names the skill is allowed to use (array or space-separated string) */
  "allowed-tools"?: string[] | string;
  /** Additional arbitrary fields (not validated, passed through) */
  [key: string]: unknown;
}

export interface ParsedSkill {
  /** Absolute path to SKILL.md */
  skillMdPath: string;
  /** Absolute path to the skill root directory */
  skillRoot: string;
  /** Parsed frontmatter (may be partial if parsing failed) */
  frontmatter: Partial<SkillFrontmatter>;
  /** Body text after the frontmatter delimiter */
  body: string;
  /** Raw frontmatter YAML string (for line-number reporting) */
  rawFrontmatter: string;
}

// ─── Trace types ─────────────────────────────────────────────────────────────

export interface TraceEvent {
  id: string;
  type: string;
  name: string;
  ts: string;
  source: "native" | "shim" | "parsed" | "manual";
  confidence: "high" | "medium" | "low";
  parent_id?: string;
  duration_ms?: number;
  data?: Record<string, unknown>;
  error?: { message: string; code?: string };
}

export interface Trace {
  version: string;
  run_id: string;
  agent?: string;
  model?: string;
  started_at?: string;
  ended_at?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  events: TraceEvent[];
}

// ─── Spec / suite types ──────────────────────────────────────────────────────

export interface SpecDefaults {
  agent?: string;
  model?: string;
  timeout_ms?: number;
  max_turns?: number;
  max_budget_usd?: number;
  eval_runs?: number;
  min_pass_rate?: number;
}

export interface SpecFixture {
  id: string;
  path: string;
  user_home?: string;
}

export interface SpecSkillDeclaration {
  source: string;
  install?: { method?: string; command?: string };
}

export interface TestCase {
  id: string;
  kind: "install" | "activation" | "negative_activation" | "end_to_end";
  description?: string;
  prompt?: string | null;
  workspace_fixture?: string;
  trace?: string;
  timeout_ms?: number;
  max_turns?: number;
  max_budget_usd?: number;
  min_pass_rate?: number;
  tester?: { persona?: string; model?: string };

  should_activate?: string[];
  should_not_activate?: string[];
  discovers?: string[];

  steps?: string[];
  should_not_run?: string[];

  commands?: string[];
  dangerous?: string[];

  tools?: string[];
  forbidden_tools?: string[];

  creates?: string[];
  modifies?: string[];
  deletes?: string[];
  should_not_create?: string[];

  api_calls?: string[];
  forbidden_api_calls?: string[];

  outcome?: "pass" | "fail" | "error" | "timeout";
  outcome_contains?: string[];
  outcome_not_contains?: string[];
  exit_code?: number;
}

export interface Suite {
  version: string;
  suite: string;
  description?: string;
  defaults?: SpecDefaults;
  skills?: { under_test?: SpecSkillDeclaration };
  fixtures?: SpecFixture[];
  tests: TestCase[];
}

// ─── Assert result types ─────────────────────────────────────────────────────

export interface AssertFinding {
  rule: string;
  severity: Severity;
  message: string;
  test_id: string;
}

export interface TestResult {
  test_id: string;
  passed: boolean;
  findings: AssertFinding[];
}

export interface AssertResult {
  suitePath: string;
  suiteName: string;
  results: TestResult[];
  passed: boolean;
}

// ─── Record result types ─────────────────────────────────────────────────────

export interface RecordingResult {
  test_id: string;
  tracePath: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}

export interface RecordResult {
  suitePath: string;
  suiteName: string;
  recordings: RecordingResult[];
  assertResult?: AssertResult;
}
