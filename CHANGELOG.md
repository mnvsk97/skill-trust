# Changelog

All notable changes to skill-check are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### In progress
- `scan` command — LLM-powered semantic security analysis
- `assert` command — trace validation against YAML assertion suites
- `record` command — live skill execution trace capture

---

## [0.1.0] — 2026-04-21

Initial release.

### Added
- `skill-check lint` command — fully offline static checks
  - `schema.*` — frontmatter validation (name, description, allowed-tools, version)
  - `desc.*` — description quality checks (length, body presence, H1 heading)
  - `files.*` — file reference validation (existence, no path traversal)
  - `scripts.*` — script file validation (executable bit, shebang, non-empty)
  - `security.prompt_injection` — static pattern scan for injection phrases
  - `security.exfil_url` — curl/wget and suspicious URL detection
  - `security.hardcoded_secret` — credential literal detection (AWS, GitHub, Slack)
  - `security.toxic_flow` — tool capability trifecta analysis
  - `security.overly_broad_tools` — wildcard/ALL tool grant detection
  - `security.cross_skill_tools` — cross-skill namespace tool shadowing detection
- `--format json` output for CI integrations
- `--no-security` flag for fast schema-only checks
- Normalized trace schema (`spec/trace-schema.json`)
- Assertion suite schema (`spec/assertion-schema.json`)
- Event families reference (`spec/event-families.md`)
- Example cloud deploy skill + passing/failing test suites + traces
- Full documentation in `docs/`
