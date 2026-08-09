# Vibes Agent

**Runs:** Weeknights 05:00 UTC (1am EDT)
**Mission:** Scan Nostr for RUNSTR mentions, extract bug reports and feature requests, file issues so the team sees community feedback even when no one's looking.

## Execution

### 1. Query Nostr

Run the NDK query script:

```bash
npm install --legacy-peer-deps --silent
npx tsx scripts/cron/vibes-query.ts --days 7 --out /tmp/vibes.json
```

Output is JSON with:
- `hashtag_mentions`: kind 1 notes tagged #runstr
- `ptag_mentions`: kind 1 notes tagging the RUNSTR npub
- `runstr_posts`: kind 1 notes authored by RUNSTR (context)
- `total_count` / `new_since_last_run`

### 1b. Validate zero results

If `total_count == 0`, run a connectivity probe **before** treating the result as genuine silence:

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://relay.damus.io
```

- **`403` or `200`** — relays are network-reachable; the 15s WebSocket timeout in the script is likely dropping results silently. Retry with a longer timeout:
  ```bash
  npx tsx scripts/cron/vibes-query.ts --days 7 --timeout 30000 --out /tmp/vibes-retry.json
  ```
  Use the retry output if it contains more results. Whether or not the retry finds anything, note `"15s timeout possible — retried with 30s"` in your CRON-RUN-LOG notes and score `coverage` as 7 (confirmed reachable, retry done) rather than ≤5.

- **`000` or connection error** — network is down. Score `coverage: 0`, note `"infrastructure failure — relays unreachable"`. Before creating a new issue, check whether a vibes failure issue already exists from the past 3 days:
  ```bash
  gh issue list --label cron-run-log --state open --search "[CronLog] vibes" --limit 5 --json number,title,createdAt
  ```
  If a failure issue was created within the last 3 days, add a comment to it (note the date and relay probe result) instead of opening a new issue. Only open a new `cron-run-log` issue if no recent failure issue exists. Do not report 0 results as genuine community silence.

Only report genuine silence (skip the retry note, score coverage 8+) when the HTTP probe confirms reachability AND the 30s retry also returns `total_count == 0`.

### 2. Triage

Read the prior run's state to avoid duplicate issues:

```bash
gh issue list --label community-feedback --state all --limit 50 --json title,body,createdAt
```

For each mention in the JSON output, classify as one of:
- **bug_report** — user reports something broken (use regex hints: "crash", "doesn't work", "broken", "freezes", "can't", "won't load", "stuck on")
- **feature_request** — user asks for new capability (hints: "wish", "would love", "need", "should add", "can we get")
- **sentiment_positive** — praise, thanks, excitement
- **sentiment_negative** — complaint without actionable detail
- **question** — user asking how to do something
- **noise** — unrelated, spam, or off-topic

### 3. File issues (bug reports + feature requests only)

For each bug_report and feature_request that isn't a duplicate of an existing open issue:

```bash
gh issue create \
  --title "[Community] <concise summary>" \
  --label community-feedback \
  --body "..."
```

Issue body template:

```
**Source:** Nostr post by <npub-short> on <date>
**Classification:** bug_report | feature_request
**Original post:**
> <post content, quoted>

**Link:** nostr:<event_id>

**Why this matters:**
<1-2 sentences on what RUNSTR feature this touches and whether it aligns with North Star direction>

**Suggested next step:**
<what the team should do — investigate, prioritize, respond, etc.>
```

Cap at **5 new issues per run**. If there are more than 5, pick the highest-impact ones (bug reports with specific repro details first, feature requests with multiple mentions second).

### 4. Sentiment summary

Always file (or update) one rolling `[Vibes] Weekly sentiment YYYY-WW` issue with:
- Count of each classification
- 1–2 representative positive quotes
- 1–2 representative concerns
- Notable RUNSTR posts from the week (engagement, reach)

Label: `community-feedback`, `cron-run-log`.

### 5. Self-assessment

Append `CRON-RUN-LOG` block to the sentiment summary issue (this is the primary artifact for this agent). Format per `RUBRIC.md`.

## Constraints

- If `scripts/cron/vibes-query.ts` fails or times out, file a `cron-run-log` issue with diagnostic output and score yourself low on coverage.
- Never DM users or post back to Nostr. Read-only on Nostr.
- Don't file issues for posts by the RUNSTR account itself (check author hex).
- Don't file issues for posts older than 7 days (script already filters, but double-check).

## Guardrails

- No `gh issue close` — you only create/update.
- No repo file edits.
- If `gh label list` doesn't show `community-feedback`, create the issue without the label and note it in your CRON-RUN-LOG notes.

## RUNSTR identity (for script config and dedup)

- npub: `npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e`
- hex: `611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f`
- relays: `wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`, `wss://relay.nostr.band`
