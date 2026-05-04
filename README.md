# skill-check

**Skill contract testing for the [agentskills.io](https://agentskills.io) ecosystem.**

`skill-check` is an open testing framework for verifying that a skill works the way it claims.

Today, the published CLI ships the **offline lint** pillar. The broader framework is designed around three pillars:

| Pillar | Command | What it catches |
|---|---|---|
| **Lint** | `skill-check lint` | Schema violations, missing files, insecure patterns — _fully offline_ |
| **Scan** | `skill-check scan` | Planned: LLM-powered semantic security analysis (prompt injection, tool poisoning) |
| **Behavior** | `skill-check assert` | Planned: trace-based assertions for hooks, order, and outcomes |

The repo already includes the draft trace/assertion specs and example suites for the planned `scan`, `assert`, and `record` commands, but those commands are not implemented in `0.1.0`.

---

## Install

```bash
npm install -g @mnvsk97/skill-check
# or run without installing:
npx @mnvsk97/skill-check lint ./my-skill
```

The installed binary is still `skill-check`.

## Claude Code plugin

This repository also ships the official Claude Code plugin for `skill-check`. The plugin adds a `/skill-check` skill and a `skill-check` Bash wrapper so Claude can set up the CLI, lint skills, run assertion suites, record traces, and generate suite YAML files from inside Claude Code.

Install it from this repo-hosted marketplace:

```bash
claude plugin marketplace add mnvsk97/skill-trust
claude plugin install skill-check@skill-check
```

For local development or PR testing, install from a checkout instead:

```bash
claude plugin validate .
claude plugin marketplace add .
claude plugin install skill-check@skill-check
```

Restart Claude Code after installing the plugin, then run:

```text
/skill-check setup ./my-skill
/skill-check lint ./my-skill
/skill-check assert ./suite.yaml
/skill-check record ./suite.yaml --assert
```

Cursor and Codex do not consume Claude Code plugin marketplaces, so there is no extra Claude-plugin setup for them. Use the same CLI directly in those tools instead, for example `npx -y @mnvsk97/skill-check@latest lint ./my-skill`, or install the package in the project and ask the agent to run `skill-check lint ./my-skill`.

See [docs/claude-plugin.md](docs/claude-plugin.md) for marketplace layout, install scopes, setup behavior, and troubleshooting.

## Quick start

```bash
# Lint a skill directory (SKILL.md must be present)
skill-check lint ./my-skill

# Lint with JSON output for CI
skill-check lint ./my-skill --format json
```

### Example output

```
✖  ERROR  SKILL.md            `name` field is missing  (schema.missing_name)
⚠  WARN   SKILL.md            description is only 8 chars — aim for 20+  (desc.too_short)
✖  ERROR  scripts/deploy.sh   Script is not marked executable  (scripts.not_executable)
⚠  WARN   SKILL.md            Toxic-flow: skill has read + write + network tools  (security.toxic_flow)

  FAILED  2 errors, 2 warnings
  Skill root: /path/to/my-skill
```

---

## Release

Publishes are handled by GitHub Actions.

1. Use Node 22+ locally (`nvm use 22`).
2. Bump the version in `package.json` using `npm version patch|minor|major`.
3. Push the commit and tag with `git push origin main --follow-tags`.

The publish workflow runs on `v*` tags, rebuilds the package, runs tests, verifies `npm pack --dry-run`, and then publishes to npm. The `NPM_TOKEN` repository secret must be configured in GitHub before the first release.

## Commands

### `lint [path]`

Runs static checks against a skill. No API keys required.

```
skill-check lint [path] [options]

Arguments:
  path          Skill directory or SKILL.md path (defaults to cwd)

Options:
  -f, --format  Output format: pretty (default) | json
  --no-security Skip security checks
```

**Exit code:** `0` = passed (errors only; warnings don't fail), `1` = one or more errors.

### `scan [path]` _(planned)_

LLM-powered security scan. Uses Claude to detect prompt injection, tool poisoning, and split-file attacks that static patterns miss. Requires `ANTHROPIC_API_KEY`.

### `assert <suite>` _(planned)_

Validates a trace file against a YAML assertion suite. Used in CI after recording a live run.

### `record <suite>` _(planned)_

Runs a skill against a real agent and captures a normalized trace. The trace can then be replayed with `assert`.

---

## Lint rules

Six rule families covering schema, description quality, file references, scripts, and security. See [docs/lint-rules.md](docs/lint-rules.md) for the full reference.

| Family | What it checks |
|---|---|
| `schema.*` | Frontmatter structure (name, description, allowed-tools) |
| `desc.*` | Description quality and body content |
| `files.*` | File reference existence and path safety |
| `scripts.*` | Executable bit, shebang, non-empty |
| `security.*` | Injection patterns, secrets, tool capability analysis |

---

## Assertion suite format

Assertion suites are YAML files validated against [`spec/assertion-schema.json`](spec/assertion-schema.json).

```yaml
version: "0.1"
suite: "my-skill-tests"

tests:
  - id: "happy_path"
    kind: "end_to_end"
    prompt: "Do the thing"
    steps:
      - "preflight"
      - "action"
    outcome: "pass"
```

See [`examples/cloud-deploy/suite.yaml`](examples/cloud-deploy/suite.yaml) for a full working example.

---

## Trace format

Traces are JSON files following [`spec/trace-schema.json`](spec/trace-schema.json). Events are grouped into eight families:

- `lifecycle.*` — harness events (install, sandbox, test lifecycle)
- `skill.*` — routing events (discovered, matched, activated)
- `hook.*` — workflow step events (started, succeeded, failed, skipped)
- `tool.*` — tool/function call events
- `command.*` — shell command events
- `file.*` — filesystem events
- `api.*` — external API call events
- `outcome.*` — final result events

See [`spec/event-families.md`](spec/event-families.md) for the full reference.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
