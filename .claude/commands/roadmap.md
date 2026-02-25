Feature gap analysis for RUNSTR. Dispatches parallel agents to find TODOs, compare against North Star goals, identify partial features, spot infrastructure leverage opportunities, and find user journey gaps. Report-only, scoped to src/.

## Phase 1: Quick Metrics (run in parallel)

```bash
grep -rn 'TODO\|FIXME\|HACK\|PLACEHOLDER\|not implemented' src/ --include='*.ts' --include='*.tsx' | wc -l
```

```bash
grep -rn 'TODO\|FIXME\|HACK' src/ --include='*.ts' --include='*.tsx' | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -15
```

```bash
grep -rn 'Phase [2-9]\|TODO.*implement\|TODO.*wire\|TODO.*connect\|stub\|STUB\|placeholder' src/ --include='*.ts' --include='*.tsx' | head -20
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: TODO/FIXME Inventory
Prompt: "Find every TODO, FIXME, HACK, and 'not implemented' comment in RUNSTR's src/ directory. This is a comprehensive inventory.

Search for these patterns across all .ts and .tsx files in src/:
- TODO (with and without colon)
- FIXME
- HACK
- 'not implemented'
- 'placeholder'
- 'temporary'
- 'workaround'

For EACH finding:
1. File:line and the full comment text
2. Category: UI / Service / Data / Config / Infrastructure
3. Staleness estimate: check git blame to see when it was written. If older than 3 months, it's likely abandoned.
4. Effort: Quick fix (< 30 min) / Medium (1-2 hours) / Large (half-day+) / Blocked (depends on external work)

Sort by category, then by effort (quick fixes first). Provide a summary count: X total TODOs, Y quick fixes, Z abandoned (> 3 months old)."

### Agent 2: North Star Gap Analyzer
Prompt: "Compare RUNSTR's implemented features against its stated product vision. Read these files first:
- North Star.md (product identity and direction)
- CLAUDE.md (product structure section)
- USER_FLOW.md (user interaction maps)

Then check the actual codebase to verify what's implemented vs what's just planned.

For each major product area in North Star.md, assess:

1. **Activities**: Which activity types are fully implemented (GPS tracking, rep counting, timer, etc.)? Which are listed in the vision but missing or incomplete?

2. **Rewards system**: Is destination routing fully working? Are all destination types (charity, project, service, self) functional? Is the subscriber tier boost implemented?

3. **Fitness Clubs**: Is the club page complete? Captain features? Club events? Club chat? Leaderboards? What's the gap between 'Clubs as described in North Star' and 'Clubs as implemented'?

4. **Competitions**: Are daily leaderboards working? Featured events? Club events? User-created competitions? What competition types are missing?

5. **Background sync**: Is HealthKit background delivery working? Health Connect WorkManager? Auto-submit to Supabase? Auto-trigger rewards?

6. **Subscriptions**: Is the tier system (Free/Supporter/Pro) implemented? Do tiers actually gate features differently?

For EACH gap: describe what's missing, rate impact (how much users would benefit), rate effort (easy/medium/hard), and suggest whether it should be prioritized."

### Agent 3: Partial Feature Detector
Prompt: "Find features in RUNSTR that were started but never finished. These are scaffolded-but-unwired features.

Look for:

1. **Imported but unused components**: Search for component files in src/components/ that are defined but never imported by any screen. These were built but never placed in the UI.

2. **Service methods with no callers**: In src/services/, find exported functions/methods that are never imported by screens, components, or other services. These are capabilities built but never used.

3. **Navigation routes with stub screens**: Check App.tsx and AppNavigator.tsx for registered Screen components. Read each screen — does it have actual content or is it a stub (just a title and 'Coming soon' or minimal placeholder)?

4. **Config entries with no UI**: Check src/config/ and src/constants/ for configuration objects that define features, events, or options that have no corresponding UI rendering them.

5. **Store actions never called**: Check Zustand stores in src/store/ for actions (methods) that are defined but never called by any component or screen.

For EACH finding: the file, what was built, how complete it is (10%/50%/90%), what's missing to finish it, and effort to complete."

### Agent 4: Infrastructure Leverage Finder
Prompt: "Identify features that would be easy to add to RUNSTR because the infrastructure already exists. Read the main services and identify underutilized capabilities.

Think about:

1. **Data already being collected but not displayed**: Is HealthKit syncing data types that aren't shown in the UI? Are workout tags capturing info that's never surfaced? Is Supabase storing fields that no screen reads?

2. **Services with unused capabilities**: Read the public APIs of major services. Are there methods that enable features the UI doesn't use? For example, does the competition service support tournament brackets but no screen offers them?

3. **Cross-feature opportunities**: Features that could be built by combining two existing features. Example: 'Club challenges' = club membership + competition system. 'Workout streaks' = workout history + notification service.

4. **Platform features not leveraged**: Does React Native / Expo offer APIs we're not using that would enhance the app? HealthKit workout routes (GPS replay), Apple Watch complications, widget support, Shortcuts integration.

5. **Existing UI patterns that could be reused**: Components built for one screen that could power a new feature. A leaderboard component used for competitions could also show club rankings.

For EACH opportunity: what the feature is, which existing services/components it builds on, estimated effort, and expected user impact."

### Agent 5: User Journey Gap Spotter
Prompt: "Walk the main RUNSTR user journeys and identify missing quality-of-life features. Read the screen files and trace what a user experiences.

Check these journeys:

1. **New user onboarding**: After tapping 'Start' on LoginScreen, what guides the user? Is there a tutorial? Are default settings sensible? Does the app explain what to do first? Is there an empty state that helps when there's no workout history?

2. **Daily active user loop**: Profile tab → start workout → complete → see rewards → check leaderboard. At each step: is there missing feedback? Missing transitions? Confusing UI? Things the user wishes they could do but can't?

3. **Club social loop**: Browse clubs → join → chat → participate in event → see results. Are there missing social features? Can users @mention? React to messages? See who's online? Get notified about club activity?

4. **Settings & configuration**: Can users find and change everything they need to? Are there settings that should exist but don't (notification preferences, data export, units, privacy controls)?

5. **Error & edge cases**: What happens when things go wrong? Network loss during workout tracking? Failed reward delivery? Club captain deletes club while user is chatting? Are there helpful error messages or does the app fail silently?

For EACH gap: the journey step, what's missing, user impact (frustration level 1-5), effort to build, and whether it's a quick win or needs design."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Feature Roadmap Analysis — [date]

## Baseline Metrics
- Total TODOs/FIXMEs: X (Y quick fixes, Z abandoned)
- North Star goals implemented: X%
- Partial features found: X
- Infrastructure leverage opportunities: X

## Summary
- Quick wins (infrastructure exists, just wire it): X
- Medium builds (1-2 day features): X
- Large features (need design first): X

## Quick Wins (< 1 day, infrastructure exists)
[Features that can be built by connecting existing pieces]

## Medium Builds (1-3 days)
[Features that need some new code but build on existing patterns]

## Large Features (need design + planning)
[Features that need their own brainstorming session and design doc]

## North Star Alignment
[Which North Star goals are furthest from implementation?]

## Top 5 Recommendations
[Prioritized by user impact relative to effort]

## Feature Completeness Score: X/10
[1 = MVP, 10 = fully realized North Star vision. Brief justification.]
```

Present this report to the user. Lead with Quick Wins since those are immediately actionable. For Large Features, include enough context that they could become brainstorming sessions.
