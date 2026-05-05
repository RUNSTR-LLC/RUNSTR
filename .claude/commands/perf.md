Performance audit for RUNSTR. Dispatches parallel agents to find render bottlenecks, unbounded queries, memory leaks, bundle weight issues, and animation jank. Report-only, scoped to src/.

## Phase 1: Quick Metrics (run in parallel)

```bash
grep -rn 'useState\|useEffect\|useMemo\|useCallback' src/screens/ --include='*.tsx' | wc -l
```

```bash
grep -rn '\.select(' src/services/ --include='*.ts' | grep -v '\.limit(' | head -20
```

```bash
grep -rn 'setInterval\|setTimeout' src/ --include='*.ts' --include='*.tsx' | grep -v 'clear' | head -20
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Render Performance Scanner
Prompt: "Audit RUNSTR React Native screens for render performance issues. Read all main screen files in src/screens/ (top-level .tsx files) and the heaviest components.

Look for:

1. **Missing useMemo**: Expensive computations (array.filter, array.map, array.sort, Object.keys, JSON.parse) inside component bodies without useMemo. These recompute every render.

2. **Missing useCallback**: Functions passed as props to child components or FlatList without useCallback. Each render creates a new function reference, causing child re-renders.

3. **Inline object/array creation in JSX**: style={{...}} or data={[...]} in JSX creates new references each render. Look for inline styles not in StyleSheet, and inline arrays/objects passed as props.

4. **FlatList optimization gaps**: FlatList components without:
   - keyExtractor (forces index-based keys)
   - getItemLayout (disables scroll-to-index optimization)
   - windowSize tuning (default renders too many offscreen items)
   - maxToRenderPerBatch
   - Missing React.memo on renderItem components

5. **Unnecessary re-renders**: Components that subscribe to entire store slices when they only need one field. Look for `useUserStore()` (subscribes to everything) vs `useUserStore(state => state.user)` (subscribes to one field).

For EACH finding, report: file:line, severity (CRITICAL/HIGH/MEDIUM/LOW), what the issue is, and the fix."

### Agent 2: Query & Network Efficiency
Prompt: "Audit RUNSTR services for query and network efficiency issues. Read all files in src/services/ that make Supabase or Nostr queries.

Look for:

1. **Unbounded Supabase queries**: .select() without .limit(). Any query that could return thousands of rows without pagination. Check SupabaseCompetitionService, SupabaseRewardService, ClubService, ClubMembershipService, DailyLeaderboardService.

2. **Unbounded Nostr subscriptions**: NDK subscriptions without limit or since filters. These pull entire relay history. Check services in src/services/nostr/, src/services/competition/, src/services/cache/.

3. **N+1 query patterns**: Loops that make individual queries (fetching profile for each member instead of batch fetching). Look for patterns like: members.forEach(m => fetchProfile(m.pubkey)).

4. **Duplicate fetches on screen focus**: useFocusEffect that unconditionally refetches data that hasn't changed. Check the 3 main tab screens (Profile, Clubs, Rewards) — do they check cache freshness before refetching?

5. **Missing request deduplication**: Multiple components requesting the same data simultaneously without coordination. Check if concurrent calls to the same service method are deduplicated.

For EACH finding: file:line, severity, what the query is, estimated impact (how many excess rows/requests), and the fix."

### Agent 3: Memory & Subscription Leak Hunter
Prompt: "Audit RUNSTR for memory leaks and subscription leaks. Read screens and services that create subscriptions, intervals, or event listeners.

Look for:

1. **useEffect without cleanup**: useEffect hooks that create subscriptions, intervals, timers, or event listeners but don't return a cleanup function. Check ALL screen files in src/screens/ and src/screens/activity/.

2. **Growing Maps/Sets without eviction**: In-memory caches (Map, Set, object literals used as caches) that grow without bounds. Check src/services/cache/, src/services/team/TeamMemberCache.ts, and any service with a private cache Map.

3. **Nostr subscriptions never stopped**: NDK subscriptions created but never .stop()'d. Check services that call ndk.subscribe() — is the subscription reference saved and cleaned up?

4. **Timers without cleanup**: setInterval/setTimeout without corresponding clearInterval/clearTimeout in cleanup. Check tracker screens especially (RunningTrackerScreen, CyclingTrackerScreen, WalkingTrackerScreen, HikingTrackerScreen).

5. **Event listeners without removal**: addEventListener calls without corresponding removeEventListener in cleanup. Check AppState listeners, keyboard listeners, Linking listeners.

For EACH finding: file:line, severity (CRITICAL if causes OOM, HIGH if measurable growth, MEDIUM if theoretical), and the fix."

### Agent 4: Startup & Bundle Weight
Prompt: "Audit RUNSTR's startup path and import weight. Read src/App.tsx, src/index.js, and trace the synchronous import chain.

Look for:

1. **Heavy synchronous imports on startup**: Libraries or services imported at the top of App.tsx that could be lazy-loaded. Does every import need to run before the first screen renders? Check if large services (workoutPublishingService, SupabaseCompetitionService, etc.) are imported eagerly when they could be deferred.

2. **require() defeating tree-shaking**: Dynamic require() calls in src/ that force bundling entire modules. List each with context and whether a static import would work.

3. **Large library imports for single functions**: Imports like 'import moment from moment' for a single format call, or 'import _ from lodash' for one utility. Check package.json dependencies and grep for their usage — are we importing the whole library?

4. **Screens that should be React.lazy**: Count how many screens are registered in App.tsx's navigator. Which ones are rarely visited and could benefit from lazy loading? Check if React.lazy/Suspense is used anywhere.

5. **Polyfill weight**: Check src/utils/applyGlobalPolyfills.ts and index.js. Are we shipping polyfills for features that React Native already supports? Are any polyfills only needed on one platform but shipped to both?

For EACH finding: file:line, severity, estimated bundle impact (KB if knowable), and the fix."

### Agent 5: Animation & UI Thread
Prompt: "Audit RUNSTR for animation performance and UI thread issues. Read tracker screens (RunningTrackerScreen, CyclingTrackerScreen, WalkingTrackerScreen, HikingTrackerScreen) and any components using Animated or LayoutAnimation.

Look for:

1. **Animations without useNativeDriver**: Animated.timing/spring/decay calls without useNativeDriver: true. Non-native animations run on the JS thread and cause jank during user interaction.

2. **Heavy JS computation during animations**: State updates or expensive calculations that run while animations are active. Look for rapid setState calls in tracker screens (distance/pace updates during GPS tracking).

3. **StyleSheet.create inside render**: StyleSheet.create() called inside component body instead of outside. This recreates the stylesheet object every render.

4. **Large images without optimization**: Image components without resizeMode, without specific width/height (causes layout thrashing), loading full-resolution images for thumbnails. Check avatar images, club banners, event images.

5. **ScrollView with many children**: ScrollView (not FlatList) rendering lists of items. If a ScrollView maps over an array of 20+ items, it should be FlatList for virtualization. Check settings sections, member lists, workout history.

For EACH finding: file:line, severity (CRITICAL if visible jank, HIGH if measurable, MEDIUM if preventive), and the fix."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Performance Audit — [date]

## Baseline Metrics
- React hooks in screens: X
- Unbounded queries found: X
- Timers/subscriptions without cleanup: X

## Summary
- Render inefficiencies: X
- Query/network issues: X
- Memory leak risks: X
- Bundle weight concerns: X
- Animation jank risks: X

## Findings by Priority

### Critical (visible jank or OOM risk)
[Issues that users can feel — dropped frames, growing memory, slow startup]

### High (measurable slowdown)
[Issues that show up in profiling — excess renders, unnecessary network calls]

### Medium (suboptimal)
[Performance debt — missing optimizations that would help at scale]

### Low (micro-optimization)
[Nice-to-have improvements with marginal impact]

## Top 5 Recommendations
[Prioritized by user-perceptible impact]

## Performance Score: X/10
[1 = sluggish, 10 = buttery smooth. Brief justification.]
```

Present this report to the user. Lead with Critical findings since those affect user experience directly.
