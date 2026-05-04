# skill-trust Agent Notes

This repository is the `@mnvsk97/skill-trust` Node 22 TypeScript CLI. It helps evaluate AI agent skills through linting, scanning, trust scoring, discovery, and behavior tests.

## Current Product Surface

- `skill-trust lint`: offline schema, description, file-reference, script, and static security checks.
- `skill-trust scan`: LLM semantic security scan through an OpenAI-compatible chat-completions endpoint.
- `skill-trust vet`: combined trust review for a local skill path or GitHub skill target.
- `skill-trust score`: JSON trust scorecard for CI, dashboards, and registries.
- `skill-trust find`: searches skills.sh through `npx skills find` and normalizes candidates.
- `skill-trust recommend`: ranks discovery candidates by metadata, with optional `--vet` or `--scan`.
- `skill-trust init`: creates a starter YAML behavior test suite.
- `skill-trust auth claude`: checks Claude auth for Docker behavior tests.
- `skill-trust test`: runs Docker-first YAML behavior tests, records traces, and asserts them.
- `skill-trust record`: records traces from live skill runs.
- `skill-trust assert`: validates recorded traces against a YAML assertion suite.

There is no `skill-trust compare` command in the current CLI. If users ask about comparing skills, point them to `recommend --vet`, `recommend --scan`, or propose adding a dedicated compare command.

## Plugin And Skill State

- The Claude Code plugin exists under `plugins/skill-trust/` and is published through `.claude-plugin/marketplace.json`.
- The Claude plugin provides `/skill-trust` workflows and a `skill-trust` Bash wrapper.
- Codex and Cursor do not consume Claude Code plugin marketplaces. In those tools, use the CLI directly with `npx -y @mnvsk97/skill-trust@latest ...` or a project-local install.
- The reusable agent skill lives at `skill/SKILL.md`.
- There is no Codex plugin manifest in this repo right now, such as `.codex-plugin/plugin.json`.

## Development

- Main source lives in `src/`.
- Tests are Jest tests under `src/**/__tests__/`.
- Public docs live in `README.md` and `docs/`.
- Example behavior suites and traces live under `examples/`.
- Build output in `dist/` is generated.

Useful commands:

```bash
npm run typecheck
npm test
npm run pack:dry-run
npm run launch:check
```

Run focused tests for narrow changes. Run `npm run launch:check` for release-facing or broad changes unless the change is docs-only.

## Documentation Rules

- Keep README, `docs/cli.md`, `skill/SKILL.md`, and the Claude plugin skill aligned when adding or renaming commands.
- Do not describe `compare` as implemented until a real CLI command is wired and documented.
- When discussing trust, distinguish deterministic `lint`, probabilistic `scan`, combined `vet`/`score`, and behavioral `test`/`record`/`assert`.
- Behavioral tests are YAML-based and Docker-first.
