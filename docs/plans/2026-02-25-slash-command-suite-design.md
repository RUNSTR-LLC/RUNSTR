# Slash Command Suite Design

**Date:** 2026-02-25
**Status:** Implemented

## Problem

RUNSTR had 3 review commands (`/audit`, `/simplify`, `/design`) plus `/stats`. These cover correctness, complexity, and visual consistency — but miss performance, feature completeness, security, data integrity, test coverage, and documentation freshness. With an automated agent running these as daily cron jobs before PRs, the suite needs to cover all angles.

## Design

**Approach:** 6 new commands following the same proven pattern — Phase 1 baseline metrics, Phase 2 five parallel agents, Phase 3 consolidated report. All report-only, fully self-contained (no interactive questions), scoped to `src/`.

### Full Suite (10 commands)

| # | Command | Focus | Cadence |
|---|---------|-------|---------|
| 1 | `/audit` | Bugs & broken flows | Before every ship |
| 2 | `/simplify` | Codebase complexity | Monthly |
| 3 | `/design` | Visual consistency & UX | Monthly / after UI work |
| 4 | `/stats` | Analytics dashboard | On demand |
| 5 | `/perf` | Performance & memory | Weekly / before releases |
| 6 | `/roadmap` | Feature gaps & backlog | Monthly / sprint planning |
| 7 | `/security` | Key handling & access control | Weekly / after auth changes |
| 8 | `/health` | Data integrity & resilience | Daily / after backend changes |
| 9 | `/testplan` | Test coverage & fragility | After features / weekly |
| 10 | `/docs` | Documentation freshness | Monthly / after refactors |

### New Command Details

#### `/perf` — Performance Audit

**Agents:**
1. **Render Performance Scanner** — Missing useMemo/useCallback, inline object creation in JSX, FlatList without keyExtractor/getItemLayout/windowSize, missing React.memo on list items.
2. **Query & Network Efficiency** — Supabase queries without .limit(), Nostr subs without since/limit, N+1 patterns, duplicate fetches on focus.
3. **Memory & Subscription Leak Hunter** — useEffect without cleanup, growing Maps without eviction, Nostr subs never stopped, timers without clear.
4. **Startup & Bundle Weight** — Heavy synchronous imports on startup, require() defeating tree-shaking, large libraries for single functions, screens that should be lazy.
5. **Animation & UI Thread** — Animations without useNativeDriver, heavy JS computation during animations, StyleSheet.create inside render, large images without resize/cache.

**Output:** Critical (visible jank/OOM) / High (measurable slowdown) / Medium (suboptimal) / Low (micro-optimization). Performance Score (1-10).

#### `/roadmap` — Feature Gap Analysis

**Agents:**
1. **TODO/FIXME Inventory** — Every TODO, FIXME, HACK in src/. Categorized by area, sorted by staleness.
2. **North Star Gap Analyzer** — Compares North Star.md goals against implemented features. Rates each gap by effort and impact.
3. **Partial Feature Detector** — Scaffolded-but-unwired features: unused components, service methods no screen calls, registered routes with stub screens.
4. **Infrastructure Leverage Finder** — Features easy to add because infrastructure exists. Underutilized data flows.
5. **User Journey Gap Spotter** — Missing quality-of-life: onboarding gaps, missing empty states, no undo, missing sharing, missing notification triggers.

**Output:** Quick Wins / Medium Builds / Large Features. Feature Completeness Score (1-10).

#### `/security` — Security Review

**Agents:**
1. **Secret & Key Exposure Scanner** — Hardcoded nsec/keys, API keys in source, secrets logged to console, keys in URLs, unencrypted AsyncStorage secrets.
2. **Input Validation Auditor** — User input sanitization before Supabase, length limits, injection via profile/chat/workout fields, Nostr event validation.
3. **Auth Flow Edge Case Reviewer** — Token expiry handling, anonymous-to-authenticated upgrade, route guards, nsec operation gating, Amber timeout handling.
4. **Permission & Access Control Checker** — Non-captain accessing captain APIs, Supabase RLS alignment, ID manipulation, destructive action confirmation.
5. **Dependency & Transport Security** — HTTPS/WSS enforcement, eval() patterns, outdated deps with known CVE patterns.

**Output:** Critical (exploit risk) / High (data exposure) / Medium (defense gap) / Low (hardening). Security Score (1-10).

#### `/health` — Data Integrity & Infrastructure Health

**Agents:**
1. **Supabase Schema Alignment** — TypeScript interfaces vs actual queries. Missing columns, type mismatches, nullable handling, untyped tables.
2. **Network Resilience Auditor** — Try/catch on every network call, graceful degradation, retry mechanisms, timeouts, offline behavior.
3. **Cache Coherence Checker** — TTL appropriateness, invalidation after writes, stale data causing incorrect behavior, race conditions.
4. **Background Sync Reliability** — Partial failure handling, idempotency, dead-letter handling, sync timestamp gap prevention.
5. **Error Handling Coverage** — Async without error handling, promises without .catch(), silent failures, raw error messages, missing error boundaries.

**Output:** Broken (data corruption risk) / Fragile (fails ungracefully) / Hardening (defense-in-depth). Health Score (1-10).

#### `/testplan` — Test Coverage & Fragility Analysis

**Agents:**
1. **Critical Path Identifier** — Maps highest-stakes call chains (auth, workout submission, rewards, clubs). Flags every untested function in each chain.
2. **Fragile Code Detector** — 5+ conditional branches, external data parsing without validation, type assertions, empty catch blocks, shape-dependent code.
3. **Edge Case Enumerator** — For top 10 most-imported services: null inputs, empty arrays, timeouts, malformed events, concurrent calls, large datasets.
4. **Regression Risk Scorer** — Files changed frequently (last 30 commits) with no tests. Files involved in "Fix:" commits. Highest regression risk.
5. **Test Script Proposer** — For top 15 gaps: file path, function, scenario, inputs/outputs, mocking needs. Ready-to-implement test skeletons.

**Output:** Critical Gaps / High Risk / Medium / Low. Top 10 test scripts to write. Coverage Score (1-10).

#### `/docs` — Documentation & Onboarding Review

**Agents:**
1. **Stale Documentation Hunter** — READMEs referencing deleted files, describing migrated architecture, listing removed services.
2. **CLAUDE.md Drift Detector** — Verifies every claim in CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md against actual codebase. Flags referenced files that don't exist, rules being violated.
3. **Undocumented Service Auditor** — Services with 5+ exports but no JSDoc. Worst offenders by export count vs documentation.
4. **Onboarding Gap Finder** — Could a new dev set up from these docs? Missing steps, unexplained decisions, undiscoverable key files.
5. **Design Doc Freshness** — docs/plans/ status accuracy. Implemented features with no design doc. Design docs referencing deleted code.

**Output:** Broken Docs / Stale Docs / Missing Docs. Top 5 doc updates. Documentation Score (1-10).
