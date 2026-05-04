# Event Families

Every event `type` is namespaced into one of eight families.
Each family owns a distinct concern; mixing concerns across families is a schema violation.

## `lifecycle.*` — Harness/runner events

Events emitted by the skill-trust runner itself, not by the agent or skill.

| Type | Meaning |
|---|---|
| `lifecycle.install.started` | Skill installation command began |
| `lifecycle.install.succeeded` | Skill installation completed successfully |
| `lifecycle.install.failed` | Skill installation failed |
| `lifecycle.sandbox.started` | Sandbox environment provisioned |
| `lifecycle.sandbox.ready` | Sandbox environment ready for execution |
| `lifecycle.sandbox.teardown` | Sandbox environment torn down |
| `lifecycle.test.started` | A test case began execution |
| `lifecycle.test.ended` | A test case finished execution |

`name` = the install command, sandbox ID, or test ID.

## `skill.*` — Skill routing events

Events related to how the agent discovers, matches, and activates skills.

| Type | Meaning |
|---|---|
| `skill.discovered` | A skill was found during discovery scan |
| `skill.matched` | Agent matched a prompt to a skill candidate |
| `skill.activated` | Agent loaded the full skill into context |
| `skill.deactivated` | Agent unloaded a skill from context |

`name` = the skill name as declared in SKILL.md.

`skill.matched` and `skill.activated` are inferred signals unless captured natively by the runtime. When inferred from file reads or transcript analysis, they should be emitted at `confidence: medium` and treated as advisory unless the assertion explicitly lowers `min_confidence`.

## `hook.*` — Workflow step events

Hooks are user-defined, domain-meaningful workflow steps that a skill executes.
These are the primary assertion targets for most tests.

| Type | Meaning |
|---|---|
| `hook.started` | A named workflow step began |
| `hook.succeeded` | A named workflow step completed successfully |
| `hook.failed` | A named workflow step failed |
| `hook.skipped` | A named workflow step was intentionally skipped |

`name` = the hook name (e.g. `preflight.check_auth`, `deploy.start`, `deploy.verify`).

Hook names are skill-defined. The spec does not prescribe them; each skill declares its own hook vocabulary.

## `tool.*` — Tool/function call events

Events for when the agent invokes a tool (MCP tool, function call, etc.).

| Type | Meaning |
|---|---|
| `tool.attempted` | Agent tried to invoke a tool |
| `tool.called` | Agent invoked a tool |
| `tool.denied` | Tool call was blocked before execution |
| `tool.succeeded` | Tool returned a result |
| `tool.failed` | Tool returned an error |

`name` = the tool name (e.g. `Read`, `Bash`, `mcp__myserver__deploy`).

`data` should include:
- `arguments`: the tool call arguments (redact secrets)
- `result`: the tool result (truncate if large)

## `command.*` — Shell command events

Events for shell commands executed by the agent or by hooks.

| Type | Meaning |
|---|---|
| `command.attempted` | Agent tried to run a shell command |
| `command.denied` | Command execution was blocked before launch |
| `command.executed` | A shell command was run |
| `command.succeeded` | Command exited with code 0 |
| `command.failed` | Command exited with non-zero code |

`name` = the command string (e.g. `cloud-cli deploy`, `npm install`).

`data` should include:
- `exit_code`: integer
- `stdout`: string (truncated)
- `stderr`: string (truncated)

## `file.*` — File system events

Events for file creation, modification, or deletion.

| Type | Meaning |
|---|---|
| `file.created` | A file was created |
| `file.modified` | A file was modified |
| `file.deleted` | A file was deleted |

`name` = the relative file path (same as `data.path`).

`data` should include:
- `path`: relative file path

File assertions (`files.created`, `files.modified`, `files.deleted`, `files.not_created`) are **event-based**: they assert that a matching event exists in the trace. They do not check final filesystem state.

## `api.*` — External API call events

Events for HTTP/API calls made to external services.

| Type | Meaning |
|---|---|
| `api.called` | An API request was made |
| `api.succeeded` | API returned a success response |
| `api.failed` | API returned an error response |

`name` = a logical API operation name (e.g. `create_service`, `get_service_health`).

`data` should include:
- `method`: HTTP method
- `url`: request URL (redact tokens)
- `status`: HTTP status code

## `outcome.*` — Final result events

Terminal events representing the overall result of a test or run.

| Type | Meaning |
|---|---|
| `outcome.pass` | The run/test succeeded |
| `outcome.fail` | The run/test failed |
| `outcome.error` | The run/test encountered an unexpected error |
| `outcome.timeout` | The run/test timed out |

`name` = the test ID (e.g. `deploy_happy_path`).

`data` should include:
- `message`: human-readable result description
- `contains`: array of strings found in the output (for outcome matching)

## Ordering semantics

All `order` assertions use **relative ordering** over successful events only. The format is an array of `"a -> b -> c"` strings, where each `->` expresses one relative-before constraint.

Ordering evaluation:
- Only success events count for ordering checks: `hook.succeeded`, `command.executed`, `tool.succeeded`, and `skill.activated`
- Only the first successful occurrence of each name is used
- Failed events and retries are ignored
- A chain passes when it exists as a subsequence in the filtered success-event list

For `hooks.order`, `a`, `b`, and `c` are hook names matched against `hook.succeeded` events.

For `skills.order`, `a`, `b`, and `c` are skill names matched against `skill.activated` events. Because skill activation is often inferred, these checks are advisory unless the effective `min_confidence` is explicitly lowered to include medium-confidence events.
