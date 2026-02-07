# Git Workflow

This document defines the git workflow for RUNSTR. Claude Code follows these rules automatically. Human contributors should follow them too.

## Branch Naming

Always create a branch before making changes. Never commit directly to `main`.

| Prefix | Use when... | Example |
|--------|-------------|---------|
| `feature/` | Adding new functionality | `feature/hiking-tracker` |
| `fix/` | Fixing a bug | `fix/distance-freeze` |
| `refactor/` | Restructuring without behavior change | `refactor/split-tracking-service` |
| `docs/` | Documentation-only changes | `docs/update-kind-1301-spec` |
| `chore/` | Dependencies, config, CI | `chore/upgrade-expo-sdk` |

Keep branch names short, lowercase, kebab-case. Include a ticket/issue number if one exists (e.g., `fix/42-distance-freeze`).

## When to Commit

Commit after every meaningful change:
- A bug fix that works
- A feature step that compiles
- A refactor that passes typecheck
- A documentation update

**Do NOT batch multiple unrelated changes into one commit.** Each commit should be a single logical unit.

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

### 1. Create a branch

```bash
git checkout main && git pull origin main
git checkout -b feature/my-feature
```

### 2. Work and commit incrementally

```bash
# After each meaningful change:
npm run typecheck                    # Must pass
git add <specific-files>             # Stage relevant files only
git commit -m "Feature: Add X"       # Descriptive message
```

### 3. Push and open a PR

When the unit of work is complete:

```bash
git push -u origin feature/my-feature
gh pr create --title "Feature: Add hiking tracker" --body "$(cat <<'EOF'
## Summary
- Added HikingTrackerScreen with elevation tracking
- Integrated with kind 1301 publishing

## Test plan
- [ ] Track a hike in simulator
- [ ] Verify kind 1301 event includes elevation data
- [ ] Check typecheck passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 4. CI runs automatically

GitHub Actions runs typecheck and lint on every PR. The PR cannot be merged if CI fails.

### 5. Merge

After CI passes and review is complete, merge the PR on GitHub. Use "Squash and merge" for feature branches to keep main history clean.

## Release Flow

Releases are tagged from `main` after merging PRs:

```bash
git checkout main && git pull origin main
git tag -a v1.7.0 -m "Release: Version 1.7.0 - Hiking Tracker"
git push origin v1.7.0
gh release create v1.7.0 --title "v1.7.0 - Hiking Tracker" --generate-notes
```

## Rules for Claude Code

These rules are enforced via CLAUDE.md and apply to every session:

1. **ALWAYS create a branch** before making any code changes
2. **NEVER commit directly to main** -- all changes go through PRs
3. **Commit after every meaningful change** -- don't wait to be asked
4. **Run `npm run typecheck`** before every commit
5. **Push and open a PR** when the unit of work is complete
6. **Stage specific files** -- never use `git add .` or `git add -A`
7. **Include the co-author trailer** on every commit

## Quick Reference

```bash
# Start work
git checkout main && git pull origin main
git checkout -b fix/my-fix

# During work (after each change)
npm run typecheck
git add src/path/to/changed-file.ts
git commit -m "Fix: Description"

# Finish work
git push -u origin fix/my-fix
gh pr create --title "Fix: Description" --body "..."
```
