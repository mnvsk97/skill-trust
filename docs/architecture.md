# Architecture

## Trust workflow design

```
skill-trust
├── lint     ← offline, no API keys
│   ├── schema check       (SKILL.md frontmatter)
│   ├── description check  (quality of routing signals)
│   ├── file check         (referenced files exist)
│   ├── script check       (executables, shebangs)
│   └── security
│       ├── static scan    (regex pattern library)
│       └── structural     (tool capability graph)
│
├── scan     ← online, OpenAI-compatible LLM endpoint
│   └── semantic analyser  (hidden injection, tool poisoning, exfiltration)
│
├── vet/score ← trust verdicts
│   ├── safety component
│   ├── quality component
│   └── provenance component
│
├── find/recommend ← skills.sh discovery
│   ├── npx skills find adapter
│   ├── install-count signal
│   └── source-reputation signal
│
└── assert/record ← behavior checks
    ├── presence assertions   (hooks.required, files.created, ...)
    ├── absence assertions    (hooks.forbidden, commands.forbidden, ...)
    ├── ordering assertions   (hooks.order, skills.order)
    ├── outcome assertions    (status hard gate, contains soft check)
    └── confidence filtering  (min_confidence gate per assertion)
```

## Current CLI scope

- **`lint`** — offline static checks
- **`scan`** — LLM semantic security analysis
- **`vet` / `score`** — trust review and JSON scorecard
- **`find` / `recommend`** — discovery and metadata ranking over skills.sh results
- **`assert`** — trace validation against YAML suites
- **`record`** — Docker-based trace capture

## Later scope

- **Tester agent** — second Claude agent that simulates a user, drives multi-turn conversations with the target
- **Provider presets** — common LLM endpoint defaults while preserving OpenAI-compatible config
- **Eval mode** — `eval_runs` + `min_pass_rate` for flaky skill testing

## Trace capture

When running `record`, the orchestrator wraps the target agent session with capture hooks:

```
┌─────────────────────────────────────┐
│  Orchestrator (skill-trust record)  │
│                                     │
│  ┌─────────────┐   ┌─────────────┐  │
│  │   Tester    │   │   Target    │  │
│  │   (haiku)   │──▶│   (sonnet)  │  │
│  │  no tools   │◀──│  + skill    │  │
│  └─────────────┘   └──────┬──────┘  │
│                           │         │
│                    capture hooks    │
│                           │         │
│                    ┌──────▼──────┐  │
│                    │    Trace    │  │
│                    │  (JSON)     │  │
│                    └─────────────┘  │
└─────────────────────────────────────┘
```

In the first `record` implementation, the tester agent is replaced by a static seed prompt — one turn only. Multi-turn tester/target conversation arrives in a later phase.

## Assertion engine

`assert` loads a trace file and runs each assertion type independently:

```
trace events
    │
    ▼
filter by min_confidence
    │
    ├── hooks.required  → check each name has hook.started + hook.succeeded
    ├── hooks.forbidden → check no hook.started for forbidden names
    ├── hooks.order     → check subsequence over hook.succeeded events
    ├── files.created   → check file.created event exists per path
    ├── commands.forbidden → check no command.executed matches
    ├── outcome.status  → hard gate: compare outcome event type
    ├── outcome.data    → hard gate: deep-equal outcome.data fields
    └── outcome.contains → soft check: warn if strings missing from message
```

## Event source model

| Source | Description | Typical confidence |
|---|---|---|
| `native` | Directly emitted by the skill/agent runtime via hooks | `high` |
| `shim` | Intercepted by an SDK wrapper (e.g. MCP call shim) | `high` |
| `parsed` | Extracted from agent transcript text by pattern matching | `medium` |
| `manual` | Hand-authored in a trace file for testing | `high` |

`skill.matched` and `skill.activated` are always `parsed` or `shim` in V0.1 and carry `confidence: medium`. They are treated as advisory for CI purposes.

## Key design decisions

**Why separate `lint` and `scan`?**  
`lint` must work offline in air-gapped CI environments with no API keys. LLM-powered checks would break that promise. Keeping them separate lets teams run `lint` always and `scan` only when they have credentials.

**Why does `lint` include text checks?**  
The text checks are deterministic static signatures, not semantic judgement. Known injection phrases, suspicious outbound data transfer, and hardcoded token patterns belong in `lint` because they are cheap and repeatable.

**Why is `skill.activated` advisory?**  
Activation is inferred from file-read events, which produces false positives (agent reads SKILL.md for reference without activating it) and false negatives (some runtimes don't expose file-read telemetry). Use `hooks.required` as the primary behavioral gate.

**Why relative ordering instead of absolute positions?**  
Agents sometimes retry failed tool calls, interleave unrelated tool use between steps, or emit events in bursts. Absolute position assertions would be brittle. Subsequence ordering checks that the logical flow is correct while tolerating implementation variance.

**Why are `outcome.contains` checks warnings, not errors?**  
Model-generated text varies across runs, providers, and versions. A hard assertion on "deployment succeeded" would fail if the model says "deploy completed successfully" instead. The structured `outcome.data` field is the right gate for hard checks; `contains` is best-effort.
