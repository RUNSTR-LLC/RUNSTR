PR Triage Dashboard for RUNSTR. Fetches all open PRs, analyzes diffs with parallel agents, and presents a ranked merge queue with safety/impact/readiness scores.

## Phase 1: Fetch PR Metadata

Run this command to get all open PRs:

```bash
gh pr list --state open --limit 30 --json number,title,author,createdAt,changedFiles,additions,deletions,headRefName,labels,mergeable,reviewDecision
```

Count the PRs returned. Batch them into groups of 3 (e.g., 10 PRs = 4 batches: 3/3/3/1). If there are no open PRs, report "No open PRs found" and stop.

## Phase 2: Parallel Agent Analysis

Dispatch **one agent per batch** using the Agent tool (subagent_type: general-purpose). All agents run in parallel.

Each agent receives the following prompt template — fill in the PR numbers for its batch:

---

**Agent Prompt Template:**

"You are analyzing open PRs for the RUNSTR fitness app. For each PR below, run `gh pr diff <number>` to get the diff, then provide a structured assessment.

**RUNSTR Critical Paths (higher risk when touched):**
- `src/services/nostr/GlobalNDKService.ts` — Nostr identity/connection (CRITICAL)
- `src/services/auth/` — Authentication flows (CRITICAL)
- `src/services/rewards/` — Reward delivery, LNURL (CRITICAL)
- `src/services/fitness/` — HealthKit/Health Connect sync (HIGH)
- `src/navigation/` — App navigation (HIGH)
- `src/services/backend/` — Supabase data layer (HIGH)
- `src/store/` — Zustand state (MEDIUM)
- `src/components/` — UI components (LOW-MEDIUM)
- `src/constants/`, `src/config/` — Static config (LOW)

**Scoring Guide:**
- Safety (1-10): 10 = zero risk (config, logs, comments), 7-9 = low risk (UI, isolated logic), 4-6 = moderate (services, state), 1-3 = high risk (auth, rewards, NDK, navigation core)
- Impact (1-10): 10 = fixes active user-facing bug or security vuln, 7-9 = meaningful improvement, 4-6 = nice-to-have, 1-3 = trivial/cosmetic
- Readiness (1-10): 10 = clean diff, no TODOs, follows conventions, small, 7-9 = mostly ready, minor nits, 4-6 = needs some work, 1-3 = incomplete or has issues

**For each PR, return EXACTLY this format:**

```
PR #<number>: <title>
Author: <login>
Domain: <one of: Bug Fix | Feature | Performance | Security | Refactor | Design | Chore>
Summary: <1-2 sentences explaining what the PR does in plain English>
Files Changed: <count> (+<additions> -<deletions>)
Safety: <score>/10 — <one sentence reasoning>
Impact: <score>/10 — <one sentence reasoning>
Readiness: <score>/10 — <one sentence reasoning>
Composite: <weighted score: Safety*0.35 + Impact*0.35 + Readiness*0.30, rounded to 1 decimal>
Flags: <any red flags, or 'None'>
```

Analyze these PRs: #NUMBERS_HERE"

---

## Phase 3: Consolidated Dashboard

After all agents return, collect their results and sort all PRs by **Composite score descending** (highest first).

Present the dashboard in this format:

```markdown
# PR Triage Dashboard — [today's date]

## Summary
**X open PRs** analyzed | Breakdown: N bug fixes, N performance, N security, N refactor...
Oldest PR: #XX (Y days old) | Newest: #XX (Y days old)

## Merge Queue (ranked by composite score)

### 1. PR #XX — <title>  [Composite: X.X/10]
**Domain:** <domain> | **Author:** <author> | **Age:** X days
**Safety:** X/10 | **Impact:** X/10 | **Readiness:** X/10
> <summary>
> **Flags:** <flags or None>

### 2. PR #XX — <title>  [Composite: X.X/10]
...

(continue for all PRs)

## Red Flags
List any PRs with Safety <= 4, or any notable flags across PRs. If none, say "No red flags detected."

## Recommended Merge Order
Number the PRs in the order you'd merge them, grouping by strategy:
1. **Quick wins** (Composite >= 8, Safety >= 8): merge immediately
2. **High-value, review carefully** (Impact >= 8, Safety < 8): merge after careful review
3. **Low priority** (Composite < 6): defer or request changes

## Domain Breakdown
| Domain | Count | PRs |
|--------|-------|-----|
| Bug Fix | N | #XX, #XX |
| Security | N | #XX |
| ... | | |
```

Present the full dashboard to the user.
