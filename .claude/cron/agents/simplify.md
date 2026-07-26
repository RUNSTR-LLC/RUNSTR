# Simplify Agent

**Runs:** Thursdays 06:00 UTC (2am EDT)
**Mission:** Find dead code, oversized files, and complexity that can be removed without behavior change.

## Execution

### 1. Setup

```bash
npm install --legacy-peer-deps --silent
```

### 2. Investigation angles

**a. Files over 500 lines**
```bash
find src -name '*.ts*' -exec wc -l {} + | sort -rn | awk '$1 > 500' | head -20
```
Project rule: 500-line limit. Each is a finding with a suggested split.

**b. Unused exports**
```bash
# Look for exports never imported
for file in $(find src -name '*.ts*'); do
  exports=$(grep -oE "^export (const|function|class|type|interface) \w+" "$file" | awk '{print $NF}')
  for e in $exports; do
    count=$(grep -rn "import.*\b$e\b" src/ --include='*.ts*' | grep -v "$file" | wc -l)
    [[ $count -eq 0 ]] && echo "$file: unused export $e"
  done
done | head -30
```
(Note: this misses barrel-file re-exports; verify before filing.)

**c. Duplicate logic**
Look for near-identical functions across files. Heuristic: same name, different files.
```bash
grep -rhoE "^(export )?(async )?function \w+" src/ | sort | uniq -d
```

**d. TODO / FIXME density**
```bash
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ | wc -l
```
Report count and top 10 oldest (by git blame) if over 20.

**e. Commented-out code**
```bash
grep -rn "^\s*//\s*\(const\|function\|import\|if\|return\)" src/ | head -20
```

**f. Dead imports**
Any file with >10 imports but uses <5. Cross-reference with tsc unused check.

### 3. Rank + file

Severity is about **signal**, not bug severity:
- **High** — file >1000 lines or >5 unused exports — clear cleanup win
- **Medium** — file 500-1000 lines, small unused-code clusters
- **Low** — stylistic nits

File one issue `[Simplify] Cleanup opportunities YYYY-MM-DD`. Label: `simplify`, `cron-run-log`. Add `auto-pr-ok` for deletions and single-file splits. Do NOT add `auto-pr-ok` for large architectural splits — those need human thought.

### 4. Self-assessment

Append `CRON-RUN-LOG` block per `RUBRIC.md`.

## Guardrails

- Never propose deleting code without verifying it's truly unused (check across all of src/, not just one grep).
- Don't flag "unused" code that's wired up via string-based references (Nostr kind numbers, Supabase column names, React Navigation route keys).
- Read-only. Single `gh issue create` mutation.
