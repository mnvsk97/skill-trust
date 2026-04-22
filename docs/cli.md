# CLI reference

## `skill-check lint [path]`

Runs static checks against a skill. **Completely offline** — no API keys required.

```
skill-check lint [path] [options]
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

## `skill-check scan [path]` _(planned)_

LLM-powered semantic security scan. Uses Claude to detect:

- Prompt injection that static patterns miss (e.g. encoded instructions, split-file attacks)
- Tool poisoning in MCP tool descriptions
- Semantic exfiltration that looks legitimate

**Requires** `ANTHROPIC_API_KEY` environment variable.

---

## `skill-check assert <suite>` _(planned)_

Validates a pre-recorded trace file against a YAML assertion suite.

```
skill-check assert ./suite.yaml --trace ./my-trace.json
```

Use this in CI to check that a recorded skill run met its behavioral contract.

---

## `skill-check record <suite>` _(planned)_

Runs the skill against a real Claude agent and captures a normalized trace.

```
skill-check record ./suite.yaml --test happy_path
```

The trace can then be committed and replayed with `assert`.
