# CLI reference

## `skill-trust init`

Creates a starter `skill-test.yaml` for Docker-first behavior tests.

```
skill-trust init --skill my-skill
```

The generated suite includes explicit activation, implicit activation, contextual activation, negative activation, and a happy-path end-to-end test.

---

## `skill-trust auth claude`

Checks whether Claude behavior tests can authenticate without logging in inside Docker.

```
skill-trust auth claude
```

Supported auth inputs are `CLAUDE_CODE_OAUTH_TOKEN` for subscription auth and `ANTHROPIC_API_KEY` for API auth.

---

## `skill-trust test [suite]`

Runs scripted behavior tests in Docker, records traces, and asserts the generated traces.

```
skill-trust test
skill-trust test ./skill-test.yaml --parallel 4
skill-trust test --run-in-band
skill-trust test --test deploy_happy_path
```

When no suite path is provided, `test` looks for `skill-test.yaml`. Default parallelism is `min(cpu count, 4)` locally and `2` in CI. `--run-in-band` runs serially and is equivalent to `--parallel 1`.

---

## `skill-trust lint [path]`

Runs static checks against a skill. **Completely offline** — no API keys required.

```
skill-trust lint [path] [options]
```

**Arguments**

| Argument | Description |
|---|---|
| `path` | Skill directory containing `SKILL.md`, or an explicit path to `SKILL.md`. Defaults to the current working directory. |

**Options**

| Option | Default | Description |
|---|---|---|
| `-f, --format <format>` | `pretty` | Output format. `pretty` = coloured human-readable output. `json` = machine-readable JSON. |
| `--no-security` | _false_ | Skip all security checks (static patterns + structural analysis). Useful for quick schema validation in tight loops. |

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | No errors (warnings may still be present) |
| `1` | One or more error-severity findings |

**JSON output shape**

```json
{
  "skillRoot": "/absolute/path/to/skill",
  "passed": false,
  "findings": [
    {
      "rule": "schema.missing_name",
      "severity": "error",
      "message": "Frontmatter is missing required field `name`.",
      "file": "SKILL.md"
    }
  ]
}
```

---

## `skill-trust scan [path]`

LLM-powered semantic security scan. Uses an OpenAI-compatible chat-completions endpoint to detect:

- Prompt injection that static patterns miss (e.g. encoded instructions, split-file attacks)
- Tool poisoning in MCP tool descriptions
- Semantic exfiltration that looks legitimate

```
skill-trust scan [path] [options]
```

**Environment**

| Variable | Description |
|---|---|
| `LLM_API_KEY` | API key for the OpenAI-compatible endpoint. `OPENAI_API_KEY` is accepted as a fallback. |
| `LLM_API_URL` | Base URL, for example `https://api.openai.com/v1`. `OPENAI_BASE_URL` is accepted as a fallback. |
| `LLM_MODEL` | Model slug to send to the endpoint. Can be overridden with `--model`. |

**Options**

| Option | Default | Description |
|---|---|---|
| `-f, --format <format>` | `pretty` | Output format: `pretty` or `json`. |
| `--model <model>` | `LLM_MODEL` | Override the model for this scan. |
| `--skill <name>` | _none_ | Skill name when scanning a GitHub repo target. |

---

## `skill-trust vet <target>`

Runs a trust review for one local skill or GitHub skill target.

```
skill-trust vet ./my-skill
skill-trust vet vercel-labs/agent-skills@vercel-react-best-practices
skill-trust vet ./my-skill --scan
```

`vet` runs `lint` by default, computes safety/quality/provenance components, and returns a verdict:

| Verdict | Meaning |
|---|---|
| `recommended` | Strong enough to use based on enabled checks. |
| `review` | No hard block, but a human should inspect the reasons. |
| `blocked` | Error-level or hard security finding. |

**Options**

| Option | Default | Description |
|---|---|---|
| `--scan` | _false_ | Include semantic LLM scan. Requires LLM environment. |
| `--model <model>` | `LLM_MODEL` | Override the model when `--scan` is used. |
| `--skill <name>` | _none_ | Skill name when vetting a GitHub repo target. |
| `-f, --format <format>` | `pretty` | Output format: `pretty` or `json`. |

---

## `skill-trust score <target>`

Machine-readable trust review for CI, dashboards, or registry ingestion.

```
skill-trust score ./my-skill
skill-trust score vercel-labs/agent-skills@vercel-react-best-practices
```

Always emits JSON.

---

## `skill-trust find <query>`

Searches skills.sh through `npx skills find <query>` and normalizes results.

```
skill-trust find "React performance"
```

This command does discovery only. Use `recommend` to rank candidates or `vet` to inspect a specific candidate.

---

## `skill-trust recommend <query>`

Ranks skills.sh search candidates by install count and source reputation.

```
skill-trust recommend "React performance"
skill-trust recommend "React performance" --vet
skill-trust recommend "React performance" --scan --limit 3
```

Default recommendation is metadata-only. `--vet` fetches and inspects the top candidates before ranking. `--scan` runs the same file-level vetting plus semantic LLM review.

**Options**

| Option | Default | Description |
|---|---|---|
| `--vet` | _false_ | Vet top candidates without LLM scan. |
| `--scan` | _false_ | Vet top candidates with LLM scan. Requires LLM environment. |
| `--limit <n>` | `3` | Number of candidates to vet/scan. |
| `--model <model>` | `LLM_MODEL` | Override the scan model. |
| `-f, --format <format>` | `pretty` | Output format: `pretty` or `json`. |

---

## `skill-trust assert <suite>`

Validates a pre-recorded trace file against a YAML assertion suite.

```
skill-trust assert ./suite.yaml --trace ./my-trace.json
```

Use this in CI to check that a recorded skill run met its behavioral contract.

---

## `skill-trust record <suite>`

Runs the skill against a real Claude agent and captures a normalized trace.

```
skill-trust record ./suite.yaml --test happy_path
```

The trace can then be committed and replayed with `assert`.
