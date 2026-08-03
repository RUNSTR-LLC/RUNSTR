# Design Consistency Agent

**Runs:** Wednesdays 06:00 UTC (2am EDT)
**Mission:** Enforce RUNSTR's visual language. Black/orange only, no emojis, strict minimalism.

## Execution

### 1. Setup

Read `CLAUDE.md` and `docs/North Star.md` for the design rules. Key constraints from memory:
- **Colors:** Black and orange only. No blue/green/red/purple accent colors.
- **No emojis in UI, code, or docs** (except where user explicitly requested).
- **Terminology:** "rewards" not "sats/Bitcoin", "password" not "nsec", "Fitness Club" not "Run Club".
- **Minimalism:** Subtle celebrations, no colorful animations.

### 2. Investigation angles

**a. Color violations**
```bash
grep -rEn "#[0-9a-fA-F]{3,6}" src/ | grep -viE "#(000|fff|f[6-9a-f]|ff[6-9a-f]|orange)"
grep -rEn "rgb\(|rgba\(" src/
```
Flag any color that isn't black/white/orange-family. Check the actual theme file first to find the approved palette.

**b. Emoji audit**
```bash
grep -rP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/ docs/ README.md
```
Any emoji in user-facing text, code comments, or docs is a violation.

**c. Terminology drift**
```bash
grep -rEn "\b(sats|Bitcoin|Lightning|nsec|Run Club)\b" src/ docs/ --include='*.{ts,tsx,md}'
```
Flag each occurrence in user-facing strings. Implementation-layer usage (e.g., LNURL code) is fine.

**d. Component consistency**
Look for screens/components that deviate from the base Card/Button/Avatar pattern in `src/components/ui/`. Examples: inline styles that should be shared, one-off typography scales, hardcoded spacing that doesn't match theme tokens.

**e. Accessibility basics**
- `<TouchableOpacity>` without `accessibilityLabel`
- Text color on background with insufficient contrast
- Touch targets <44px

### 3. Rank + file

Severity:
- **Critical** — breaks brand (wrong color on primary CTA, emoji on Rewards page)
- **High** — visible inconsistency across screens
- **Medium** — small nit (spacing off by 4px)
- **Low** — future-proofing

File one issue `[Design] Consistency sweep YYYY-MM-DD`. Label: `design`. Add `auto-pr-ok` for string replacements and simple style fixes (most design findings qualify).

### 4. Self-assessment

Include the `CRON-RUN-LOG` block (format per `RUBRIC.md`) at the **very end** of the issue body when calling `gh issue create`. Write the block directly into the body HEREDOC — do not attempt to add it via a separate comment after creation, as that step is consistently skipped.

Example tail of your issue body:
```
---

<!-- CRON-RUN-LOG
agent: design
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

- Don't propose redesigns. Consistency issues only.
- Don't flag emojis in `book/`, `articles/`, business docs, or skill files — those are humans' domain.
- Read-only. Single `gh issue create` mutation.
