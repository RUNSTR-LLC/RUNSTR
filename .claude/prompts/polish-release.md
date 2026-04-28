# Polish for Release

A self-contained prompt: pick safe fixes from the cron-filed audit issues, implement them, typecheck, commit to main, report what changed.

## How to invoke

Open a fresh Claude Code session, paste this entire file as the first message.

---

# Mission

Polish the codebase by implementing 5–10 safe, small fixes drawn from open cron audit issues. Improve release readiness. Report a tight before/after.

You **make changes**. Not a scorecard. One PR-quality session that ships.

# Definition of "safe fix"

- Single concern per change
- < 30 lines diff per fix
- No new dependencies
- No native-config (`ios/`, `android/`, `app.json`) changes
- Typecheck must pass after, with no new errors vs baseline
- Behavior preserved (or strictly improved per the issue's stated goal)

Anything bigger gets noted in the report and skipped — humans review those.

# Execution

## 1. Inventory the queue

```bash
gh issue list --label auto-pr-ok --state open --limit 20 \
  --json number,title,body,labels
gh issue list --label audit --state open --limit 10 \
  --json number,title,body,labels
gh issue list --label simplify --state open --limit 10 \
  --json number,title,body,labels
gh issue list --label design --state open --limit 10 \
  --json number,title,body,labels
gh issue list --label perf --state open --limit 10 \
  --json number,title,body,labels
```

For each, check whether an open PR already addresses it:
```bash
gh pr list --state open --search "fixes #NUM"
```

Skip anything with an in-flight PR — don't duplicate work.

## 2. Pick fixes

Score each candidate:
- ⭐ Pure deletions of dead code with no callers
- ⭐ Helper consolidation (delete local copy, import shared)
- ⭐ One-line stale-comment / wrong-deps fixes
- ⚠️ String/color swaps (verify nothing inferred)
- 🚫 Anything requiring design judgment

Pick 5–10 ⭐ items. Pick 0–3 ⚠️ items only if the issue body specifies the exact replacement.

## 3. Implement

Apply each fix. After each one:
```bash
npm run typecheck 2>&1 | tail -5
```

If typecheck error count goes up, revert that fix and move on. Don't try to debug it in-session.

After all fixes applied:
```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

Final error counts must equal or improve on baseline (per `CLAUDE.md`).

## 4. Commit

One commit per fix is overkill for a polish session. Use one commit summarizing all fixes:

```bash
git add <only the files changed>
git commit -m "Chore: Polish pass — <N> safe fixes (closes #X, #Y, ...)"
git push
```

`git push` goes to `main` directly (per the project's main-only workflow). No PR needed for this kind of low-risk batch.

If anything is borderline, open a draft PR instead of pushing to main:
```bash
git checkout -b polish/$(date +%Y-%m-%d)
git push -u origin HEAD
gh pr create --draft --base main --title "Polish: ..." --body "..."
```

## 5. Close the issues you addressed

```bash
for issue in <closed-by-this-pass>; do
  gh issue close $issue --comment "Resolved in commit $(git rev-parse --short HEAD)."
done
```

## 6. Report

Output a tight summary in your final message:

```
## Polish session summary

**Commit:** <sha> - <message>
**Fixes applied:** N
**Issues closed:** #X, #Y, ...
**Typecheck:** baseline / new (delta)
**Lint:** baseline / new (delta)

### Changes
1. <file:line> — <what changed>, closes #N
2. ...

### Skipped (and why)
- #N — needed design judgment
- #N — already in flight via PR #M
```

# Guardrails

- Don't fix bugs you "spotted along the way" — stay scoped to the issue queue.
- Don't refactor while polishing. One concern per fix.
- If unsure about behavior preservation, skip it.
- If 0 safe fixes are available, say so and exit. Do not invent work.
- Never `--no-verify`, never force-push, never push to anything but main (or a polish branch via PR).
