---
name: skill-trust
description: Set up and run skill-trust for AI agent skills — lint, vet, scan, initialize, and run Docker-first behavior tests
version: 0.3.0
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Glob
  - Grep
---

# skill-trust

Use this plugin skill when a user wants to set up, run, or interpret `skill-trust` for an AI agent skill. The plugin provides a `skill-trust` executable on the Bash `PATH`; use that first. The wrapper prefers a local `@mnvsk97/skill-trust` repository build at `dist/cli.js`, then a project-local `node_modules/.bin/skill-trust`, and finally falls back to `npx -y @mnvsk97/skill-trust@latest`.

This Claude Code plugin is not installed by Cursor or Codex. If a user asks about those environments, explain that they should run the same CLI directly, such as `npx -y @mnvsk97/skill-trust@latest lint ./my-skill`, or add project npm scripts that call `skill-trust`.

## When to activate

Activate when `$ARGUMENTS` is provided or when the user mentions:

- Setting up `skill-trust` in a repository
- Linting a `SKILL.md` file
- Vetting, scoring, scanning, finding, or recommending skills
- Creating `skill-test.yaml` with `skill-trust init`
- Designing or improving behavior-test YAML from an existing skill repository
- Running Docker-first behavior tests with `skill-trust test`
- Validating traces against a suite YAML file
- Recording skill test runs
- Testing agent skills or skill contracts

Do not activate for general coding tasks unrelated to skill testing.

## Argument parsing

Parse `$ARGUMENTS` to determine the workflow:

- Starts with `setup` -> run the setup workflow
- Starts with `init` -> run the init workflow
- Starts with `test` -> run the test workflow
- Starts with `auth` -> run the auth workflow
- Starts with `lint` -> run the lint workflow
- Starts with `vet` -> run the vet workflow
- Starts with `score` -> run the score workflow
- Starts with `scan` -> run the scan workflow
- Starts with `assert` -> run the assert workflow
- Starts with `record` -> run the record workflow
- Empty or `help` -> show a concise summary of available commands

If the argument does not match any workflow, tell the user the available commands: `setup`, `init`, `test`, `auth`, `lint`, `vet`, `score`, `scan`, `assert`, and `record`.

## Workflows

### setup

Prepare a repository to use `skill-trust`.

**Usage:** `/skill-trust setup [skill-path]`

1. Confirm Node.js 22+ is available:
   ```bash
   node --version
   ```
   If Node is missing or older than 22, tell the user to install Node 22+ before running `skill-trust`.
2. Confirm the CLI wrapper works:
   ```bash
   skill-trust --version
   ```
   For `assert` and `record`, prefer version `0.3.0` or newer. If the resolved package is older, ask the user to install a newer package locally or set `SKILL_TRUST_PACKAGE_SPEC` to the package source they want the wrapper to run.
   If the wrapper is unavailable, try:
   ```bash
   npx -y @mnvsk97/skill-trust@latest --version
   ```
3. Locate the target skill. Prefer the path from `$ARGUMENTS`; otherwise look for `SKILL.md` in the current directory or common skill directories such as `skill/`, `skills/*/`, and `.claude/skills/*/`.
4. Run an initial lint check:
   ```bash
   skill-trust lint <skill-path>
   ```
5. If the repository has a `package.json`, offer to add useful scripts only when the user wants persistent npm commands:
   ```json
   {
     "scripts": {
       "skill-trust:lint": "skill-trust lint <skill-path>",
       "skill-trust:vet": "skill-trust vet <skill-path>",
       "skill-trust:lint:json": "skill-trust lint <skill-path> --format json"
     }
   }
   ```
6. Summarize the setup state, the command that was run, and the next recommended command.

### lint

Run static offline checks on a skill. No API key is required.

**Usage:** `/skill-trust lint [path] [--format pretty|json] [--no-security]`

1. Determine the target path from `$ARGUMENTS`. If no path is provided, use a nearby `SKILL.md` when one is obvious; otherwise ask for the skill directory or `SKILL.md` path.
2. Run:
   ```bash
   skill-trust lint <path>
   ```
   Preserve supported options such as `--format json` and `--no-security`.
3. Interpret the output:
   - Exit 0: summarize that all error-level checks passed and mention any warnings.
   - Exit 1: group findings by severity, explain each rule in plain language, and suggest focused fixes.
4. Common findings and fixes:
   - `schema.missing_name` — add a lowercase slug `name` field to frontmatter.
   - `schema.missing_desc` — add a useful `description` field to frontmatter.
   - `schema.allowed_tools_type` — make `allowed-tools` a YAML array of strings.
   - `schema.invalid_version` — use semver such as `1.0.0`.
   - Security findings — explain the risk and point to the flagged file or pattern.

### init

Create or improve a behavior test suite.

**Usage:** `/skill-trust init [--skill name] [--output skill-test.yaml]`

Use this workflow both when the user asks to generate `skill-test.yaml` and when they ask for help designing the YAML. Do a lightweight repository scan before writing or editing the suite:

1. Locate the skill root. Prefer a path from `$ARGUMENTS`; otherwise look for `SKILL.md` in the current directory or common skill directories such as `skill/`, `skills/*/`, `.claude/skills/*/`, and `.codex/skills/*/`.
2. Read `SKILL.md` frontmatter for `name`, `description`, and `allowed-tools`.
3. Read the skill body and referenced local files. Identify:
   - activation phrases and nearby negative prompts
   - the main happy-path workflow
   - expected tools, shell commands, API calls, and file changes
   - safety boundaries such as commands, tools, files, or skills that must not run
4. Inspect nearby README files, examples, scripts, package files, fixtures, and existing tests to infer realistic user tasks.
5. If the repository has no fixture workspace and the behavior needs one, create a minimal fixture directory with only the files needed for the test.
6. Determine the skill name from `$ARGUMENTS` or the discovered `SKILL.md`.
7. Run:
   ```bash
   skill-trust init --skill <skill-name>
   ```
   Preserve supported options such as `--output` and `--force`.
8. Replace generic starter text with concrete tests:
   - `explicit_activation`: direct `$<skill-name>` usage.
   - `implicit_activation`: natural user intent that should activate the skill without naming it.
   - `contextual_activation`: realistic noisy request that should activate based on repo context.
   - `negative_activation`: adjacent task that must not activate this skill.
   - `happy_path`: main workflow with meaningful `steps`, `tools`, `commands`, file assertions, API assertions, and `outcome`.
9. Prefer observable assertions over guesses about internal implementation. Use `dangerous`, `forbidden_tools`, `should_not_run`, `should_not_activate`, and `should_not_create` for important safety boundaries.
10. Keep live external side effects out of the first suite unless the user explicitly wants an integration test. Prefer fixtures, local files, dry-run commands, or mocked endpoints.
11. Before finishing, check the YAML for placeholder values such as `replace-with-required-step`, vague prompts, missing fixture paths, and assertions that cannot appear in traces.

Explain that the generated suite should cover explicit activation, implicit activation, contextual activation, negative activation, and a happy-path end-to-end test.

### test

Run Docker-first scripted behavior tests, record traces, and assert the generated traces.

**Usage:** `/skill-trust test [suite.yaml] [--parallel n] [--run-in-band] [--test id]`

1. Determine the suite path. If none is provided, use `skill-test.yaml` when present.
2. Run preflight checks:
   ```bash
   docker info > /dev/null 2>&1
   skill-trust auth claude
   ```
3. If Docker is unavailable, tell the user to start Docker Desktop or install Docker.
4. If Claude auth is unavailable, tell the user to set `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`. For subscription auth, suggest `claude setup-token`.
5. If preflight passes, run:
   ```bash
   skill-trust test <suite.yaml>
   ```
   Preserve supported options such as `--parallel`, `--run-in-band`, `--test`, `--image`, `--output`, and `--format json`.
6. Summarize pass/fail results, failed assertions, and the artifact directory.

### auth

Check runtime authentication.

**Usage:** `/skill-trust auth claude`

Run:

```bash
skill-trust auth claude
```

If it fails, explain that behavior tests use `CLAUDE_CODE_OAUTH_TOKEN` for subscription auth or `ANTHROPIC_API_KEY` for API auth.

### vet / score / scan

Run trust review, machine-readable scoring, or semantic scanning.

**Usage:** `/skill-trust vet <target>`, `/skill-trust score <target>`, `/skill-trust scan <target>`

1. Determine the local path or GitHub target.
2. Run the requested command, preserving options such as `--scan`, `--model`, `--skill`, and `--format json`.
3. Explain verdicts clearly: `recommended`, `review`, or `blocked`.
4. For `scan`, ensure `LLM_API_KEY`, `LLM_API_URL`, and `LLM_MODEL` are configured before running.

### assert

Validate pre-recorded execution traces against a suite YAML file. No API key is required.

**Usage:** `/skill-trust assert <suite.yaml> [--trace trace.json]`

1. Determine the suite path from `$ARGUMENTS`. If only `assert` is provided, ask for the suite YAML path.
2. Optionally read the suite YAML first to understand expected tests and trace locations.
3. Run:
   ```bash
   skill-trust assert <suite.yaml>
   ```
   Preserve supported options such as `--trace` and `--format json`.
4. Interpret failures by explaining the expected value, the observed trace behavior, and whether the suite or skill behavior likely needs to change.

Assertion checks to explain include `steps`, `commands`, `dangerous`, `tools`, `forbidden_tools`, `creates`, `modifies`, `deletes`, `outcome`, `outcome_contains`, `outcome_not_contains`, `should_activate`, `should_not_activate`, and `discovers`.

### record

Run skills inside Docker, capture execution traces through Claude Code hooks, and optionally assert the results. Docker and Claude auth are required.

**Usage:** `/skill-trust record <suite.yaml> [--test id] [--assert] [-o dir]`

1. Determine the suite path from `$ARGUMENTS`. If only `record` is provided, ask for the suite YAML path.
2. Run preflight checks before recording:
   ```bash
   docker info > /dev/null 2>&1
   skill-trust auth claude
   ```
3. If Docker is unavailable, tell the user to start Docker Desktop or install Docker.
4. If Claude auth is unavailable, tell the user to set `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`.
5. If preflight passes, run:
   ```bash
   skill-trust record <suite.yaml>
   ```
   Preserve supported options such as `--test`, `--assert`, `--image`, `--output`, and `--format json`.
6. Summarize which tests recorded successfully, where traces were written, and any assertion failures.

## General error handling

- `skill-trust` not found: run `npx -y @mnvsk97/skill-trust@latest <command>` and mention that the plugin wrapper may not be on `PATH` until Claude Code is restarted after installation.
- Published package is too old for `assert` or `record`: install a newer local package or set `SKILL_TRUST_PACKAGE_SPEC` to an npm, GitHub, or file package spec before running the wrapper.
- `npx` not found: Node.js 22+ and npm are required.
- Package resolution failure: try `npx -y @mnvsk97/skill-trust@latest` to force the latest published package.
- Permission errors: prefer `npx` over global installs, then check directory permissions.
- YAML parse errors: read the file, fix indentation or quoting, and rerun the command.
