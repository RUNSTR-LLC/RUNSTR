# Simplify Skill Design

**Date:** 2026-02-25
**Status:** Implemented

## Problem

The RUNSTR codebase is 622 files / 228K lines with significant complexity debt:
- 20+ files exceed the 500-line limit (SettingsScreen is 2,247 lines)
- 14 competition service files with unclear canonical paths
- 7 team service files mixing legacy Nostr and current Supabase patterns
- 49 files with deprecation/removal markers that haven't been cleaned up
- 10 cache service files with unclear overlap

There was no tool to periodically review and flag this complexity. The `/audit` skill finds bugs before releases; `/simplify` finds unnecessary complexity for periodic cleanup.

## Design

**Approach:** 5 parallel agents, same pattern as `/audit`. Report-only (no auto-fixes). Scoped to `src/` only.

### Agents

1. **Dead Code Hunter** — Finds deprecated files, commented-out code, orphaned files, expired event constants, unused exports. Reports confidence level and lines saved.

2. **Oversized File Splitter** — Finds files over 500 lines, identifies natural split points, proposes specific extraction with estimated resulting sizes.

3. **Service Consolidation Mapper** — Maps competition (14 files), team (7), cache (10), fitness (24), and backend services. Identifies canonical vs redundant. Proposes merges.

4. **Architecture Clarity Reviewer** — Checks for NDK violations, data source confusion, disabled store methods, inconsistent data fetching patterns, navigation dead ends.

5. **Dependency & Import Complexity** — Finds high fan-in/fan-out files, dynamic require() calls, circular dependencies, cross-layer imports.

### Output

Prioritized report with:
- Quick Wins (< 30 min, safe) — dead deletions, import cleanup
- Medium Effort (1-2 hours) — file splits, small merges
- Large Refactors (half-day+) — service consolidation, architecture alignment
- Simplification Score (1-10)

## Usage

```
/simplify
```

Run periodically (monthly or before major releases) to keep complexity in check.
