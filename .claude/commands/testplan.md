Test coverage and fragility analysis for RUNSTR. Dispatches parallel agents to identify critical untested paths, fragile code, edge cases, regression risks, and propose concrete test scripts. Report-only, scoped to src/.

## Phase 1: Quick Metrics (run in parallel)

```bash
find src/ -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' | wc -l
```

```bash
find src/ -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' -o -path '*__tests__*' | head -20
```

```bash
git log --oneline --since="30 days ago" --diff-filter=M -- 'src/' | wc -l
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Critical Path Identifier
Prompt: "Map RUNSTR's highest-stakes code paths and flag every untested function in each chain. These are the paths where a regression directly costs users.

Trace these critical paths by reading each file in the chain:

**Path 1: Auth → Session**
LoginScreen.tsx → authService.ts → SecureNsecStorage.ts → UnifiedSigningService.ts → AuthContext.tsx
Question: if any function in this chain breaks, can users log in?

**Path 2: Workout → Submission → Rewards**
ActivityTrackerScreen.tsx → [tracker screen] → LocalWorkoutStorageService.ts → workoutPublishingService.ts → SupabaseCompetitionService.submitWorkoutSimple() → Supabase trigger → rewards
Question: if any function in this chain breaks, do users lose their workout or miss rewards?

**Path 3: Background Sync → Auto Submit**
HealthKitBackgroundTask.ts → healthKitService.ts → LocalWorkoutStorageService.ts → autoSubmitToSupabase()
Question: if this chain breaks, workouts from Apple Health stop syncing silently.

**Path 4: Club Operations**
ClubsScreen.tsx → ClubService.ts → ClubMembershipService.ts → ClubPageScreen.tsx → ClubChatService.ts
Question: if any function breaks, can users browse, join, and chat in clubs?

**Path 5: Reward Delivery**
SupabaseRewardService.ts → RewardDestinationService.ts → NWCWalletService.ts
Question: if this chain breaks, users don't receive rewards.

For EACH function in each chain: file:line, function name, does it have any test coverage (check for corresponding test files), and what would break if this function regressed. Sort by blast radius (most users affected first)."

### Agent 2: Fragile Code Detector
Prompt: "Find the most fragile code in RUNSTR — code most likely to break silently without tests catching it. Read services and screens looking for:

1. **High branching complexity**: Functions with 5+ if/else/switch branches. Each branch is an untested code path. Use grep to find functions, then read them to count branches. Focus on src/services/.

2. **External data parsing without validation**: Functions that parse Nostr events (kind 1301, kind 0, kind 30000), HealthKit workout objects, or Supabase responses. Are they checking for missing fields, wrong types, unexpected formats? A malformed event could crash the parser.

3. **Type assertions**: Search for 'as any', 'as unknown as', type casts that bypass TypeScript's safety. These are points where the developer said 'trust me' — they need tests most.

4. **Empty or minimal catch blocks**: try/catch where the catch does nothing or just console.logs. The error is swallowed and the function returns undefined/null — callers don't know something went wrong.

5. **Implicit dependencies**: Functions that depend on global state (singletons, module-level variables, AsyncStorage) without it being obvious from the function signature. These are hard to test and easy to break.

6. **Date/time logic**: Any code that calculates dates, durations, time zones, or compares timestamps. These are notoriously bug-prone. Check: workout duration calculations, competition start/end date checks, cooldown timers, cache TTL calculations.

For EACH finding: file:line, why it's fragile, confidence that a bug would go undetected (HIGH/MEDIUM/LOW), and what test would catch it."

### Agent 3: Edge Case Enumerator
Prompt: "For the top 10 most-imported services in RUNSTR, generate specific edge case scenarios that should be tested. Read each service and think about what could go wrong.

Find the top 10 most-imported services by running:
grep -rn 'from.*services/' src/ --include='*.ts' --include='*.tsx' | awk -F\"'\" '{print $2}' | sort | uniq -c | sort -rn | head -10

For each of the top 10:

1. **Null/undefined inputs**: What happens if the main function is called with null userId, undefined teamId, empty string? Does it handle gracefully or crash?

2. **Empty collections**: What happens with an empty workout array, empty member list, empty chat history? Does the UI handle this or crash on .length, [0], .map()?

3. **Network timeout**: What happens if the Supabase/Nostr call takes 30 seconds? Is there a timeout? Does the UI show a loading state indefinitely?

4. **Malformed external data**: What happens if a Nostr event has missing tags, wrong kind number, invalid JSON in content? What if a Supabase response has null where a string is expected?

5. **Concurrent calls**: What happens if the same function is called twice simultaneously? Does it deduplicate, race, or create duplicates?

6. **Large datasets**: What happens with 1000+ workouts, 500+ club members, 100+ competitions? Does performance degrade? Are there missing pagination limits?

For EACH edge case: the service, the scenario, expected behavior, likely actual behavior (based on reading the code), and severity if it fails."

### Agent 4: Regression Risk Scorer
Prompt: "Identify the highest-regression-risk code in RUNSTR by analyzing git history and test coverage.

1. **Frequently changed files**: Run: git log --since='30 days ago' --name-only --pretty=format: -- 'src/' | sort | uniq -c | sort -rn | head -20
These are the files that change most often. Files that change frequently and have no tests are the highest regression risk.

2. **Bug fix files**: Run: git log --since='90 days ago' --oneline --grep='Fix:' --name-only -- 'src/' | grep '^src/' | sort | uniq -c | sort -rn | head -15
Files that appear in bug fix commits have proven they contain bugs. Without tests, the same (or similar) bugs will recur.

3. **Test coverage check**: For each of the top 20 most-changed files, check if there's a corresponding test file. Run: find src/ -name '*.test.*' -o -name '*.spec.*' | head -20

4. **High-import + high-change intersection**: Cross-reference the most-imported files (highest blast radius) with the most-changed files (highest change frequency). Files that are both widely imported AND frequently changed are the most dangerous to leave untested.

5. **Recent large changes without tests**: Check the last 10 commits for files with 50+ lines changed but no corresponding test file added or modified.

For EACH high-risk file: path, change frequency, number of importers, whether it has tests, and a risk score (1-10 combining all factors). Sort by risk score descending."

### Agent 5: Test Script Proposer
Prompt: "Based on what a thorough review of the RUNSTR codebase reveals about its highest-risk untested areas, propose 15 specific test scripts. Read the most critical services and propose tests that catch the most likely regressions.

For each proposed test, provide:

1. **Test file path**: Where the test should live (e.g., scripts/verify/verify-workout-submission.ts or src/__tests__/services/workoutPublishing.test.ts)
2. **What it tests**: The specific function(s) and scenario
3. **Test type**: Unit test (isolated function), integration test (multiple services), or smoke test (end-to-end path)
4. **Inputs**: Specific test data to use
5. **Expected output**: What the test should assert
6. **Mocking needs**: Which dependencies need mocking (Supabase, Nostr, HealthKit, AsyncStorage)
7. **Priority**: Why this test matters more than others

Focus on tests for:
- Workout submission pipeline (the most critical user flow)
- Auth flow (login, session, sign-out)
- Background sync (data integrity)
- Leaderboard calculation (correctness)
- Reward destination routing (money flow)
- Cache invalidation (data freshness)
- Nostr event parsing (external data handling)

Use the project's existing verification pattern: scripts in scripts/verify/ that run with 'npx tsx'. Keep tests focused — each should test one thing and be runnable independently.

Sort by priority (highest impact test first)."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Test Coverage & Fragility Report — [date]

## Baseline Metrics
- Existing test files: X
- Critical path functions without tests: X
- Files changed in last 30 days: X
- Bug fix commits in last 90 days: X

## Summary
- Critical path gaps: X untested functions on critical paths
- Fragile code hotspots: X
- Edge cases identified: X
- High regression-risk files: X
- Proposed test scripts: 15

## Critical Gaps (untested code on critical paths)
[Functions in auth, workout submission, rewards, and sync chains with zero test coverage]

## High Risk (fragile code with no safety net)
[Code with high branching complexity, type assertions, or external data parsing — no tests]

## Medium Risk (frequently changed, never tested)
[Files that change often in commits but have no tests to catch regressions]

## Top 10 Test Scripts to Write First
[From Agent 5's proposals, ordered by risk reduction impact]

## Regression Risk Leaderboard
[Top 10 files by risk score — combines change frequency, import count, and test coverage]

## Coverage Score: X/10
[1 = flying blind, 10 = comprehensive safety net. Brief justification.]
```

Present this report to the user. Lead with Critical Gaps since those represent the highest risk. The Top 10 Test Scripts section should be actionable — a developer could start writing these immediately.
