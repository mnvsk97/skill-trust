# Spec file format

Spec files are YAML test suites that describe what a skill should do when driven by a specific prompt. They are validated against [`spec/assertion-schema.json`](../spec/assertion-schema.json).

---

## Field reference

### Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `string` | **yes** | Spec version. Must be `"0.1"`. |
| `suite` | `string` | **yes** | Human-readable name for this test suite. Used in reports and logs. |
| `description` | `string` | no | Optional longer description of what this suite covers. |
| `defaults` | `object` | no | Default values inherited by every test case unless overridden at the test level. |
| `skills` | `object` | no | Declares the skill(s) under test. Used by `record` mode to install and discover skills. |
| `fixtures` | `array` | no | Named workspace fixtures available to tests. Each fixture is a directory copied fresh per test case. |
| `tests` | `array` | **yes** | Ordered list of test cases. Must contain at least one. |

### `defaults` fields

All defaults are optional. When set, they apply to every test case unless the test overrides them.

| Field | Type | Default | Description |
|---|---|---|---|
| `agent` | `string` | -- | Agent name used in `record` mode (e.g. `"claude-code"`). |
| `model` | `string` | -- | Model used in `record` mode (e.g. `"claude-sonnet-4-5"`). |
| `timeout_ms` | `integer` | `60000` | Maximum time per test in milliseconds. |
| `max_turns` | `integer` | `20` | Maximum tester-target conversation turns before the test is terminated. |
| `max_budget_usd` | `number` | -- | Maximum API spend per test case in USD. |
| `eval_runs` | `integer` | `3` | How many times each eval test case is run. Results are aggregated into a pass rate. |
| `min_pass_rate` | `number` (0-1) | `0.9` | Fraction of eval runs that must pass for the overall test to pass. |

### `skills` fields

| Field | Type | Required | Description |
|---|---|---|---|
| `under_test` | `object` | no | The skill being tested. |
| `under_test.source` | `string` | **yes** | Skill source location. GitHub reference (`"github:org/repo"`) or a local path. |
| `under_test.install.method` | `string` | no | Installation method (e.g. `"npx"`). |
| `under_test.install.command` | `string` | no | Shell command to install the skill. |

### `fixtures` fields

Each item in the `fixtures` array.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **yes** | Fixture identifier. Tests reference this in their `workspace_fixture` field. |
| `path` | `string` | **yes** | Path to fixture directory, relative to the suite file. Copied fresh into a temporary workspace per test case. |
| `user_home` | `string` | no | Path to a directory mounted as `~/.claude/` in the container. Omit for a clean new-user environment. |

### Test case fields

Each item in the `tests` array. All assertion fields live directly on the test case -- no nesting under `expect`.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **yes** | Unique test identifier. Used in reports and trace file names. |
| `kind` | `string` | **yes** | Test kind. One of: `"install"`, `"activation"`, `"negative_activation"`, `"end_to_end"`. |
| `description` | `string` | no | Human-readable description of what this test verifies. |
| `prompt` | `string` \| `null` | no | Prompt to send to the agent. Set to `null` for `install` tests. |
| `workspace_fixture` | `string` | no | Fixture `id` to use as the working directory for this test. |
| `trace` | `string` | no | Path to a pre-recorded trace JSON file, relative to the suite file. Used in `assert` mode. |
| `timeout_ms` | `integer` | no | Override the default timeout for this test. |
| `max_turns` | `integer` | no | Override the default max conversation turns for this test. |
| `max_budget_usd` | `number` | no | Override the default max API spend for this test. |
| `min_pass_rate` | `number` (0-1) | no | Override the default minimum eval pass rate for this test. |
| `tester` | `object` | no | Tester agent configuration. |
| `tester.persona` | `string` | no | Natural language persona appended to the tester agent's system prompt. |
| `tester.model` | `string` | no | Model for the tester agent. Defaults to a cheap model. |

### Skill assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `should_activate` | `string[]` | no | Skills that must activate for this prompt. |
| `should_not_activate` | `string[]` | no | Skills that must NOT activate for this prompt. |
| `discovers` | `string[]` | no | Skills that must be discovered after install. |

### Step assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `steps` | `string[]` | no | Workflow steps that must run, in this order (subsequence matching). |
| `should_not_run` | `string[]` | no | Workflow steps that must NOT run. |

### Command assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `commands` | `string[]` | no | Shell commands that must be executed. |
| `dangerous` | `string[]` | no | Shell commands that must NOT be executed. |

### Tool assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `tools` | `string[]` | no | Tools that must be invoked. |
| `forbidden_tools` | `string[]` | no | Tools that must NOT be invoked. |

### File assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `creates` | `string[]` | no | Files that must be created. |
| `modifies` | `string[]` | no | Files that must be modified. |
| `deletes` | `string[]` | no | Files that must be deleted. |
| `should_not_create` | `string[]` | no | Files that must NOT be created. |

### API assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `api_calls` | `string[]` | no | API operations that must be called. |
| `forbidden_api_calls` | `string[]` | no | API operations that must NOT be called. |

### Outcome assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `outcome` | `string` | no | Expected final outcome status. One of: `"pass"`, `"fail"`, `"error"`, `"timeout"`. Hard gate -- CI fails on mismatch. |
| `outcome_contains` | `string[]` | no | Strings that should appear in outcome data. Soft check -- warnings only. |
| `outcome_not_contains` | `string[]` | no | Strings that should NOT appear in outcome data. Soft check -- warnings only. |

### Lifecycle assertions

| Field | Type | Required | Description |
|---|---|---|---|
| `exit_code` | `integer` | no | Expected exit code of the install command. |

---

## Test kinds

| Kind | When to use |
|---|---|
| `install` | Verify that skill installation exits successfully. `prompt` should be `null`. |
| `activation` | Verify the correct skill activates for a given prompt. |
| `negative_activation` | Verify a skill does NOT activate for a given prompt. |
| `end_to_end` | Full workflow: prompt in, steps fire in order, outcomes verified. |

---

## Key rules

- `steps` means required AND ordered. Steps are matched as a subsequence of the trace -- they must all appear, in the listed order, but other steps can occur between them.
- `outcome` is a hard gate. CI fails if the actual outcome does not match.
- `outcome_contains` and `outcome_not_contains` are soft checks. They produce warnings but never fail CI.
- File assertions (`creates`, `modifies`, `deletes`, `should_not_create`) are event-based. They check for trace events, not actual filesystem state.
- A step is "present" when both a started and succeeded event exist for it in the trace.
- Every assertion field is a list of strings, except `outcome` (a single string) and `exit_code` (a single integer).

---

## Examples

### 1. Minimal install test

Verify that a skill package installs and registers its skills.

```yaml
version: "0.1"
suite: "cloud-deploy-install"

skills:
  under_test:
    source: "github:example-org/cloud-deploy-skills"
    install:
      method: "npx"
      command: "npx skills add example-org/cloud-deploy-skills"

tests:
  - id: "install_from_npx"
    kind: "install"
    prompt: null
    trace: "./traces/install.trace.json"
    exit_code: 0
    discovers:
      - "cloud-deploy"
```

### 2. Activation test

Verify the right skill activates for a deploy prompt.

```yaml
version: "0.1"
suite: "cloud-deploy-routing"

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "activate_on_deploy_prompt"
    kind: "activation"
    prompt: "Deploy this service to the cloud."
    workspace_fixture: "express-app"
    trace: "./traces/activation.trace.json"
    should_activate:
      - "cloud-deploy"
    should_not_activate:
      - "cloud-logs"
```

### 3. Negative activation test

Verify a skill does NOT activate for an unrelated prompt.

```yaml
version: "0.1"
suite: "cloud-deploy-negative"

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "logs_prompt_should_not_deploy"
    kind: "negative_activation"
    prompt: "Show me the latest deployment logs."
    workspace_fixture: "express-app"
    trace: "./traces/negative.trace.json"
    should_activate:
      - "cloud-logs"
    should_not_activate:
      - "cloud-deploy"
    should_not_run:
      - "deploy"
```

### 4. Full end-to-end deploy

Verify the complete happy path: correct steps fire in order, expected commands run, files are created, APIs are called, and the outcome is a pass.

```yaml
version: "0.1"
suite: "cloud-deploy-e2e"
description: "Tests for cloud deployment skills."

defaults:
  agent: "claude-code"
  model: "claude-sonnet-4-5"
  timeout_ms: 60000

skills:
  under_test:
    source: "github:example-org/cloud-deploy-skills"
    install:
      method: "npx"
      command: "npx skills add example-org/cloud-deploy-skills"

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "deploy_happy_path"
    kind: "end_to_end"
    prompt: "Deploy this Express app and verify it is healthy."
    workspace_fixture: "express-app"
    timeout_ms: 120000
    trace: "./traces/deploy_happy_path.trace.json"
    should_activate:
      - "cloud-deploy"
    steps:
      - "check-repo"
      - "check-auth"
      - "generate-config"
      - "deploy"
      - "verify"
    should_not_run:
      - "rollback"
    commands:
      - "cloud-cli deploy"
    dangerous:
      - "rm -rf"
    creates:
      - ".deploy/service.yaml"
    api_calls:
      - "create_service"
      - "get_service_health"
    outcome: "pass"
    outcome_contains:
      - "deployment succeeded"
      - "healthy"
```

### 5. End-to-end with tester persona

Use a tester agent with a specific persona to simulate a real user driving a multi-turn conversation.

```yaml
version: "0.1"
suite: "cloud-deploy-persona"

defaults:
  agent: "claude-code"
  model: "claude-sonnet-4-5"
  timeout_ms: 120000
  max_turns: 15
  max_budget_usd: 1.00

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "junior_dev_deploys"
    kind: "end_to_end"
    prompt: "I want to deploy this app somewhere. Not sure how."
    workspace_fixture: "express-app"
    tester:
      persona: "junior developer, first time deploying, unfamiliar with CLI tools"
      model: "claude-haiku-4-5"
    should_activate:
      - "cloud-deploy"
    steps:
      - "check-repo"
      - "deploy"
    outcome: "pass"
```

### 6. Eval mode (flaky skill testing)

Run the same test multiple times and require a minimum pass rate. Useful for skills with non-deterministic behavior.

```yaml
version: "0.1"
suite: "cloud-deploy-eval"

defaults:
  agent: "claude-code"
  model: "claude-sonnet-4-5"
  eval_runs: 5
  min_pass_rate: 0.8

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "deploy_reliability"
    kind: "end_to_end"
    prompt: "Deploy this Express app and verify it is healthy."
    workspace_fixture: "express-app"
    steps:
      - "deploy"
      - "verify"
    outcome: "pass"
```

### 7. Multiple skill orchestration

Verify that multiple skills activate and their steps interleave correctly.

```yaml
version: "0.1"
suite: "multi-skill-workflow"

fixtures:
  - id: "express-app"
    path: "./fixtures/express-app"

tests:
  - id: "migrate_then_deploy"
    kind: "end_to_end"
    prompt: "Run the database migration and then deploy the app to production."
    workspace_fixture: "express-app"
    trace: "./traces/migrate_then_deploy.trace.json"
    should_activate:
      - "db-migrate"
      - "cloud-deploy"
    should_not_activate:
      - "cloud-logs"
    steps:
      - "run-migration"
      - "check-repo"
      - "deploy"
    commands:
      - "db migrate up"
      - "cloud-cli deploy"
    outcome: "pass"
```

### 8. Regression tests (deliberate failures)

Include intentionally failing test cases to verify the assertion engine catches violations.

```yaml
version: "0.1"
suite: "cloud-deploy-regressions"
description: >
  Each trace contains a deliberate violation. Use these to verify the
  assertion engine produces the correct failure output.

tests:
  # Step order violation: deploy runs before check-repo
  - id: "step_order_regression"
    kind: "end_to_end"
    description: "deploy fires before check-repo -- order assertion must catch this"
    prompt: "Deploy this app."
    trace: "./traces/failing/step_order_regression.trace.json"
    steps:
      - "check-repo"
      - "deploy"

  # Missing required step: verify never runs
  - id: "missing_step_regression"
    kind: "end_to_end"
    description: "verify is absent -- required steps assertion must catch this"
    prompt: "Deploy this app."
    trace: "./traces/failing/missing_step_regression.trace.json"
    steps:
      - "deploy"
      - "verify"

  # Dangerous command executed
  - id: "dangerous_command_regression"
    kind: "end_to_end"
    description: "rm -rf fires during deploy -- dangerous command assertion must catch this"
    prompt: "Deploy this app."
    trace: "./traces/failing/dangerous_command_regression.trace.json"
    dangerous:
      - "rm -rf"

  # Outcome mismatch: expected pass but got fail
  - id: "outcome_mismatch_regression"
    kind: "end_to_end"
    description: "service unhealthy after deploy -- outcome assertion must catch this"
    prompt: "Deploy this app."
    trace: "./traces/failing/outcome_mismatch_regression.trace.json"
    outcome: "pass"
    outcome_contains:
      - "deployment succeeded"
```

---

## Full working example

See [`examples/cloud-deploy/suite.yaml`](../examples/cloud-deploy/suite.yaml) for a complete passing suite and [`examples/cloud-deploy/failing-suite.yaml`](../examples/cloud-deploy/failing-suite.yaml) for regression tests.
