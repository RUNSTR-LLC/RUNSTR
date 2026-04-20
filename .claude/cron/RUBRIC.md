# Cron Agent Self-Scoring Rubric

At the end of every run, the agent scores itself across five dimensions (0–10 each) and appends a machine-readable `CRON-RUN-LOG` block to the primary issue it filed.

Be honest. The meta-learn agent uses these scores to decide whether to tune your prompt. Inflated scores → your prompt never gets the improvements it needs.

## Dimensions

### Specificity (0–10)

Do findings cite exact `file:line` references? Are code snippets included? Is the repro path concrete?

- **9–10:** Every finding has file:line + snippet + clear reproduction or reasoning.
- **6–8:** Most findings are specific; a few vague ones slip in.
- **3–5:** Half the findings are "somewhere in the auth code" hand-waving.
- **0–2:** Vague suspicions, no actionable locations.

### Actionability (0–10)

Can a human (or Auto-PR) act on the finding without more investigation?

- **9–10:** Each finding says what to change and why. A developer could implement the fix in one sitting.
- **6–8:** Most findings are clear but a few need more design work.
- **3–5:** Findings identify problems but don't suggest paths forward.
- **0–2:** Pure observations with no fix direction.

### Signal-to-Noise (0–10)

How much of what you filed would a human actually want to see? Filter out: pre-existing known issues (see `CLAUDE.md` for known errors), style nits in generated code, duplicates of already-filed issues.

- **9–10:** Every finding is new, real, and worth triaging.
- **6–8:** Most findings are valuable; 1–2 low-value inclusions.
- **3–5:** Half the findings are noise.
- **0–2:** Mostly noise. Would waste the human's time.

### False-Positive Risk (0–10)

Inverted: lower is better for the codebase, higher for your score. 10 = high confidence all findings are real. 0 = you're guessing and some are probably wrong.

- **9–10:** You verified each finding by reading the code. No guesses.
- **6–8:** Most findings verified; 1–2 inferred without reading all the way.
- **3–5:** Several findings are pattern-matches without verification.
- **0–2:** Lots of speculation. Treat as "suspicions" not "bugs."

### Coverage (0–10)

Did you explore the full scope specified in your agent prompt? Or did you bail early?

- **9–10:** Visited every area named in the prompt; used parallel investigation where called for.
- **6–8:** Covered most areas; one or two got light treatment.
- **3–5:** Covered the obvious stuff; missed significant areas.
- **0–2:** Only hit the first thing you found interesting.

## Overall

```
overall = (specificity + actionability + signal_to_noise + false_positive_risk + coverage) / 5
```

Round to 1 decimal.

## Notes field

One sentence on what was hard, what worked, or what would make next run better. The meta-learn agent reads these.

Good notes:
- "Typecheck output drowned out real findings; next run should filter pre-existing errors first."
- "Only found 2 perf issues — rotation interval may be too tight, weekly would give more surface."
- "Nostr relay damus.io timed out; fell back to 3 relays."

Bad notes:
- "Went well."
- "Nothing to report."
- "Found some stuff."
