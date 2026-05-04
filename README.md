# skill-trust

**Trust checks and recommendations for the [skills.sh](https://skills.sh) agent-skill ecosystem.**

`skill-trust` helps teams decide which AI agent skills are safe and worth installing. It complements `npx skills`: the Skills CLI discovers and installs skills; `skill-trust` vets, scores, scans, and recommends them.

The CLI is organized around five workflows:

| Workflow | Command | What it answers |
|---|---|---|
| **Behavior testing** | `skill-trust init`, `skill-trust test` | Does this skill activate and behave correctly in an isolated run? |
| **Lint** | `skill-trust lint` | Does this skill have schema, quality, script, or static security problems? |
| **Scan** | `skill-trust scan` | Does an LLM reviewer see semantic security risk? |
| **Vet / Score** | `skill-trust vet`, `skill-trust score` | Is this skill recommended, review-first, or blocked? |
| **Discovery** | `skill-trust find`, `skill-trust recommend` | Which candidate skills look worth considering? |
| **Behavior internals** | `skill-trust record`, `skill-trust assert` | Did a recorded trace match its contract? |

`lint`, `vet`, `score`, `find`, `recommend`, `assert`, and `record` run without an LLM key by default. `scan`, `vet --scan`, and `recommend --scan` use an OpenAI-compatible chat-completions endpoint.

---

## Install

```bash
npm install -g @mnvsk97/skill-trust
# or run without installing:
npx @mnvsk97/skill-trust lint ./my-skill
```

The installed binary is still `skill-trust`.

## Claude Code plugin

This repository also ships the official Claude Code plugin for `skill-trust`. The plugin adds a `/skill-trust` skill and a `skill-trust` Bash wrapper so Claude can set up the CLI, lint/vet skills, initialize behavior suites, run Docker-first tests, run assertion suites, and record traces from inside Claude Code.

Install it from this repo-hosted marketplace:

```bash
claude plugin marketplace add mnvsk97/skill-trust
claude plugin install skill-trust@skill-trust
```

For local development or PR testing, install from a checkout instead:

```bash
claude plugin validate .
claude plugin marketplace add .
claude plugin install skill-trust@skill-trust
```

Restart Claude Code after installing the plugin, then run:

```text
/skill-trust setup ./my-skill
/skill-trust init --skill my-skill
/skill-trust test ./skill-test.yaml --run-in-band
/skill-trust lint ./my-skill
/skill-trust vet ./my-skill
/skill-trust assert ./suite.yaml
/skill-trust record ./suite.yaml --assert
```

Cursor and Codex do not consume Claude Code plugin marketplaces, so there is no extra Claude-plugin setup for them. Use the same CLI directly in those tools instead, for example `npx -y @mnvsk97/skill-trust@latest lint ./my-skill`, or install the package in the project and ask the agent to run `skill-trust lint ./my-skill`.

See [docs/claude-plugin.md](docs/claude-plugin.md) for marketplace layout, install scopes, setup behavior, and troubleshooting.

## Quick start

```bash
# Lint a skill directory (SKILL.md must be present)
skill-trust lint ./my-skill

# Create and run a Docker-first behavior test suite
skill-trust init --skill my-skill
skill-trust auth claude
skill-trust test

# Review a local skill and return a trust verdict
skill-trust vet ./my-skill

# Search skills.sh and rank candidates by metadata
skill-trust recommend "React performance"

# Lint with JSON output for CI
skill-trust lint ./my-skill --format json
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

1. Use Node 22 locally (`nvm install 22 && nvm use 22`).
2. Run `npm run launch:check`.
3. Bump the version in `package.json` using `npm version patch|minor|major`.
4. Push the commit and tag with `git push origin main --follow-tags`.

The publish workflow runs on `v*` tags, rebuilds the package, runs tests, verifies `npm pack --dry-run`, and then publishes to npm. The `NPM_TOKEN` repository secret must be configured in GitHub before the first release.

See [docs/launch.md](docs/launch.md) for the full launch checklist.

## Commands

### `lint [path]`

Runs static checks against a skill. No API keys required.

```
skill-trust lint [path] [options]

Arguments:
  path          Skill directory or SKILL.md path (defaults to cwd)

Options:
  -f, --format  Output format: pretty (default) | json
  --no-security Skip security checks
```

**Exit code:** `0` = passed (errors only; warnings don't fail), `1` = one or more errors.

### `scan [path]`

LLM-powered semantic security scan. Supports OpenAI-compatible APIs.

Required environment:

```bash
export LLM_API_KEY=...
export LLM_API_URL=https://api.openai.com/v1
export LLM_MODEL=...
```

Fallback aliases are supported for OpenAI users:

```bash
OPENAI_API_KEY -> LLM_API_KEY
OPENAI_BASE_URL -> LLM_API_URL
```

### `vet <target>`

Runs a trust review for a local path or GitHub skill target such as `vercel-labs/agent-skills@vercel-react-best-practices`.

```
skill-trust vet ./my-skill
skill-trust vet vercel-labs/agent-skills@vercel-react-best-practices
skill-trust vet ./my-skill --scan
```

Verdicts:

- `recommended` — strong enough to install/use based on enabled checks
- `review` — no hard block, but a human should inspect the reasons
- `blocked` — error-level finding or hard security gate

### `score <target>`

Machine-readable version of `vet` for CI, dashboards, and registries.

### `find <query>`

Runs `npx skills find <query>` and normalizes the result into install commands and optional JSON.

### `recommend <query>`

Ranks search results by metadata signals: install count and source reputation.

```
skill-trust recommend "React performance"
skill-trust recommend "React performance" --vet
skill-trust recommend "React performance" --scan --limit 3
```

Default recommendations are metadata-only. `--vet` fetches and inspects the top candidates without installing them. `--scan` adds LLM semantic review.

### `assert <suite>`

Validates a trace file against a YAML assertion suite. Used in CI after recording a live run.

### `init`

Creates a starter `skill-test.yaml` with explicit activation, implicit activation, contextual activation, negative activation, and end-to-end happy-path tests.

### `auth claude`

Checks whether behavior tests can authenticate Claude. `CLAUDE_CODE_OAUTH_TOKEN` is used for subscription auth and `ANTHROPIC_API_KEY` is used for API auth.

### `test [suite]`

Runs scripted behavior tests in Docker, records traces, and asserts the generated traces in one flow. When no suite is provided, `skill-trust test` looks for `skill-test.yaml`.

```
skill-trust test
skill-trust test --parallel 4
skill-trust test --run-in-band
skill-trust test --test deploy_happy_path
```

Default parallelism is `min(cpu count, 4)` locally and `2` in CI. `--run-in-band` is an alias for serial execution.

### `record <suite>`

Runs a skill against a real agent and captures a normalized trace. The trace can then be replayed with `assert`.

---

## Why lint has text checks

`lint` includes text checks because they are deterministic static signatures, like Semgrep rules: obvious prompt injection phrases, suspicious outbound `curl` patterns, and hardcoded secrets. They are cheap, offline, and CI-safe.

`scan` is separate because it is slower, probabilistic, and requires an LLM endpoint. It is for semantic risks that static signatures miss, such as indirect exfiltration or split-file attacks.

## Lint rules

Six rule families cover schema, description quality, file references, scripts, and security. See [docs/lint-rules.md](docs/lint-rules.md) for the full reference.

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
