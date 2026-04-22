# Lint rules

Every finding has a `rule` field in the format `<family>.<name>`. Errors (`severity: "error"`) fail the lint. Warnings and info findings are advisory.

---

## Lint runtime rules — `lint.*`

These are top-level lint failures that happen before rule-specific checks can run.

### `lint.skill_not_found` _(error)_
The provided path does not exist or does not contain a `SKILL.md`.

### `lint.parse_error` _(error)_
`SKILL.md` was found, but the YAML frontmatter could not be parsed.

---

## Schema rules — `schema.*`

These check that the SKILL.md frontmatter satisfies the agentskills.io skill contract.

### `schema.no_frontmatter` _(error)_
SKILL.md has no YAML `---` block at all.

**Fix:** Add a frontmatter block:
```yaml
---
name: my-skill
description: What this skill does
---
```

### `schema.missing_name` _(error)_
The `name` field is absent or empty.

**Fix:** Add `name: <slug>` to your frontmatter.

### `schema.invalid_name` _(error)_
`name` is not a valid slug. Slugs must start with a lowercase letter and contain only lowercase letters, numbers, hyphens (`-`), or underscores (`_`).

**Examples:** `cloud-deploy` ✔, `My Skill` ✖, `1st-skill` ✖

### `schema.missing_desc` _(error)_
The `description` field is absent or empty.

**Fix:** Add `description: <one-line summary>` to your frontmatter.

### `schema.allowed_tools_type` _(error)_
`allowed-tools` is present but is not an array of non-empty strings.

**Fix:**
```yaml
allowed-tools:
  - Read
  - Bash
  - mcp__myserver__my_tool
```

### `schema.invalid_version` _(warn)_
`version` is present but doesn't look like a semver-style version (`1`, `1.0`, `1.0.0`, `1.0.0-beta.1`).

---

## Description rules — `desc.*`

These check that the skill provides enough context for routing agents to activate it correctly.

### `desc.too_short` _(warn)_
The `description` field is under 20 characters. Routing models use the description to match user intent — a description that is too vague will cause the skill to miss activations or activate incorrectly.

### `desc.no_body` _(warn)_
SKILL.md has no body content after the frontmatter. The body is the skill's instruction set — without it the agent has nothing to act on.

### `desc.body_too_short` _(warn)_
The body is under 50 characters. This is unlikely to contain meaningful instructions.

### `desc.missing_h1` _(info)_
No `# Heading` in the body. A clear title makes the document easier to navigate and helps the routing agent confirm it loaded the right skill.

---

## File reference rules — `files.*`

### `files.ref_not_found` _(error)_
A relative path referenced in the SKILL.md body (Markdown link or backtick path) doesn't exist on disk.

**Fix:** Check the path is correct and the file is committed.

### `files.outside_root` _(error)_
A referenced path escapes the skill root (e.g. `../../../etc/passwd`). Skills must be self-contained; references outside the skill directory are a security risk.

---

## Script rules — `scripts.*`

These apply to every script file found anywhere in the skill directory tree.

### `scripts.not_executable` _(warn)_
A `.sh` / `.bash` file is not marked executable.

**Fix:** `chmod +x scripts/deploy.sh`

### `scripts.missing_shebang` _(warn)_
A shell script has no shebang line (`#!/usr/bin/env bash`). Without a shebang the shell may not be selected correctly when the agent executes the script.

### `scripts.empty_script` _(warn)_
A script file exists but contains no content.

---

## Security — static patterns — `security.*`

These checks scan all text files in the skill directory for dangerous patterns. **All checks are offline** — no API keys required.

### `security.prompt_injection` _(error)_
A text file (especially SKILL.md) contains a phrase known to be used in prompt injection attacks:
- "ignore previous instructions"
- "disregard / forget all prior"
- "you are now a / act as a different"
- DAN / jailbreak patterns
- HTML comment hidden instructions

A legitimate skill has no reason to ask the agent to ignore its instructions.

### `security.exfil_url` _(error/warn)_
A file contains `curl` or `wget` pointing to an external URL (error), or a suspicious URL with data-bearing query parameters (warn).

### `security.hardcoded_secret` _(error)_
A file contains a literal credential: API key, AWS access key (`AKIA...`), GitHub personal access token (`ghp_...`), or Slack bot token (`xoxb-...`).

**Fix:** Use environment variables or a secrets manager instead.

### `security.toxic_flow` _(warn)_
The skill's `allowed-tools` includes all three capability legs simultaneously:
1. **Read** — can access sensitive data (files, env vars, memory)
2. **Write/exec** — can modify system state or run arbitrary commands
3. **Network** — can exfiltrate data or fetch remote instructions

When all three are present, a compromised or malicious skill can: read a secret → encode it → send it to an attacker-controlled server. Review whether all three are genuinely required.

Note: `Bash` alone counts as all three legs (it can do everything).

### `security.overly_broad_tools` _(error)_
`allowed-tools` contains a wildcard (`*`) or the string `ALL`. Skills must declare only the specific tools they need — broad grants make security analysis impossible and create excessive attack surface.

### `security.cross_skill_tools` _(warn)_
`allowed-tools` includes MCP tools whose namespace appears to belong to a different skill (e.g. `mcp__cloud_logs__get_logs` in a skill named `cloud-deploy`). This is a potential **tool-shadowing** vector: one skill's instructions could modify how another skill behaves.
