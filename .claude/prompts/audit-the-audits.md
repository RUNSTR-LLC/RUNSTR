# Audit the Audits

A self-contained meta-review prompt: walk the audit/script ecosystem, find drift, dead tools, gaps, and recommend specific upgrades. Produces one tracking issue with concrete file:line action items. Does not modify anything.

## How to invoke

Open a fresh Claude Code session at the repo root. Paste this entire file as the first message.

Optionally schedule monthly (`0 14 1 * *` UTC = 1st of each month, 10am EDT) — cadence matches how fast tooling drifts.

---

# Mission

Review every audit, agent prompt, slash command, and maintenance script in this repo. Find:
- **Drift** — same dimension covered by multiple tools that have evolved out of sync
- **Bugs** — prompts that call CLI flags scripts don't accept; scripts referenced by prompts that don't exist
- **Noise** — audits whose signal-to-noise ratio makes them un-actionable
- **Gaps** — release-relevant dimensions with no tool watching them
- **Stale work** — scripts that haven't been touched/run in 90+ days

File **one** issue titled `[Meta] Audit ecosystem review YYYY-MM-DD` with a tight action plan. No code changes.

# Execution

## 1. Inventory

```bash
echo "=== Cron agents ==="
ls .claude/cron/agents/

echo "=== Slash commands ==="
ls .claude/commands/

echo "=== Plugin skills ==="
ls .claude/skills/

echo "=== Standalone prompts ==="
ls .claude/prompts/

echo "=== Maintenance scripts ==="
ls scripts/maintenance/

echo "=== Verify scripts ==="
ls scripts/verify/

echo "=== Cron helper scripts ==="
ls scripts/cron/

echo "=== Last modified per file (sorted oldest first) ==="
find .claude/{cron,commands,prompts,skills} scripts/{maintenance,cron,verify,core-tests} \
  -type f \( -name '*.md' -o -name '*.ts' -o -name '*.js' \) \
  -exec git log -1 --format="%ai %h %s" -- {} \; -exec echo "---FILE: {}" \; \
  2>/dev/null | head -60
```

Build a mental table: tool name, location, what dimension it covers, last touched.

## 2. Drift check — same dimension, multiple tools

For each cron agent, check whether a slash command or plugin skill covers the same dimension:

| Dimension | Cron | Slash | Skill |
|-----------|------|-------|-------|
| Audit | `cron/agents/audit.md` | `commands/audit.md` | — |
| Perf | `cron/agents/perf.md` | `commands/perf.md` | — |
| Design | `cron/agents/design.md` | `commands/design.md` | — |
| Simplify | `cron/agents/simplify.md` | `commands/simplify.md` | — |
| Docs | `cron/agents/docs.md` | `commands/docs.md` | — |
| Vibes | `cron/agents/vibes.md` | — | `skills/vibes/` |
| Polish | — | — | `skills/polish/` + `prompts/polish-release.md` |

For each row with two or more tools:
- Read both side by side
- Identify findings the cron version makes that the slash command misses (or vice versa)
- Identify guardrails one has and the other doesn't
- Flag specific paragraphs that have drifted (e.g., terminology, tool calls, exit conditions)

Score drift severity:
- **Aligned (0)** — both cover the same areas with consistent guardrails
- **Cosmetic (1)** — wording differs, behavior is the same
- **Behavioral (2)** — one finds things the other doesn't; one guard is missing
- **Contradictory (3)** — they would produce conflicting findings on the same code

Anything ≥2 needs a tracking item.

## 3. Script ↔ prompt drift check

For every shell command appearing in a cron agent prompt or slash command, verify the script (if any) exists and accepts the flags being passed:

```bash
# Extract all "npx tsx scripts/..." invocations from agent prompts
grep -rE "npx tsx scripts/[a-z/]+\.ts" .claude/cron/agents/ .claude/commands/ .claude/prompts/ \
  | sed -E 's/.*npx tsx (scripts\/[a-z/]+\.ts).*/\1/' | sort -u
```

For each unique script invocation:
- `[ -f <script> ] || echo "MISSING: <script>"` — script doesn't exist
- For each `--<flag>` passed, grep the script for that flag's parser:
  ```bash
  grep -n "'--<flag>'" <script> || echo "FLAG NOT PARSED: --<flag> in <script>"
  ```

The vibes-query script is a known recent example (April 2026): meta-tune added `--timeout 30000` but the script only parses `--days` and `--out`. This check catches that class of bug.

## 4. Audit-script signal-to-noise audit

Run `npx tsx scripts/maintenance/preLaunchAudit.ts` and inspect the breakdown:

```bash
npx tsx scripts/maintenance/preLaunchAudit.ts 2>&1 | grep -E "^\s+(🔴|🟠|🟡|🟢)"
```

For any bucket with > 200 findings:
- Read `AUDIT_REPORT.md`
- Identify the top 3 most-cited file:line patterns in that bucket
- Score: are these actually issues a human would want to fix, or is the rule too broad?

If the rule is too broad, file a tracking item: "Audit rule X needs deny-list (or higher threshold)".

Verify the script's known-good behavior with curated input fixtures. If `scripts/maintenance/preLaunchAudit.test.ts` doesn't exist, file a tracking item to create it.

## 5. Gap analysis

Cross-reference what the codebase actually does against what's audited.

For each item in `CLAUDE.md`'s "Critical Rules" section, find the audit/script that catches violations:

| Rule | Auditor | Coverage |
|------|---------|----------|
| 500-line file limit | ? | ? |
| NDK exclusively (no nostr-tools) | ? | ? |
| Crypto polyfill first import | ? | ? |
| Kind 1301 format compliance | ? | ? |
| `NDKPrivateKeySigner.generate()` for keys | ? | ? |
| No mock data | ? | ? |

Any rule with no tool watching it = gap. File a tracking item.

Also check: is there a tool watching for…
- Native config drift (HealthKit background delivery, Android WorkManager registration)
- Migration ↔ code dependency (e.g., a query that needs a migration that hasn't been applied)
- Broken slash commands (file paths in command definitions that don't exist)
- Plugin skill ↔ command-definition consistency

## 6. Cron health check

```bash
# Issues filed by each cron agent in the last 7 days — count per agent
for label in audit perf design simplify docs community-feedback cron-run-log cron-meta; do
  count=$(gh issue list --label "$label" --state all --search "created:>=$(date -v-7d +%Y-%m-%d)" --json number --jq 'length')
  echo "$label: $count"
done
```

Expected weekly cadence (per `.claude/cron/README.md`): vibes ×5, audit ×1, perf ×1, design ×1, simplify ×1, docs ×1, auto-pr ×5, meta-learn ×1.

Any agent with 0 issues in its expected window = silent failure. File a tracking item.

## 7. Stale tooling

```bash
# Files older than 90 days, sorted by age
find scripts/{maintenance,verify,core-tests,diagnostics} -type f \( -name '*.ts' -o -name '*.js' \) \
  | while read f; do
      age=$(git log -1 --format='%ar' -- "$f" 2>/dev/null)
      mtime=$(git log -1 --format='%at' -- "$f" 2>/dev/null)
      [ -n "$mtime" ] && echo "$mtime $age $f"
    done | sort -n | head -30
```

For the oldest 10 scripts, decide: actively useful, archive candidate, or delete?

## 8. File the tracking issue

Single issue with this exact shape:

```
Title: [Meta] Audit ecosystem review YYYY-MM-DD

Body:

# Summary

<one paragraph: total tools reviewed, drift incidents found, real bugs, gaps>

## Drift findings (cron ↔ slash command)

<for each pair with drift score ≥2:>
- **<dimension>** — drift score X. Specific divergences:
  - cron/<file>:line — <thing it says>
  - commands/<file>:line — <conflicting thing>
  - **Action:** <consolidate to single source of truth, OR sync the diverged paragraphs>

## Real bugs found

<numbered list of file:line where a prompt calls a non-existent flag/script, etc.>

## Audit-script noise

<for each bucket >200 findings, the top 3 patterns and whether the rule should be tightened>

## Gaps

<critical rules / dimensions with no tool watching them>

## Stale candidates

<10 oldest scripts with recommendation: keep / archive / delete>

## Recommended consolidation

<3-5 specific PRs the human could open to address findings>

---

<!-- META-AUDIT-RUN-LOG
date: YYYY-MM-DD
total_tools: N
drift_incidents: N
real_bugs: N
gaps: N
stale_candidates: N
notes: <one sentence>
-->
```

Label: `cron-meta`, `audit`. Do not add `auto-pr-ok` — these recommendations need design judgment.

# Guardrails

- Read-only on the codebase. Never edit source files, agent prompts, or scripts.
- Do not file separate issues per finding — bundle into the single tracking issue.
- Do not score drift by line count or file size; score by behavioral divergence.
- If you find an item that's already addressed in an open PR (`gh pr list`), note it as "in flight" rather than re-flagging.
- If your run produces zero findings, file the issue anyway with a "no action needed" body and a non-zero coverage score so meta-learn has data.
