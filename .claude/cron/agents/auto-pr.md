# Auto-PR Agent

**Runs:** Weekdays 08:00 UTC (4am EDT)
**Mission:** Pick one issue labeled `auto-pr-ok`, implement it, open a draft PR against `main`.

## Execution

### 1. Sync main

```bash
git fetch --all --prune
git checkout main
git pull --ff-only
```

The project uses a single-branch model — all work targets `main`, releases are tagged. There is no rolling version branch.

### 2. Pick an issue

```bash
gh issue list --label auto-pr-ok --state open --json number,title,body,labels --limit 20
```

Pick the first issue that meets ALL of:
- Opened within the last 14 days
- Not assigned to anyone
- Does NOT already have a linked PR (`gh pr list --search "fixes #NUMBER"`)
- Estimated diff based on issue description is < 100 lines
- No new dependency implied
- Single concern (not a bundle of findings)

If nothing qualifies, file a `[CronLog] Auto-PR YYYY-MM-DD` issue labeled `cron-run-log` describing the queue state. Then add a `CRON-RUN-LOG` comment to that issue (using `gh issue comment`) with your self-assessment scores before exiting.

### 3. Implement

Create branch:
```bash
git checkout -b "auto-pr/issue-${ISSUE_NUM}-$(date +%Y%m%d)"
```

Implement the change. Constraints:
- Max diff: 100 lines added + removed combined
- Single file preferred, 2–3 files if the fix genuinely requires it
- No new dependencies
- No `package.json` / `package-lock.json` modifications (except via the fix itself)
- No changes to `.env*`, `ios/` native config, `android/` native config, `supabase/migrations/`

### 4. Verify

```bash
npm install --legacy-peer-deps --silent
npm run typecheck 2>&1 | tail -20
```

Typecheck must not introduce new errors (compare count against baseline from `CLAUDE.md`). If it does, bail: delete the branch, comment on the issue explaining, exit.

### 5. Commit + push + PR

```bash
git add <specific files only>
git commit -m "Auto-PR: <issue title, truncated to 60 chars> (closes #${ISSUE_NUM})"
git push -u origin HEAD
gh pr create --draft \
  --base main \
  --title "Auto-PR: <short title>" \
  --body "$(cat <<'EOF'
Automated draft PR addressing #${ISSUE_NUM}.

## Summary
<what this PR changes, 2-3 bullets>

## How this addresses the issue
<1-2 sentences linking to specific issue findings>

## Verification
- [x] Typecheck passes (no new errors vs baseline)
- [x] Diff under 100 lines
- [x] Single concern
- [ ] Human review needed before merge

Closes #${ISSUE_NUM}
EOF
)"
```

### 6. Comment on the issue

```bash
gh issue comment "$ISSUE_NUM" --body "Auto-PR opened: #<PR_NUM>. Human review required before merge."
```

### 7. Self-assessment

Append `CRON-RUN-LOG` block to the PR body (not the issue, since the issue will be closed on merge). Format per `RUBRIC.md`.

## Guardrails

- **Never merge.** Draft PRs only.
- **Never force-push.**
- **Never push to main directly.** Always open a draft PR.
- **Abort on any lint/typecheck regression.** Better to skip than to ship a bad PR.
- **One PR per run max.** Don't try to clear the whole queue.
- **No --no-verify** under any circumstance.
- If the issue turns out to be ambiguous after reading: comment on the issue asking for clarification, remove `auto-pr-ok` label, exit.

## Failure mode

If any step fails after branch creation:
```bash
git checkout main
git branch -D "auto-pr/issue-${ISSUE_NUM}-$(date +%Y%m%d)"
git push origin --delete "auto-pr/issue-${ISSUE_NUM}-$(date +%Y%m%d)" 2>/dev/null || true
```
Then comment on the issue explaining the failure and file a `cron-run-log` issue with details.
