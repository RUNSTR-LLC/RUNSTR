# Git Workflow

This document defines the git workflow for RUNSTR. Claude Code follows these rules automatically.

## Version Branch Model

All work happens on a **version branch** named after the next release (e.g., `v1.6.8`). Every fix, feature, and change goes on this one branch. When it's ready to ship, merge to main, tag it, build the APK.

**Why this model:**
- One branch, no confusion — everything is in one place
- Commit often for good history and backup
- All features available locally for testing at the same time
- Clean release process: merge to main, tag, build, ship

## Branch Naming

The branch name is the version number:

```
v1.6.8    ← current work
v1.7.0    ← next major version
v2.0.0    ← big rewrite
```

That's it. No prefixes needed. One branch per release cycle.

## When to Commit

**Commit early and often.** After every meaningful change:
- A bug fix that works
- A feature step that compiles
- A refactor that passes typecheck
- A documentation update

Each commit should be one logical change with a clear message.

**Do NOT commit:**
- Code with TypeScript errors (`npm run typecheck` must pass)
- Half-finished features that break existing functionality
- Files containing secrets (`.env`, credentials)

## Commit Message Format

```
<Prefix>: <Short description>

<Optional body explaining why, not what>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Prefixes:** `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`

Examples:
- `Fix: Resolve distance freeze after GPS signal loss`
- `Feature: Add hiking tracker screen`
- `Refactor: Extract split tracking into dedicated service`
- `Docs: Update KIND_1301_SPEC with hiking activity type`

## Workflow: Start to Finish

### 1. Create the version branch (once per release cycle)

```bash
git checkout main && git pull origin main
git checkout -b v1.6.8
```

### 2. Work and commit constantly

Every meaningful change gets its own commit:

```bash
# Fix a bug
npm run typecheck
git add src/services/activity/SimpleRunTracker.ts
git commit -m "Fix: Resolve distance freeze after GPS signal loss"

# Add a feature
npm run typecheck
git add src/screens/activity/HikingTrackerScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "Feature: Add hiking tracker screen"

# Push to GitHub for backup (do this often)
git push -u origin v1.6.8
```

### 3. Test locally

Test everything on device. All changes are on one branch, so everything is present.

### 4. Release

When the version is ready to ship:

```bash
# Push final changes
git push origin v1.6.8

# Open PR
gh pr create --title "Release: v1.6.8" --body "$(cat <<'EOF'
## Summary
- Fixed distance freeze after GPS signal loss
- Added hiking tracker screen
- Updated KIND_1301_SPEC with hiking type

## Test plan
- [x] Tested on iOS simulator
- [x] TypeScript compiles cleanly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# After PR is merged:
git checkout main && git pull origin main
git tag -a v1.6.8 -m "Release: Version 1.6.8"
git push origin v1.6.8
```

### 5. Start next version

```bash
git checkout -b v1.6.9
```

## Rules for Claude Code

1. **At session start**, check for the current version branch and switch to it
2. **If no version branch exists**, ask the user what version to create
3. **Commit after every meaningful change** — don't wait to be asked
4. **Push regularly** to back up work on GitHub
5. **All changes go on the same version branch**
6. **NEVER commit directly to main** — merge via PR when releasing
7. **Run `npm run typecheck`** before every commit
8. **Stage specific files** — never use `git add .` or `git add -A`
9. **Include the co-author trailer** on every commit

## Quick Reference

```bash
# Start of release cycle
git checkout main && git pull origin main
git checkout -b v1.6.8

# During work (after each change)
npm run typecheck
git add src/path/to/changed-file.ts
git commit -m "Fix: Description"
git push origin v1.6.8   # backup often

# Ready to release
gh pr create --title "Release: v1.6.8" --body "..."
# Merge on GitHub, then:
git checkout main && git pull origin main
git tag -a v1.6.8 -m "Release: Version 1.6.8"
git push origin v1.6.8
git checkout -b v1.6.9   # start next version
```
