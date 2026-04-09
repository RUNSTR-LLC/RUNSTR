Documentation and onboarding review for RUNSTR. Dispatches parallel agents to find stale READMEs, CLAUDE.md drift, undocumented services, onboarding gaps, and design doc freshness. Report-only, scoped to src/ and docs/.

## Phase 1: Quick Metrics (run in parallel)

```bash
find src/ docs/ -name 'README.md' | wc -l
```

```bash
grep -rn 'export function\|export const\|export class\|export async function' src/services/ --include='*.ts' | wc -l
```

```bash
find docs/plans/ -name '*.md' | wc -l
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Stale Documentation Hunter
Prompt: "Find stale and broken documentation in RUNSTR. Read every README.md in src/ subdirectories and docs/.

For EACH README found:

1. **File reference check**: Does the README list specific files? For each file mentioned, verify it still exists (use ls or glob). Flag any referenced files that have been deleted.

2. **Architecture accuracy**: Does the README describe how the code works? Read the actual code in that directory — does the description still match? Flag descriptions that reference old patterns (e.g., 'uses Nostr for team membership' when it now uses Supabase).

3. **Service inventory accuracy**: If the README lists services or components in the directory, check that the list matches the actual files. Are there new files not mentioned? Are deleted files still listed?

4. **Freshness**: Check the README's last modification date vs the directory's most recently modified file. If the code changed significantly more recently than the README, the README is likely stale.

5. **Link validity**: Check any URLs or relative file path links in the README. Do they resolve?

For EACH finding: file path, what's stale/broken, severity (BROKEN if actively misleading, STALE if partially outdated, MINOR if cosmetic), and the fix."

### Agent 2: CLAUDE.md Drift Detector
Prompt: "Verify every factual claim in RUNSTR's main documentation files against the actual codebase. Read these files:
- CLAUDE.md
- ARCHITECTURE.md
- USER_FLOW.md

For EACH claim, verify:

1. **File path references**: Every file path mentioned in these docs — does the file exist? Run ls on each referenced path.

2. **Architecture claims**:
   - 'Supabase is the data store' — are there services still using Nostr as a data store?
   - 'Nostr is the identity layer' — are there Nostr services doing more than identity?
   - '500-line file limit' — how many files violate this?
   - 'NEVER create new NDK()' — are there violations?

3. **Product structure claims**: Does the three-tab navigation description match the actual BottomTabNavigator? Do the activity types listed match the actual ActivityTrackerScreen grid?

4. **Technology claims**: Are the listed technologies still accurate? Is anything missing from the tech stack description?

5. **Project structure**: Does the directory tree in CLAUDE.md match the actual src/ structure? Are there directories not mentioned? Directories listed that don't exist?

6. **Command accuracy**: Do the development commands (npm install, npx expo start, etc.) still work as described?

For EACH drift: the document, the claim, what's actually true, severity (BROKEN if actively misleading, DRIFT if partially wrong, STALE if outdated but not harmful), and the correction."

### Agent 3: Undocumented Service Auditor
Prompt: "Find services in RUNSTR that lack documentation and would be hard for a new developer to understand. Read files in src/services/.

For each service file with 5+ exported functions:

1. **JSDoc coverage**: Count exported functions/classes. How many have JSDoc comments? What percentage?

2. **Complexity without explanation**: Read the service. Is its purpose obvious from the code, or would a developer need context to understand it? Services with complex business logic (leaderboard calculation, reward routing, workout merge) need more documentation than simple CRUD services.

3. **Non-obvious behavior**: Are there side effects, caching behaviors, or implicit dependencies that aren't documented? Example: a function that reads from cache first but falls back to network — is this documented?

4. **API contract**: For services called by multiple files, is the expected input/output documented? Could a caller misuse the API because the contract isn't clear?

Rate each undocumented service by: documentation score (0-10), complexity (simple/moderate/complex), and priority to document (based on how many files import it and how complex it is).

List the top 15 most-in-need-of-documentation services, sorted by (import count * complexity / documentation score)."

### Agent 4: Onboarding Gap Finder
Prompt: "Evaluate RUNSTR's documentation from the perspective of a new developer joining the project. Read:
- CLAUDE.md
- ARCHITECTURE.md
- docs/DEV_WORKFLOW.md
- docs/ENVIRONMENT_SETUP.md
- docs/GIT_WORKFLOW.md
- docs/PERFORMANCE_GUIDE.md

Answer these questions:

1. **Setup completeness**: Could a developer go from 'git clone' to 'app running on simulator' using only these docs? Are there missing steps? Missing dependencies? Assumed knowledge?

2. **Architecture understanding**: After reading CLAUDE.md and ARCHITECTURE.md, would a developer understand: where to put a new screen? How to add a new service? How data flows from UI to Supabase? Where to find the auth system? The docs should answer these without needing to read code.

3. **Key decisions explained**: Are the major architectural decisions documented? Why Supabase + Nostr (not just one)? Why Zustand (not Redux/Context)? Why no test suite? Why the 500-line limit? A new developer needs to know WHY, not just WHAT.

4. **Common tasks**: Are there guides for common development tasks? Adding a new screen, adding a new activity type, creating a new competition, modifying the reward flow. Or does the developer have to reverse-engineer from existing code?

5. **Debugging guide**: When things go wrong, where does a developer look? Are there documented debugging techniques for: Nostr connection issues, Supabase query failures, HealthKit sync problems, reward delivery failures?

6. **Discoverability**: Can a developer find the most important files quickly? Are the most-edited, most-imported files highlighted in the docs? Or are they buried in a flat directory listing?

For EACH gap: what's missing, who it affects (all new devs, specific scenarios), severity (BLOCKING if they can't start, CONFUSING if they'll waste time, NICE-TO-HAVE if it would help), and a suggestion for what to add."

### Agent 5: Design Doc Freshness
Prompt: "Audit RUNSTR's design documents in docs/plans/ for freshness and accuracy.

For EACH design doc in docs/plans/:

1. **Read the status field**: Is it marked Implemented, Planned, In Progress, or something else?

2. **Verify status accuracy**:
   - If 'Implemented': Check if the files it references exist and match the described implementation. Did the implementation follow the plan, or did it diverge?
   - If 'Planned': Is this still relevant? Or has the feature been abandoned, superseded, or implemented differently?
   - If no status: Add one based on your investigation.

3. **File reference validity**: Check all file paths mentioned in the design doc. Do they still exist? Were they renamed or deleted?

4. **Undocumented implementations**: Check recent git commits (last 60 days) for features that were implemented without a design doc. Are there significant features with no planning documentation?

5. **Obsolete plans**: Are there design docs for features that were superseded by different implementations? These should be marked as 'Superseded' to avoid confusion.

For EACH finding: design doc path, what's wrong, severity (MISLEADING if wrong status, STALE if references deleted code, OK if accurate), and the fix."

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Documentation Review — [date]

## Baseline Metrics
- README files in src/ and docs/: X
- Exported service functions: X (Y% with JSDoc)
- Design docs in docs/plans/: X

## Summary
- Broken documentation (references deleted files): X
- Stale documentation (partially outdated): X
- Missing documentation (undocumented services): X
- CLAUDE.md drift items: X
- Design docs needing status update: X

## Findings by Severity

### Broken Docs (actively misleading)
[READMEs referencing deleted files, CLAUDE.md claims that are wrong, design docs with wrong status]

### Stale Docs (partially outdated)
[Architecture descriptions that don't fully match, service lists with missing entries, old patterns described]

### Missing Docs (gaps that hurt onboarding)
[Undocumented high-import services, missing setup steps, unexplained decisions, no debugging guide]

## Top 5 Doc Updates
[Prioritized by: how many developers would be confused by the current state]

## Documentation Score: X/10
[1 = no useful docs, 10 = everything documented and current. Brief justification.]
```

Present this report to the user. Lead with Broken Docs since those actively mislead developers. For Missing Docs, suggest specific content that should be written.
