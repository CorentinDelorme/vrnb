# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo (this repo):

```
/
├── GLOSSARY-MAP.md      ← points at one GLOSSARY.md per context
├── docs/adr/            ← system-wide ADRs
└── src/                 ← contexts (apps/, packages/)
    ├── web/
    │   ├── GLOSSARY.md
    │   └── docs/adr/    ← web-specific ADRs
    └── clean/
        ├── GLOSSARY.md   ← exists: apps/clean/GLOSSARY.md
        └── docs/adr/     ← clean-specific ADRs
```

Only contexts that have a `GLOSSARY.md` are listed in `GLOSSARY-MAP.md`. For now only `apps/clean` has one (`apps/clean/GLOSSARY.md`); `apps/web` does not yet have one.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the context's `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
