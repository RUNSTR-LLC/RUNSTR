# Documentation Directory

Central index for RUNSTR docs. This file reflects the current live structure and points older material to `docs/archive/`.

## Quick Navigation

- [Project README](../README.md)
- [Claude Context](../CLAUDE.md)
- [Changelog](../CHANGELOG.md)

## Core (active docs in `docs/`)

- `RUNSTR_REWARDS_OVERVIEW.md` — product + system overview
- `ENVIRONMENT_SETUP.md` — local env and secrets setup
- `KIND_1301_SPEC.md` — workout event specification
- `HEALTHKIT_IMPLEMENTATION_GUIDE.md` / `HEALTHKIT_XCODE_SETUP.md` — HealthKit integration
- `DATA_ARCHITECTURE_AND_CACHING_STRATEGY.md` — cache/data architecture
- `WORKOUT_ARCHITECTURE.md` — workout data model and flow
- `TEAM_MANAGEMENT_SYSTEM.md` — team architecture and behavior
- `EVENT_LEADERBOARD_PATTERN.md` — leaderboard/event interaction pattern
- `PERFORMANCE_GUIDE.md` — performance troubleshooting and guardrails
- `GIT_WORKFLOW.md` — branch/PR workflow
- `PRE_LAUNCH_REVIEW_GUIDE.md` — pre-release validation checklist

## Themed docs

- `events-and-leagues.md`
- `AI_LEARNING_LAYER_DESIGN.md`
- `ANTICHEAT_WEBSITE_SPEC.md`
- `FITNESS_TRACKER_ANDROID_STEP_ANALYSIS.md`
- `FITNESS_TRACKER_MEMORY.md`
- `CHARITY_ADDRESS_ROUTING_ISSUES.md`
- `IOS_TIMER_BLOCK_FIX.md`
- `Decentralized-Fitness.md`
- `LESSONS_LEARNED.md`
- `NOSTR_AGENT_MEMORY.md`
- `AMBER_INTEGRATION.md`
- `ANDROID_BUILD.md`
- `CLAUDE_REVIEW_PROMPT.md`
- `BASELINE_SCRIPT_PROMPT.md`

## Internal planning (`docs/internal/`)

Contains strategy docs, product planning, and internal audits (business plan, GTM, MVP specs, subscription planning, etc.).

## Release notes (`docs/release-notes/`)

Versioned App Store release notes, including `APP_STORE_RELEASE_NOTES.md` and historical point-release notes.

## Archive (`docs/archive/`)

Historical docs that were removed from active navigation but are still useful as reference:

- prior roadmap snapshots
- old implementation guides
- legacy troubleshooting writeups
- historical issue investigations

## Maintenance rules

When adding docs:
1. Keep active docs in `docs/` when they reflect current behavior.
2. Move outdated material to `docs/archive/` instead of deleting.
3. Add internal-only planning docs to `docs/internal/`.
4. Update this index in the same PR.
