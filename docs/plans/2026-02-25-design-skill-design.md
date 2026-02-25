# Design Review Skill Design

**Date:** 2026-02-25
**Status:** Implemented

## Problem

RUNSTR has a strong design system (theme.ts with comprehensive colors, typography, spacing) and 32 shared UI components, but no tool to enforce consistency as the codebase grows. Screens drift from the design system, reinvent shared components, and accumulate UX rough edges without anyone noticing.

## Design

**Approach:** 5 parallel agents, report-only with priority tiers (Broken UX / Inconsistency / Enhancement). Brand-aware — hardcodes RUNSTR's orange-on-black identity rules. Scoped to `src/`.

### Brand Rules (hardcoded)

- Orange-on-black theme. All text is orange variants, NEVER white.
- Status colors are orange (success = #FF9D42, error = #FF6B00). No green/red/blue.
- All colors must come from theme.colors. No hardcoded hex.
- TouchableOpacity must have activeOpacity (default 0.2 is too harsh on dark).

### Agents

1. **Theme Compliance Scanner** — Finds hardcoded colors, white text, non-orange status colors, raw font sizes, missing activeOpacity, off-grid spacing values.

2. **Component Usage Auditor** — Finds screens that reinvent Card, Button, Avatar, LoadingStates instead of using shared components. Identifies missing shared components.

3. **UX Flow Reviewer** — Walks 4 critical journeys (first launch, club join, track-to-earn, settings). Flags dead ends, missing feedback, confusing transitions.

4. **Layout & Spacing Consistency** — Compares headers, section gaps, card padding, safe area handling, ScrollView behavior, empty states, and loading patterns across all screens.

5. **Polish & Enhancement** — Finds missing press feedback, image loading gaps, text truncation, sparse/crowded layouts, accessibility gaps, form input quality.

### Output

Prioritized report with three tiers:
- **Broken UX** — fix now
- **Inconsistency** — fix when touching that file
- **Enhancement** — backlog

Plus a Design Score (1-10) and Top 5 recommendations.

## Skill Trio

| Skill | Purpose | When to run |
|-------|---------|-------------|
| `/audit` | Find bugs before release | Before every ship |
| `/simplify` | Find unnecessary complexity | Monthly |
| `/design` | Find design drift and UX issues | Monthly or after UI work |
