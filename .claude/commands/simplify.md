Codebase simplification review for RUNSTR. Dispatches parallel agents to find dead code, oversized files, duplicate services, architecture violations, and import complexity. Report-only — no changes made.

## Phase 1: Quick Metrics (run in parallel)

Run these commands to establish baseline numbers:

```bash
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -30
```

```bash
find src/services -type f -name '*.ts' | wc -l
```

```bash
grep -rl 'deprecated\|DEPRECATED\|DISABLED\|TODO.*remove\|legacy\|LEGACY' src/ --include='*.ts' --include='*.tsx' | head -30
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Dead Code Hunter
Prompt: "Find dead code in the RUNSTR React Native app that should be deleted. Scope: src/ only.

Search for and read files matching these patterns:

1. **Deprecation markers**: Find all files containing 'deprecated', 'DEPRECATED', 'DISABLED', 'TODO: remove', 'TODO: delete', 'legacy', 'LEGACY' in src/. For each file, read it and determine if it's actually dead or still referenced.

2. **Commented-out code**: Find files with 5+ consecutive commented lines that look like disabled functionality (not documentation comments). Use grep for patterns like consecutive lines starting with //.

3. **Orphaned files**: Check if these known-suspect files are imported anywhere:
   - src/services/verification/PerWorkoutVerificationService.ts (marked deprecated)
   - src/services/rewards/StepPollingService.ts (if exists)
   - src/services/rewards/StepRewardService.ts (if exists)
   - src/services/ai/ChatCoachService.ts (if exists)
   - src/services/ai/CoachClaudeService.ts (if exists)
   - src/services/ai/ModelManager.ts (if exists)
   - src/services/ai/RunstrContextGenerator.ts (if exists)
   - src/services/ai/useCoachRunstr.ts (if exists)
   - Any file in src/components/coach/ (if exists)
   For each: grep the codebase for imports of that file. If nothing imports it, it's dead.

4. **Expired event code**: Check src/constants/ for event configurations with end dates in the past (before 2026-02-25). Check if the shouldShow*() functions return false permanently. Then check where those constants are imported — if the event is permanently hidden, the import chain is dead code.

5. **Unused exports**: For files in src/services/ that export multiple functions/classes, spot-check whether each export is imported anywhere.

For EACH finding, report: file path, what it is, confidence (SAFE TO DELETE / NEEDS VERIFICATION), and estimated lines that would be removed. Sort by lines saved descending."

### Agent 2: Oversized File Splitter
Prompt: "Find files over 500 lines in RUNSTR's src/ directory and propose how to split them.

Run: find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -40

For each file over 500 lines, READ the file and analyze:

1. **What logical sections does it contain?** Look for comment headers, groups of related functions, distinct UI sections in screens.
2. **Where are the natural split points?** Usually: styles at bottom (extract to .styles.ts), helper functions (extract to utils), sub-components within a screen (extract to components/), distinct service methods that serve different features.
3. **What's the split proposal?** Be specific: 'Extract lines 400-800 (the leaderboard section) into ClubLeaderboardSection.tsx'

Prioritize by user impact:
- CRITICAL: Screens users see daily (SettingsScreen, ProfileScreen, tracker screens)
- HIGH: Core services (SupabaseCompetitionService, workoutPublishingService)
- MEDIUM: Modals and secondary screens
- LOW: Internal services and utilities

For each file, report: path, current line count, proposed splits with estimated resulting file sizes, and effort level (easy/medium/hard)."

### Agent 3: Service Consolidation Mapper
Prompt: "Map duplicate and overlapping services in RUNSTR's src/services/ directory and propose consolidation.

Investigate these known complexity hotspots by reading the files:

1. **Competition services (src/services/competition/)**: List every file, read each one's purpose, and determine:
   - Which service is the canonical leaderboard implementation?
   - Which are legacy/unused alternatives?
   - What's the actual call chain from UI → service → data?
   - Propose: which files to keep, merge, or delete

2. **Team services (src/services/team/)**: List every file and determine:
   - Which are legacy Nostr-based (pre-Supabase clubs)?
   - Which are current (used by ClubsScreen, ClubPageScreen)?
   - Is TeamMemberCache still needed now that clubs use Supabase?
   - Is TeamJoinRequestService (kind 1104) still used?
   - Propose: consolidation plan

3. **Cache services (src/services/cache/)**: List every file and determine:
   - Is UnifiedWorkoutCache actually unified or do specific caches duplicate it?
   - Which caches are actively used vs dormant?
   - Propose: which caches to keep vs merge

4. **Fitness services (src/services/fitness/)**: List every file and determine:
   - Which background sync implementations are active?
   - Is there shared logic between tracker services that should be extracted?
   - Propose: consolidation opportunities

5. **Backend services (src/services/backend/)**: Cross-reference with Nostr services to find overlap:
   - Are there features served by BOTH a Supabase service and a Nostr service?
   - Which is canonical for each feature?

For each service group, report: file inventory, dependency graph (who imports whom), canonical vs redundant services, and a specific merge/delete proposal with effort estimate."

### Agent 4: Architecture Clarity Reviewer
Prompt: "Review RUNSTR's src/ code for patterns that contradict or confuse the stated architecture. The architecture principles from CLAUDE.md are:
- Supabase is the data store
- Nostr is the identity layer (via GlobalNDKService singleton only)
- NEVER create new NDK() instances
- Rewards are destination-routed
- Background-first via HealthKit/Health Connect
- Local-first with background sync
- 500-line file limit

Read and check for:

1. **NDK violations**: Search for 'new NDK(' in src/ — any file besides GlobalNDKService.ts that creates its own NDK instance. Report each with context.

2. **Data source confusion**: Find services where it's unclear whether Nostr or Supabase is the source of truth. Check:
   - src/services/team/ — are team members from Nostr lists or Supabase club_memberships?
   - src/services/competition/ — are leaderboards from Nostr events or Supabase tables?
   - src/services/nostr/workoutPublishingService.ts — does it publish to Nostr relays, Supabase, or both?

3. **Store inconsistencies**: Check src/store/ — which stores have disabled methods, TODO comments, or methods that throw 'not implemented'? These indicate incomplete migrations.

4. **Direct service calls from components**: Check if screen/component files import from src/services/ directly instead of going through stores or hooks. Identify the worst offenders (most direct service imports).

5. **Inconsistent data fetching patterns**: Do screens use useFocusEffect, useEffect, or manual refresh inconsistently for the same type of operation? Check the 3 main tab screens (Profile, Clubs, Rewards) and compare their patterns.

6. **Navigation dead ends**: Search for navigation.navigate() calls that reference screen names not registered in AppNavigator.tsx or App.tsx's AuthenticatedStack.

For each finding: file path, line number, what the violation is, and whether it's confusing (developer will misunderstand the architecture) or actively broken."

### Agent 5: Dependency & Import Complexity
Prompt: "Analyze import complexity in RUNSTR's src/ directory to find tangled dependencies and over-coupled files.

1. **High fan-in files** (imported by many): Run grep to find which src/services/ files are imported by the most other files. List the top 15 most-imported services. Flag any that seem like god-objects.

2. **High fan-out files** (import many): For the largest files (App.tsx, NavigationDataContext.tsx, SettingsScreen.tsx), count how many unique imports they have. Files importing 20+ other files are likely doing too much.

3. **Dynamic require() calls**: Search for 'require(' in src/ (excluding node_modules, test files). Dynamic requires break tree-shaking and hide dependencies. List each with context.

4. **Circular dependency risk**: Check for cases where A imports B and B imports A (or longer chains). Focus on src/services/ and src/store/ since those are most likely to have cycles. Use grep to trace import chains for the most-imported files.

5. **Barrel file analysis**: Check if src/services/index.ts, src/components/index.ts, or similar barrel files exist. If they re-export everything, they force bundling of unused code. If they don't exist, check if the import paths are consistent.

6. **Cross-layer imports**: Find cases where:
   - Components import directly from services (bypassing stores/hooks)
   - Services import from components (wrong direction)
   - Screens import from other screens (coupling)

For each finding: the files involved, the nature of the coupling, severity (high/medium/low), and a suggested fix."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Simplification Report — [date]

## Baseline Metrics
- Total files in src/: X
- Total lines in src/: X
- Service files: X
- Files over 500 lines: X
- Files with deprecation markers: X

## Summary
- Dead code: X files / Y lines deletable
- Oversized files: X files over 500-line limit
- Service groups to consolidate: X
- Architecture violations: X
- Import complexity hotspots: X

## Quick Wins (< 30 min each, safe to do now)
[Dead file deletions, unused import cleanup, expired event code removal]

## Medium Effort (1-2 hours each)
[File splits, small service merges, pattern alignment]

## Large Refactors (half-day+ each)
[Service consolidation, architecture migration, store completion]

## Top 5 Recommendations
[Prioritized by impact — what gives the most simplification for the least effort]

## Simplification Score: X/10
[1 = spaghetti, 10 = minimal and clean. Brief justification.]
```

Present this report to the user. Lead with Quick Wins since those are immediately actionable. For Large Refactors, include enough detail that they could become their own implementation plans.
