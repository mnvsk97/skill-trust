# Getting started

## Install

```bash
npm install -g @mnvsk97/skill-check
```

Or use without installing:

```bash
npx @mnvsk97/skill-check lint ./my-skill
```

The installed binary is `skill-check`, so global installs still run as:

```bash
skill-check lint ./my-skill
```

## What is a skill?

A **skill** is a Markdown file (`SKILL.md`) with YAML frontmatter that tells an AI agent how to perform a specialized workflow. Skills live in the [agentskills.io](https://agentskills.io) ecosystem and are loaded by Claude Code and compatible agents.

A minimal skill looks like:

```markdown
---
name: my-skill
description: Deploys my service to the cloud
version: 1.0.0
allowed-tools:
  - Read
  - Bash
---

# My Skill

When the user asks to deploy the service, run `./scripts/deploy.sh`.
```

## Your first lint

Run `skill-check lint` pointing at any directory that contains a `SKILL.md`:

```bash
skill-check lint ./my-skill
```

Passing output:

```
✔  No issues found.
   Skill root: /path/to/my-skill
```

Failing output:

```
✖  ERROR  SKILL.md  `name` field is missing  (schema.missing_name)
⚠  WARN   SKILL.md  description is only 8 chars — aim for 20+  (desc.too_short)

  FAILED  1 error, 1 warning
  Skill root: /path/to/my-skill
```

Exit code is `1` when there are errors. Warnings alone do not fail the lint.

## Current scope

`skill-check@0.1.0` currently ships the offline `lint` command.

The docs also include the planned trace/assertion formats for future `assert`, `record`, and `scan` commands, but those commands are not available in the CLI yet.

## CI integration

```yaml
# .github/workflows/skill-check.yml
- name: Lint skill
  run: npx @mnvsk97/skill-check lint . --format json > lint-result.json
  working-directory: ./my-skill
```

## Next steps

- [CLI reference](cli.md) — all flags and options
- [Lint rules](lint-rules.md) — every rule, why it exists, how to fix it
- [Assertion suites](assertion-suite.md) — planned dynamic skill behaviour checks
