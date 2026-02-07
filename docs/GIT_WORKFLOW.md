# Git Workflow

This document defines the git workflow for RUNSTR. Claude Code follows these rules automatically. Human contributors should follow them too.

## Working Branch Model

The user works on multiple features simultaneously and needs to test them all together locally. Instead of one branch per feature, use a **single working branch per session** that collects all changes.

**Why this model:**
- All features are available locally for testing at the same time
- No branch-switching needed during development
- Individual commits still track what changed and why
- One PR at the end for review and CI

## Branch Naming

| Prefix | Use when... | Example |
|--------|-------------|---------|
| `dev/` | Working branch with multiple changes (default) | `dev/feb-updates` |
| `feature/` | Single focused feature | `feature/hiking-tracker` |
| `fix/` | Single focused bug fix | `fix/distance-freeze` |
| `refactor/` | Restructuring without behavior change | `refactor/split-tracking-service` |
| `docs/` | Documentation-only changes | `docs/update-kind-1301-spec` |
| `chore/` | Dependencies, config, CI | `chore/upgrade-expo-sdk` |

Keep branch names short, lowercase, kebab-case.

**Default is `dev/`** — use specific prefixes only when the user asks for a single focused task.

## When to Commit

Commit after every meaningful change:
- A bug fix that works
- A feature step that compiles
- A refactor that passes typecheck
- A documentation update

Each commit should be a single logical unit with a clear message. Multiple features on the same branch is fine — just make each **commit** focused.

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

### 1. Start a working branch

At the beginning of a session (or when no branch exists yet):

```bash
git checkout main && git pull origin main
git checkout -b dev/feb-updates
```

### 2. Work and commit incrementally

All changes go on the same branch. Each commit is one logical change:

```bash
# Fix a bug
npm run typecheck
git add src/services/activity/SimpleRunTracker.ts
git commit -m "Fix: Resolve distance freeze after GPS signal loss"

# Add a feature
npm run typecheck
git add src/screens/activity/HikingTrackerScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "Feature: Add hiking tracker screen"

# Update docs
git add docs/KIND_1301_SPEC.md
git commit -m "Docs: Add hiking activity type to spec"
```

### 3. Test locally

The user tests all changes together on device. Everything is on one branch, so all features are present.

### 4. Push and open a PR

When the user says "ship it", "let's merge", or the session is done:

```bash
git push -u origin dev/feb-updates
gh pr create --title "Dev: February updates" --body "$(cat <<'EOF'
## Summary
- Fixed distance freeze after GPS signal loss
- Added hiking tracker screen
- Updated KIND_1301_SPEC with hiking type

## Test plan
- [ ] Run app in simulator, verify all features work
- [ ] Check typecheck passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5. CI runs automatically

GitHub Actions runs typecheck and lint on every PR. The PR cannot be merged if CI fails.

### 6. Merge

After CI passes, merge the PR on GitHub. Use "Squash and merge" to keep main history clean — all the individual commits collapse into one clean entry on main.

## Release Flow

Releases are tagged from `main` after merging PRs:

```bash
git checkout main && git pull origin main
git tag -a v1.7.0 -m "Release: Version 1.7.0 - February Updates"
git push origin v1.7.0
gh release create v1.7.0 --title "v1.7.0 - February Updates" --generate-notes
```

## Rules for Claude Code

These rules are enforced via CLAUDE.md and apply to every session:

1. **Check for existing working branch** at session start — reuse it if one exists
2. **If no branch exists**, create a `dev/` branch from latest main
3. **NEVER commit directly to main** — all changes go through PRs
4. **Commit after every meaningful change** — don't wait to be asked
5. **All changes go on the same branch** — the user tests everything together
6. **Run `npm run typecheck`** before every commit
7. **Stage specific files** — never use `git add .` or `git add -A`
8. **Include the co-author trailer** on every commit
9. **Push + open PR** only when the user asks to ship

## Quick Reference

```bash
# Start of session
git checkout main && git pull origin main
git checkout -b dev/session-description

# During work (after each change)
npm run typecheck
git add src/path/to/changed-file.ts
git commit -m "Fix: Description"

# When user says ship it
git push -u origin dev/session-description
gh pr create --title "Dev: Session description" --body "..."
```
