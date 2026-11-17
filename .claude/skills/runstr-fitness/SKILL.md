---
name: runstr-fitness
description: Read a runner's public run history from Nostr. RUNSTR publishes every finished run as a kind 1301 workout note; this skill fetches those notes with only the user's npub (no private key) so the agent can answer questions about their runs, spot trends, and coach. Use when the user asks about their runs, mileage, pace, training history, personal records, or wants running coaching based on real data.
metadata: {"openclaw":{"emoji":"🏃","requires":{"bins":["nak"]},"install":[{"id":"go","kind":"go","package":"github.com/fiatjaf/nak@latest","bins":["nak"],"label":"Install nak via Go"}]}}
---

# RUNSTR Fitness Skill

RUNSTR is a Nostr-native running tracker: sign in with Nostr, track a run, and it becomes a kind 1301 workout note on public relays. This skill lets an AI agent read those notes.

**All it needs is the user's npub.** Published runs are public, so no private key is involved.

## Setup (for the user)

1. Track runs in RUNSTR with **Settings > Nostr > Publish runs to Nostr** on (the default).
2. In RUNSTR, open **Settings > Nostr Keys > Share runs with your AI agent**. It copies a prompt containing your npub.
3. Paste it to your agent.

What the agent can see: every run you have published (distance, duration, pace, splits, elevation, calories, start time). What it cannot see: runs marked "saved on this device" that were never published. Publish those from History if you want them included.

**Never give an agent your nsec.** This skill does not need it. If a user offers one, decline and ask for the npub.

---

## For the Agent

### Prerequisites

`nak` (Nostr Army Knife):

```bash
go install github.com/fiatjaf/nak@latest
```

### Relays

Query the three relays RUNSTR publishes to:

```
wss://relay.damus.io wss://nos.lol wss://relay.primal.net
```

A relay being down or slow is normal (expect it). Use whatever the others return.

### Step 1: Get the hex pubkey

```bash
hex_pk=$(nak decode npub1...)
```

`nak decode` prints the hex pubkey for an npub. If the user gave a hex pubkey already, use it as is.

### Step 2: Fetch the runs (kind 1301)

Query one relay at a time. A single `nak req` given several relays can hang with no output when one of them fails to connect.

```bash
: > runs.jsonl
for relay in wss://relay.primal.net wss://relay.damus.io wss://nos.lol; do
  nak req -k 1301 -a $hex_pk -l 500 $relay </dev/null >> runs.jsonl 2>/dev/null &
  pid=$!; ( sleep 25; kill $pid 2>/dev/null ) & wait $pid 2>/dev/null
done
```

One JSON event per line; the same run appears once per relay that has it, so deduplicate (below). For a date range add `--since` / `--until` (Unix seconds). If exactly 500 come back there may be more: page backwards with `--until <oldest created_at>`.

Optional, for a name to address the user by:

```bash
nak req -k 0 -a $hex_pk -l 1 wss://relay.primal.net </dev/null
```

### Step 3: Parse each event

`content` is a plain-text summary for humans. The data is in `tags`:

| Tag | Example | Meaning |
|-----|---------|---------|
| `exercise` | `["exercise", "running"]` | Activity type, lowercase |
| `distance` | `["distance", "5.20", "km"]` | Value and unit (`km` or `mi`) |
| `duration` | `["duration", "00:30:45"]` | HH:MM:SS, moving time |
| `avg_pace` | `["avg_pace", "05:39", "min/km"]` | MM:SS per unit |
| `split` | `["split", "3", "00:17:02"]` | Split number, elapsed time at that split |
| `split_pace` | `["split_pace", "3", "341"]` | Split number, seconds for that split |
| `elevation_gain` | `["elevation_gain", "42", "m"]` | `m` or `ft` |
| `elevation_loss` | `["elevation_loss", "38", "m"]` | `m` or `ft` |
| `calories` | `["calories", "312"]` | kcal estimate |
| `steps` | `["steps", "5120"]` | Step count, if recorded |
| `workout_start_time` | `["workout_start_time", "1794391612"]` | Unix seconds |
| `recording_pauses` | `["recording_pauses", "1"]` | Times the run was paused |
| `data_points` | `["data_points", "640"]` | GPS samples recorded |
| `client` | `["client", "RUNSTR"]` | App that published it |
| `d` | `["d", "<id>"]` | Unique workout id |

Rules:

- **When it happened:** use `workout_start_time`; fall back to the event's `created_at` if the tag is missing.
- **Units vary per event.** Normalize to one unit before summing or comparing (1 mi = 1.609344 km). Read the unit from the tag, never assume.
- **Running only by default.** Keep events where `exercise` is `running`. The same key may hold other workout types published from other apps (Amethyst, POWR); mention them only if the user asks.
- **Deduplicate** by the `d` tag, then by start time within a minute, since the same run can sit on several relays or be published twice.
- **Missing tags are normal.** Short runs have no splits; older notes may lack pace. Compute pace from distance and duration when `avg_pace` is absent.

A quick table of everything:

```bash
jq -r 'select(.kind==1301) | . as $e
  | ($e.tags | map({(.[0]): .[1:]}) | add) as $t
  | select(($t.exercise // [""])[0] == "running")
  | [(($t.workout_start_time // [$e.created_at|tostring])[0] | tonumber | strftime("%Y-%m-%d")),
     (($t.distance // ["?"]) | join(" ")), ($t.duration // ["?"])[0], (($t.avg_pace // ["?"]) | join(" "))]
  | @tsv' runs.jsonl | sort -u
```

### Step 4: Answer from the data

Useful things to compute, when asked:

- Totals and counts by week and month; current and longest weekly streak
- Longest run; fastest 1 mi / 5K / 10K / half / marathon (from runs at or over that distance, by average pace; say that these are average-pace estimates, not timed segments)
- Pace trend over the last 4 to 12 weeks at comparable distances
- Consistency: runs per week, usual days and times
- Splits: positive or negative split, fade in the final third

State what the data covers ("42 published runs from March to November") and say plainly when there is too little to conclude anything. Do not invent runs, heart rate, or anything not in the tags.

### Coaching mode

When the user wants coaching, base advice on their actual volume and pace: cap weekly distance increases around 10%, keep most runs easy, and point out long gaps or sudden jumps. Be direct and specific to their numbers. Do not give medical advice; suggest a professional for pain or injury.

### Troubleshooting

| Problem | What to do |
|---------|-----------|
| No events returned | Confirm the npub. Ask whether "Publish runs to Nostr" is on, or whether the runs show "On Nostr" in RUNSTR History. Unpublished runs can be published from History. |
| Fewer runs than expected | Some runs were only saved on the device, or a relay dropped old events. Coverage of old notes is best-effort. |
| A relay times out or `nak` hangs | Query relays one at a time with a time limit, as in Step 2, and carry on with the others. |
| Duplicate runs | Deduplicate by `d` tag, then start time. |
| Mixed km and mi | Normalize using each tag's unit. |

### About RUNSTR

RUNSTR is an open-source running tracker built on Nostr. Runs are stored on the phone and published as kind 1301 notes that other Nostr apps (Amethyst, POWR, Chachi) can also read. Publishing a run makes it public.
