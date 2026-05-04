# Claude Code plugin

The repository includes the official Claude Code plugin for `skill-check`. It is distributed through the repo-hosted marketplace at `.claude-plugin/marketplace.json` and the plugin source at `plugins/skill-check/`.

## What the plugin provides

- `/skill-check setup` — verifies Node.js, checks the CLI wrapper, finds a skill path, and runs an initial lint.
- `/skill-check lint [path]` — runs the offline linter and explains findings.
- `/skill-check assert <suite.yaml>` — validates recorded traces against an assertion suite.
- `/skill-check record <suite.yaml>` — runs the Docker-backed recording workflow and can assert afterward.
- `/skill-check build-spec` — guides the user through creating a minimal assertion suite YAML file.
- `skill-check` Bash wrapper — available while the plugin is enabled. It prefers a local `@mnvsk97/skill-check` repository build, then a project-local install, then `npx -y @mnvsk97/skill-check@latest`.

## Install from GitHub

Add the marketplace, then install the plugin:

```bash
claude plugin marketplace add mnvsk97/skill-trust
claude plugin install skill-check@skill-check
```

Restart Claude Code after installation so the plugin skill and wrapper are loaded.

## Install from a local checkout

Use this flow while developing the plugin or testing a PR:

```bash
git clone https://github.com/mnvsk97/skill-trust.git
cd skill-trust
claude plugin validate .
claude plugin marketplace add .
claude plugin install skill-check@skill-check
```

If you already added the marketplace, refresh it before reinstalling or updating:

```bash
claude plugin marketplace update skill-check
claude plugin install skill-check@skill-check --scope local
```

## Usage

Run the plugin skill from Claude Code:

```text
/skill-check setup ./my-skill
/skill-check lint ./my-skill
/skill-check lint ./my-skill --format json
/skill-check assert ./suite.yaml --trace ./trace.json
/skill-check record ./suite.yaml --test happy_path --assert
/skill-check build-spec
```

The setup workflow is intentionally conservative. It checks Node.js 22+, confirms the wrapper can run, locates the target `SKILL.md`, and runs `skill-check lint`. If you want persistent npm scripts, ask the plugin to add them after setup.

By default, the wrapper falls back to `@mnvsk97/skill-check@latest` from npm. To test an unreleased CLI build, install it in the current project or set `SKILL_CHECK_PACKAGE_SPEC` before launching Claude Code:

```bash
export SKILL_CHECK_PACKAGE_SPEC='github:mnvsk97/skill-trust'
```

## Cursor and Codex compatibility

The `.claude-plugin/` marketplace and `/skill-check` command are Claude Code-specific. Cursor and Codex do not install or run Claude Code plugin manifests, so there is no extra Claude-plugin step for those environments.

Use the same `skill-check` CLI directly instead:

```bash
npx -y @mnvsk97/skill-check@latest lint ./my-skill
```

For a persistent setup in Cursor, Codex, CI, or any other agent workflow, install the package in the project and add scripts such as:

```json
{
  "scripts": {
    "skill-check:lint": "skill-check lint ./my-skill",
    "skill-check:lint:json": "skill-check lint ./my-skill --format json"
  }
}
```

If you are using Codex skills or Cursor rules, point those instructions at the CLI commands above. The Claude Code plugin is optional and only adds Claude Code-native command routing and a wrapper on Claude Code's plugin `PATH`.

## Marketplace layout

```text
.
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── skill-check/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── bin/
        │   └── skill-check
        └── skills/
            └── skill-check/
                └── SKILL.md
```

The marketplace entry points to `./plugins/skill-check`, so it works when the marketplace is added from a Git checkout or a GitHub repository. Do not add the raw `marketplace.json` URL when using this repo layout, because relative plugin sources need the full repository checkout.

## Validation

Before releasing plugin changes, run:

```bash
claude plugin validate .
npm test -- --runTestsByPath src/plugin/__tests__/claude-plugin.test.ts
npm run launch:check
```

If `claude plugin validate` is not available in your Claude Code version, run the Jest plugin layout test and verify the JSON manifests manually.

## Troubleshooting

- **`/skill-check` does not appear:** restart Claude Code after installing the plugin and run `claude plugin list --available --json` to confirm the plugin is enabled.
- **`skill-check` is not on `PATH`:** restart Claude Code, then retry. As a fallback, run `npx -y @mnvsk97/skill-check@latest <command>`.
- **The wrapper resolves an older npm release:** install the desired CLI in the project or set `SKILL_CHECK_PACKAGE_SPEC` to the npm, GitHub, or file package source to run.
- **Marketplace add fails:** verify `.claude-plugin/marketplace.json` exists and run `claude plugin validate .` from the repository root.
- **Record fails before running tests:** start Docker and export `ANTHROPIC_API_KEY` before using `/skill-check record`.
