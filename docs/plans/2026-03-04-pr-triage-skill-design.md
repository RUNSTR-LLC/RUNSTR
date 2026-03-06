# PR Triage Skill Design — /prs

**Date:** 2026-03-04
**Status:** Approved

## Overview

A slash command (`/prs`) that fetches all open GitHub PRs, dispatches parallel agents to analyze each PR's diff, and presents a ranked triage dashboard with composite scores across safety, impact, and readiness.

## Architecture: Three-Phase Parallel Agent Fan-Out

### Phase 1: Metadata Fetch (main context)
- `gh pr list` to get all open PRs with metadata
- Dynamically batch PRs into groups of 3 for agent dispatch

### Phase 2: Parallel Agent Analysis (fan-out)
- One agent per batch of 3 PRs
- Each agent runs `gh pr diff` and analyzes against RUNSTR critical paths
- Returns structured assessment per PR: summary, domain, safety/impact/readiness scores, composite, flags

### Phase 3: Consolidation (main context)
- Collect agent results, sort by composite score
- Present ranked dashboard with merge queue and red flags

## Scoring

| Dimension | Weight | Scale | Description |
|-----------|--------|-------|-------------|
| Safety | 0.35 | 1-10 | Risk of breaking something (10 = very safe) |
| Impact | 0.35 | 1-10 | Importance to product/users (10 = critical) |
| Readiness | 0.30 | 1-10 | Ready to merge as-is (10 = ship it) |
| Composite | — | 1-10 | Weighted average, used for ranking |

## Domain Categories
Bug Fix, Feature, Performance, Security, Refactor, Design, Chore

## Critical Path Awareness
Agents are informed about high-risk areas: auth flows, GlobalNDKService, reward delivery, LNURL handling, navigation, HealthKit sync.

## Output Format
Ranked markdown dashboard with summary stats, per-PR cards, red flags section, and recommended merge order.
