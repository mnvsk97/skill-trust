---
name: skill-check
description: Test and validate AI agent skills — lint SKILL.md files, validate execution traces against spec files, record test runs in Docker, and build spec YAML files
version: 0.2.1
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
---

# skill-check

Run skill-check commands to test and validate AI agent skills. This skill is the Claude Code interface for the `@mnvsk97/skill-check` CLI.

## When to activate

Activate when `$ARGUMENTS` is provided or when the user mentions:

- Linting a SKILL.md file
- Validating traces against a spec/suite YAML
- Recording skill test runs
- Building or generating a spec YAML file
- Testing agent skills or skill contracts

Do NOT activate for general coding tasks unrelated to skill testing.

## Argument parsing

Parse `$ARGUMENTS` to determine which workflow to run:

- Starts with `lint` -> run the **lint** workflow
- Starts with `assert` -> run the **assert** workflow
- Starts with `record` -> run the **record** workflow
- Starts with `build-spec` -> run the **build-spec** workflow
- Empty or `help` -> show a summary of available commands

If the argument does not match any workflow, tell the user the available commands: `lint`, `assert`, `record`, `build-spec`.

---

## Workflows

### lint

Runs static offline checks on a SKILL.md file. No API key required.

**Usage:** `/skill-check lint [path]`

1. Determine the target path from `$ARGUMENTS`. If only `lint` is provided with no path, ask the user for the skill directory or SKILL.md path. If there is a SKILL.md in the current working directory, offer to use that.
2. Run the command:
   ```
   npx @mnvsk97/skill-check lint <path>
   ```
3. Interpret the output:
   - If it exits 0: all checks passed. Summarize the result.
   - If it exits 1: there are findings. Read the output and explain each finding to the user, grouped by severity (errors first, then warnings). Suggest specific fixes for each issue.
4. Common findings and fixes:
   - `schema.missing_name` — add a `name` field to frontmatter (must be a lowercase slug with hyphens/underscores)
   - `schema.missing_desc` — add a `description` field to frontmatter
   - `schema.allowed_tools_type` — ensure `allowed-tools` is a YAML array of strings
   - `schema.invalid_version` — use semver format like `1.0.0`
   - Security findings — review the flagged patterns and explain the risk

**Error handling:** If `npx` fails with a module-not-found error, suggest running `npm install -g @mnvsk97/skill-check` or checking the Node.js version (requires Node 22+).

---

### assert

Validates pre-recorded execution traces against a spec YAML file. No API key required.

**Usage:** `/skill-check assert <suite.yaml>`

1. Determine the suite file path from `$ARGUMENTS`. If only `assert` is provided, ask the user for the path to their suite YAML file.
2. Optionally, read the suite YAML file first using the Read tool to understand what tests it contains and what traces it references.
3. Run the command:
   ```
   npx @mnvsk97/skill-check assert <suite.yaml>
   ```
4. Interpret the output:
   - If it exits 0: all assertions passed. Summarize which tests passed.
   - If it exits 1: some assertions failed. For each failed test, explain:
     - Which assertions failed (steps out of order, missing commands, wrong outcome, etc.)
     - What the expected value was vs. what was found in the trace
     - Suggestions for fixing either the spec or the skill behavior

**Assertion types to explain:**
- `steps` — required workflow steps that must appear in order (subsequence match)
- `commands` / `dangerous` — shell commands that must or must not appear
- `tools` / `forbidden_tools` — tools that must or must not be invoked
- `creates` / `modifies` / `deletes` — file operations expected in the trace
- `outcome` — hard gate on pass/fail/error/timeout
- `outcome_contains` / `outcome_not_contains` — soft checks on outcome text
- `should_activate` / `should_not_activate` — skill routing assertions
- `discovers` — skills that must be found after install

**Error handling:** If the suite YAML fails to parse, check YAML syntax. If trace files are missing, tell the user they need to run `record` first or provide trace file paths.

---

### record

Runs skills inside Docker, captures execution traces via Claude Code hooks. Requires Docker and an Anthropic API key.

**Usage:** `/skill-check record <suite.yaml>`

1. Determine the suite file path from `$ARGUMENTS`. If only `record` is provided, ask for the suite YAML path.
2. **Pre-flight checks** (run these before attempting the record):

   a. Check Docker is available:
   ```
   docker info > /dev/null 2>&1
   ```
   If this fails, tell the user: "Docker is not running or not installed. The record command runs skills inside a Docker container to isolate execution. Please start Docker Desktop or install Docker, then try again."

   b. Check for the API key:
   ```
   echo "${ANTHROPIC_API_KEY:+set}"
   ```
   If the variable is not set, tell the user: "ANTHROPIC_API_KEY is not set. The record command needs this to drive the Claude Code agent inside the container. Export it with: export ANTHROPIC_API_KEY=sk-ant-..."

3. If pre-flight checks pass, run:
   ```
   npx @mnvsk97/skill-check record <suite.yaml>
   ```
   This may take a while depending on test timeouts. Let the user know it is running.

4. Interpret the output:
   - Report which tests recorded successfully and which failed
   - Note the location of generated trace files
   - If `--assert` was included, also interpret the assertion results

**Options to mention if relevant:**
- `--test <id>` — run only a specific test
- `--assert` — automatically run assertions after recording
- `--image <image>` — use a custom Docker image
- `-o <dir>` — write traces to a specific output directory

**Error handling:**
- Docker permission errors: suggest `sudo` or adding user to the docker group
- Timeout failures: suggest increasing `timeout_ms` in the suite YAML
- API errors: check that the API key is valid and has sufficient quota

---

### build-spec

Guided workflow to generate a spec YAML file for testing a skill. This is interactive -- ask the user questions and build the file from their answers.

**Usage:** `/skill-check build-spec`

**Step 1: Gather information.** Ask the user these questions (skip any the user has already answered in their message):

1. "What is the name of this test suite?" (used as the `suite` field)
2. "Where is the skill source? (e.g., a GitHub repo like `github:org/repo` or a local path)"
3. "What prompt should trigger this skill?" (the `prompt` field for the test)
4. "What workflow steps does the skill run, in order?" (becomes the `steps` array)
5. "Are there any shell commands the skill should execute?" (becomes the `commands` array)
6. "Are there any dangerous commands it should never run?" (becomes the `dangerous` array)
7. "Does the skill create, modify, or delete any files?" (becomes `creates`, `modifies`, `deletes`)
8. "What is the expected outcome? (pass/fail)" (becomes the `outcome` field)
9. "Do you need a workspace fixture? If so, what directory should be copied as the test workspace?"

**Step 2: Generate the YAML.** Build the suite YAML following this structure:

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

fixtures:
  - id: "<fixture-id>"
    path: "<fixture-path>"

tests:
  - id: "<test-id>"
    kind: "end_to_end"
    prompt: "<prompt>"
    workspace_fixture: "<fixture-id>"
    should_activate:
      - "<skill-name>"
    steps:
      - "<step-1>"
      - "<step-2>"
    commands:
      - "<cmd>"
    dangerous:
      - "<dangerous-cmd>"
    creates:
      - "<file>"
    outcome: "pass"
```

Only include fields the user provided values for. Omit empty arrays and unused sections.

**Step 3: Write the file.** Ask the user where to save it (suggest `suite.yaml` in the current directory). Use the Write tool to create the file.

**Step 4: Validate.** After writing, if there is a SKILL.md nearby, offer to run `lint` on it. Explain that the spec file itself is validated when running `assert` or `record`.

---

## General error handling

- **npx not found:** The user needs Node.js 22+ installed. Suggest installing via nvm: `nvm install 22 && nvm use 22`.
- **Package not found:** The package is `@mnvsk97/skill-check`. If npx cannot resolve it, suggest `npx @mnvsk97/skill-check@latest` to force the latest version.
- **Permission errors:** Suggest using `npx` (which avoids global installs) or checking directory permissions.
- **YAML parse errors:** Read the file with the Read tool and help the user fix syntax issues (indentation, missing quotes, etc.).
