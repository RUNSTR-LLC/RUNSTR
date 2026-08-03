# Performance Audit Agent

**Runs:** Tuesdays 06:00 UTC (2am EDT)
**Mission:** Find render bottlenecks, unbounded queries, memory leaks, and expensive operations on the critical path.

## Execution

### 1. Setup

```bash
npm install --legacy-peer-deps --silent
```

Read `docs/PERFORMANCE_GUIDE.md` if it exists — it documents the aggressive caching architecture, so anything that breaks it is a finding.

### 2. Investigation angles

**a. Render bottlenecks**
`grep -rn "useEffect" src/screens/ src/components/` — flag:
- Dependencies that cause re-render on every render (objects/arrays inline)
- Missing memoization on expensive computations in render path
- Components over 300 lines (likely doing too much)

**b. Unbounded queries**
```bash
grep -rn "\.select(" src/services/backend/ | grep -v "\.limit(" | grep -v "\.single()"
```
Each result is a potential OOM if the table grows.

**c. Nostr subscription leaks**
`grep -rn "ndk.subscribe\|\.subscribe(" src/` — verify every subscription has a matching `.stop()` / unsubscribe in cleanup.

**d. Cache bypass patterns**
Look for direct DB/Nostr fetches in hot paths (`useEffect` in screens) that should be hitting Zustand cache instead. Cross-reference with `docs/PERFORMANCE_GUIDE.md`.

**e. Bundle size watch**
```bash
find src -name '*.ts*' -exec wc -l {} + | sort -rn | head -20
```
Files >500 lines violate project rules. Flag them for splitting.

**f. Image handling**
`grep -rn "<Image" src/` — flag anything loading remote images without caching or size constraints.

### 3. Rank + file

Severity:
- **Critical** — unbounded query on active user path, guaranteed OOM under load
- **High** — noticeable render jank, leak that grows with session
- **Medium** — inefficient pattern that hurts cold start
- **Low** — code could be tighter

File one issue `[Perf] Performance sweep YYYY-MM-DD` with sections per severity. Use format from `audit.md`. Label: `perf`. Add `auto-pr-ok` if trivially fixable.

### 4. Self-assessment

Include the `CRON-RUN-LOG` block (format per `RUBRIC.md`) at the **very end** of the issue body when calling `gh issue create`. Write the block directly into the body HEREDOC — do not attempt to add it via a separate comment after creation, as that step is consistently skipped.

Example tail of your issue body:
```
---

<!-- CRON-RUN-LOG
agent: perf
run_date: YYYY-MM-DD
findings_count: <int>
severity: critical=<n> high=<n> medium=<n> low=<n>
self_score:
  specificity: <0-10>
  actionability: <0-10>
  signal_to_noise: <0-10>
  false_positive_risk: <0-10>
  coverage: <0-10>
overall: <float>
notes: <one-line note>
-->
```

## Guardrails

- Don't propose premature optimization. If a hot path isn't actually hot, skip it.
- Don't rewrite caching architecture — that's design work. File the observation and move on.
- Read-only. Single `gh issue create` mutation.
