---
name: skill-trust
description: Vet, scan, score, find, recommend, lint, record, and assert AI agent skills using the @mnvsk97/skill-trust CLI
version: 0.3.0
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
---

# skill-trust

Use the `@mnvsk97/skill-trust` CLI when a user wants to decide whether an AI agent skill is safe, good, worth installing, or behaving according to a contract.

## When to activate

Activate when the user mentions:

- Vetting, trusting, scoring, or reviewing a skill
- Finding or recommending safe skills from skills.sh
- Linting a `SKILL.md` file
- Running an LLM semantic security scan
- Creating `skill-test.yaml` or other behavior-test YAML
- Recording skill test runs
- Validating traces against a suite YAML
- Building or fixing skill assertion suites

Do not activate for general coding work unrelated to agent skills.

## Commands

Prefer `npx @mnvsk97/skill-trust@latest ...` unless the repo already has a local checkout and the user is working inside it.

### Find

Use when the user asks what skills exist.

```bash
npx @mnvsk97/skill-trust@latest find "<query>"
```

This searches skills.sh through `npx skills find` and prints candidates with install commands.

### Recommend

Use when the user asks which skill they should use.

```bash
npx @mnvsk97/skill-trust@latest recommend "<query>"
```

Default recommendations are metadata-based: install count plus source reputation. Use `--vet` to fetch and inspect the top candidates before ranking, or `--scan` to include LLM semantic review.

```bash
npx @mnvsk97/skill-trust@latest recommend "<query>" --vet
npx @mnvsk97/skill-trust@latest recommend "<query>" --scan --limit 3
```

### Vet

Use before installing a skill, or when the user asks whether a skill is safe.

```bash
npx @mnvsk97/skill-trust@latest vet <path-or-owner/repo@skill>
```

Examples:

```bash
npx @mnvsk97/skill-trust@latest vet ./my-skill
npx @mnvsk97/skill-trust@latest vet vercel-labs/agent-skills@vercel-react-best-practices
```

Verdicts:

- `recommended` means enabled checks found no hard blockers.
- `review` means a human should inspect the reasons before installing.
- `blocked` means the skill has an error-level or hard security finding.

### Scan

Use for deeper semantic review when static checks are not enough.

```bash
npx @mnvsk97/skill-trust@latest scan <path-or-owner/repo@skill>
```

Requires an OpenAI-compatible chat-completions endpoint:

```bash
export LLM_API_KEY=...
export LLM_API_URL=https://api.openai.com/v1
export LLM_MODEL=...
```

`OPENAI_API_KEY` and `OPENAI_BASE_URL` are accepted as fallbacks.

Use `vet --scan` when the user wants one combined trust verdict:

```bash
npx @mnvsk97/skill-trust@latest vet <target> --scan
```

### Score

Use for CI, dashboards, or machine-readable output.

```bash
npx @mnvsk97/skill-trust@latest score <target>
```

This always returns JSON.

### Lint

Use for fast local checks while authoring skills.

```bash
npx @mnvsk97/skill-trust@latest lint <path>
```

Interpret errors as blockers. Warnings are review prompts unless the user's policy treats warnings as failures.

### Init and behavior YAML authoring

Use when the user wants to create or improve the YAML file for behavior tests.

Start by inspecting the skill repository before writing the suite:

1. Locate the skill root by finding `SKILL.md`.
2. Read the frontmatter for `name`, `description`, and `allowed-tools`.
3. Read the skill body and referenced local files to identify the main workflow, activation language, expected tools, expected commands, files it should create or edit, and risky actions it must avoid.
4. Inspect nearby examples, fixtures, README files, scripts, package files, and test data to understand realistic user tasks.
5. If the repo has no fixture workspace, create a minimal fixture only when needed for the behavior being tested.

Then generate the starter suite:

```bash
npx @mnvsk97/skill-trust@latest init --skill <skill-name>
```

After generation, replace generic placeholders with concrete tests:

- `explicit_activation`: a direct prompt such as "Use the $<skill-name> skill...".
- `implicit_activation`: a natural user request that should route to the skill without naming it.
- `contextual_activation`: a realistic noisy request where repo context should still trigger the skill.
- `negative_activation`: a nearby but different task that must not activate the skill.
- `happy_path`: the main workflow with meaningful `steps`, `tools`, `commands`, file assertions, API assertions, and `outcome`.

Prefer assertions that reflect observable behavior, not implementation guesses. Use `dangerous`, `forbidden_tools`, `should_not_run`, `should_not_activate`, and `should_not_create` for important safety boundaries. Keep live external side effects out of the first suite unless the user explicitly wants an integration test; prefer fixtures, dry-run commands, local files, or mocked endpoints.

Before telling the user the YAML is ready, scan it for placeholders such as `replace-with-required-step`, vague prompts, missing fixture paths, and assertions that cannot be observed in traces.

### Test

Use when the user wants to run a behavior YAML suite.

```bash
npx @mnvsk97/skill-trust@latest test <suite.yaml>
```

Run Docker and auth preflights first when possible. Behavior tests need Docker and Claude auth.

### Assert

Use when a suite YAML and trace files already exist.

```bash
npx @mnvsk97/skill-trust@latest assert <suite.yaml>
```

If assertions fail, explain the expected behavior versus what the trace contained.

### Record

Use when the user wants to generate traces from live skill runs.

```bash
npx @mnvsk97/skill-trust@latest record <suite.yaml>
```

Requires Docker and `ANTHROPIC_API_KEY` for the current recorder.

## Response guidance

When presenting results, lead with the verdict:

```text
Recommended
Review first
Blocked
```

Then give short reasons: tool risk, lint errors, semantic scan findings, weak provenance, or strong official-source/install-count signals.

Never describe a skill as safe based only on `find` or `recommend`; say it is a candidate and suggest `vet` for a file-level review.
