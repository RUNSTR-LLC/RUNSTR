---
name: runstr-fitness
description: Give your AI agent access to your health and fitness data from RUNSTR. Fetches workouts, habits, journal entries, mood, steps, competition leaderboards, and more from Nostr. Use when the user asks about their workouts, fitness history, health habits, mood tracking, competition rankings, who's winning, what place they're in, or wants AI fitness coaching based on real data.
metadata: {"openclaw":{"emoji":"\ud83c\udfc3","requires":{"bins":["nak"]},"install":[{"id":"go","kind":"go","package":"github.com/fiatjaf/nak@latest","bins":["nak"],"label":"Install nak via Go"}]}}
---

# RUNSTR Fitness Skill

Give your AI agent access to your real health and fitness data. RUNSTR is a free fitness app that tracks workouts, habits, journal entries, mood, and steps — and stores encrypted backups on the Nostr protocol. This skill lets your bot read that data so it can help with fitness coaching, habit accountability, mood tracking, and health insights.

**What your bot gets access to:**
- Workout history (running, walking, cycling, hiking, strength, yoga, etc.)
- Daily habits and streaks (quit smoking, daily meditation, etc.)
- Journal entries with mood and energy levels
- Daily step counts
- Which charity you support and reward routing
- Competition leaderboards and rankings (no nsec needed — public data)
- Daily records (fastest 5K/10K/half marathon/marathon, most steps)
- Charity impact rankings and donation estimates

## Setup: Getting Your Data to Your Bot

If you're already a RUNSTR user with backups enabled, skip to step 3.

### 1. Download RUNSTR (if you haven't)
- **iOS**: Search "RUNSTR" on the App Store
- **Android**: Available on Zapstore or direct APK
- **GitHub**: https://github.com/RUNSTR (open source)

RUNSTR is free. You earn Bitcoin (sats) for working out.

### 2. Use the App
- Create or import a Nostr identity (the app generates one for you)
- Track workouts, log habits, write journal entries
- Go to **Settings > Backup** and tap **Backup to Nostr**

This encrypts all your fitness data and publishes it to Nostr relays. Only you (with your private key) can read it.

### 3. Give Your Bot Your nsec
Your **nsec** is your Nostr private key. Find it in RUNSTR under **Settings > Keys** (or your Nostr key manager).

**Tell your bot:** "Here's my RUNSTR nsec: nsec1..."

Your bot uses the nsec to decrypt your encrypted fitness backup from Nostr. The nsec is never stored, logged, or transmitted — it's used only for the decryption step in your current session.

**Why nsec and not npub?** Your fitness data is encrypted. The public key (npub) can only see old public workout posts (if any). The private key (nsec) is needed to decrypt your habits, journals, mood, steps, and current workout history.

**Privacy note:** If you want a dedicated identity just for fitness data, create a new Nostr account in RUNSTR. Your fitness nsec doesn't have to be your main Nostr identity.

### 4. Keep Your Backup Fresh
Your bot sees whatever was in your last backup. After a week of new workouts, go to **Settings > Backup** in RUNSTR and tap backup again to sync the latest data to Nostr.

---

## For the Agent: How to Fetch RUNSTR Data

Everything below is instructions for the AI agent, not the user.

### Prerequisites

`nak` (Nostr Army Knife) must be installed:
```bash
go install github.com/fiatjaf/nak@latest
```

### Relays

Always query these four relays (RUNSTR defaults):
```
wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

### Step 1: Decode the nsec

```bash
hex_sk=$(nak decode nsec1...)
hex_pk=$(nak key public $hex_sk)
```

### Step 2: Fetch Profile (Kind 0)

```bash
nak req -k 0 -a $hex_pk -l 1 \
  wss://relay.damus.io wss://nos.lol | \
  jq -r '.content | fromjson | {name, about, lud16, picture}'
```

### Step 3: Fetch Encrypted Backup (Kind 30078)

This is the **primary data source**.

```bash
nak req -k 30078 -a $hex_pk -t d=runstr-workout-backup -l 1 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

**If no backup found:** Tell the user: "No backup found on Nostr. Open RUNSTR on your phone, go to Settings > Backup, and create one. Then try again."

**If backup found but `exportedAt` is old:** Warn the user that their backup is stale and recent data may be missing. Suggest they re-backup in the app.

### Decrypt the Backup

The backup is NIP-44 self-encrypted and gzip-compressed.

**Method 1: Using nak**
```bash
content=$(nak req -k 30078 -a $hex_pk -t d=runstr-workout-backup -l 1 \
  wss://relay.damus.io wss://nos.lol | jq -r '.content')

# Decrypt (NIP-44 self-decryption: user to own pubkey)
decrypted=$(echo "$content" | nak encrypt --sec $hex_sk $hex_pk --decrypt)

# Decompress (check for ["compression", "gzip"] tag first)
echo "$decrypted" | base64 -d | gunzip | jq .
```

**Method 2: Node.js fallback**
```javascript
// /tmp/decrypt-runstr.mjs — run with: node /tmp/decrypt-runstr.mjs <hex_sk> '<content>'
import { gunzipSync } from 'zlib';
import NDK, { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

const signer = new NDKPrivateKeySigner(process.argv[2]);
const user = await signer.user();
const decrypted = await signer.decrypt(user, process.argv[3]);

try {
  console.log(gunzipSync(Buffer.from(decrypted, 'base64')).toString());
} catch {
  console.log(decrypted);
}
```

### Backup Payload Structure

```json
{
  "version": 1,
  "exportedAt": "2025-01-15T10:30:00Z",
  "appVersion": "1.6.5",
  "workouts": [
    {
      "id": "uuid",
      "type": "running",
      "startTime": "2025-01-15T07:00:00Z",
      "endTime": "2025-01-15T07:35:00Z",
      "duration": 2100,
      "distance": 5200,
      "calories": 312
    }
  ],
  "habits": [
    {
      "id": "id",
      "name": "No Smoking",
      "type": "abstinence",
      "currentStreak": 45,
      "longestStreak": 45,
      "checkIns": ["2025-01-15", "2025-01-14"]
    }
  ],
  "journal": [
    {
      "id": "uuid",
      "date": "2025-01-15",
      "content": "Great morning run today.",
      "mood": "great",
      "energy": 4,
      "tags": ["morning", "outdoors"]
    }
  ],
  "stepHistory": [
    { "date": "2025-01-15", "steps": 12450, "source": "healthkit" }
  ],
  "preferences": {
    "unitSystem": "imperial",
    "selectedCharity": "hrf"
  }
}
```

**Field reference:**
- `workouts[].type`: running, walking, cycling, hiking, strength, meditation, yoga, diet, swimming, rowing
- `workouts[].duration`: seconds
- `workouts[].distance`: meters
- `habits[].type`: "abstinence" (quitting something) or "positive" (building something)
- `journal[].mood`: great, good, neutral, low, bad
- `journal[].energy`: 1-5 scale
- `stepHistory[].source`: healthkit, health_connect, native

### Step 4: Check for Legacy Public Workouts (Kind 1301)

Older users may have public workout events. Always check:

```bash
nak req -k 1301 -a $hex_pk -l 50 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

If found, parse `tags` array:

| Tag | Example |
|-----|---------|
| `exercise` | `["exercise", "running"]` |
| `distance` | `["distance", "5.2", "km"]` |
| `duration` | `["duration", "00:30:45"]` |
| `calories` | `["calories", "312"]` |
| `avg_pace` | `["avg_pace", "05:39", "min/km"]` |
| `steps` | `["steps", "8432"]` |
| `team` | `["team", "hrf"]` |

Merge with backup data. Deduplicate by matching workout start times or IDs.

### Step 5: Fetch Competition Leaderboards (Kind 30150)

RUNSTR publishes a public leaderboard note to Nostr every 5 minutes with all active competition standings, daily records, and charity rankings. **This step does NOT require the user's nsec.** The leaderboard note is public. If a user asks "who's winning Season II?" without giving their nsec, you can still answer.

```bash
# RUNSTR aggregator pubkey (hardcoded — this is the trusted source)
RUNSTR_AGG="611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f"

nak req -k 30150 -a $RUNSTR_AGG -t d=runstr-leaderboards -l 1 \
  wss://relay.damus.io wss://relay.primal.net wss://nos.lol wss://relay.nostr.band
```

Parse the content field as JSON:

```bash
nak req -k 30150 -a $RUNSTR_AGG -t d=runstr-leaderboards -l 1 \
  wss://relay.damus.io wss://nos.lol | jq -r '.content' | jq .
```

#### Leaderboard Payload Structure

```json
{
  "v": 1,
  "updatedAt": "2026-02-06T12:05:00Z",
  "competitions": [
    {
      "id": "season-ii",
      "name": "Season II",
      "activityType": "running",
      "scoringMethod": "total_distance",
      "status": "active",
      "startDate": "2026-01-01",
      "endDate": "2026-03-01",
      "prizePoolSats": 500000,
      "entries": [
        {"r": 1, "p": "npub1abc...", "n": "Runner1", "s": 142.5, "w": 28}
      ]
    }
  ],
  "daily": {
    "date": "2026-02-06",
    "fastest5k": [{"r": 1, "p": "npub1...", "n": "SpeedKing", "s": 1320}],
    "fastest10k": [],
    "fastestHalf": [],
    "fastestMarathon": [],
    "mostSteps": [{"r": 1, "p": "npub1...", "n": "StepQueen", "s": 18432}]
  },
  "charityRankings": [
    {"id": "als-foundation", "name": "ALS Foundation", "km": 342.5, "sats": 342500, "participants": 12}
  ]
}
```

#### Entry Field Keys

| Key | Meaning |
|-----|---------|
| `r` | Rank (1-based) |
| `p` | npub (Nostr public key) |
| `n` | Display name |
| `s` | Score (meaning depends on competition — see below) |
| `w` | Workout count |

#### Score Interpretation

| `scoringMethod` | `s` means | Format as |
|-----------------|-----------|-----------|
| `total_distance` | Kilometers | `142.5 km` |
| `total_duration` | Seconds | `10:00:00` (HH:MM:SS) |
| `workout_count` | Count | `28 workouts` |
| `fastest_time` | Seconds (lower = better) | `22:00` (MM:SS) |

Daily boards:
- `fastest5k`, `fastest10k`, `fastestHalf`, `fastestMarathon` — seconds, lower is better, format as MM:SS or H:MM:SS
- `mostSteps` — step count, higher is better, format with commas

#### Finding the User's Position

If you have the user's npub (from Step 1 decoding, or they told you directly):

1. Search each competition's `entries` array for a matching `p` field
2. Report their rank, score, and gap to the leader
3. If they're not in a competition, tell them they haven't joined it

Example response for "what's my rank?":

> You're #7 in Season II with 85.3 km across 15 workouts. The leader (Runner1) has 142.5 km — you're 57.2 km behind.
>
> You're not entered in the January Walking Contest.
>
> In today's daily boards, you posted a 23:45 5K (ranked #3 today).

#### Finding the User Without nsec

Users may ask leaderboard questions without providing their nsec. In this case:
- Ask for their **npub** (public key) — this is safe to share and sufficient to look them up
- Or ask for their Nostr display name and search the `n` fields (warn about possible duplicates)
- You do NOT need nsec to look someone up on the leaderboard

#### Freshness Check

The note's `updatedAt` field tells you when data was last refreshed. If it's more than 15 minutes old, warn the user: "Leaderboard data is from [time]. It may be slightly behind — RUNSTR updates every 5 minutes."

If the note is missing entirely, the aggregator may be down: "I couldn't find current leaderboard data on Nostr. The RUNSTR leaderboard service may be temporarily offline. Check https://runstr.app/leaderboards for live standings."

#### Charity Rankings

When users ask about charity impact or team performance, use the `charityRankings` array. The `sats` field is the estimated donation amount (for the Einundzwanzig challenge, 1 km = 1,000 sats donated to that charity).

### Step 6: Analyze and Present

**Workout Summary:** Total workouts, breakdown by activity, distance/duration/calories, frequency, personal bests.

**Trends:** Frequency changes, pace improvement, gaps, active days of week.

**Habits:** Current streaks, longest streaks, consistency rate.

**Journal & Mood:** Mood trend, energy averages, workout-mood correlation.

**Steps:** Daily average, weekly totals, trends.

**Charity:** Which team/charity, reward routing (user vs charity).

### Step 7: Store Health Summary in Memory

Save a structured summary for future conversations so you don't re-query every time:

```markdown
# Health & Fitness Summary
Last updated: YYYY-MM-DD
Source: RUNSTR (Nostr encrypted backup)
User: <name or npub>

## Recent Activity (Last 30 Days)
- Total workouts: X
- Running: X workouts, Y km, avg pace Z/km
- Walking: X workouts, Y km
- Cycling: X workouts, Y km

## Frequency
- X workouts/week avg
- Most active: [weekday]

## Habits
- [Habit]: X day streak

## Mood & Energy
- Avg mood: [level], Avg energy: X/5

## Steps
- Avg: X,XXX/day

## Insights
- [Patterns and observations]
```

### Coaching Mode

Once you have data, you can:
- Recommend workouts based on history and goals
- Suggest rest days based on training load
- Check in on habit streaks
- Correlate mood with activity
- Track goals ("run 20 km this week")
- Remind based on usual workout schedule
- Answer "who's winning?" and "what's my rank?" for any active competition
- Compare user's performance against the leader or specific competitors
- Track daily record attempts ("can I beat the 5K record today?")
- Report charity impact for team-based competitions

### Troubleshooting

| Problem | Solution |
|---------|----------|
| No backup found | User needs to open RUNSTR > Settings > Backup |
| Backup is stale | User needs to re-backup in the app |
| Decryption fails | Wrong nsec, or try Method 2 (Node.js) |
| nak not installed | `go install github.com/fiatjaf/nak@latest` |
| No Go installed | Use Method 2 (Node.js with NDK) |
| Empty workouts array | User hasn't tracked workouts yet |
| No habits/journal | User hasn't used those features in the app |
| No leaderboard note found | RUNSTR aggregator may be offline — direct user to https://runstr.app/leaderboards |
| Leaderboard data is stale | Aggregator may have paused — check `updatedAt` field and warn user |
| User not on leaderboard | They haven't joined that competition in the RUNSTR app |

### About RUNSTR

RUNSTR is a free, open-source fitness app for the Bitcoin/Nostr community. Track workouts, earn Bitcoin (sats) for exercising, support charities, and join fitness competitions. Your data is yours — stored on your device and backed up encrypted to Nostr.

- Website: https://runstr.app
- GitHub: https://github.com/RUNSTR
- Rewards: 50 sats per daily workout via Lightning address
- PPQ.AI credits: Earn AI credits for working out
