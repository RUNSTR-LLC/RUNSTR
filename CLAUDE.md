# RUNSTR - Claude Context

## Project Overview
RUNSTR is an anonymous fitness tracker that rewards cardio workouts with Bitcoin and enables charity donations via the Nostr protocol. Built for Bitcoiners and the Nostr community, the app focuses on running, walking, and cycling.

**Core Value:** Fitness earns Bitcoin. Bitcoin supports charities.

📖 **For workout event specification, see**: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)
🔐 **For environment setup, see**: [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)
🏗️ **For full system architecture, see**: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Four Core Pillars

### 1. **Workouts** - GPS Cardio Tracking
- Core activities: Running, Walking, Cycling
- GPS tracking with real-time metrics (pace, distance, elevation, splits)
- HealthKit (iOS), Health Connect (Android), Garmin sync
- Experimental features in settings (strength, diet, wellness)
- Stored locally and submitted through Supabase-backed workout flow (kind 1301 payloads remain local compatibility data)

### 2. **Rewards** - Bitcoin for Fitness
- **50 sats** per daily workout
- Step rewards are currently disabled in UI (daily workout rewards remain active)
- Delivered via Lightning address (LNURL protocol)
- Real Bitcoin, not points or tokens
- Creates positive feedback loop for healthy behavior

### 3. **Donations** - Teams = Charities
- "Joining" a team means selecting a charity to support
- Team tag embedded in kind 1301 and kind 1 notes
- Split a percentage of rewards to your charity
- Zap charities directly from Lightning wallets (Cash App, Strike, Alby, Zeus)
- **Impact Level** XP system tracks contributions

### 4. **Events** - Fitness Competitions
- Hardcoded events (Season II, January Walking Contest)
- Participation via Supabase database
- Leaderboards by activity type (Running, Walking, Cycling)
- Bitcoin prize pools

### Target Market: Bitcoin/Nostr Community
- **50,000+ addressable market** of Bitcoiners and Nostr users
- Community already understands nsec/npub, Lightning, decentralized protocols
- Solves cold start problem by targeting knowledgeable users

## User Experience

**User Flow:** Nsec login → Profile screen → Select charity → Track workouts → Earn rewards → Join events

**Key Features:**
- **Nostr Authentication**: Direct nsec login with automatic profile import
- **Lightning Address Rewards**: Users enter Lightning address to receive sats
- **Charity Support**: Select a team (charity) to donate portion of rewards
- **HealthKit/Health Connect Sync**: Import workouts from Apple/Android health apps
- **Social Posting**: Share workouts as kind 1 posts with achievement cards
- **Event Participation**: Join competitions via Supabase, workouts count toward leaderboards

**Authentication:**
- Show login screen unless npub/nsec found in local storage
- Manual nsec input only (no platform-specific auth)
- Nsec login → derive npub → store nsec in SecureStore and npub/hex pubkey in AsyncStorage

## Key Technologies
- **Frontend**: React Native with TypeScript (Expo framework)
- **Workout Data**: Nostr kind 1301 events + HealthKit/Health Connect
- **Event Participation**: Supabase database for joining events and leaderboards
- **Authentication**: Nostr (nsec) - direct authentication only
- **Rewards**: Lightning address via LNURL protocol
- **Nostr Library**: NDK (`@nostr-dev-kit/ndk`) is the runtime relay/publish backbone; `nostr-tools` is still used in legacy/helper paths during migration
- **Global NDK Instance**: Single shared NDK instance via `GlobalNDKService`
- **Nostr Relays**: Damus, nos.lol, Primal (3 active default relays in `GlobalNDKService`)

## Nostr Event Kinds

### Core Events
- **kind 0**: Profile metadata (name, picture, about, Lightning address)
- **kind 1**: Social posts (workout shares with achievement cards)
- **kind 1301**: Workout events (distance, duration, calories, team tag)

### Kind 1301 Tags
Workouts include tags for:
- `exercise` - Activity type (running, walking, cycling)
- `distance` - Distance with unit (km or mi)
- `duration` - Duration in HH:MM:SS format
- `team` - Charity/team identifier (for donation tracking)

📖 **For complete specification, see**: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)

## Kind 1301 Workout Event Format

**Overview**: RUNSTR builds kind 1301 workout payloads locally for compatibility while authoritative workout submission/competition tracking runs through Supabase.

**Critical Format Rules**:
- Content must be plain text, NOT JSON
- Exercise type: lowercase full words (`running`, not `run`)
- Distance: separate array elements `['distance', '5.2', 'km']`
- Duration: HH:MM:SS format (`00:30:45`)

**Supported Activities**: running, walking, cycling, hiking, strength, meditation, diet, other

📖 **For complete event specification, tag requirements, and examples, see**: [docs/KIND_1301_SPEC.md](./docs/KIND_1301_SPEC.md)

## Architecture Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Four Core Pillars**: Workouts, Rewards, Donations, Events
- **Cardio Focus**: Running, Walking, Cycling are core; other features are experimental
- **Teams = Charities**: Team selection means choosing a charity to support
- **Lightning Address Rewards**: Users receive sats via LNURL protocol
- **Supabase for Events**: Event participation and leaderboards via database
- **Nostr for Workouts**: Kind 1301 events for fitness data
- **Performance First**: Aggressive caching eliminates loading states
- **Local-First**: Store locally, sync to Nostr on user action

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
- **Prevents Connection Explosion**: Before global NDK, 9 services × 3 relays = 27 WebSocket connections. After: 1 NDK × 3 relays = 3 connections (89% reduction)
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
- ✅ **ALWAYS** use `GlobalNDKService.getInstance()` for Nostr queries
- ❌ **NEVER** create new `NostrRelayManager()` instances
- ❌ **NEVER** create new `NDK()` instances (except in GlobalNDKService itself)
- ✅ **USE** `ndk.fetchEvents()` for direct queries (returns promise)
- ✅ **USE** `ndk.subscribe()` for real-time subscriptions (returns subscription object)

**Global NDK Configuration:**
- **Default Relays**: `wss://relay.damus.io`, `wss://nos.lol`, `wss://relay.primal.net`
- **Initialized**: On app startup by `GlobalNDKService`
- **Connection Timeout**: 2 seconds
- **Auto-reconnect**: Built into NDK

**Services Using Global NDK:**
- `SimpleCompetitionService` - Fetches leagues/events (kind 30100, 30101)
- `SimpleLeaderboardService` - Queries workout events (kind 1301)
- `NdkTeamService` - Team discovery (kind 33404)
- `JoinRequestService` - Join requests (kind 1104, 1105)
- All other Nostr-dependent services

**Connection Status:**
```typescript
// Check if NDK is connected
const status = GlobalNDKService.getStatus();
console.log(`${status.connectedRelays}/${status.relayCount} relays connected`);

// Force reconnect if needed
await GlobalNDKService.reconnect();
```

## Performance Optimization Strategy

**Problem**: Heavy Nostr usage causing slow app startup and loading states throughout navigation.

**Solution**: Aggressive caching with intelligent TTLs + prefetching during splash screen.

**Key Strategies:**
- **Prefetching**: Load all critical data during splash (2-3 seconds) → Zero loading states after
- **Cache-First Pattern**: Show cached data immediately, fetch fresh in background
- **Smart TTLs**: 24hrs for profiles, 5min for leaderboards, 30sec for wallet balance
- **Batch Queries**: Combine multiple Nostr filters into single fetchEvents call

**Expected Results**: App startup 2-3 seconds, instant screen navigation, 70% faster perceived performance.

📖 **For complete caching architecture, implementation patterns, and optimization techniques, see**: [docs/PERFORMANCE_GUIDE.md](./docs/PERFORMANCE_GUIDE.md)

## Project Structure
```
src/
├── components/        # Reusable UI components (<500 lines each)
│   ├── ui/           # Basic components (Card, Button, Avatar, StatusBar)  
│   ├── team/         # Team-specific components
│   ├── profile/      # Profile-specific components
│   └── fitness/      # Workout posting and display components
├── screens/          # Main app screens
├── services/         # External API integrations
│   └── notifications/ # In-app notification system (no push)
├── store/           # State management
├── types/           # TypeScript definitions
├── utils/           # Helper functions
└── styles/          # Theme system matching HTML mockups exactly
```

## App Flow Architecture

**1. Authentication**:
- Show login screen unless npub/nsec found in local storage
- Nsec login imports profile from kind 0 events
- Nsec stored in SecureStore; derived npub/hex pubkey stored in AsyncStorage

**2. Three-Tab Navigation**:
- **Profile Tab**: Workout tracking, history, settings, Lightning address entry
- **Teams Tab**: Browse/select charities to support
- **Rewards Tab**: Total earnings, Impact Level XP, donation splits

**3. Workout Flow**:
- Track cardio via GPS (Running, Walking, Cycling)
- Sync from HealthKit/Health Connect/Garmin
- Build kind 1301 payload locally for compatibility metadata
- Share as kind 1 social post with achievement card

**4. Rewards Flow**:
- Complete daily workout → Earn 50 sats
- Step rewards are currently hidden/disabled in settings
- Rewards sent to user's Lightning address via LNURL

**5. Donation Flow**:
- Select a team (charity) to support
- Set donation split percentage
- Team tag embedded in workout events
- Zap charities directly from any Lightning wallet

**6. Event Flow**:
- Join hardcoded events via Supabase
- Workouts during event period count toward leaderboard
- Leaderboards organized by activity type
- Prize pools distributed to winners

## UI Requirements
Simple three-tab interface with dark theme:
- **Colors**: Black background (#000), dark cards (#0a0a0a), borders (#1a1a1a)
- **Navigation**: Bottom tab bar with Profile, Teams, Rewards
- **Profile Tab**: Start workout, workout history, settings, Lightning address
- **Teams Tab**: Browse charities, select one to support, zap button
- **Rewards Tab**: Total sats earned, Impact Level XP, donation split settings

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
📖 **For complete Android build instructions, signing configuration, and troubleshooting, see**: [docs/ANDROID_BUILD.md](./docs/ANDROID_BUILD.md)

### **Change Types & Required Actions**
**JavaScript/TypeScript Changes (src/ files):**
- ✅ **Auto-reload**: Metro handles via Fast Refresh
- ✅ **No Xcode rebuild needed**
- 🔄 **If not appearing**: Press Cmd+R in simulator or restart Metro with `--clear`

**Native Configuration Changes:**  
- ❌ **Requires Xcode rebuild**: Changes to `app.json`, iOS permissions, new dependencies
- ❌ **No auto-reload**: Must rebuild and reinstall via Xcode
- 🔄 **Process**: Stop Metro → Make changes → Rebuild in Xcode → Restart Metro

### **Common Issues & Solutions**
- **"No script URL provided"**: Metro not running or wrong port → Start Metro on 8081
- **"Connection refused [61]"**: App can't reach Metro → Check Metro is on localhost:8081  
- **Changes not appearing**: Fast Refresh failed → Press Cmd+R or restart Metro with `--clear`
- **App crashes on startup**: Check Metro logs for JavaScript errors, not Xcode logs

## Local Data Storage

**Local Storage (AsyncStorage + SecureStore)**:
- User authentication:
  - SecureStore: user's private key (nsec)
  - `@runstr:npub` - User's public key (npub)
  - `@runstr:hex_pubkey` - User's hex-encoded public key
- Lightning address for receiving rewards
- Selected team/charity
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

📖 **For complete workflow and usage instructions, see**: [docs/PRE_LAUNCH_REVIEW_GUIDE.md](./docs/PRE_LAUNCH_REVIEW_GUIDE.md)

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

### Examples:
- "Fixed duration parser" → script tests `parseDuration("01:15:55")` returns 4555
- "Fixed Nostr query" → script runs the query and prints event count
- "Added new service method" → script calls the method and prints output
- "Debugging auth issue" → script reads AsyncStorage keys and prints state

### Rules:
- Scripts go in `scripts/verify/` (verification) or `scripts/diagnostics/` (debugging)
- Scripts must be runnable with `npx tsx <script>` (Node.js, no device needed)
- For things that NEED a device (GPS, HealthKit, UI), verify what you can in Node and note what must be manually tested
- Keep scripts small and focused -- throwaway, not a test suite
- Always run `npm run typecheck` as the baseline check
- Delete or keep old scripts as needed -- they're not permanent infrastructure

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

PPQ.ai (PayPerQ) provides access to 500+ specialized AI models via an OpenAI-compatible API, paid with Bitcoin over Lightning. Use it to enhance video creation, generate images, create music, and more.

**API Key:** Stored in `.env` as `CLAUDE_PPQ_API_KEY` (never hardcode in source files)
**Base URL:** `https://api.ppq.ai`
**Auth:** `Authorization: Bearer $CLAUDE_PPQ_API_KEY`

### Image Generation (Nano Banana)

Use Nano Banana (Gemini image models) for AI-generated images via the chat completions endpoint. These models accept text prompts and return images inline.

**Model IDs (confirmed on PPQ.ai):**
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

**For Remotion videos:** Generate images -> save to `runstr-demo-video/public/` -> use with `<Img src={staticFile("generated-bg.png")} />`

### Music Generation (ElevenLabs)

Use ElevenLabs Eleven Music for AI-generated background music and soundtracks.

**Try these endpoints (test in order):**
```bash
# Option 1: Dedicated music endpoint
curl -X POST https://api.ppq.ai/v1/audio/music \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "elevenlabs/eleven_music", "prompt": "Energetic electronic workout music, 120 BPM, dark atmosphere", "duration_ms": 30000}'

# Option 2: Music via compose endpoint
curl -X POST https://api.ppq.ai/v1/music/compose \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Energetic electronic workout music, 120 BPM", "duration_ms": 30000}'
```
Note: The exact endpoint for ElevenLabs Music on PPQ.ai needs testing. If neither works, check PPQ.ai docs or UI for the correct path.

**For Remotion videos:** Generate music -> save MP3 to `public/` -> use with `<Audio src={staticFile("bg-music.mp3")} />`

### Text-to-Speech (Voiceovers)

**Endpoint:** `POST /v1/audio/speech`
```bash
curl -X POST https://api.ppq.ai/v1/audio/speech \
  -H "Authorization: Bearer $CLAUDE_PPQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "RUNSTR. Run. Earn Bitcoin. Support Charities.", "model": "deepgram_aura_2", "voice": "aura-2-apollo-en"}' \
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

### Audio Models

- `openai/gpt-audio` -- GPT Audio (full, ~$0.011/query)
- `openai/gpt-audio-mini` -- GPT Audio Mini (~$0.003/query)

### Video Enhancement Workflow

When creating enhanced Remotion videos with PPQ.ai:
1. **Generate background images** via Nano Banana -> save to `public/` -> `<Img>` in scenes
2. **Generate voiceover** via TTS -> save to `public/` -> `<Audio>` in Remotion
3. **Generate background music** via ElevenLabs -> save to `public/` -> `<Audio>` in Remotion
4. **Generate subtitles** via STT on voiceover -> parse SRT -> animate text in scenes
5. **Write scripts** via chat LLM -> feed into TTS pipeline

### Recommended Models by Task

| Task | Model | Cost |
|------|-------|------|
| Background images | `google/gemini-2.5-flash-image` (Nano Banana) | ~$0.001/image |
| Hero/promo images | `google/gemini-3-pro-image-preview` (Nano Banana Pro) | ~$0.005/image |
| Voiceovers | `deepgram_aura_2` via `/v1/audio/speech` | fractions of a cent |
| Subtitles | `nova-3` via `/v1/audio/transcriptions` | fractions of a cent |
| Script writing | `claude-haiku-4.5` via `/v1/chat/completions` | ~$0.005/query |
| Background music | `elevenlabs/eleven_music` (test endpoint) | TBD |

### Cost
Pay-per-query via Lightning. No subscription required. Budget-friendly: most operations cost fractions of a cent. Image generation is the most expensive at ~$0.005/image with Nano Banana Pro.

## Git Workflow Requirements

**CRITICAL: All code changes go through branches and pull requests. NEVER push directly to main.**

📖 **For full workflow details, see**: [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)

### Version Branch Model
All work happens on a **version branch** (e.g., `v1.6.8`). This is the next release. All features, fixes, and changes go here. When it's ready to ship, merge to main, tag the release, build the APK.

### Rules (Claude MUST follow these automatically):
1. **At session start**, check if a version branch exists and switch to it:
   ```bash
   git checkout v1.6.8  # or whatever the current version branch is
   ```
   - If no version branch exists, ask the user what version to create
   - Branch name = version number (e.g., `v1.6.8`, `v1.7.0`)
2. **Commit early and often** -- after every meaningful change, don't wait to be asked
   - Run `npm run typecheck` before every commit
   - Stage specific files (`git add src/path/to/file.ts`) -- NEVER use `git add .`
   - Use prefix format: `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`
   - ✅ Commit: working fixes, completed feature steps, doc updates
   - ❌ Don't commit: broken code, TypeScript errors, secrets
3. **All changes stay on the version branch** so the user can test everything together locally
4. **Push regularly** to back up work on GitHub:
   ```bash
   git push -u origin v1.6.8
   ```
5. **When ready to release**, open a PR from the version branch to main, merge, tag, and build:
   ```bash
   gh pr create --title "Release: v1.6.8" --body "..."
   # After merge:
   git checkout main && git pull origin main
   git tag -a v1.6.8 -m "Release: Version 1.6.8"
   git push origin v1.6.8
   ```
6. **NEVER push directly to main** -- all changes merge via PR

## Folder Documentation Requirements
**Update folder READMEs when adding/removing/changing files:**
- Every src/ folder must have README.md listing all files
- Keep descriptions concise (1-2 sentences per file)
- Update READMEs as part of file modification commits

## Current Development Status (Jan 2026)
✅ Three-tab navigation (Profile, Teams, Rewards)
✅ Nostr authentication with nsec
✅ GPS cardio tracking (Running, Walking, Cycling)
✅ HealthKit, Health Connect, Garmin sync
✅ Kind 1301 workout publishing
✅ Kind 1 social posts with achievement cards
✅ Daily rewards (50 sats/workout)
⚠️ Step rewards pipeline exists but UI/runtime exposure is currently paused in Settings
✅ Lightning address reward delivery via LNURL
✅ Teams = Charities with donation splitting
✅ Impact Level XP system
✅ Hardcoded events with leaderboards (Season II, January Walking)
✅ Supabase event participation
✅ All TypeScript compilation successful



## CRITICAL WALLET ARCHITECTURE RULES
**⚠️ NEVER use nostr-tools in wallet code - Use NDK exclusively**
- **NDK handles ALL Nostr operations** including key generation, nip19 encoding/decoding
- **No library mixing** - NDK has everything needed built-in for Nostr functionality
- **Crypto polyfill**: Must use `react-native-get-random-values` imported FIRST in index.js
- **Why this matters**: Mixing NDK with nostr-tools causes crypto errors and initialization failures
- **Key generation**: Use `NDKPrivateKeySigner.generate()` NOT `generateSecretKey()` from nostr-tools

## Lessons Learned
📖 **For detailed troubleshooting history and prevention strategies, see**: [docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md)


## Important Notes
- All files must stay under 500 lines of code for maintainability
- **Core User Journey**: Login → Select charity → Track workouts → Earn rewards → Donate
- **Three-Tab Focus**: Profile (workouts), Teams (charities), Rewards (earnings)
- **Teams = Charities**: Always use this framing, not "social groups"
- **Cardio Focus**: Running, Walking, Cycling are core activities
- **Bitcoin, not crypto**: Never use "cryptocurrency" - Bitcoin is Bitcoin
- **Lightning Address**: Users receive rewards via LNURL, no NWC required
- **Real Data Only**: No mock data - all functionality uses actual Nostr/Supabase