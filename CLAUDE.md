# RUNSTR - Claude Context

## What is RUNSTR

RUNSTR is a fitness app that enters your workouts into virtual competitions and rewards you for working out. Users choose where their rewards go — to their wallet, a charity, an open source project, or a service like PPQ.AI for AI credits. The app works with any device or fitness app connected to Apple Health or Health Connect, syncing workouts automatically in the background. RUNSTR is a fitness company that monetizes through subscriptions, sponsorships, and event ticket sales.

**Read [North Star.md](./North%20Star.md) for the full product identity and direction.**

## Identity & Documentation Map

| Document | Purpose |
|----------|---------|
| [North Star.md](./North%20Star.md) | Product identity, direction, and terminology guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and data flow |
| [USER_FLOW.md](./USER_FLOW.md) | User interaction maps and screen flows |
| [book/](./book/) | The RUNSTR Book — 30-chapter product documentation |
| [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md) | Workout event specification |
| [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) | Environment variables and setup |
| [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md) | Caching architecture and optimization |

## Terminology Rules

**Use "rewards" everywhere. Avoid "Bitcoin", "sats", "Lightning", "Nostr" in documentation, code comments, and user-facing text except where technically necessary in implementation code.**

- "rewards" — not "sats" or "Bitcoin"
- "micro donations" — when rewards go to a charity or project
- "AI credits" — when rewards go to PPQ.AI
- "wallet" — not "Lightning wallet"
- "password" — not "nsec" (in user-facing contexts)
- "Fitness Club" — not "Run Club"
- Never use "cryptocurrency", "blockchain", or "decentralized" in user-facing contexts

## Product Structure

### Three-Tab Navigation
- **Profile Tab**: Workout tracking, history, settings
- **Clubs Tab**: Browse and manage Fitness Clubs
- **Rewards Tab**: Earnings, reward destination, sponsor attribution

### Activity Categories (Swipeable Grid)
| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking (GPS tracking) |
| **Strength** | Pushups, Pull-ups, Sit-ups, Squats, Curls, Bench |
| **Wellness** | Guided meditation, Unguided, Breathwork, Body Scan, Gratitude |
| **Mindfulness** | Journal, Habits |
| **Other** | Diet tracking, Water tracking (off-grid) |

### Reward System
- Rewards are **funded by sponsors**, not RUNSTR
- Users choose **one destination** — no splits, no percentages
- Destinations: charities (20+), open source projects, services (PPQ.AI), or user's own wallet
- Sponsor attribution shown on Rewards page ("This month's rewards brought to you by [Sponsor]")
- Zapvertising: branded push notifications ("You received a reward from [Sponsor] for your workout")
- Free tier: base reward per qualifying daily workout + step rewards
- Subscriber tier: significantly boosted rewards per qualifying workout

### Subscription Tiers
| | Free | Supporter | Pro |
|---|---|---|---|
| Rewards per workout | Base | Boosted | Boosted |
| Premium competitions | No | Yes | Yes |
| Create Fitness Clubs | No | No | Yes |
| Create events | No | No | Yes |

### Fitness Clubs (Pro Feature)
- Club page with member leaderboard, real-time chat, events
- Captains create competitions from templates (5K, 10K, Half Marathon, Step Challenge)
- Captains earn rewards per club member workout
- **Future**: Captains connect NWC wallets for non-custodial reward pools and prize pools

### Competitions
- **Daily leaderboard** (built-in, permanent): 5K, 10K, Half Marathon, Marathon fastest times + daily steps
- **Featured events**: Distance challenges, goal completion, team competitions
- **Club events**: Captain-created competitions, all members auto-entered
- **Direction**: Moving toward user-created competitions (away from hardcoded events)

### Background Sync (Passive Earning)
- Users work out with ANY HealthKit/Health Connect compatible app or device
- iOS: HealthKit background delivery wakes the app automatically
- Android: Periodic sync every 15 minutes via WorkManager
- Workouts auto-submitted to Supabase, rewards auto-triggered
- Users earn and compete without ever opening the app

## Key Technologies
- **Frontend**: React Native with TypeScript (Expo framework)
- **Data Store**: Supabase (workouts, competitions, leaderboards, rewards, clubs, chat)
- **Identity Layer**: Nostr via NDK (authentication, profile reads, optional social sharing, encrypted backups)
- **Rewards**: External service monitors submissions, sends rewards via LNURL to chosen destination
- **Nostr Library**: NDK (@nostr-dev-kit/ndk) EXCLUSIVELY — NEVER use nostr-tools
- **Global NDK Instance**: Single shared NDK instance via `GlobalNDKService`
- **State Management**: Zustand stores + AsyncStorage (local-first, cache-first)

## What Nostr Is Used For

Nostr is the **invisible identity layer**. Users never see "Nostr" in the UI.

**Reads from Nostr:**
- User profiles (kind 0) — names, pictures, Lightning addresses
- Team/charity data (kind 33404) — for browsing destinations

**Writes to Nostr (all optional, user-initiated):**
- Social posts (kind 1) — only when user taps "Share to Social"
- Profile updates (kind 0) — when user edits their profile
- Encrypted backups (kind 30078) — auto-backup after workouts

**NOT published to Nostr:**
- Workouts — go to Supabase only (kind 1301 is created locally for structure but never sent to relays)
- Competitions, leaderboards, club data — all Supabase

### Kind 1301 Workout Event Format

Kind 1301 events are created locally and submitted to Supabase (not Nostr relays).

**Critical Format Rules**:
- Content must be plain text, NOT JSON
- Exercise type: lowercase full words (`running`, not `run`)
- Distance: separate array elements `['distance', '5.2', 'km']`
- Duration: HH:MM:SS format (`00:30:45`)

**Supported Activities**: running, walking, cycling, hiking, strength, meditation, diet, other

For complete specification: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)

## Architecture Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Supabase is the data store**: Workouts, competitions, leaderboards, rewards, clubs, chat
- **Nostr is the identity layer**: Authentication, profiles, optional social sharing, backups
- **Rewards are destination-routed**: Users pick one destination, rewards go there entirely
- **Background-first**: App works passively via HealthKit/Health Connect sync
- **Performance First**: Aggressive caching eliminates loading states
- **Local-First**: Store locally, sync in background

## Multi-Agent Workflow (MANDATORY)

**CRITICAL: ALWAYS parallelize. Launch agents aggressively. Never do sequentially what can be done concurrently.**

### When given ANY task:
1. **Break it down** into independent subtasks immediately
2. **Launch parallel agents** for every subtask that doesn't depend on another
3. **Use background agents** for long-running work (searches, builds, large refactors)
4. **Only serialize** when there's a true data dependency (task B needs output from task A)

### When given multiple tasks:
- Launch ALL of them as parallel agents simultaneously
- Each agent gets its own branch (per Git Workflow rules)
- Each agent opens its own PR when done
- Report a unified summary when all agents complete

### When given a single complex task:
- Decompose into subtasks (research, implement, test, document)
- Launch research/exploration agents in parallel first
- Follow with implementation agents once research returns
- Run typecheck and verification agents in parallel after implementation

### Agent types to use:
- **Explore agents**: Codebase research, finding files, understanding patterns
- **General-purpose agents**: Multi-step implementation, complex changes
- **Bash agents**: Running builds, tests, git operations
- **Nostr-dev-expert agents**: Any Nostr/NDK related work
- **Fitness-tracker-expert agents**: GPS tracking, HealthKit, workout features

### Examples:
- User says "fix X and add Y" → 2 parallel agents, 2 branches, 2 PRs
- User says "add hiking tracker" → 1 explore agent (research patterns) + then parallel agents for screen, service, types, navigation
- User says "investigate why X is slow" → 3 explore agents searching different parts of the codebase simultaneously
- User says "do these 5 things" → 5 parallel agents, 5 branches, 5 PRs

### Rules:
- **Default is parallel, not sequential** -- justify serialization, never justify parallelization
- **Minimum 2 agents** for any non-trivial task
- **Always report back** with a summary of what each agent did
- **If an agent fails**, don't block others -- report the failure and let the rest finish

## Global NDK Instance Architecture

**CRITICAL: The app uses a single global NDK instance for all Nostr operations**

**Why Global NDK?**
- **Prevents Connection Explosion**: Before global NDK, 9 services x 4 relays = 36 WebSocket connections. After: 1 NDK x 4 relays = 4 connections (90% reduction)
- **Eliminates Timing Issues**: New relay managers need 2-3 seconds to connect, causing "No connected relays available" errors
- **Better Performance**: Reusing one connection pool instead of creating/destroying connections per query
- **Connection Stability**: Single instance maintains persistent relay connections throughout app lifetime

**How to Use:**
```typescript
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';

// In any service that needs to query Nostr:
const ndk = await GlobalNDKService.getInstance();
const events = await ndk.fetchEvents(filter);
```

**IMPORTANT RULES:**
- ALWAYS use `GlobalNDKService.getInstance()` for Nostr queries
- NEVER create new `NostrRelayManager()` instances
- NEVER create new `NDK()` instances (except in GlobalNDKService itself)
- USE `ndk.fetchEvents()` for direct queries (returns promise)
- USE `ndk.subscribe()` for real-time subscriptions (returns subscription object)

**Global NDK Configuration:**
- **Default Relays**: `wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`, `wss://relay.nostr.band`
- **Initialized**: On app startup by `GlobalNDKService`
- **Connection Timeout**: 2 seconds
- **Auto-reconnect**: Built into NDK

**Connection Status:**
```typescript
const status = GlobalNDKService.getStatus();
console.log(`${status.connectedRelays}/${status.relayCount} relays connected`);
await GlobalNDKService.reconnect(); // Force reconnect if needed
```

## Performance Optimization Strategy

**Problem**: Heavy Nostr usage causing slow app startup and loading states throughout navigation.

**Solution**: Aggressive caching with intelligent TTLs + prefetching during splash screen.

**Key Strategies:**
- **Prefetching**: Load all critical data during splash (2-3 seconds) → Zero loading states after
- **Cache-First Pattern**: Show cached data immediately, fetch fresh in background
- **Smart TTLs**: 24hrs for profiles, 5min for leaderboards, 30sec for wallet balance
- **Batch Queries**: Combine multiple Nostr filters into single fetchEvents call

For complete caching architecture: [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md)

## Project Structure
```
src/
├── components/        # Reusable UI components (<500 lines each)
│   ├── ui/           # Basic components (Card, Button, Avatar, StatusBar)
│   ├── activity/     # Workout tracking UI (GPS, strength, wellness)
│   ├── club/         # Fitness Club components (chat, events, leaderboard)
│   ├── rewards/      # Reward destination, earnings display, sponsor banner
│   ├── profile/      # Profile-specific components
│   ├── compete/      # Competition and event components
│   └── subscription/ # Subscription tier and club creation modals
├── screens/          # Main app screens
├── services/         # External API integrations
│   ├── nostr/        # NDK-based Nostr services (identity layer)
│   ├── backend/      # Supabase services (data store)
│   ├── rewards/      # Reward destination and delivery
│   ├── fitness/      # HealthKit, Health Connect, background sync
│   ├── activity/     # GPS tracking, step counting
│   ├── competition/  # Leaderboards and events
│   └── notifications/# Push and in-app notification system
├── store/           # Zustand state management
├── types/           # TypeScript definitions
├── utils/           # Helper functions
└── styles/          # Theme system
```

## App Flow

**1. Authentication (Anonymous-First)**:
- Tap "Start" to use immediately — no login required
- Optional "Advanced" login with nsec (presented as "Password") or Amber
- Experience is the same whether logged in or not

**2. Three-Tab Navigation**:
- **Profile Tab**: Start workout, workout history, settings
- **Clubs Tab**: Browse Fitness Clubs, join/create clubs, club chat
- **Rewards Tab**: Earnings, reward destination picker, sponsor attribution

**3. Reward Destination Selection**:
- Choose one destination: charity, project, service (AI credits), or yourself
- All rewards go to that destination — no splits
- Change anytime

**4. Workout Flow**:
- Track via GPS (cardio), reps (strength), timer (wellness), or text (mindfulness)
- Or sync automatically from any HealthKit/Health Connect compatible app
- Workouts submitted to Supabase
- Rewards auto-triggered via database trigger

**5. Competition Flow**:
- Daily leaderboard always active (5K, 10K, Half, Marathon, Steps)
- Featured events run on schedules
- Club captains create events for their members
- Workouts auto-qualify for matching competitions

## UI Requirements
Simple three-tab interface with dark theme:
- **Colors**: Black background (#000), dark cards (#0a0a0a), borders (#1a1a1a)
- **Navigation**: Bottom tab bar with Profile, Clubs, Rewards
- **Profile Tab**: Start workout, workout history, settings
- **Clubs Tab**: Browse clubs, club page with chat and events
- **Rewards Tab**: Earnings, reward destination, sponsor banner

## Development Workflow & Testing Protocol

**CRITICAL: React Native/Expo requires TWO components running simultaneously:**

### **Metro Bundler (JavaScript Engine)**
- **Purpose**: Transforms and serves your React Native code to the app
- **Start Command**: `npx expo start` (starts on port 8081)
- **NEVER use `--ios` flag** - this launches Expo Go (wrong app, missing native modules)
- **Role**: Watches `src/` files, compiles TypeScript/React Native to JavaScript bundles
- **Logs**: Shows app's `console.log()`, React Native errors, service initializations
- **Hot Reload**: Changes to `src/` files appear instantly via Fast Refresh
- **Must stay running** as a persistent background process

### **Xcode (Native iOS Shell)**
- **Purpose**: Builds and runs the native RUNSTR app
- **Start Command**: `open ios/RUNSTR.xcworkspace`
- **Bundle ID**: `com.anonymous.runstr.project`
- **Role**: Compiles native iOS code, installs app on device/simulator
- **The App Logic**: Native shell downloads JavaScript from Metro at `http://localhost:8081`
- **Logs**: Shows native iOS system events, less useful for app logic debugging

### **Standard Testing Protocol**
**When user says "let's test" or requests testing, Claude should use the `runstr-simulator` skill, or follow these steps:**

1. **Check Metro Status**: Verify Metro bundler is running on port 8081
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status
   ```
   - If not running: `lsof -ti:8081 | xargs kill -9 2>/dev/null; sleep 1; npx expo start &`
   - If running on wrong port: Kill and restart on 8081
   - Only use `--clear` flag when debugging asset/cache issues

2. **Open Xcode Workspace**: `open ios/RUNSTR.xcworkspace`
   - Select iOS Simulator (not physical device unless specified)
   - Click Play button or Cmd+R

3. **Reload App** (without rebuilding in Xcode):
   ```bash
   DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; devices=json.load(sys.stdin)['devices']; print([d['udid'] for devs in devices.values() for d in devs if d['state']=='Booted'][0])")
   xcrun simctl terminate "$DEVICE_ID" com.anonymous.runstr.project
   sleep 1
   xcrun simctl launch "$DEVICE_ID" com.anonymous.runstr.project
   ```

4. **Monitor Metro Logs**: Use BashOutput tool to check Metro's console output
   - Metro logs show actual app behavior and JavaScript execution
   - Look for authentication flows, service initialization, errors
   - Ignore Xcode native system logs unless investigating native issues

### **Development Commands**
- `npm install` - Install dependencies
- `npx expo start` - **REQUIRED**: Start Metro bundler on port 8081 (NEVER use `--ios` flag)
- `npx expo start --clear` - Clear Metro cache and restart (only for asset/cache issues)
- `open ios/RUNSTR.xcworkspace` - Open Xcode, then Cmd+R to build and run
- `npm run typecheck` - TypeScript validation
- `npm run lint` - Code linting

### **Android APK Build System**
For complete Android build instructions: [docs/ANDROID_BUILD.md](./docs/ANDROID_BUILD.md)

### **Change Types & Required Actions**
**JavaScript/TypeScript Changes (src/ files):**
- Auto-reload via Fast Refresh, no Xcode rebuild needed
- If not appearing: Press Cmd+R in simulator or restart Metro with `--clear`

**Native Configuration Changes:**
- Requires Xcode rebuild: Changes to `app.json`, iOS permissions, new dependencies
- Process: Stop Metro → Make changes → Rebuild in Xcode → Restart Metro

### **Common Issues & Solutions**
- **"No script URL provided"**: Metro not running or wrong port → Start Metro on 8081
- **"Connection refused [61]"**: App can't reach Metro → Check Metro is on localhost:8081
- **Changes not appearing**: Fast Refresh failed → Press Cmd+R or restart Metro with `--clear`
- **App crashes on startup**: Check Metro logs for JavaScript errors, not Xcode logs

## Local Data Storage

**Local Storage (AsyncStorage)**:
- User authentication:
  - `@runstr:user_nsec` - User's private key (nsec)
  - `@runstr:npub` - User's public key (npub)
  - `@runstr:hex_pubkey` - User's hex-encoded public key
- Reward destination selection
- Workout posting status (to prevent duplicates)
- User preferences and settings

## Quality Assurance Requirements
**MANDATORY: Before completing any development phase:**
1. **Run Quality Checks:**
   ```bash
   npm install           # Ensure all dependencies installed
   npm run typecheck     # Verify TypeScript compilation
   npx prettier --write "src/**/*.{ts,tsx}"  # Fix formatting
   ```
2. **Review LESSONS_LEARNED.md** - Check for known issues and prevention strategies
3. **Update Folder READMEs** - Ensure all folder README.md files reflect current file structure
4. **Verify Phase Deliverables** - Ensure all planned functionality works as expected

**Note:** No phase should be marked "complete" until TypeScript compiles without errors, folder READMEs are current, and lessons learned have been reviewed.

## Pre-Launch Review System
**Use before major releases:**
- **Automated**: `npm run audit:pre-launch` (generates AUDIT_REPORT.md with categorized issues)
- **Manual**: Use `docs/CLAUDE_REVIEW_PROMPT.md` for deep Claude analysis

For complete workflow: [docs/PRE_LAUNCH_REVIEW_GUIDE.md](./docs/PRE_LAUNCH_REVIEW_GUIDE.md)

## Script-Based Verification & Debugging

**MANDATORY: After implementing any fix or feature, verify it works before reporting "done".**

### After Implementing a Fix or Feature:
1. Run `npm run typecheck` (baseline -- always do this first)
2. **Write a short verification script** (10-50 lines) that:
   - Imports the changed function/service
   - Feeds it real inputs and edge cases
   - Prints pass/fail results
   - Lives in `scripts/verify/` and runs with `npx tsx scripts/verify/<name>.ts`
3. Run the script and report results to the user before saying "done"

### When Debugging:
1. **Write a diagnostic script first** before changing code
   - Reproduce the problem in isolation
   - Print actual vs expected values
   - Lives in `scripts/diagnostics/` and runs with `npx tsx scripts/diagnostics/<name>.ts`
2. Run it to confirm the bug exists
3. Make the fix
4. Re-run the diagnostic script to confirm the fix works

### Rules:
- Scripts go in `scripts/verify/` (verification) or `scripts/diagnostics/` (debugging)
- Scripts must be runnable with `npx tsx <script>` (Node.js, no device needed)
- For things that NEED a device (GPS, HealthKit, UI), verify what you can in Node and note what must be manually tested
- Keep scripts small and focused -- throwaway, not a test suite
- Always run `npm run typecheck` as the baseline check

## Video Creation (Remotion)

**ALWAYS use Remotion for video creation. NEVER use InVideo or other video generation services.**

Remotion is a React-based video framework. The demo video project lives at:
- **Project:** `/Users/dakotabrown/runstr-demo-video/`
- **Scenes:** `src/scenes/` (each scene is a React component)
- **Assets:** `public/` (screenshots, images, audio files)
- **Output:** `out/` (rendered MP4s)

**Commands:**
- `npm run studio` -- Opens Remotion Studio at localhost:3000 for preview/editing
- `npm run render` -- Renders final MP4 to `out/runstr-demo.mp4`

**Video specs:** 1080x1920 (vertical), 30fps, dark theme (#000000 bg, #FF7B1C deep orange, #FFB366 light orange)

**When user asks to create a video:**
1. Copy any new screenshots to `public/`
2. Create/update scene components in `src/scenes/`
3. Wire scenes together using `<TransitionSeries>` from `@remotion/transitions`
4. Use the app's theme colors (deep orange #FF7B1C, burnt orange #E65100, NOT bright orange)
5. Enhance with AI-generated assets via PPQ.ai (see AI Enhancement Layer below)
6. Start studio with `npm run studio` so user can preview
7. Render with `npm run render` when ready

**Key Remotion rules:**
- Use `<Img>` from remotion (never HTML `<img>`)
- Use `staticFile()` for assets in `public/`
- All animations driven by `useCurrentFrame()` -- NO CSS animations
- Use `spring()` for natural motion, `interpolate()` for linear
- Use `<TransitionSeries>` with `fade()` or `slide()` for scene transitions
- Always `premountFor` on `<Sequence>` components

## AI Enhancement Layer (PPQ.ai)

PPQ.ai (PayPerQ) provides access to 500+ specialized AI models via an OpenAI-compatible API. Use it to enhance video creation, generate images, create music, and more.

**API Key:** Stored in `.env` as `CLAUDE_PPQ_API_KEY` (never hardcode in source files)
**Base URL:** `https://api.ppq.ai`
**Auth:** `Authorization: Bearer $CLAUDE_PPQ_API_KEY`

### Image Generation (Nano Banana)

**Model IDs:**
- `google/gemini-2.5-flash-image` -- Nano Banana (fast, ~$0.001/image)
- `google/gemini-3-pro-image-preview` -- Nano Banana Pro (highest quality, ~$0.005/image)
- `openai/gpt-5-image` -- GPT-5 Image (~$0.025/image)
- `openai/gpt-5-image-mini` -- GPT-5 Image Mini (~$0.006/image)

**Usage (via chat completions - images returned as base64 in response):**
```bash
curl -X POST https://api.ppq.ai/v1/chat/completions \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash-image",
    "messages": [{"role": "user", "content": "Generate an image: dark fitness app background with deep burnt orange (#E65100) glow, abstract running figure silhouette, 1080x1920 vertical"}]
  }'
```

### Text-to-Speech (Voiceovers)

**Endpoint:** `POST /v1/audio/speech`
```bash
curl -X POST https://api.ppq.ai/v1/audio/speech \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "RUNSTR. Fitness rewards, your way.", "model": "deepgram_aura_2", "voice": "aura-2-apollo-en"}' \
  --output voiceover.mp3
```
Voices: `aura-2-arcas-en`, `aura-2-thalia-en`, `aura-2-andromeda-en`, `aura-2-helena-en`, `aura-2-apollo-en`, `aura-2-aries-en`

### Speech-to-Text (Subtitles)

**Endpoint:** `POST /v1/audio/transcriptions`
```bash
curl -X POST https://api.ppq.ai/v1/audio/transcriptions \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -F file=@voiceover.mp3 \
  -F model=nova-3 \
  -F response_format=srt
```

### Recommended Models by Task

| Task | Model | Cost |
|------|-------|------|
| Background images | `google/gemini-2.5-flash-image` (Nano Banana) | ~$0.001/image |
| Hero/promo images | `google/gemini-3-pro-image-preview` (Nano Banana Pro) | ~$0.005/image |
| Voiceovers | `deepgram_aura_2` via `/v1/audio/speech` | fractions of a cent |
| Subtitles | `nova-3` via `/v1/audio/transcriptions` | fractions of a cent |
| Script writing | `claude-haiku-4.5` via `/v1/chat/completions` | ~$0.005/query |
| Background music | `elevenlabs/eleven_music` (test endpoint) | TBD |

## Git Workflow Requirements

**CRITICAL: All code changes go through branches and pull requests. NEVER push directly to main.**

For full workflow details: [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)

### Version Branch Model
All work happens on a **version branch** (e.g., `v1.7.0`). This is the next release. All features, fixes, and changes go here. When it's ready to ship, merge to main, tag the release, build the APK.

### Rules (Claude MUST follow these automatically):
1. **At session start**, check if a version branch exists and switch to it
   - If no version branch exists, ask the user what version to create
   - Branch name = version number (e.g., `v1.7.0`, `v1.8.0`)
2. **Commit early and often** -- after every meaningful change, don't wait to be asked
   - Run `npm run typecheck` before every commit
   - Stage specific files (`git add src/path/to/file.ts`) -- NEVER use `git add .`
   - Use prefix format: `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`
3. **All changes stay on the version branch** so the user can test everything together locally
4. **Push regularly** to back up work on GitHub
5. **When ready to release**, open a PR from the version branch to main, merge, tag, and build
6. **NEVER push directly to main** -- all changes merge via PR

## Folder Documentation Requirements
**Update folder READMEs when adding/removing/changing files:**
- Every src/ folder must have README.md listing all files
- Keep descriptions concise (1-2 sentences per file)
- Update READMEs as part of file modification commits

## CRITICAL WALLET ARCHITECTURE RULES
**NEVER use nostr-tools in wallet code - Use NDK exclusively**
- **NDK handles ALL Nostr operations** including key generation, nip19 encoding/decoding
- **No library mixing** - NDK has everything needed built-in for Nostr functionality
- **Crypto polyfill**: Must use `react-native-get-random-values` imported FIRST in index.js
- **Why this matters**: Mixing NDK with nostr-tools causes crypto errors and initialization failures
- **Key generation**: Use `NDKPrivateKeySigner.generate()` NOT `generateSecretKey()` from nostr-tools

## Lessons Learned
For detailed troubleshooting history and prevention strategies: [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md)

## Important Notes
- All files must stay under 500 lines of code for maintainability
- **Core User Journey**: Open app → Choose reward destination → Work out → Earn rewards → Compete
- **Three-Tab Focus**: Profile (workouts), Clubs (community), Rewards (earnings)
- **Fitness Clubs**: Community feature for Pro subscribers — not "teams" or "charities"
- **All Activities Matter**: Cardio, Strength, Wellness, Mindfulness — not just running
- **Background-First**: Most users earn via HealthKit/Health Connect sync, not in-app tracking
- **Rewards, not Bitcoin**: Never use Bitcoin/crypto terminology in user-facing contexts
- **Sponsor-Funded**: Rewards come from sponsors, with Zapvertising attribution
- **Real Data Only**: No mock data — all functionality uses actual Supabase/Nostr data
