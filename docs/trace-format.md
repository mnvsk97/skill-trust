# Trace format

Traces are JSON files validated against [`spec/trace-schema.json`](../spec/trace-schema.json). They record every significant event during a skill execution.

The trace spec is included ahead of the `assert` / `record` CLI implementation so suites and adapters can be designed in parallel with the shipped lint command.

## Envelope

```json
{
  "version": "0.1",
  "run_id": "run_abc123",
  "agent": "claude",
  "model": "claude-sonnet-4-5",
  "started_at": "2026-04-20T10:00:00.000Z",
  "ended_at": "2026-04-20T10:00:30.000Z",
  "duration_ms": 30000,
  "metadata": {},
  "events": [ ... ]
}
```

## Event structure

Every event has:

```json
{
  "id": "e1",
  "type": "hook.succeeded",
  "name": "preflight.check_auth",
  "ts": "2026-04-20T10:00:01.000Z",
  "source": "native",
  "confidence": "high",
  "data": {},
  "error": null,
  "parent_id": null
}
```

| Field | Description |
|---|---|
| `id` | Unique event ID within the trace |
| `type` | Event type (see families below) |
| `name` | Subject of the event (hook name, tool name, file path, etc.) |
| `ts` | ISO-8601 timestamp |
| `source` | How the event was captured: `native` \| `shim` \| `parsed` \| `manual` |
| `confidence` | How certain we are: `high` \| `medium` \| `low` |
| `data` | Event-specific payload (varies by type) |
| `error` | Error detail for `.failed` events: `{ message, code }` |
| `parent_id` | ID of a parent event (e.g. a command inside a hook) |

## Event families

### `lifecycle.*`
Emitted by the harness/runner.

| Type | `name` |
|---|---|
| `lifecycle.install.started` | install command string |
| `lifecycle.install.succeeded` | install command string |
| `lifecycle.install.failed` | install command string |
| `lifecycle.sandbox.started` | sandbox ID |
| `lifecycle.sandbox.ready` | sandbox ID |
| `lifecycle.sandbox.teardown` | sandbox ID |
| `lifecycle.test.started` | test ID |
| `lifecycle.test.ended` | test ID |

### `skill.*`
Emitted when the agent routes to a skill.

| Type | `name` | Note |
|---|---|---|
| `skill.discovered` | skill name | found during scan |
| `skill.matched` | skill name | inferred, `confidence: medium` |
| `skill.activated` | skill name | inferred from SKILL.md read, `confidence: medium` |
| `skill.deactivated` | skill name | |

### `hook.*`
Emitted by the skill's workflow steps. Primary assertion target.

| Type | `name` |
|---|---|
| `hook.started` | hook name (e.g. `preflight.check_auth`) |
| `hook.succeeded` | hook name |
| `hook.failed` | hook name |
| `hook.skipped` | hook name |

### `tool.*`

| Type | `name` |
|---|---|
| `tool.attempted` | tool name |
| `tool.called` | tool name |
| `tool.denied` | tool name |
| `tool.succeeded` | tool name |
| `tool.failed` | tool name |

`data` should include `arguments` and `result`.

### `command.*`

| Type | `name` |
|---|---|
| `command.attempted` | command string |
| `command.denied` | command string |
| `command.executed` | command string |
| `command.succeeded` | command string |
| `command.failed` | command string |

`data` should include `exit_code`, `stdout`, `stderr`.

### `file.*`

| Type | `name` |
|---|---|
| `file.created` | relative file path |
| `file.modified` | relative file path |
| `file.deleted` | relative file path |

### `api.*`

| Type | `name` |
|---|---|
| `api.called` | logical operation name (e.g. `create_service`) |
| `api.succeeded` | operation name |
| `api.failed` | operation name |

`data` should include `method`, `url`, `status`.

### `outcome.*`

| Type | `name` |
|---|---|
| `outcome.pass` | test ID |
| `outcome.fail` | test ID |
| `outcome.error` | test ID |
| `outcome.timeout` | test ID |

`data` should include `message` and optionally `contains`.

## Ordering semantics

The `hooks.order` assertion evaluates over **success events only** (`hook.succeeded`, `command.executed`, `tool.succeeded`, `skill.activated`):

- Only the **first successful occurrence** of each name counts
- Failed events and retries are ignored
- A chain `a -> b -> c` passes when `a`, `b`, `c` appear as a **subsequence** (not necessarily adjacent)

## Confidence levels

| Level | Meaning |
|---|---|
| `high` | Directly observed (native hook, shim interception) |
| `medium` | Inferred (e.g. SKILL.md read → skill activated) |
| `low` | Speculative (heuristic matching) |

Assertions with `min_confidence: "high"` (the default) only consider `confidence: "high"` events. Skill activation signals are `medium` by default and are advisory unless `min_confidence` is explicitly lowered.
