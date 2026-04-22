# Contributing to skill-check

Thanks for your interest in contributing! skill-check is an open framework — contributions of new lint rules, security patterns, assertion types, and example suites are all welcome.

## Project structure

```
skill-check/
├── src/
│   ├── cli.ts                    # CLI entry point (commander)
│   ├── types.ts                  # Shared TypeScript types
│   └── lint/
│       ├── index.ts              # lint command entrypoint
│       ├── parse.ts              # SKILL.md parser
│       ├── reporter.ts           # Terminal output formatting
│       └── checks/
│           ├── schema.ts         # Frontmatter schema validation
│           ├── description.ts    # Description quality checks
│           ├── files.ts          # File reference validation
│           ├── scripts.ts        # Script file validation
│           └── security/
│               ├── static.ts     # Pattern-based security scan
│               └── structural.ts # Tool capability graph analysis
├── spec/
│   ├── trace-schema.json         # Normalized trace envelope schema
│   ├── assertion-schema.json     # Test suite assertion schema
│   └── event-families.md         # Event type reference
└── examples/
    └── cloud-deploy/             # End-to-end example suite
```

## Development setup

```bash
git clone https://github.com/mnvsk97/skill-check
cd skill-check
npm install
npm run build      # compile TypeScript
npm test           # run jest tests
npm run dev -- lint ./examples/cloud-deploy  # run CLI in dev mode
```

## Adding a lint rule

1. **Pick the right check file.** Add to an existing file in `src/lint/checks/` or create a new one.
2. **Choose a rule ID.** Format: `<family>.<rule_name>`, e.g. `schema.missing_license`.
3. **Return a `LintFinding`.** Use `severity: "error"` for things that break the spec; `"warn"` for best-practice violations; `"info"` for suggestions.
4. **Register the check** in `src/lint/index.ts` if you created a new file.
5. **Write tests** in `src/lint/__tests__/`. Tests are jest; keep them unit-focused and offline.
6. **Document the rule** in the README lint-rules table.

### Rule severity guide

| Severity | When to use |
|---|---|
| `error` | Spec violation, security risk, or broken reference — CI _must_ fail |
| `warn` | Best-practice violation — CI _may_ fail depending on config |
| `info` | Suggestion — never fails CI |

## Adding an example

Drop a `suite.yaml` and fixture + trace files under `examples/<skill-name>/`. Follow the pattern in `examples/cloud-deploy/`.

## Schemas

The schemas in `spec/` are the source of truth. Do not change them without a discussion — downstream tools validate against these.

## Code style

- TypeScript strict mode throughout
- ESM (`"type": "module"`) — all local imports must use `.js` extension
- No default exports (named exports only)
- Keep each check file focused on one concern

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] New rules have test coverage
- [ ] New rules are documented in README
- [ ] No new dependencies without justification
