---
name: polish
description: "Run a repeatable codebase polish pass. Use when the user says 'polish', 'cleanup', 'tidy', 'housekeeping', or 'shine'. Runs all audit scripts, identifies safe fixes, implements them, and reports a before/after scorecard. Safe to run repeatedly — each pass finds diminishing returns."
version: 1.0.0
metadata:
  tags: cleanup, refactor, dead-code, imports, polish, audit
---

# RUNSTR Codebase Polish

Automated cleanup pass that finds and fixes low-risk issues. Each run produces a before/after scorecard. Safe to run on any branch — never changes business logic.

## Rules

- NEVER change business logic, only structure and cleanup
- NEVER remove TODO comments that describe future work
- NEVER remove console.error or console.warn
- ALWAYS run `npm run typecheck` after each fix category before committing
- ALWAYS verify removed symbols are truly unused (grep the file)
- Commit after each category with prefix `Cleanup:` or `Refactor:`
- Stop and report if typecheck fails — do not push broken code

## Execution

### Step 1: Baseline Audit (run ALL in parallel)

Run every audit script and capture counts. These are the "before" numbers.

```bash
npx tsx scripts/verify/audit-dead-imports.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-file-size-limit.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-circular-dependencies.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-unbounded-queries.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-useeffect-cleanup.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-singleton-cleanup.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-hardcoded-strings.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-secret-exposure.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-service-error-handling.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-nostr-tools-usage.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-duplicate-constants.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-loading-state-coverage.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-empty-state-coverage.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-touchable-opacity-props.ts 2>&1 | tail -3
npx tsx scripts/verify/audit-charity-config-consistency.ts 2>&1 | tail -3
npm run typecheck 2>&1 | tail -3
```

Record the summary line from each script into a table.

### Step 2: Dead Import Removal

Get the full list:
```bash
npx tsx scripts/verify/audit-dead-imports.ts 2>&1 | grep "^\[UNUSED\]"
```

For each unused import:
1. Read the file
2. Grep for the symbol name in the file (excluding the import line)
3. If zero references found, remove the symbol from the import
4. If removing it empties the import line, remove the whole line

**Watch out for false positives:** Type imports used in generics (`useState<TypeName>`) or type annotations may not be caught by simple grep. If the type name appears ANYWHERE in the file body, skip it.

Dispatch parallel agents for batches of 15-20 files. Run `npm run typecheck` after each batch. Commit when clean.

### Step 3: Dead Commented Code

Search for and remove:
```
// REMOVED
// DEPRECATED
// OLD
// DISABLED
// DEAD
// UNUSED
```

Also find blocks of 3+ consecutive commented lines that are dead code (not documentation). Remove them.

**DO NOT remove:**
- TODO comments describing future work
- JSDoc or documentation comments
- Single-line comments explaining logic
- Intentionally disabled code with explanation (e.g., "DISABLED: causes crash on Android 12")

Commit when clean.

### Step 4: Debug Console.log Removal

Search src/services/ and src/screens/ for debug logging:
```
console.log('DEBUG
console.log('test
console.log('here
console.log('===
console.log('---
console.log(`DEBUG
```

Also look for verbose banner-style logging (multi-line `====` blocks).

**DO NOT remove:**
- `console.error()` or `console.warn()`
- Operational logs with `[ServiceName]` prefixes
- Logs inside catch blocks
- Initialization/lifecycle logs

Commit when clean.

### Step 5: Stale Commented Imports

Search for commented-out import lines:
```bash
grep -rn "^[[:space:]]*// import " src/ --include="*.ts" --include="*.tsx"
```

Remove any that are clearly dead (no corresponding TODO, no explanation of why it was kept). Commit when clean.

### Step 6: File Size Check

Run the file size audit. For any file over 1,500 lines, evaluate if it can be safely split:
- Settings screens -> section components
- Large services -> extract helper functions to separate files
- Large style blocks -> separate style files

Only split if the extraction is pure structural (no logic changes). Skip files where splitting would require interface changes across many consumers.

### Step 7: Scorecard

Re-run ALL audit scripts from Step 1. Present a before/after table:

```
| Audit                    | Before | After | Delta |
|--------------------------|--------|-------|-------|
| typecheck                |        |       |       |
| dead-imports             |        |       |       |
| file-size-limit          |        |       |       |
| circular-dependencies    |        |       |       |
| unbounded-queries        |        |       |       |
| useeffect-cleanup        |        |       |       |
| singleton-cleanup        |        |       |       |
| hardcoded-strings        |        |       |       |
| secret-exposure          |        |       |       |
| service-error-handling   |        |       |       |
| nostr-tools-usage        |        |       |       |
| duplicate-constants      |        |       |       |
| loading-state-coverage   |        |       |       |
| empty-state-coverage     |        |       |       |
| touchable-opacity-props  |        |       |       |
| charity-config           |        |       |       |
```

Also report:
- Total files changed
- Net lines added/removed
- Commits created
- Anything that was flagged but too risky to fix (defer to next run)

### Step 8: Score

Rate the pass 1-10:
- **9-10**: Multiple audit numbers improved, zero regressions
- **7-8**: Some improvements, minor items deferred
- **5-6**: Mostly investigation, few fixes applied
- **1-4**: Something went wrong or nothing was found

If score is 7+, the codebase got meaningfully cleaner. If score is 5 or below, the polish skill may have reached diminishing returns for this category of fixes — suggest new audit scripts or different polish targets.
