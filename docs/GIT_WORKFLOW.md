# Git Workflow

This document defines the git workflow for RUNSTR. Claude Code follows these rules automatically.

## Single-Branch Model

All work happens on **`main`**. Routine commits go straight to main. Releases are marked with **tags** (`v1.10.0`, `v1.11.0`), not branches.

**Why this model:**
- Zero confusion about which branch is current — main is always the truth
- Every commit on main is potentially shippable
- Tags are cheap and never go stale; branches do
- No more "merge v1.X.Y to main" PRs that just sync long-lived branches

**When to use a feature branch:**
- The change needs human review before landing (architectural shift, risky refactor, native config)
- Multiple commits are needed and you want them reviewed as a unit
- You want CI/Auto-PR to draft the change

For everyday fixes, tweaks, polish, and small features: commit straight to main.

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

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Prefixes:** `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`

Examples:
- `Fix: Resolve distance freeze after GPS signal loss`
- `Feature: Add hiking tracker screen`
- `Refactor: Extract split tracking into dedicated service`
- `Docs: Update KIND_1301_SPEC with hiking activity type`
- `Chore: Polish pass — 4 safe fixes`

## Workflow: Routine Work (90% of the time)

```bash
# Make sure you're on main and up to date
git checkout main
git pull --ff-only

# Make changes, then commit
npm run typecheck
git add src/path/to/changed-file.ts
git commit -m "Fix: Description"

# Push to GitHub
git push
```

That's it. No branch creation, no PR, no merge.

If `git push` is rejected because someone (or a cron) pushed first:
```bash
git pull --rebase origin main
git push
```

## Workflow: Feature Branch (when needed)

For changes that warrant review:

```bash
git checkout main
git pull --ff-only
git checkout -b descriptive-name

# Work and commit as normal
git push -u origin HEAD

# Open PR
gh pr create --base main --title "Feature: ..." --body "..."

# After merge, clean up
git checkout main
git pull --ff-only
git branch -D descriptive-name
```

## Workflow: Releases

Releases are tagged, never branched.

```bash
# Make sure main is the state you want to ship
git checkout main
git pull --ff-only

# Bump version in package.json + app.json (Claude can do this)
git add package.json app.json
git commit -m "Chore: Bump version to v1.10.0"
git push

# Tag the release
git tag -a v1.10.0 -m "Release: v1.10.0"
git push origin v1.10.0

# Build APK / Xcode build / push to App Store from this tag
```

## Rules for Claude Code

1. **Default to main.** Routine work commits and pushes to main.
2. **Use a feature branch only when** the change needs review, is risky, or the user explicitly asks for one.
3. **Never force-push** to main. If push fails, `git pull --rebase` and retry.
4. **Never push to main with** `--no-verify`, `--force`, or any safety bypass.
5. **Run `npm run typecheck`** before every commit.
6. **Stage specific files** — never use `git add .` or `git add -A`. Avoids accidentally committing secrets, build artifacts, or unrelated work.
7. **Commit after every meaningful change** — don't wait to be asked.
8. **Push regularly** to back up work and let cron agents see fresh state.
9. **Include the co-author trailer** on every commit.
10. **Releases are tags, not branches.** No `vX.Y.Z` branches.

## Quick Reference

```bash
# Routine work
git checkout main && git pull --ff-only
npm run typecheck
git add <specific-files>
git commit -m "Fix: Description"
git push

# Push rejected (someone else pushed first)
git pull --rebase origin main
git push

# Feature branch (rare)
git checkout -b feature-name
# ... work and commit ...
git push -u origin HEAD
gh pr create --base main --title "..." --body "..."

# Release
git tag -a v1.10.0 -m "Release: v1.10.0"
git push origin v1.10.0
```

## Migration Notes (April 2026)

This project previously used a rolling-version-branch model (`v1.7.0`, `v1.8.0`, `v1.9.0`...) with PRs merging each into main. As of April 2026 we moved to the single-branch model documented here. The shipped tags (`v1.6.8`, `v1.7.0`, `v1.7.2`, `v1.8.8`, `v1.9.0`, etc.) are preserved as release markers — those should never be deleted.
