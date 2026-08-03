# General Audit Agent

**Runs:** Mondays 06:00 UTC (2am EDT)
**Mission:** Find bugs, regressions, and breaking changes in recent work that should block a release.

## Execution

### 1. Setup

```bash
npm install --legacy-peer-deps --silent
git log --since='7 days ago' --oneline --no-merges | head -40
```

Read `CLAUDE.md` for known issues (e.g., the ~199 pre-existing TS errors noted there — do not report those).

### 2. Typecheck + lint

```bash
npm run typecheck 2>&1 | tee /tmp/tc.log
npm run lint 2>&1 | tee /tmp/lint.log
```

Compare against baseline: if typecheck error count increased vs `CLAUDE.md`'s noted baseline, that's a regression — file it. Otherwise note the counts in your run log.

### 3. Parallel investigation

Dispatch agents (use the `Agent` tool if available, otherwise sequential Grep) across these angles. Each should return file:line + 1-line description of findings.

**a. Recent diff review**
Read the diff of every commit in the last 7 days. Flag:
- Unhandled promise rejections (calling async without try/catch or .catch)
- Missing `useEffect` cleanups (subscriptions, timers, listeners)
- Stale closures in setInterval/setTimeout callbacks
- Missing null checks on Nostr events / Supabase rows

**b. GPS/tracking correctness**
Focus: `src/services/activity/`, `src/components/activity/`
Look for:
- Timer drift patterns (ref-based pause/resume)
- Distance accumulation during GPS loss
- Missing cleanup when workout is cancelled mid-session

**c. Nostr/NDK misuse**
`grep -r "new NDK(" src/ && grep -r "nostr-tools" src/` — anything outside `src/services/nostr/` is a violation.

**d. Supabase query smells**
`grep -rn "\.select(" src/services/backend/` — flag queries without `.limit()` that could return unbounded data.

**e. Kind 1301 spec violations**
Check any code building kind 1301 events: must be plain text (not JSON), lowercase activity types, HH:MM:SS duration. See `docs/KIND_1301_SPEC.md`.

### 4. Rank + file

Severity:
- **Critical** — data loss, crash, security issue, shipped regression
- **High** — user-visible broken feature, would fail app review
- **Medium** — edge case bug, minor data inconsistency
- **Low** — code smell, future-proofing

File **one** issue per run titled `[Audit] General sweep YYYY-MM-DD` (substitute today's ISO date) with sections per severity. Include:
- `**File:**` + file:line
- `**Evidence:**` 5–10 line code snippet
- `**Why:**` one-sentence reasoning
- `**Fix direction:**` one sentence

Label: `audit`. If findings look trivially fixable (<50 line diff, single file, no design decisions), also add `auto-pr-ok`.

### 5. Self-assessment

Include the `CRON-RUN-LOG` block (format per `RUBRIC.md`) at the **very end** of the issue body when calling `gh issue create`. Write the block directly into the body HEREDOC — do not attempt to add it via a separate comment after creation, as that step is consistently skipped.

Example tail of your issue body:
```
---

<!-- CRON-RUN-LOG
agent: audit
run_date: YYYY-MM-DD
findings_count: <int>
severity: critical=<n> high=<n> medium=<n> low=<n>
self_score:
  specificity: <0-10>
  actionability: <0-10>
  signal_to_noise: <0-10>
  false_positive_risk: <0-10>
  coverage: <0-10>
overall: <float>
notes: <one-line note>
-->
```

## Guardrails

- Read-only. Only mutation is the single `gh issue create`.
- Don't file an issue if you found nothing — file a `cron-run-log` issue with label `cron-run-log` instead.
- Don't double-file things already in existing open `audit` issues (dedup by title + first-finding match).
- Don't touch pre-existing typecheck errors listed as baseline.
