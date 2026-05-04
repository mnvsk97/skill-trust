# Launch Plan

This plan covers the public launch of `@mnvsk97/skill-trust` `0.3.0`.

## Launch Goal

Ship `skill-trust` as the vetting and recommendation layer for the skills.sh agent-skill ecosystem. The launch should make it clear that teams can lint, scan, vet, score, find, recommend, record, and assert skills from one CLI.

## Audience

- Skill authors who want fast local checks before publishing a skill
- Teams evaluating third-party skills before installing them
- Maintainers who want CI-friendly trust scorecards and trace assertions

## Scope

Launch includes:

- npm package `@mnvsk97/skill-trust`
- Installed binary `skill-trust`
- README install, quick start, command reference, and release instructions
- Docs under `docs/`
- GitHub Actions CI and npm publish workflow

Launch does not require:

- Live LLM scan coverage in default CI
- Docker-backed `record` runs in default CI
- Provider-specific presets beyond OpenAI-compatible endpoint configuration

## Go/No-Go Gates

All gates must pass before tagging a release:

- `npm run launch:check` passes on Node 22
- CI is green on `main`
- `CHANGELOG.md` has a dated entry for the version being tagged
- `README.md` install command, binary name, and package name match `package.json`
- `npm pack --dry-run` includes only the intended package files
- GitHub repository secret `NPM_TOKEN` is configured

## Pre-Launch Checklist

1. Confirm version in `package.json`, `package-lock.json`, `src/cli.ts`, and `skill/SKILL.md`.
2. Run `npm ci` on Node 22.
3. Run `npm run launch:check`.
4. Run `node dist/cli.js --help` and confirm all launch commands are listed.
5. Run `node dist/cli.js lint examples/cloud-deploy --format json`.
6. Review `npm pack --dry-run` output for accidental files.
7. Confirm `CHANGELOG.md` has the target release date.

## Launch Steps

1. Merge the launch-ready branch to `main`.
2. Create the version commit and tag with `npm version patch`, `npm version minor`, or `npm version major`.
3. Push `main` and tags with `git push origin main --follow-tags`.
4. Confirm the publish workflow completes successfully.
5. Confirm the package is available with `npm view @mnvsk97/skill-trust version`.
6. Create a GitHub release from the tag using the changelog entry.

## Post-Launch Checks

Run these after npm publish:

```bash
npx @mnvsk97/skill-trust@latest --version
npx @mnvsk97/skill-trust@latest lint ./examples/cloud-deploy
npx @mnvsk97/skill-trust@latest recommend "React performance"
```

For scan verification, use an OpenAI-compatible endpoint:

```bash
LLM_API_KEY=... LLM_API_URL=https://api.openai.com/v1 LLM_MODEL=... \
  npx @mnvsk97/skill-trust@latest scan ./skill
```

## Rollback

If the package is broken after publish:

1. Deprecate the bad npm version with a message pointing to the last good version.
2. Fix forward in a patch release.
3. Update the GitHub release notes with the replacement version.

Do not delete published versions unless the package contains secrets or legally sensitive material.
