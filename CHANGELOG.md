# Changelog

All notable changes to skill-trust are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

No unreleased changes yet.

---

## [0.3.0] — 2026-05-03

### Added
- `scan` command for OpenAI-compatible LLM semantic security analysis.
- `vet` command for local or GitHub skill trust reviews.
- `score` command for machine-readable trust scorecards.
- `find` command that normalizes `npx skills find` results.
- `recommend` command that ranks skills.sh candidates by metadata signals.
- Remote GitHub target support for `vet`, `score`, and `scan` using `<owner/repo@skill>`.

### Changed
- CLI version now reports `0.3.0`.
- Documentation now positions skill-trust as a vetting/recommendation layer on top of skills.sh discovery.

---

## [0.1.0] — 2026-04-21

Initial release.

### Added
- `skill-trust lint` command — fully offline static checks
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
