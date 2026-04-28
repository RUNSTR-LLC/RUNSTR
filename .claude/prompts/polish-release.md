# Polish for Release

A self-contained prompt for an agent (local or remote) to assess release readiness and produce a single tracking issue summarizing what's left before the next ship.

## How to invoke

**Locally:** Open a fresh Claude Code session, paste this entire file as the first message.

**As a remote one-shot:** `/schedule` → run-now an existing trigger pointing at this file, or create a temporary trigger with the inline prompt: "Read `.claude/prompts/polish-release.md` and execute it."

**As a scheduled cron:** Add a Friday-afternoon trigger (e.g. `0 21 * * 5` UTC = 5pm EDT Fridays) so you get a fresh release-readiness scorecard going into every weekend.

---

# Mission

Produce a single `[Release] Polish scorecard YYYY-MM-DD` issue that tells the human team in one read whether the codebase is ready to ship and, if not, exactly what's left.

You synthesize three signals: cron-filed audit issues, real-time code checks, and recent commits. You rank what's blocking, what's polish, what's already addressed.

You do **not** fix anything. You file one issue and exit.

# Execution

## 1. Read the project state

```bash
git log --since='14 days ago' --oneline --no-merges | head -40
cat package.json | grep -E '"version"'
git tag --sort=-creatordate | head -5
```

Read `CLAUDE.md`, `docs/North Star.md` for current priorities.

Read `docs/LESSONS_LEARNED.md` if it exists — past pain points to watch for.

## 2. Inventory open cron-filed issues

```bash
for label in audit perf design simplify docs community-feedback bug; do
  echo "=== $label ==="
  gh issue list --label "$label" --state open --limit 10 \
    --json number,title,createdAt,labels \
    --jq '.[] | "\(.number) | \(.createdAt[:10]) | \(.title)"'
done
```

Also pull issues with `auto-pr-ok` label that don't yet have a linked PR:
```bash
gh issue list --label auto-pr-ok --state open --limit 20 --json number,title
```

For each open issue, fetch its body and identify:
- **Severity** (Critical/High/Medium/Low — usually in the issue body if filed by a cron agent)
- **Age** (days open)
- **Status** — does the finding still apply, or has the underlying code changed since?

Verify-on-read: for each Critical or High finding, grep the cited file:line to confirm the issue still exists in current main. Stale findings get marked `[STALE — code has moved]`.

## 3. Run release-readiness checks

Order these from cheap to expensive. Stop and surface any failure as a Critical blocker.

### Typecheck and lint
```bash
npm install --legacy-peer-deps --silent
npm run typecheck 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```
Compare error count against `CLAUDE.md` baseline. Increases are blockers. Decreases or matches are fine.

### Bundle inventory
```bash
find src -name '*.ts*' -exec wc -l {} + | sort -rn | head -10
```
Files >500 lines: existing rule violation. Already-known via `simplify` agent — confirm count hasn't grown.

### Critical-path imports
```bash
grep -rn "new NDK(" src/ | grep -v "src/services/nostr/"
grep -rn "from 'nostr-tools'" src/
```
Either result is a Critical violation per `CLAUDE.md`.

### Kind 1301 spec adherence
```bash
grep -rn "kind.*1301\|KIND_1301" src/ | head -10
```
Inspect each. Per `docs/KIND_1301_SPEC.md`: plain-text content (not JSON), lowercase exercise types, HH:MM:SS duration, `['distance', 'X', 'km']` tag format. Violations are High blockers.

### Reward destination routing
```bash
grep -rn "RewardDestination\|reward.*destination" src/services/rewards/ | head -20
```
Confirm the four destination types (charity, project, service, self) all resolve to a valid LNURL path. Sample one of each from a smoke test if scripts exist (see `scripts/verify/verify-reward-destination-routing.ts`).

### Background sync configuration
```bash
grep -rn "BackgroundFetch\|expo-background\|background.*delivery" src/ ios/ android/ | head -15
```
Per `CLAUDE.md`, HealthKit background delivery (iOS) and WorkManager 15min (Android) must be configured. Confirm the registration code exists and the entitlements/manifest declare it.

### Crypto polyfill order
```bash
head -5 index.js
```
`react-native-get-random-values` must be the first import. If anything precedes it, that's a Critical regression (will break key generation in production).

## 4. Pull from prior cron findings

For each open audit-flavored issue (`audit`, `perf`, `design`, `simplify`, `docs`):
- Note the count of findings still active
- Identify the top 3 by severity that haven't been auto-PR'd yet

For community-feedback issues (`bug`, `enhancement`):
- Bug reports go straight into the blocker list (real users)
- Enhancement requests get noted but not blocking

For meta-tune PRs (`cron-meta`):
- Note whether prior week's tunings have been merged. Unmerged tunings mean cron quality is drifting.

## 5. Score the release

Use this rubric. Be honest — inflated scores mislead.

| Dimension | 0–10 |
|-----------|------|
| **Code health** | typecheck baseline, lint clean, no critical regressions |
| **Spec adherence** | NDK exclusively, kind 1301 format, color/terminology rules |
| **Open audit debt** | low count of unresolved Critical/High findings |
| **Real bug pipeline** | community-reported bugs are triaged or fixed |
| **Build readiness** | `npm install` clean, no missing native deps |

`overall = average`

Decision rule:
- **>= 8.5** → ship-ready. Issue body says "GREEN: cleared for release."
- **7.0–8.4** → ship after addressing 1–3 named blockers. Issue body says "YELLOW: ship after fixing #X, #Y, #Z."
- **< 7.0** → not ready. Issue body says "RED: <reason>. Recommend pushing release window by 1 week."

## 6. File the tracking issue

Single issue with this exact shape:

```
Title: [Release] Polish scorecard YYYY-MM-DD

Body:

# Verdict: GREEN | YELLOW | RED

**Overall score:** X.X / 10

**Recommendation:** <one sentence>

## Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Code health | X | <one line> |
| Spec adherence | X | <one line> |
| Open audit debt | X | <one line> |
| Real bug pipeline | X | <one line> |
| Build readiness | X | <one line> |

## Blockers (must fix before ship)

1. **#NUM — Title** — [Severity] one-line reason
2. ...

## Polish (nice to have, not blocking)

- #NUM — short reason
- ...

## Already addressed (closed since last polish run)

- #NUM — closed YYYY-MM-DD
- ...

## Stale findings (code has moved on, can close)

- #NUM — file no longer at cited line, recommend close

## Real-time check results

```
Typecheck: <count> errors (baseline: ~199 per CLAUDE.md)
Lint: <count> warnings
Files >500 lines: <count>
NDK violations outside src/services/nostr/: <count>
nostr-tools imports: <count>
Crypto polyfill order: OK | WRONG
```

## Recent commits (last 14 days)

<git log --oneline --since='14 days ago' output, last 20>

## Next steps

If GREEN: run `/prerelease` to start the build pipeline.
If YELLOW: address the blockers above, re-run polish, then `/prerelease`.
If RED: address foundational issues, defer release.

---

<!-- POLISH-RUN-LOG
date: YYYY-MM-DD
verdict: GREEN | YELLOW | RED
overall: X.X
blocker_count: N
polish_count: N
stale_count: N
notes: <one line on what was hard or surprising>
-->
```

Label: `audit`, `release-tracking` (create only if it already exists; otherwise omit).

## 7. Comment on linked issues

For each issue listed in the "Already addressed" or "Stale findings" sections, leave a comment:
- For addressed: "Resolved per polish run YYYY-MM-DD. Closing." Then `gh issue close NUM`.
- For stale: "Code at cited location has moved. Re-flag if still relevant. Closing for now." Then `gh issue close NUM --reason 'not planned'`.

This keeps the issue list honest week-over-week.

# Guardrails

- Read-only on the codebase. Never edit src/.
- Single new issue creation. Plus issue comments and closures for stale/addressed items only.
- Do not open PRs.
- If verdict is RED, do not soft-pedal — name the blocker and the reason directly.
- If you can't verify a check (e.g., command times out), score that dimension low and note it. Do not assume pass.
