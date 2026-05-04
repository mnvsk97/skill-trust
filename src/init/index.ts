import fs from "node:fs";
import path from "node:path";

export interface InitOptions {
  output?: string;
  force?: boolean;
  skill?: string;
}

export interface InitResult {
  path: string;
  created: boolean;
}

export function initSuite(opts: InitOptions = {}): InitResult {
  const suitePath = path.resolve(opts.output ?? "skill-test.yaml");
  if (fs.existsSync(suitePath) && !opts.force) {
    throw new Error(`Suite already exists: ${suitePath}. Use --force to overwrite it.`);
  }

  fs.writeFileSync(suitePath, buildTemplate(opts.skill ?? "my-skill"), "utf8");
  return { path: suitePath, created: true };
}

function buildTemplate(skillName: string): string {
  return `version: "0.1"
suite: "${skillName}-behavior"
description: "Starter behavior tests for ${skillName}."

defaults:
  runtime: "claude-code"
  isolation: "docker"
  timeout_ms: 120000
  eval_runs: 1
  min_pass_rate: 1

fixtures:
  - id: "sample-workspace"
    path: "./fixtures/sample-workspace"

tests:
  - id: "explicit_activation"
    kind: "activation"
    prompt: "Use the $${skillName} skill for this task."
    workspace_fixture: "sample-workspace"
    should_activate:
      - "${skillName}"

  - id: "implicit_activation"
    kind: "activation"
    prompt: "Describe the real user task this skill is meant to handle."
    workspace_fixture: "sample-workspace"
    should_activate:
      - "${skillName}"

  - id: "contextual_activation"
    kind: "activation"
    prompt: "Handle a realistic, slightly noisy request that should still use this skill."
    workspace_fixture: "sample-workspace"
    should_activate:
      - "${skillName}"

  - id: "negative_activation"
    kind: "negative_activation"
    prompt: "Ask for a nearby task that should not use this skill."
    workspace_fixture: "sample-workspace"
    should_not_activate:
      - "${skillName}"

  - id: "happy_path"
    kind: "end_to_end"
    prompt: "Run the main workflow this skill is supposed to perform."
    workspace_fixture: "sample-workspace"
    should_activate:
      - "${skillName}"
    steps:
      - "replace-with-required-step"
    dangerous:
      - "rm -rf"
    outcome: "pass"
`;
}

