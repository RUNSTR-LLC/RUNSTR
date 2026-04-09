Data integrity and infrastructure health check for RUNSTR. Dispatches parallel agents to find schema mismatches, network fragility, cache incoherence, background sync gaps, and missing error handling. Report-only, scoped to src/.

## Phase 1: Quick Metrics (run in parallel)

```bash
grep -rn 'try {' src/services/ --include='*.ts' | wc -l
```

```bash
grep -rn '\.from(' src/services/ --include='*.ts' | head -20
```

```bash
grep -rn 'catch.*{\s*}' src/ --include='*.ts' --include='*.tsx' | head -20
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Supabase Schema Alignment
Prompt: "Audit RUNSTR's TypeScript types against actual Supabase query usage for schema mismatches. Read:
- src/utils/supabase.ts (type definitions)
- src/types/ (all type files)
- All files in src/services/backend/

Check:

1. **Type definitions vs query usage**: For each Supabase table type defined in supabase.ts or types/, check the services that query that table. Do the queries reference columns that aren't in the type? Do the types define fields that no query uses?

2. **Nullable handling**: When Supabase returns nullable fields, does the TypeScript type mark them as optional (?)? Are there places where code accesses a potentially-null field without checking? Look for patterns like: data.field.toString() where field could be null.

3. **Type assertions on Supabase responses**: Search for 'as any', 'as unknown', or type assertions on Supabase query results. These bypass type checking and hide mismatches.

4. **Missing table types**: Are there Supabase .from('table_name') calls where the table doesn't have a corresponding TypeScript interface? List all table names used in queries and cross-reference with type definitions.

5. **Enum/status value alignment**: Check string literal types (status fields, type fields) in TypeScript against what the services actually write. Could a service write a status value that doesn't match the TypeScript union type?

For EACH finding: file:line, what the mismatch is, severity (BROKEN if causes runtime error, FRAGILE if hides bugs, DRIFT if just inconsistent), and the fix."

### Agent 2: Network Resilience Auditor
Prompt: "Audit RUNSTR services for network resilience — what happens when API calls fail. Read all files in src/services/ that make network calls (Supabase, Nostr, external APIs).

Check:

1. **Missing try/catch**: Async functions that make network calls without try/catch. These will throw unhandled promise rejections if the network fails. Check EVERY .from().select(), ndk.subscribe(), fetch() call.

2. **Graceful degradation**: When a network call fails, does the service: a) return cached data (good), b) return a meaningful error (OK), c) throw an unhandled error (bad), or d) fail silently with no indication (worst)? Check the main data paths: workout loading, leaderboard fetching, profile loading, reward checking.

3. **Missing timeouts**: Network calls without timeout limits. A hanging request blocks the UI indefinitely. Check Supabase queries (does the client have a global timeout?), Nostr subscriptions (is there an EOSE timeout?), fetch() calls (is there an AbortController?).

4. **Offline behavior**: What happens when the device is completely offline? Does the app: crash, show errors, show cached data, or show a helpful offline message? Check the 3 main tab screens and the workout tracking flow.

5. **Retry logic**: For transient failures (timeout, 503, network blip), are there retry mechanisms? Check workout submission (the most important path — a submitted workout must not be lost), reward delivery triggers, and background sync.

For EACH finding: file:line, the failure scenario, severity (BROKEN if data loss, FRAGILE if poor UX, HARDENING if improvement), and the fix."

### Agent 3: Cache Coherence Checker
Prompt: "Audit RUNSTR's caching layer for coherence issues — stale data, missing invalidation, and race conditions. Read:
- src/services/cache/ (all files)
- Services that use caching (grep for 'cache', 'Cache', 'TTL', 'cached')

Check:

1. **TTL appropriateness**: For each cached data type, check the TTL. Is leaderboard data cached for too long (showing stale rankings)? Is profile data cached for too short (excessive fetches)? List all TTLs with the data they cache.

2. **Write-through invalidation**: When a user performs an action that changes data (submit workout, join club, change destination), is the relevant cache invalidated? Trace: user submits workout → does the leaderboard cache invalidate? User joins club → does the club members cache invalidate?

3. **Stale reads causing wrong behavior**: Could stale cached data cause the app to make incorrect decisions? Examples: cached competition status shows 'active' when it's ended; cached membership shows 'member' after being removed; cached reward destination is outdated.

4. **Race conditions**: Can concurrent cache reads and writes produce inconsistent state? Example: two background syncs running simultaneously both read the cache, both write back, one's changes are lost. Check for: cache reads followed by async work followed by cache writes without locking.

5. **Cache size limits**: Do caches have maximum size limits? Could a power user with years of data grow caches to consume excessive memory/storage? Check AsyncStorage-backed caches especially.

For EACH finding: file:line, the coherence issue, severity, and the fix."

### Agent 4: Background Sync Reliability
Prompt: "Audit RUNSTR's background sync system for reliability issues. Read:
- src/services/fitness/HealthKitBackgroundTask.ts
- src/services/fitness/HealthKitBackgroundService.ts
- src/services/fitness/AndroidBackgroundSyncTask.ts
- src/services/fitness/BackgroundSyncRegistration.ts
- src/services/fitness/HealthSyncManager.ts
- src/services/fitness/healthKitService.ts
- src/services/fitness/healthConnectService.ts

Check:

1. **Partial failure handling**: If syncing 10 workouts and workout #5 fails, what happens? Do the first 4 succeed? Does the whole batch fail? Are the remaining 5 attempted? Is the failure recorded so it can be retried?

2. **Idempotency**: If a background task runs twice for the same time window, will it create duplicate workout submissions? Check: are workouts deduplicated by content/timestamp? Is there a 'last synced at' timestamp to prevent overlap?

3. **Sync gap prevention**: If a background task fails to run for 3 days (user had battery saver on), when it resumes, does it fetch all missed workouts? Or does it only fetch recent ones, creating a gap? Check the 'since' parameter on HealthKit/Health Connect queries.

4. **Error reporting**: When background sync fails, is the failure logged somewhere the user can see? Or does it fail silently? Can the user trigger a manual re-sync if automatic sync missed something?

5. **Platform-specific edge cases**: iOS: what happens when HealthKit background delivery fires but the app has been terminated? Android: what happens when WorkManager runs during Doze mode? Are there platform-specific failure modes not handled?

For EACH finding: file:line, the failure scenario, severity (BROKEN if data loss, FRAGILE if missed syncs, HARDENING if edge case), and the fix."

### Agent 5: Error Handling Coverage
Prompt: "Audit RUNSTR screens and services for error handling completeness. Read the main screen files and critical services.

Check:

1. **Async without error handling**: Functions marked async that don't have try/catch or .catch(). These create unhandled promise rejections. Focus on: screen useEffect hooks, event handlers (onPress callbacks that call async services), store actions.

2. **Silent failures**: Operations that catch errors but do nothing (empty catch blocks, catch that only console.logs). The user has no idea something went wrong. Check: workout submission, reward delivery, club operations, profile updates.

3. **Raw error messages**: Error displays that show technical error messages to users instead of friendly text. Look for: Alert.alert with error.message, toast notifications with stack traces, error states showing 'TypeError: Cannot read property...'

4. **Missing error boundaries**: React error boundaries prevent one component crash from taking down the whole screen. Check: are error boundaries wrapped around major screen sections? What happens if a single list item throws during render — does the whole screen crash?

5. **Missing loading/error states in UI**: Screens that fetch data but don't show: a loading indicator during fetch, an error message if fetch fails, or a retry button. The user sees a blank screen with no explanation. Check all main screens.

6. **Unhandled promise rejections at top level**: In App.tsx and AuthContext.tsx, are all initialization promises properly caught? A rejection during app startup could crash the entire app.

For EACH finding: file:line, what fails and how the user experiences it, severity, and the fix."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Infrastructure Health Check — [date]

## Baseline Metrics
- Try/catch blocks in services: X
- Supabase table queries: X
- Empty catch blocks: X

## Summary
- Schema mismatches: X
- Network fragility issues: X
- Cache coherence problems: X
- Background sync gaps: X
- Error handling gaps: X

## Findings by Severity

### Broken (data corruption or loss risk)
[Issues that could cause lost workouts, wrong leaderboards, or data inconsistency]

### Fragile (works but fails ungracefully)
[Issues where failure produces poor UX — blank screens, silent failures, confusing errors]

### Hardening (defense-in-depth improvement)
[Missing safety nets that would catch problems before users notice them]

## Top 5 Recommendations
[Prioritized by data integrity impact]

## Health Score: X/10
[1 = house of cards, 10 = battle-tested. Brief justification.]
```

Present this report to the user. Lead with Broken findings since those risk data integrity.
