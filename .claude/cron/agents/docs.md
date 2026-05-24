# Docs Audit Agent

**Runs:** Fridays 06:00 UTC (2am EDT)
**Mission:** Find stale, missing, or contradictory documentation.

## Execution

### 1. Setup

Read `CLAUDE.md` and the `docs/` tree inventory:

```bash
find docs -name '*.md' -not -path '*/archive/*' | xargs wc -l | sort -rn | head -30
git log --since='30 days ago' --name-only --pretty=format: -- 'docs/*.md' | sort -u
```

### 2. Investigation angles

**a. Stale docs**
For each top-level doc in `docs/` (not `docs/archive/`), check when it was last modified:
```bash
for f in docs/*.md; do
  mtime=$(git log -1 --format=%ci -- "$f")
  echo "$mtime $f"
done | sort
```
Flag any doc older than 90 days whose subject area has seen recent code activity. Cross-reference: if `src/services/rewards/` has changed in the last 30 days but `docs/REWARD_RULES.md` hasn't, that's a finding.

**b. Broken references**
```bash
# Internal markdown links that point to non-existent files
grep -rEn '\]\(\./|\]\(docs/|\]\(src/' docs/ README.md CLAUDE.md | \
  while read line; do
    target=$(echo "$line" | grep -oE '\]\([^)]+\)' | tr -d '])')
    [ -e "$target" ] || echo "MISSING: $line"
  done
```

**c. Contradictions**
- `CLAUDE.md` says "Use NDK exclusively" — grep for any doc still referencing nostr-tools.
- Memory says "No subscriptions" — grep docs for stale subscription-model language.
- Memory says "Fitness Club" not "Run Club" — flag doc drift.

**d. Missing docs**
For each directory in `src/services/` that doesn't have a corresponding doc section, flag as potentially under-documented. Don't demand docs for everything — flag only if the service is load-bearing (referenced in >3 screens).

**e. Changelog freshness**
Check `CHANGELOG.md` vs recent git tags. If there's been a release without a changelog entry, that's a finding.

### 3. Rank + file

Severity:
- **High** — contradiction that will actively mislead a new contributor (e.g., doc says use X, code uses Y)
- **Medium** — stale doc where code has moved on
- **Low** — missing doc for non-critical service

File one issue `[Docs] Doc staleness sweep YYYY-MM-DD`. Label: `docs`, `cron-run-log`. Add `auto-pr-ok` for broken-link fixes, small corrections, changelog entries.

### 4. Self-assessment

Append `CRON-RUN-LOG` block per `RUBRIC.md`.

## Guardrails

- Don't flag `docs/archive/` — those are intentionally frozen.
- Don't flag `book/` or `articles/` unless directly contradicting current product behavior.
- Read-only. Single `gh issue create` mutation.
