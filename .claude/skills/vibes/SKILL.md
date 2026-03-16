---
name: vibes
description: "Monitor Nostr for RUNSTR mentions, bug reports, and community sentiment. Use when the user says 'vibes', 'check mentions', 'what are people saying', 'any bug reports', 'community pulse', or 'check nostr'. Can be looped with /loop for recurring monitoring."
version: 1.0.0
metadata:
  tags: nostr, monitoring, community, bugs, sentiment, vibes
  openclaw:
    requires:
      bins: [nak]
---

# RUNSTR Vibes Check

Monitors Nostr for RUNSTR mentions, bug reports, feature requests, and community sentiment. Queries multiple signal sources and presents a categorized digest.

## Constants

```
RUNSTR_NPUB: npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e
RUNSTR_HEX: 611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f
RELAYS: wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

## Execution Steps

### Step 1: Query Nostr for Mentions (run all in parallel)

Run these 4 nak queries in parallel. Each searches the last 7 days (adjust `--since` to unix timestamp for 7 days ago). Use `date -v-7d +%s` (macOS) to get the timestamp.

```bash
# Get the since timestamp (7 days ago)
SINCE=$(date -v-7d +%s)
```

**Query A — Hashtag mentions (#runstr, #RUNSTR):**
```bash
nak req -k 1 -t t=runstr --since $SINCE -l 100 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

**Query B — P-tag mentions (replies/tags to RUNSTR account):**
```bash
nak req -k 1 -t p=611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f --since $SINCE -l 100 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

**Query C — Posts BY the RUNSTR account (for context on what we've been saying):**
```bash
nak req -k 1 -a 611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f --since $SINCE -l 50 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

**Query D — Text search via relay.nostr.band (supports NIP-50 search):**
Note: relay.nostr.band often times out. Set a short timeout and don't block on it. The other queries are sufficient if this one fails.
```bash
nak req -k 1 --search "runstr" --since $SINCE -l 100 \
  wss://relay.nostr.band
```

### Step 2: Deduplicate

Combine all results. Deduplicate by event `id`. Remove any posts authored by the RUNSTR account itself (those are "our" posts, not mentions).

### Step 3: Resolve Author Names

For each unique author pubkey in the results, fetch their kind 0 profile to get display names:

```bash
nak req -k 0 -a <hex_pubkey> -l 1 \
  wss://relay.damus.io wss://relay.primal.net | jq -r '.content' | jq -r '.name // .display_name // "anon"'
```

Batch these — fetch profiles for up to 20 unique authors. For remaining authors, show shortened pubkeys.

### Step 4: Categorize Each Mention

Read each note's `.content` field and categorize:

**Bug Reports** — Look for keywords: `bug`, `crash`, `broken`, `error`, `doesn't work`, `won't`, `can't`, `issue`, `problem`, `fix`, `glitch`, `stuck`, `freeze`, `fail`

**Feature Requests** — Look for: `wish`, `would be nice`, `should`, `could you`, `please add`, `feature`, `idea`, `suggestion`, `want`, `need`

**Positive** — Look for: `love`, `great`, `awesome`, `amazing`, `thank`, `nice`, `good`, `best`, `fire`, `based`, `🔥`, `💪`, `🙏`, `❤️`, `cool`, `excited`, `helpful`, `solid`

**Negative** — Look for: `hate`, `terrible`, `awful`, `worst`, `sucks`, `disappointed`, `annoying`, `frustrating`, `useless`, `waste`, `scam`, `bad`

**Neutral** — Anything that doesn't clearly fit above categories (shares, mentions in passing, questions)

A single note can appear in multiple categories (e.g., both bug report AND negative).

### Step 5: Present the Vibes Report

Format the output as a structured digest. Use this template:

```
# RUNSTR Vibes Check — [date range]

## Summary
- Total mentions found: X
- Bug reports: X
- Feature requests: X
- Positive mentions: X
- Negative mentions: X
- Neutral mentions: X

## Bug Reports & Issues
[For each bug report, show:]
- **[Author Name]** ([relative time]): "[content preview - first 200 chars]"
  npub: [npub] | note: [note id]

## Feature Requests
[Same format]

## Positive Vibes
[Same format]

## Negative Mentions
[Same format]

## Neutral / Other
[Same format, but abbreviated — just count + 2-3 examples]

## Our Recent Posts
[List the last 5 posts from the RUNSTR account for context]

## Actionable Items
[Your analysis:]
- Any bugs that need immediate attention?
- Any feature requests that align with the roadmap?
- Any users we should respond to?
- Overall sentiment trend (positive/negative/neutral)
```

### Step 6: Compare with Previous Check (if memory exists)

Check if there's a previous vibes check saved in memory at:
`/Users/dakotabrown/.claude/projects/-Users-dakotabrown-runstr-project/memory/vibes-last-check.md`

If it exists, compare:
- New mentions since last check
- Sentiment trend (improving/declining/stable)
- Any recurring bug reports

### Step 7: Save Current State to Memory

Save the current check timestamp and summary to:
`/Users/dakotabrown/.claude/projects/-Users-dakotabrown-runstr-project/memory/vibes-last-check.md`

```markdown
---
name: vibes-last-check
description: Last vibes check results for trend comparison
type: project
---

Last checked: [ISO timestamp]
Total mentions: X
Bugs: X | Features: X | Positive: X | Negative: X | Neutral: X
Key issues: [brief list of open bugs/concerns]
```

## Usage

- **One-time check:** `/vibes`
- **Recurring monitoring:** `/loop 30m /vibes` (every 30 minutes)
- **Daily pulse:** `/loop 4h /vibes` (every 4 hours during work)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| nak not found | `go install github.com/fiatjaf/nak@latest` |
| No results from relay.nostr.band | NIP-50 search may be down — other queries still work |
| Too many results | Reduce time window or add `--until` flag |
| Timeout on relay | Some relays may be slow — results from others still valid |
