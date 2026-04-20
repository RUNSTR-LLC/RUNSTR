# RUNSTR Cron System

Overnight remote agents that audit, triage, and propose fixes without needing Dakota's laptop open. Agents run in Anthropic's cloud, clone the repo at HEAD, execute their prompt, and file GitHub issues (or open draft PRs).

## How it works

Each scheduled trigger on claude.ai/code/scheduled has a short inline prompt that says:

> Checkout the repo. Read `.claude/cron/agents/<name>.md` and `.claude/cron/RUBRIC.md`. Execute the agent's instructions. End by appending the machine-readable `CRON-RUN-LOG` block to the primary issue.

This means the actual agent behavior lives here, in the repo. Edit a prompt file → next run uses the new prompt. No trigger reconfiguration needed.

## Layout

```
.claude/cron/
  README.md          # this file
  RUBRIC.md          # self-scoring dimensions agents use at end-of-run
  agents/
    vibes.md         # nightly Nostr community sweep
    audit.md         # Monday: general bug/regression audit
    perf.md          # Tuesday: performance sweep
    design.md        # Wednesday: theme/UX consistency
    simplify.md      # Thursday: dead code, oversized files
    docs.md          # Friday: doc staleness
    auto-pr.md       # weekdays: pick one `auto-pr-ok` issue, open draft PR
    meta-learn.md    # Sundays: review run logs, tune agent prompts via PR
```

## Trigger schedule (all EDT-aligned)

| Trigger | Cron (UTC) | Local (EDT) |
|---------|------------|-------------|
| Vibes | `0 5 * * 1-5` | Weekdays 1am |
| Audit - General | `0 6 * * 1` | Mon 2am |
| Audit - Perf | `0 6 * * 2` | Tue 2am |
| Audit - Design | `0 6 * * 3` | Wed 2am |
| Audit - Simplify | `0 6 * * 4` | Thu 2am |
| Audit - Docs | `0 6 * * 5` | Fri 2am |
| Auto-PR | `0 8 * * 1-5` | Weekdays 4am |
| Meta-learn | `0 14 * * 0` | Sundays 10am |

Cron is UTC — no DST shift. Times drift 1 hour during standard time (Nov–Mar).

## Run logs

Each agent run ends by either:
1. Appending the `CRON-RUN-LOG` block to the primary issue it filed, or
2. Filing a standalone `[CronLog] <agent> <date>` issue with label `cron-run-log` if it had nothing actionable to report.

The meta-learn agent queries these via `gh issue list --label cron-run-log` to score agents and tune prompts.

### CRON-RUN-LOG block format

```
<!-- CRON-RUN-LOG
agent: <name>
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
notes: <one-line note on what went well or what was hard>
-->
```

## Labels

Agents apply labels to the issues they file. These are queried by the meta-agent and by humans filtering the issue list.

| Label | Applied by | Meaning |
|-------|------------|---------|
| `audit` | audit agent | General audit findings |
| `perf` | perf agent | Performance issue |
| `design` | design agent | Theme/UX consistency issue |
| `simplify` | simplify agent | Dead code / oversized file |
| `docs` | docs agent | Stale or missing docs |
| `community-feedback` | vibes agent | Bug report or feature request from Nostr |
| `auto-pr-ok` | humans | Issue safe enough for auto-PR to attempt |
| `cron-run-log` | all agents | Run log artifact |
| `cron-meta` | meta-learn | Meta-learning PR or summary |

Agents should check which labels exist via `gh label list` and only apply existing ones. Never create labels automatically.

## Guardrails

All agents are read-only except for issue/PR creation commands:
- `gh issue create`, `gh issue edit`, `gh issue comment`
- `gh pr create` (Auto-PR, Meta-learn only; must be draft)
- `git commit` + `git push` to a feature branch (Auto-PR, Meta-learn only)

Agents **never**:
- Push to `main` or any shipped version branch directly
- Force-push
- Modify `.env*`, secrets, or credentials
- Run `--no-verify`
- Install new dependencies (Auto-PR excluded by policy; Meta-learn only touches `.claude/cron/` files)

## Changing agent behavior

Edit the relevant `agents/<name>.md` file and push. Next scheduled run picks it up. For urgent behavior changes, `/schedule` → update → run now on the specific trigger.

## Adding a new agent

1. Write `.claude/cron/agents/<name>.md` following the shape of existing agents
2. Commit and push
3. Use `/schedule` to create a trigger with this inline prompt:
   ```
   Checkout the repo. Read `.claude/cron/agents/<name>.md` and `.claude/cron/RUBRIC.md`. Execute the agent. End by appending the CRON-RUN-LOG block to the primary issue you file (or create a standalone cron-run-log issue if you had nothing to report).
   ```

## Deleting

Triggers cannot be deleted via API. Disable them, or remove from https://claude.ai/code/scheduled.
