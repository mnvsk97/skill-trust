# skill-trust Claude Notes

This repo contains `@mnvsk97/skill-trust`, a Node 22 TypeScript CLI for checking whether AI agent skills are safe, useful, and behaviorally correct.

## Use The Real Command Surface

Current commands:

- `lint`: offline static checks.
- `scan`: LLM semantic security review.
- `vet`: trust verdict for a local or GitHub skill target.
- `score`: JSON trust scorecard.
- `find`: skills.sh discovery.
- `recommend`: ranked candidates, optionally with `--vet` or `--scan`.
- `init`: starter YAML behavior suite.
- `auth claude`: Claude auth preflight for behavior tests.
- `test`: Docker-first YAML behavior tests.
- `record`: live trace recording.
- `assert`: replay recorded traces against YAML assertions.

There is no implemented `compare` command. If someone asks to compare skills, use `recommend --vet` or `recommend --scan`, or add a proper `compare` command as a feature.

## Claude Code Plugin

The Claude Code plugin is present:

- Marketplace: `.claude-plugin/marketplace.json`
- Plugin source: `plugins/skill-trust/`
- Plugin skill: `plugins/skill-trust/skills/skill-trust/SKILL.md`
- Wrapper: `plugins/skill-trust/bin/skill-trust`

The plugin adds `/skill-trust` workflows and a `skill-trust` Bash wrapper for Claude Code. It is Claude-specific. Codex and Cursor should run the CLI directly, for example:

```bash
npx -y @mnvsk97/skill-trust@latest lint ./my-skill
```

The reusable non-plugin skill lives at `skill/SKILL.md`.

## Validation

Use these commands when changing implementation:

```bash
npm run typecheck
npm test
npm run pack:dry-run
```

Use `npm run launch:check` for broad or release-facing changes. Documentation-only changes generally do not require the full launch check.

## Keep Docs Aligned

When changing commands or behavior, update the relevant surfaces together:

- `README.md`
- `docs/cli.md`
- `docs/assertion-suite.md` or `docs/security.md` when relevant
- `skill/SKILL.md`
- `plugins/skill-trust/skills/skill-trust/SKILL.md`
- Plugin tests under `src/plugin/__tests__/` when plugin layout or behavior changes
