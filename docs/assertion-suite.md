# Assertion suite format

Assertion suites are YAML files that describe what a skill _should_ do when driven by a specific prompt. They're validated against [`spec/assertion-schema.json`](../spec/assertion-schema.json).

These suites document the planned `assert` / `record` behavior-testing surface. The schema and examples are in the repo now, but the CLI commands are not implemented yet.

## Minimal example

```yaml
version: "0.1"
suite: "my-skill-tests"

tests:
  - id: "happy_path"
    kind: "end_to_end"
    prompt: "Deploy the FastAPI service to production"
    expect:
      hooks:
        required:
          - "preflight.check_auth"
          - "deploy.start"
        order:
          - "preflight.check_auth -> deploy.start"
      outcome:
        status: "pass"
```

## Top-level fields

| Field | Required | Description |
|---|---|---|
| `version` | ✔ | Always `"0.1"` |
| `suite` | ✔ | Human-readable suite name |
| `description` | — | Optional suite description |
| `defaults` | — | Default values for all tests |
| `skills` | — | Skill under test (for install/record modes) |
| `fixtures` | — | Named workspace fixtures |
| `tests` | ✔ | Array of test cases (at least one) |

## Defaults

```yaml
defaults:
  agent: "claude"
  model: "claude-sonnet-4-5"
  timeout_ms: 60000
  min_confidence: "high"
  max_turns: 20
  max_budget_usd: 0.50
```

## Test kinds

| Kind | Description |
|---|---|
| `install` | Tests that `skill install` exits successfully |
| `activation` | Tests that the skill activates for the given prompt |
| `negative_activation` | Tests that the skill does NOT activate for the given prompt |
| `end_to_end` | Full workflow test: prompt → hooks → outcome |

## Assertion blocks

### `hooks`

```yaml
expect:
  hooks:
    required:
      - "preflight.check_auth"
      - { name: "deploy.start", min_confidence: "high" }
    forbidden:
      - "dangerous.rm_rf"
    order:
      - "preflight.check_auth -> deploy.generate_config -> deploy.start"
```

A hook is "present" when both `hook.started` and `hook.succeeded` events appear in the trace. Ordering is evaluated over first successful occurrences as a subsequence.

### `skills`

```yaml
expect:
  skills:
    activated:
      required:
        - "tfy-deploy"
      forbidden:
        - "tfy-logs"
    order:
      - "tfy-deploy -> tfy-verify"
```

`skill.activated` is inferred from SKILL.md file-read events at `confidence: medium`. By default (`min_confidence: "high"`) these assertions are advisory. To make them required, set `min_confidence: "medium"` on the test or globally.

### `commands`

```yaml
expect:
  commands:
    required:
      - "tfy service deploy"
    forbidden:
      - "rm -rf"
```

Matches against `command.executed` events. Forbidden is matched as a substring.

### `files`

```yaml
expect:
  files:
    created:
      - ".truefoundry/service.yaml"
    not_created:
      - ".env"
```

File assertions are **event-based** — they check for `file.created` / `file.modified` events in the trace, not actual filesystem state.

### `outcome`

```yaml
expect:
  outcome:
    status: "pass"           # hard gate: CI fails if status doesn't match
    data:                    # hard gate: must match outcome event data fields
      exit_code: 0
    contains:                # soft check: warning only, never fails CI
      - "deployment succeeded"
    not_contains:            # soft check: warning only
      - "error"
```

`status` and `data` are hard gates — CI fails if they don't match. `contains` / `not_contains` are warnings.

## Fixtures

```yaml
fixtures:
  - id: "fastapi-service"
    path: "./fixtures/fastapi-service"
    user_home: "./fixtures/user-home-with-auth"
```

Fixtures are directories copied fresh into a temporary workspace per test. `user_home` is mounted as `~/.claude/` — use it to provide a pre-seeded user environment (e.g. existing credentials).

Omit `user_home` to simulate a brand-new user with an empty `~/.claude/`.

## Full example

See [`examples/tfy-deploy/suite.yaml`](../examples/tfy-deploy/suite.yaml).
