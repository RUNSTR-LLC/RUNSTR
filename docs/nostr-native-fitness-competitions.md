# Nostr-Native Fitness Competitions Architecture

**A comprehensive guide to RUNSTR REWARDS' decentralized competition system built entirely on Nostr protocol**

---

## Table of Contents
1. [Introduction](#introduction)
2. [Core Event Kinds](#core-event-kinds)
3. [Data Flow Examples](#data-flow-examples)
4. [Architecture Insights](#architecture-insights)

---

## Introduction

RUNSTR REWARDS implements a **pure Nostr architecture** for fitness competitions - no traditional backend database, no proprietary APIs, just open Nostr events. This document provides a comprehensive breakdown of every Nostr event kind used in the application and explains how they work together to create a decentralized fitness competition platform.

### Why Nostr-Native?

**Traditional Fitness Apps**:
- Proprietary databases lock in user data
- Centralized APIs control who can access workout information
- Closed ecosystems prevent third-party innovation
- Users lose data if company shuts down

**RUNSTR's Nostr-Native Approach**:
- ✅ **Portable data**: Workouts published as kind 1301 events belong to users forever
- ✅ **Interoperable competitions**: Any app can create competitions over the same workout data
- ✅ **No vendor lock-in**: Users keep their data even if RUNSTR disappears
- ✅ **Open innovation**: Third parties can build new features on public Nostr events
- ✅ **Decentralized trust**: No central authority needed to verify competition results

---

## Core Event Kinds

### 1. Fitness & Workout Data

#### **kind 1301: Workout Events** ✅ (Foundation of all competitions)

**Purpose**: Standard RUNSTR workout/fitness tracking events compatible with NIP-101e

**Structure**:
```javascript
{
  kind: 1301,
  content: "Completed a running workout with RUNSTR!", // Plain text, NOT JSON
  tags: [
    ['d', 'workout_1234567890'],           // Unique identifier (deduplication)
    ['title', 'Morning Run'],              // Human-readable title
    ['exercise', 'running'],               // Activity type (lowercase)
    ['distance', '5.2', 'km'],             // Value + unit (separate elements)
    ['duration', '00:30:45'],              // HH:MM:SS format
    ['source', 'RUNSTR'],                  // App identification
    ['client', 'RUNSTR', '0.1.2'],         // Client + version
    ['t', 'running'],                      // Activity hashtag
    ['calories', '312'],                   // Optional: calorie count
    ['elevation_gain', '50', 'm']          // Optional: elevation with unit
  ],
  created_at: 1704067200,
  pubkey: "user_hex_pubkey"
}
```

**Activity Types**: `running`, `walking`, `cycling`, `hiking`, `swimming`, `rowing`, `workout`

**Usage**:
- **Members post workouts**: Users "Save to Nostr" from HealthKit → creates kind 1301 event
- **Competition queries**: System queries kind 1301 events from team members
- **Leaderboard scoring**: Aggregates distance, duration, calories from 1301 events
- **Single source of truth**: All workout data comes from these events

**Published by**: Users when completing workouts

**Key Insight**: kind 1301 events are **completely independent** of competitions. Users post workouts to Nostr, and competitions are just different ways of querying and scoring those existing events.

---

#### **kind 1: Social Posts** 🎨 (Social media format)

**Purpose**: Social media-style workout posts with beautiful auto-generated cards

**Structure**:
```javascript
{
  kind: 1,
  content: "Just crushed a 5K run! 🏃‍♂️\n\nDistance: 5.2 km\nTime: 30:45\nPace: 5:55/km\n\n#running #fitness #RUNSTR",
  tags: [
    ['t', 'running'],
    ['t', 'fitness'],
    ['t', 'RUNSTR']
  ],
  created_at: 1704067200,
  pubkey: "user_hex_pubkey"
}
```

**Usage**:
- When users "Post to Nostr" from HealthKit
- Creates Instagram-worthy workout achievement cards
- Shows on social feeds across Nostr network
- NOT used for competition scoring (kind 1301 handles that)

**Published by**: Users choosing social sharing

---

### 2. Team Management System

#### **kind 33404: Team Events** 🏃 (Team metadata)

**Purpose**: Team discovery and metadata storage

**Structure**:
```javascript
{
  kind: 33404,
  content: JSON.stringify({
    name: "City Runners Club",
    description: "Weekly running challenges and social runs",
    location: "San Francisco, CA",
    activityTypes: ["running", "walking"],
    rules: "Post at least 3 workouts per week",
    memberCount: 47
  }),
  tags: [
    ['d', 'team_sf_runners_123'],          // Unique team ID
    ['name', 'City Runners Club'],
    ['captain', 'captain_hex_pubkey'],     // For captain detection
    ['t', 'fitness'],
    ['t', 'running']
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"
}
```

**Usage**:
- Team discovery queries (Teams tab searches for kind 33404 events)
- Captain detection (compare user's pubkey to captain tag)
- Team profile display (name, description, member count)

**Published by**: Captains when creating teams

**Critical**: This event does NOT contain the actual member list - that's in kind 30000

---

#### **kind 30000: Participant Lists** 👥 (Single source of truth for membership)

**Purpose**: Team membership lists, challenge participant lists - **most critical event kind**

**Structure**:
```javascript
{
  kind: 30000,
  content: "",                              // Usually empty
  tags: [
    ['d', 'team_sf_runners_123_members'],  // List identifier
    ['name', 'City Runners Club Members'],
    ['p', 'member1_hex_pubkey'],           // One 'p' tag per member
    ['p', 'member2_hex_pubkey'],
    ['p', 'member3_hex_pubkey'],
    // ... up to 47 members
    ['t', 'team'],
    ['t', 'fitness']
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"              // Captain owns the list
}
```

**Usage - Teams**:
- Captain approves join request → adds member to kind 30000 list
- Captain removes member → publishes updated kind 30000 list (without that member)
- **Competition queries**: System fetches kind 30000 list to get all team member pubkeys

**Usage - Challenges**:
- Accepter creates kind 30000 list with 2 members (challenger + accepter)
- Challenge leaderboard queries kind 1301 events from those 2 pubkeys

**Why Replaceable Events**:
- kind 30000 is a **replaceable event** (same 'd' tag replaces previous version)
- Adding/removing members = publish new version of same list
- Nostr relays automatically keep only the latest version
- No duplicate lists or versioning issues

**Published by**:
- Captains (team member lists)
- Challenge accepters (2-person challenge participant lists)

**Critical Insight**: This is the **single source of truth** for "who's on the team/challenge". All competition queries start here.

---

#### **kind 30001: Generic Lists** 📋

**Purpose**: Additional categorized lists (less common than kind 30000)

**Structure**: Similar to kind 30000 but uses 't' tags instead of 'p' tags

**Usage**: Secondary lists, backup member tracking, custom categorizations

---

#### **kind 1104: Team Join Requests** 🔔

**Purpose**: Member requests to join teams

**Structure**:
```javascript
{
  kind: 1104,
  content: "I'd like to join the City Runners Club!",
  tags: [
    ['team', 'team_sf_runners_123'],       // Which team
    ['p', 'captain_hex_pubkey']            // Notify captain
  ],
  created_at: 1704067200,
  pubkey: "requester_hex_pubkey"
}
```

**Usage**:
- User clicks "Join Team" → publishes kind 1104 event
- Captain's app subscribes to kind 1104 events with ['p', captain_pubkey]
- Captain sees notification in dashboard
- Captain approves → adds requester to kind 30000 member list

**Published by**: Users requesting to join teams

---

### 3. Competition System (Leagues & Events)

#### **kind 30100: League Definitions** 🏆

**Purpose**: Ongoing team-wide competitions with recurring scoring

**Structure**:
```javascript
{
  kind: 30100,
  content: JSON.stringify({
    name: "Winter Distance Challenge",
    description: "Who can run the most kilometers this winter?",
    activityType: "running",
    competitionType: "total_distance",
    scoringFrequency: "daily",
    startDate: "2024-12-01T00:00:00Z",
    endDate: "2025-02-28T23:59:59Z",
    duration: 90,                           // days
    prizePool: 100000,                      // satoshis
    entryFee: 1000,
    maxParticipants: 50,
    requireApproval: false,
    allowLateJoining: true,
    status: "active"
  }),
  tags: [
    ['d', 'league_winter_distance_2024'],  // Unique league ID
    ['team', 'team_sf_runners_123'],       // Associated team
    ['activity_type', 'running'],
    ['competition_type', 'total_distance'],
    ['start_date', '2024-12-01T00:00:00Z'],
    ['end_date', '2025-02-28T23:59:59Z'],
    ['scoring_frequency', 'daily'],
    ['status', 'active']
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"
}
```

**Competition Types**:
- `total_distance` - Sum of all distances
- `total_duration` - Sum of all workout durations
- `consistency_streak` - Longest streak of consecutive days
- `average_pace` - Best average pace across workouts
- `most_workouts` - Total number of workouts posted

**Usage Flow**:
1. Captain creates league via Competition Wizard
2. League published as kind 30100 event
3. System fetches team members from kind 30000 list
4. System queries kind 1301 events from those members (within date range)
5. Scoring engine applies `competitionType` to calculate rankings
6. Leaderboard updates in real-time as new kind 1301 events appear

**Published by**: Captains via Competition Wizard

---

#### **kind 30101: Event Definitions** 🎯

**Purpose**: Time-bounded competitions with specific goals

**Structure**:
```javascript
{
  kind: 30101,
  content: JSON.stringify({
    name: "New Year 5K Challenge",
    description: "Fastest 5K run on New Year's Day",
    activityType: "running",
    competitionType: "fastest_5k",
    eventDate: "2025-01-01T00:00:00Z",
    targetValue: 5000,                     // meters
    targetUnit: "meters",
    prizePool: 50000,                      // satoshis
    entryFee: 500,
    maxParticipants: 25,
    requireApproval: true,
    status: "upcoming"
  }),
  tags: [
    ['d', 'event_ny_5k_2025'],             // Unique event ID
    ['team', 'team_sf_runners_123'],
    ['activity_type', 'running'],
    ['competition_type', 'fastest_5k'],
    ['event_date', '2025-01-01T00:00:00Z'],
    ['target_value', '5000'],
    ['target_unit', 'meters'],
    ['status', 'upcoming']
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"
}
```

**Event Types**:
- `fastest_5k` - Fastest 5K time
- `longest_run` - Longest single workout
- `most_calories` - Highest calorie burn in single workout
- `elevation_challenge` - Most elevation gain

**Difference from Leagues**: Events are typically single-day or short-duration with specific distance/time targets

**Published by**: Captains via Event Creation Wizard

---

#### **kind 1105: Event Join Requests** 📬 (Separate from team joins)

**Purpose**: Requests to join specific events (when `requireApproval: true`)

**Structure**:
```javascript
{
  kind: 1105,
  content: "I'd like to participate in the New Year 5K Challenge!",
  tags: [
    ['event', 'event_ny_5k_2025'],         // Which event
    ['p', 'captain_hex_pubkey']            // Notify captain
  ],
  created_at: 1704067200,
  pubkey: "requester_hex_pubkey"
}
```

**Note**: Same kind number as Challenge Requests but different context (uses 'event' tag vs 'challenge_id' tag)

---

### 4. Challenge System (1v1 Competitions)

#### **kind 1105: Challenge Requests** ⚔️

**Purpose**: Initiate 1v1 fitness challenge between two users

**Structure**:
```javascript
{
  kind: 1105,
  content: "I challenge you to a 7-day running distance battle! 💪",
  tags: [
    ['challenge_id', 'chal_alice_bob_running_7d'],  // Unique challenge ID
    ['p', 'challenged_user_pubkey'],                // Opponent to notify
    ['activity', 'running'],
    ['metric', 'distance'],
    ['duration', '7'],                              // Days
    ['wager', '10000'],                             // Satoshis
    ['start_date', '2025-01-10T00:00:00Z'],
    ['end_date', '2025-01-17T23:59:59Z'],
    ['expires_at', '1704844800']                    // Unix timestamp
  ],
  created_at: 1704067200,
  pubkey: "challenger_hex_pubkey"
}
```

**Metrics**: `distance`, `duration`, `count`, `calories`, `pace`

**Duration Options**: 3, 7, 14, 30 days

**Usage Flow**:
1. User A selects User B from team member list
2. User A configures challenge (activity, metric, duration, wager)
3. User A publishes kind 1105 challenge request
4. User B's app subscribes to kind 1105 with ['p', user_b_pubkey]
5. User B sees notification with challenge details
6. User B can accept (kind 1106) or decline (kind 1107)

**Expiration**: Challenges expire after 24 hours if not accepted

**Published by**: Challenger (the person initiating the challenge)

---

#### **kind 1106: Challenge Acceptances** ✅

**Purpose**: Accept a challenge request and create participant list

**Structure**:
```javascript
{
  kind: 1106,
  content: "Challenge accepted! Let's do this! 🔥",
  tags: [
    ['e', 'challenge_request_event_id'],           // Reference to kind 1105
    ['p', 'challenger_hex_pubkey'],                // Notify challenger
    ['accepted_at', '1704067200']
  ],
  created_at: 1704067200,
  pubkey: "challenged_user_pubkey"                 // Person accepting
}
```

**Critical Flow After Acceptance**:
1. Challenged user publishes kind 1106 acceptance
2. **Automatically creates kind 30000 participant list** with 2 members:
```javascript
{
  kind: 30000,
  content: "",
  tags: [
    ['d', 'chal_alice_bob_running_7d_participants'],
    ['name', 'Alice vs Bob Running Challenge'],
    ['p', 'alice_hex_pubkey'],                     // Challenger
    ['p', 'bob_hex_pubkey'],                       // Accepter
    ['challenge_id', 'chal_alice_bob_running_7d'],
    ['activity', 'running'],
    ['metric', 'distance'],
    ['start_date', '2025-01-10T00:00:00Z'],
    ['end_date', '2025-01-17T23:59:59Z'],
    ['wager', '10000']
  ],
  created_at: 1704067200,
  pubkey: "challenged_user_pubkey"                 // Accepter owns list
}
```

3. Challenge becomes active
4. System queries kind 1301 events from both participants
5. Leaderboard calculates winner based on metric

**Published by**: Challenged person (the person accepting the challenge)

---

#### **kind 1107: Challenge Declines** ❌

**Purpose**: Decline a challenge request

**Structure**:
```javascript
{
  kind: 1107,
  content: "Sorry, can't accept right now. Maybe next time!",
  tags: [
    ['e', 'challenge_request_event_id'],           // Reference to kind 1105
    ['p', 'challenger_hex_pubkey'],                // Notify challenger
    ['declined_at', '1704067200']
  ],
  created_at: 1704067200,
  pubkey: "challenged_user_pubkey"
}
```

**Usage**: Closes challenge loop without creating participant list or activating challenge

**Published by**: Challenged person (the person declining)

---

### 5. Notification System

#### **kind 1101: Competition Announcements** 📣

**Purpose**: New competition/league/event announcements

**Structure**:
```javascript
{
  kind: 1101,
  content: "New league starting: Winter Distance Challenge! Join now and compete for 100K sats!",
  tags: [
    ['competition_id', 'league_winter_distance_2024'],
    ['event_type', 'league'],
    ['start_time', '1704067200'],
    ['prize_pool', '100000'],
    ['p', 'member1_pubkey'],                       // Notify each member
    ['p', 'member2_pubkey'],
    ['p', 'member3_pubkey']
    // ... one 'p' tag for each team member
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"
}
```

**Usage**:
- Captain creates new competition → system publishes kind 1101
- Team members' apps subscribe to kind 1101 with their pubkey
- In-app notification appears: "New competition available!"
- Click notification → navigate to competition details

**Published by**: System/Captains when creating competitions

---

#### **kind 1102: Competition Results** 🏅

**Purpose**: Final results and prize distribution announcements

**Structure**:
```javascript
{
  kind: 1102,
  content: "Winter Distance Challenge Complete! Congratulations to our winners!",
  tags: [
    ['competition_id', 'league_winter_distance_2024'],
    ['winner', 'alice_pubkey', '1', '50000'],      // Rank, prize amount
    ['winner', 'bob_pubkey', '2', '30000'],
    ['winner', 'charlie_pubkey', '3', '20000'],
    ['total_participants', '47'],
    ['total_workouts', '1247'],
    ['p', 'alice_pubkey'],                         // Notify winners
    ['p', 'bob_pubkey'],
    ['p', 'charlie_pubkey']
  ],
  created_at: 1704067200,
  pubkey: "captain_hex_pubkey"
}
```

**Usage**:
- Competition ends → system calculates final standings
- System publishes kind 1102 with results
- Winners receive in-app notification with prize amounts
- Bitcoin prizes can be zapped directly via Lightning

**Published by**: System when competitions end

---

#### **kind 1103: Competition Starting Soon** ⏰

**Purpose**: Reminder notifications 24 hours before competition starts

**Structure**:
```javascript
{
  kind: 1103,
  content: "Winter Distance Challenge starts in 24 hours! Get ready to run!",
  tags: [
    ['competition_id', 'league_winter_distance_2024'],
    ['start_time', '1704067200'],
    ['p', 'member1_pubkey'],
    ['p', 'member2_pubkey']
    // ... all participants
  ],
  created_at: 1704067200,
  pubkey: "system_pubkey"
}
```

**Usage**: Automated reminder system triggers 24 hours before competition start

---

### 6. Bitcoin/Lightning Wallet (NIP-60/61)

#### **kind 37375: Wallet Info Events** 💰

**Purpose**: Lightning wallet configuration (NIP-60)

**Structure**:
```javascript
{
  kind: 37375,
  content: "encrypted_nwc_connection_string",      // NIP-04 encrypted
  tags: [
    ['d', 'main_wallet'],                          // Wallet identifier
    ['relay', 'wss://relay.getalby.com/v1'],
    ['mint', 'https://mint.coinos.io']
  ],
  created_at: 1704067200,
  pubkey: "user_hex_pubkey"
}
```

**Usage**:
- Auto-created on first login
- Stores encrypted NWC (Nostr Wallet Connect) credentials
- Enables instant Bitcoin zaps without manual wallet setup

**Published by**: Wallet creation service on user login

---

#### **kind 9321: Nutzap Events** ⚡

**Purpose**: Ecash token zap receipts (NIP-61)

**Structure**:
```javascript
{
  kind: 9321,
  content: JSON.stringify({
    amount: 1000,                                  // Satoshis
    mint: "https://mint.coinos.io",
    proofs: [/* ecash proofs */]
  }),
  tags: [
    ['p', 'recipient_pubkey'],
    ['amount', '1000'],
    ['e', 'workout_event_id']                      // Optional: zap for workout
  ],
  created_at: 1704067200,
  pubkey: "sender_hex_pubkey"
}
```

**Usage**:
- User taps ⚡ button → sends 21 sats → publishes kind 9321
- Long-press ⚡ → custom amount modal → publishes kind 9321
- Recipient's wallet subscribes to kind 9321 with ['p', recipient_pubkey]
- Auto-receive service claims ecash tokens every 30 seconds

**Published by**: Lightning wallet service when sending zaps

---

#### **kind 7375: Token Events** 🪙

**Purpose**: Ecash token storage for balance calculation

**Structure**:
```javascript
{
  kind: 7375,
  content: "encrypted_token_data",                 // NIP-04 encrypted
  tags: [
    ['mint', 'https://mint.coinos.io'],
    ['amount', '1000']
  ],
  created_at: 1704067200,
  pubkey: "user_hex_pubkey"
}
```

**Usage**: Background wallet sync service stores/retrieves tokens for balance calculations

---

### 7. User Profile & Discovery

#### **kind 0: Profile Metadata** 👤

**Purpose**: User profile information (standard Nostr kind)

**Structure**:
```javascript
{
  kind: 0,
  content: JSON.stringify({
    name: "Alice Runner",
    display_name: "Alice 🏃‍♀️",
    about: "Marathon runner | Bitcoin enthusiast | RUNSTR captain",
    picture: "https://example.com/alice.jpg",
    nip05: "alice@runstr.com",
    lud16: "alice@getalby.com"                     // Lightning address
  }),
  tags: [],
  created_at: 1704067200,
  pubkey: "alice_hex_pubkey"
}
```

**Usage**:
- Auto-imported on login from Nostr relays
- Displayed on profile screen, team member lists
- Lightning address enables direct zaps

**Published by**: Users updating their profile

---

#### **kind 3: Contact Lists** 🤝

**Purpose**: User's social connections (standard Nostr kind)

**Structure**:
```javascript
{
  kind: 3,
  content: "",
  tags: [
    ['p', 'friend1_pubkey'],
    ['p', 'friend2_pubkey']
  ],
  created_at: 1704067200,
  pubkey: "user_hex_pubkey"
}
```

**Usage**: Social graph, friend discovery, team member suggestions

---

## Data Flow Examples

### Example 1: Team Competition Leaderboard

**Scenario**: Captain creates "Winter Distance Challenge" league for team with 47 members

**Step-by-step data flow**:

```
1. CAPTAIN CREATES LEAGUE
   Captain uses Competition Wizard
   → Publishes kind 30100 event to Nostr
   {
     kind: 30100,
     tags: [
       ['d', 'league_winter_2024'],
       ['team', 'team_sf_runners_123'],
       ['competition_type', 'total_distance'],
       ['start_date', '2024-12-01'],
       ['end_date', '2025-02-28']
     ]
   }

2. SYSTEM FETCHES TEAM MEMBERS
   App queries Nostr for team member list
   → Queries kind 30000 with ['d', 'team_sf_runners_123_members']
   → Receives list of 47 pubkeys:
   ['alice_pk', 'bob_pk', 'charlie_pk', ...]

3. MEMBERS POST WORKOUTS
   Alice completes 5K run
   → Saves to Nostr from HealthKit
   → Publishes kind 1301 event:
   {
     kind: 1301,
     tags: [
       ['exercise', 'running'],
       ['distance', '5.2', 'km'],
       ['duration', '00:30:45']
     ],
     pubkey: 'alice_pk'
   }

4. SYSTEM QUERIES WORKOUT EVENTS
   App queries Nostr for competition workouts
   → Queries kind 1301 where:
     - authors IN ['alice_pk', 'bob_pk', 'charlie_pk', ...]  (from step 2)
     - created_at >= 2024-12-01 AND created_at <= 2025-02-28 (from step 1)
     - tags contain ['exercise', 'running']
   → Receives 1,247 workout events

5. CALCULATE LEADERBOARD
   Client-side scoring engine processes events:

   For each member pubkey:
     total_distance = SUM(distance from their kind 1301 events)

   Rankings:
   1. Alice    - 347.2 km (67 workouts)
   2. Bob      - 289.5 km (52 workouts)
   3. Charlie  - 245.8 km (48 workouts)
   ...

   Display leaderboard in real-time

6. NEW WORKOUT UPDATES INSTANTLY
   Bob posts new workout
   → kind 1301 event appears on relay
   → App's subscription receives new event
   → Recalculates Bob's total: 289.5 + 8.3 = 297.8 km
   → Leaderboard updates in UI
```

**Key Insight**: No backend database needed! Query kind 30000 → get member pubkeys → query their kind 1301 events → calculate locally.

---

### Example 2: 1v1 Challenge Flow

**Scenario**: Alice challenges Bob to a 7-day running distance battle with 10K sats wager

**Step-by-step data flow**:

```
1. ALICE INITIATES CHALLENGE
   Alice selects Bob from team member list
   → Configures challenge (running, distance, 7 days, 10K sats)
   → Publishes kind 1105 event:
   {
     kind: 1105,
     content: "I challenge you to 7 days of running!",
     tags: [
       ['challenge_id', 'alice_bob_run_7d'],
       ['p', 'bob_pubkey'],              // Notify Bob
       ['activity', 'running'],
       ['metric', 'distance'],
       ['duration', '7'],
       ['wager', '10000']
     ],
     pubkey: 'alice_pubkey'
   }

2. BOB RECEIVES NOTIFICATION
   Bob's app subscribes to kind 1105 with ['p', 'bob_pubkey']
   → Receives Alice's challenge request
   → In-app notification: "Alice challenged you!"
   → Bob views details: 7-day running distance, 10K sats

3. BOB ACCEPTS CHALLENGE
   Bob clicks "Accept Challenge"
   → Publishes kind 1106 acceptance:
   {
     kind: 1106,
     tags: [
       ['e', 'alice_challenge_event_id'],
       ['p', 'alice_pubkey']             // Notify Alice
     ],
     pubkey: 'bob_pubkey'
   }

4. SYSTEM CREATES PARTICIPANT LIST
   Upon seeing kind 1106, system auto-publishes kind 30000:
   {
     kind: 30000,
     tags: [
       ['d', 'alice_bob_run_7d_participants'],
       ['p', 'alice_pubkey'],            // Participant 1
       ['p', 'bob_pubkey'],              // Participant 2
       ['challenge_id', 'alice_bob_run_7d'],
       ['metric', 'distance'],
       ['start_date', '2025-01-10'],
       ['end_date', '2025-01-17'],
       ['wager', '10000']
     ],
     pubkey: 'bob_pubkey'                // Bob owns the list
   }

   Challenge is now ACTIVE!

5. BOTH POST WORKOUTS
   Alice runs 8.2 km → publishes kind 1301
   Bob runs 10.5 km → publishes kind 1301
   Alice runs 6.7 km → publishes kind 1301
   Bob runs 5.8 km → publishes kind 1301
   ...continues for 7 days...

6. SYSTEM CALCULATES WINNER
   App queries kind 30000 for participants
   → Gets ['alice_pubkey', 'bob_pubkey']

   App queries kind 1301 events where:
     - authors IN ['alice_pubkey', 'bob_pubkey']
     - created_at between 2025-01-10 and 2025-01-17
     - tags contain ['exercise', 'running']

   Calculate totals:
   - Alice: 52.3 km (7 workouts)
   - Bob: 61.8 km (8 workouts)

   Winner: BOB! 🏆

7. PRIZE DISTRIBUTION
   Alice's wallet automatically zaps 10K sats to Bob
   → Publishes kind 9321 nutzap event
   → Bob's wallet auto-receives tokens
   → Bob sees notification: "You won 10,000 sats!"
```

**Key Insight**: Challenge acceptance automatically creates a kind 30000 participant list, then same query pattern as team competitions (30000 → 1301 → calculate).

---

### Example 3: Team Member Approval Flow

**Scenario**: Charlie requests to join "City Runners Club"

**Step-by-step data flow**:

```
1. CHARLIE REQUESTS TO JOIN
   Charlie browses Teams tab
   → Finds "City Runners Club" (kind 33404 event)
   → Clicks "Request to Join"
   → Publishes kind 1104 event:
   {
     kind: 1104,
     content: "I'd love to join your team!",
     tags: [
       ['team', 'team_sf_runners_123'],
       ['p', 'captain_pubkey']           // Notify captain
     ],
     pubkey: 'charlie_pubkey'
   }

2. CAPTAIN RECEIVES NOTIFICATION
   Captain's app subscribes to kind 1104 with ['p', 'captain_pubkey']
   → Receives Charlie's join request
   → In-app notification: "New join request from Charlie"
   → Captain views Charlie's profile (kind 0 event)

3. CAPTAIN APPROVES
   Captain clicks "Approve" in dashboard
   → App fetches current kind 30000 member list
   → Adds Charlie to the list
   → Publishes updated kind 30000:
   {
     kind: 30000,
     tags: [
       ['d', 'team_sf_runners_123_members'],
       ['p', 'alice_pubkey'],
       ['p', 'bob_pubkey'],
       ['p', 'charlie_pubkey'],          // NEWLY ADDED
       // ... other members ...
       ['t', 'team']
     ],
     pubkey: 'captain_pubkey'
   }

4. CHARLIE IS NOW A MEMBER
   Because kind 30000 is replaceable, old version disappears
   → New version with 48 members is now canonical
   → Charlie's workouts now count toward team competitions
   → Charlie sees team competitions in his app

5. CHARLIE POSTS FIRST WORKOUT
   Charlie runs 5K
   → Publishes kind 1301 event
   → Team competition queries include charlie_pubkey
   → Charlie appears on team leaderboard
```

**Key Insight**: Captain approval = updating kind 30000 member list. That single action makes Charlie's workouts eligible for all team competitions.

---

## Architecture Insights

### 1. Why No Backend Database?

**Traditional Approach**:
```
User posts workout → API server → Database insert → Backend query → Leaderboard
```

**Problems**:
- Single point of failure (if server down, no competitions)
- Data silos (only RUNSTR can query the database)
- Vendor lock-in (users lose data if RUNSTR shuts down)
- Scaling costs (more users = bigger database bills)

**RUNSTR's Nostr Approach**:
```
User posts workout → kind 1301 to Nostr relays → Multiple apps can query → Client calculates leaderboard
```

**Benefits**:
- ✅ **Decentralized**: Multiple Nostr relays host the data
- ✅ **Portable**: User owns their kind 1301 events forever
- ✅ **Interoperable**: Any app can build on same workout data
- ✅ **Free infrastructure**: Nostr relays handle storage/queries
- ✅ **Offline-first**: Cache kind 30000/1301 events locally

---

### 2. Competitions as Views, Not Storage

**Key Concept**: Competitions don't store results - they're dynamic queries

**Traditional fitness app**:
```sql
CREATE TABLE competition_entries (
  user_id INT,
  competition_id INT,
  workout_id INT,
  points INT
)
```

Every workout must be explicitly "entered" into competition. If you forget to enter a workout, it doesn't count.

**RUNSTR approach**:
```javascript
// Competition is just parameters
const competition = {
  activityType: 'running',
  startDate: '2024-12-01',
  endDate: '2025-02-28',
  metric: 'total_distance'
};

// Query existing kind 1301 events
const workouts = await queryNostr({
  kinds: [1301],
  authors: teamMembers,  // from kind 30000
  since: competition.startDate,
  until: competition.endDate,
  '#exercise': [competition.activityType]
});

// Calculate on the fly
const leaderboard = calculateRankings(workouts, competition.metric);
```

**Benefits**:
- All past workouts automatically count if they match parameters
- Can create multiple competitions viewing same workout data
- No "forgot to enter" issues - kind 1301 exists independently
- Different apps can create different competition views

---

### 3. Replaceable Events for State Management

**kind 30000 member lists** use Nostr's "replaceable event" pattern:
- Same pubkey + same 'd' tag = replaces previous version
- No versioning headaches
- Always get latest state with single query

**Example**:
```javascript
// Version 1 (3 members)
{
  kind: 30000,
  tags: [
    ['d', 'team_123_members'],
    ['p', 'alice'], ['p', 'bob'], ['p', 'charlie']
  ],
  created_at: 1704067200
}

// Version 2 (4 members) - REPLACES version 1
{
  kind: 30000,
  tags: [
    ['d', 'team_123_members'],  // Same 'd' tag
    ['p', 'alice'], ['p', 'bob'], ['p', 'charlie'], ['p', 'dave']
  ],
  created_at: 1704153600
}
```

Query for `kind: 30000, '#d': ['team_123_members']` returns **only version 2** (latest).

---

### 4. Event Kind Reuse with Tag Differentiation

**kind 1105** serves two purposes:
1. **Event join requests**: `['event', 'event_id']`
2. **Challenge requests**: `['challenge_id', 'challenge_id']`

Same kind number, different context based on tags. Keeps the event kind space clean while supporting multiple features.

---

### 5. P2P Bitcoin Without Team Wallets

**Traditional approach**: Team wallet pools funds, captain distributes

**Problems**:
- Custody risk (who holds the keys?)
- Regulatory issues (money transmitter licenses?)
- Trust required (will captain actually distribute prizes?)

**RUNSTR approach**: Direct P2P zaps via NIP-60/61
- Alice zaps Bob directly (kind 9321)
- No intermediary wallet
- Non-custodial (ecash tokens)
- Instant settlement

**Benefits**:
- ✅ No custody liability
- ✅ No regulatory issues
- ✅ No trust required
- ✅ Instant payments

---

### 6. Client-Side Calculations = Better Privacy

**Because leaderboards calculate locally**:
- No server sees who's querying what
- No analytics tracking
- No server-side rate limiting
- Works offline (with cached data)

**Trade-off**: More client-side CPU usage, but worth it for privacy and decentralization.

---

### 7. Open Ecosystem Potential

**Any developer can build**:
- Different scoring algorithms over same kind 1301 data
- Alternative team management UIs
- Cross-team mega-competitions
- Workout analytics dashboards
- Social features (workout comments via kind 1 replies)
- Betting markets on competition outcomes

**All without asking RUNSTR for permission** - it's open Nostr data.

---

## Conclusion

RUNSTR REWARDS demonstrates that **decentralized fitness competitions are possible** using only Nostr events. By treating:
- **kind 1301** as the immutable workout ledger
- **kind 30000** as the team roster
- **Competitions as dynamic queries** over existing data

...we've built a system that:
- ✅ Has no backend database
- ✅ Gives users full data ownership
- ✅ Enables open innovation
- ✅ Supports instant Bitcoin payments
- ✅ Works across multiple apps

**The future of fitness is decentralized, and it's built on Nostr.** 🏃‍♂️⚡

---

## Quick Reference Summary

| Event Kind | Purpose | Published By | Critical For |
|------------|---------|--------------|--------------|
| **1301** | Workout data | Users | All competitions |
| **30000** | Member/participant lists | Captains/Accepters | All queries |
| **33404** | Team metadata | Captains | Team discovery |
| **30100** | League definitions | Captains | Ongoing competitions |
| **30101** | Event definitions | Captains | Time-bounded competitions |
| **1105** | Challenge requests / Event joins | Users | 1v1 & event participation |
| **1106** | Challenge acceptances | Challenged users | Activate challenges |
| **1107** | Challenge declines | Challenged users | Close challenge requests |
| **1104** | Team join requests | Users | Team membership |
| **1101** | Competition announcements | System | Notifications |
| **1102** | Competition results | System | Prize distribution |
| **1103** | Starting soon reminders | System | Notifications |
| **37375** | Wallet info | Wallet service | Bitcoin payments |
| **9321** | Nutzaps | Wallet service | P2P payments |
| **0** | Profile metadata | Users | Identity |
| **1** | Social posts | Users | Social engagement |

**Core Data Flow**: kind 30000 → kind 1301 → Client-side calculation → Leaderboard

**Core Architecture**: Decentralized, portable, interoperable, Bitcoin-native 🚀
