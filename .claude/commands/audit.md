Pre-release audit for RUNSTR. Dispatches parallel agents to find bugs, performance issues, and broken flows before shipping.

## Phase 1: Automated Checks (run in parallel)

Run these three commands and collect results:

```bash
npm run typecheck 2>&1 | tail -20
```

```bash
npx tsx scripts/maintenance/preLaunchAudit.ts 2>&1
```

```bash
git diff main --stat
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Critical User Flow Audit
Prompt: "Audit the critical user flows in RUNSTR for bugs, crashes, and broken paths. Check these files thoroughly:
- src/screens/ProfileScreen.tsx (main screen - does it render correctly?)
- src/screens/ClubsScreen.tsx (club browsing and joining)
- src/screens/RewardsScreen.tsx (reward display and destination)
- src/screens/LoginScreen.tsx (auth flow - anonymous and advanced)
- src/screens/activity/ActivityTrackerScreen.tsx (workout start flow)
- src/navigation/AppNavigator.tsx (are all screens registered?)
- src/navigation/BottomTabNavigator.tsx (tab navigation)

Look for: undefined variable references, missing null checks on navigation params, screens referenced but not imported, broken conditional rendering, race conditions in useEffect, missing error boundaries on critical paths. Report file:line for each issue."

### Agent 2: Performance & Memory Audit
Prompt: "Audit RUNSTR services and data-heavy screens for performance issues. Check:
- src/services/nostr/GlobalNDKService.ts (connection handling, query patterns)
- src/services/backend/SupabaseCompetitionService.ts (query efficiency)
- src/services/team/TeamMemberCache.ts (cache invalidation, memory)
- src/services/wot/WoTService.ts (Web of Trust calculations)
- src/services/verification/VerificationService.ts (verification flow)
- src/services/verification/PerWorkoutVerificationService.ts
- src/services/rewards/SupabaseRewardService.ts (reward delivery)
- src/services/backup/BackupService.ts (backup reliability)
- src/services/ai/PPQAccountService.ts (AI service integration)
- src/contexts/NavigationDataContext.tsx (data fetching on mount)

Look for: unbounded queries (no limit/since), missing cache TTLs, N+1 query patterns, useEffect without cleanup, subscriptions without unsubscribe, excessive re-renders, large data in state, missing error handling on network calls, stale closures. Report file:line for each issue."

### Agent 3: Recent Changes Risk Assessment
Prompt: "Review all files changed since main branch to assess release risk. Run 'git diff main' on each changed file and look for:
- Incomplete implementations (TODO, FIXME, HACK comments)
- Commented-out code that should be removed or uncommented
- New features missing error handling
- Breaking changes to existing interfaces
- New imports that might not be installed
- Hardcoded values that should be configurable
- Console.log statements that should be removed for production
- Any TypeScript 'any' types in new code

Focus especially on files in src/services/ and src/components/ that changed. Report specific issues with file:line references."

### Agent 4: UI/UX Consistency Audit
Prompt: "Audit RUNSTR UI components and screens for user-facing issues. Check:
- src/components/compete/EventsContent.tsx
- src/components/events/DynamicEventCard.tsx
- src/components/events/EinundzwanzigEventCard.tsx
- src/screens/RewardsScreen.tsx
- src/screens/ClubsScreen.tsx
- src/screens/ProfileScreen.tsx
- All files in src/screens/activity/

Look for: missing loading indicators, screens that flash blank before data loads, buttons without disabled states during async ops, missing keyboard dismiss on text inputs, ScrollView/FlatList without proper styling, hardcoded strings that should be i18n, inconsistent spacing/padding, TouchableOpacity without activeOpacity, images without fallbacks, missing safe area handling. Report file:line for each issue."

### Agent 5: Data Integrity & Config Audit
Prompt: "Audit RUNSTR data handling, configuration, and constants for correctness. Check:
- src/config/charityPayments.ts (payment routing correctness)
- src/constants/charities.ts (charity data completeness)
- src/constants/januaryWalking.ts (event config)
- src/constants/runningBitcoin.ts (event config)
- src/i18n/locales/en/charities.json (translation completeness)
- src/i18n/locales/de/charities.json (translation completeness vs English)
- src/store/ (all Zustand stores - check for stale state, missing persistence)

Look for: mismatched IDs between config files, missing translations (keys in en but not de or vice versa), hardcoded dates that may have expired, invalid URLs or addresses, Zustand stores without proper persistence config, race conditions in store updates, missing validation on user input before Supabase submission. Report specific issues with file:line references."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Pre-Release Audit — [date]

## TypeCheck Status
[Pass/Fail with error count]

## Automated Audit Summary
[Results from preLaunchAudit.ts]

## Changes Since Main
[File count and areas affected]

## Critical Issues (Fix Before Release)
[Issues that could cause crashes, data loss, or broken core flows]

## High Priority (Should Fix)
[Performance problems, UX issues on critical paths]

## Medium Priority (Post-Release OK)
[UI polish, minor inconsistencies]

## Low Priority (Tech Debt)
[Code quality, minor improvements]

## Release Verdict: READY / NOT READY / READY WITH CAVEATS
[Summary recommendation]
```

Present this report to the user. If there are critical issues, list them first with specific file:line references and suggested fixes.
