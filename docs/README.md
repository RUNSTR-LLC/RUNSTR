# RUNSTR Docs Index

This folder contains implementation guides, architecture notes, and operational references.

## Start Here

1. [`../README.md`](../README.md) — product overview + developer commands
2. [`QUICKSTART.md`](./QUICKSTART.md) — canonical first-run checklist (`prereqs -> env -> pod install -> run`)
3. [`ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md) — `.env` requirements and secrets handling
4. [`HEALTHKIT_XCODE_SETUP.md`](./HEALTHKIT_XCODE_SETUP.md) — iOS capability setup details

## Core Technical References

- [`WORKOUT_ARCHITECTURE.md`](./WORKOUT_ARCHITECTURE.md)
- [`DATA_ARCHITECTURE_AND_CACHING_STRATEGY.md`](./DATA_ARCHITECTURE_AND_CACHING_STRATEGY.md)
- [`PERFORMANCE_GUIDE.md`](./PERFORMANCE_GUIDE.md)
- [`KIND_1301_SPEC.md`](./KIND_1301_SPEC.md)

## Integration Guides

- [`AMBER_INTEGRATION.md`](./AMBER_INTEGRATION.md)
- [`HEALTHKIT_IMPLEMENTATION_GUIDE.md`](./HEALTHKIT_IMPLEMENTATION_GUIDE.md)
- [`HEALTHKIT_XCODE_SETUP.md`](./HEALTHKIT_XCODE_SETUP.md)
- [`events-and-leagues.md`](./events-and-leagues.md)

## Quality + Release

- [`PRE_LAUNCH_REVIEW_GUIDE.md`](./PRE_LAUNCH_REVIEW_GUIDE.md)
- [`CLAUDE_REVIEW_PROMPT.md`](./CLAUDE_REVIEW_PROMPT.md)
- [`release-notes/`](./release-notes)

## Historical Material

Older planning, deprecated docs, and one-off investigations live in [`archive/`](./archive).

## Maintenance Rule

When adding or renaming docs:
- keep this index focused on high-signal entry points
- link new canonical guides from **Start Here** or the most relevant section
- move stale/obsolete material to `archive/` instead of deleting history
