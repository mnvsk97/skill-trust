---
name: skill-check
description: Set up and run skill-check for AI agent skills — lint SKILL.md files, validate execution traces, record Docker runs, and generate assertion suites
version: 0.3.0
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Glob
  - Grep
---

# skill-check

Use this plugin skill when a user wants to set up, run, or interpret `skill-check` for an AI agent skill. The plugin provides a `skill-check` executable on the Bash `PATH`; use that first. The wrapper prefers a local `@mnvsk97/skill-check` repository build at `dist/cli.js`, then a project-local `node_modules/.bin/skill-check`, and finally falls back to `npx -y @mnvsk97/skill-check@latest`.

This Claude Code plugin is not installed by Cursor or Codex. If a user asks about those environments, explain that they should run the same CLI directly, such as `npx -y @mnvsk97/skill-check@latest lint ./my-skill`, or add project npm scripts that call `skill-check`.

## When to activate

Activate when `$ARGUMENTS` is provided or when the user mentions:

- Setting up `skill-check` in a repository
- Linting a `SKILL.md` file
- Validating traces against a suite YAML file
- Recording skill test runs
- Building or generating an assertion suite YAML file
- Testing agent skills or skill contracts

Do not activate for general coding tasks unrelated to skill testing.

## Argument parsing

Parse `$ARGUMENTS` to determine the workflow:

- Starts with `setup` -> run the setup workflow
- Starts with `lint` -> run the lint workflow
- Starts with `assert` -> run the assert workflow
- Starts with `record` -> run the record workflow
- Starts with `build-spec` -> run the build-spec workflow
- Empty or `help` -> show a concise summary of available commands

If the argument does not match any workflow, tell the user the available commands: `setup`, `lint`, `assert`, `record`, and `build-spec`.

## Workflows

### setup

Prepare a repository to use `skill-check`.

**Usage:** `/skill-check setup [skill-path]`

1. Confirm Node.js 22+ is available:
   ```bash
   node --version
   ```
   If Node is missing or older than 22, tell the user to install Node 22+ before running `skill-check`.
2. Confirm the CLI wrapper works:
   ```bash
   skill-check --version
   ```
   For `assert` and `record`, prefer version `0.3.0` or newer. If the resolved package is older, ask the user to install a newer package locally or set `SKILL_CHECK_PACKAGE_SPEC` to the package source they want the wrapper to run.
   If the wrapper is unavailable, try:
   ```bash
   npx -y @mnvsk97/skill-check@latest --version
   ```
3. Locate the target skill. Prefer the path from `$ARGUMENTS`; otherwise look for `SKILL.md` in the current directory or common skill directories such as `skill/`, `skills/*/`, and `.claude/skills/*/`.
4. Run an initial lint check:
   ```bash
   skill-check lint <skill-path>
   ```
5. If the repository has a `package.json`, offer to add useful scripts only when the user wants persistent npm commands:
   ```json
   {
     "scripts": {
       "skill-check:lint": "skill-check lint <skill-path>",
       "skill-check:lint:json": "skill-check lint <skill-path> --format json"
     }
   }
   ```
6. Summarize the setup state, the command that was run, and the next recommended command.

### lint

Run static offline checks on a skill. No API key is required.

**Usage:** `/skill-check lint [path] [--format pretty|json] [--no-security]`

1. Determine the target path from `$ARGUMENTS`. If no path is provided, use a nearby `SKILL.md` when one is obvious; otherwise ask for the skill directory or `SKILL.md` path.
2. Run:
   ```bash
   skill-check lint <path>
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

### assert

Validate pre-recorded execution traces against a suite YAML file. No API key is required.

**Usage:** `/skill-check assert <suite.yaml> [--trace trace.json]`

1. Determine the suite path from `$ARGUMENTS`. If only `assert` is provided, ask for the suite YAML path.
2. Optionally read the suite YAML first to understand expected tests and trace locations.
3. Run:
   ```bash
   skill-check assert <suite.yaml>
   ```
   Preserve supported options such as `--trace` and `--format json`.
4. Interpret failures by explaining the expected value, the observed trace behavior, and whether the suite or skill behavior likely needs to change.

Assertion checks to explain include `steps`, `commands`, `dangerous`, `tools`, `forbidden_tools`, `creates`, `modifies`, `deletes`, `outcome`, `outcome_contains`, `outcome_not_contains`, `should_activate`, `should_not_activate`, and `discovers`.

### record

Run skills inside Docker, capture execution traces through Claude Code hooks, and optionally assert the results. Docker and `ANTHROPIC_API_KEY` are required.

**Usage:** `/skill-check record <suite.yaml> [--test id] [--assert] [-o dir]`

1. Determine the suite path from `$ARGUMENTS`. If only `record` is provided, ask for the suite YAML path.
2. Run preflight checks before recording:
   ```bash
   docker info > /dev/null 2>&1
   echo "${ANTHROPIC_API_KEY:+set}"
   ```
3. If Docker is unavailable, tell the user to start Docker Desktop or install Docker.
4. If `ANTHROPIC_API_KEY` is unset, tell the user to export it before recording.
5. If preflight passes, run:
   ```bash
   skill-check record <suite.yaml>
   ```
   Preserve supported options such as `--test`, `--assert`, `--image`, `--output`, and `--format json`.
6. Summarize which tests recorded successfully, where traces were written, and any assertion failures.

### build-spec

Guide the user through creating an assertion suite YAML file for a skill.

**Usage:** `/skill-check build-spec`

Ask only for missing information, then write a minimal suite:

1. Suite name.
2. Skill source, such as `github:org/repo` or a local path.
3. Prompt that should trigger the skill.
4. Expected workflow steps in order.
5. Required commands, forbidden dangerous commands, and expected file changes.
6. Expected outcome, normally `pass`.
7. Optional fixture path.

Use this template and omit empty sections:

```yaml
version: "0.1"
suite: "<suite-name>"

defaults:
  agent: "claude-code"
  model: "claude-sonnet-4-5"
  timeout_ms: 60000

skills:
  under_test:
    source: "<source>"

tests:
  - id: "<test-id>"
    kind: "end_to_end"
    prompt: "<prompt>"
    should_activate:
      - "<skill-name>"
    steps:
      - "<step-1>"
    outcome: "pass"
```

After writing the file, offer to run `skill-check lint` on the target skill if a `SKILL.md` path is available.

## General error handling

- `skill-check` not found: run `npx -y @mnvsk97/skill-check@latest <command>` and mention that the plugin wrapper may not be on `PATH` until Claude Code is restarted after installation.
- Published package is too old for `assert` or `record`: install a newer local package or set `SKILL_CHECK_PACKAGE_SPEC` to an npm, GitHub, or file package spec before running the wrapper.
- `npx` not found: Node.js 22+ and npm are required.
- Package resolution failure: try `npx -y @mnvsk97/skill-check@latest` to force the latest published package.
- Permission errors: prefer `npx` over global installs, then check directory permissions.
- YAML parse errors: read the file, fix indentation or quoting, and rerun the command.
