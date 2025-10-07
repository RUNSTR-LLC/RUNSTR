# Pre-Launch Review Guide

This guide explains how to conduct a comprehensive pre-launch review of the RUNSTR app using two complementary approaches:

1. **Automated Audit** - Fast automated checks (5 minutes)
2. **Claude Manual Review** - Deep manual analysis (90 minutes)

---

## Approach 1: Automated Audit (Recommended First Step)

### Quick Start
```bash
npm run audit:pre-launch
```

### What It Checks
The automated audit scans your codebase for common issues:

- ✅ **Error Handling**: Missing try-catch blocks, error boundaries
- ✅ **Loading States**: Missing ActivityIndicators while fetching data
- ✅ **Memory Leaks**: useEffect hooks without cleanup functions
- ✅ **UI Consistency**: Hardcoded colors instead of theme
- ✅ **Production Readiness**: Console.log statements
- ✅ **AsyncStorage**: Operations without error handling
- ✅ **Performance**: Unbounded Nostr queries
- ✅ **User Experience**: Lists without empty states

### Output
The script generates:
1. **Terminal Summary** - Color-coded issue count by severity
2. **Detailed Report** - `AUDIT_REPORT.md` with file paths and recommendations

### Exit Codes
- `0` - No critical issues (launch ready)
- `1` - Critical issues found (fix before launch)

### Example Output
```
🚀 Starting RUNSTR Pre-Launch Audit...

🔍 Auditing Error Boundaries...
🔍 Auditing Loading States...
🔍 Auditing Memory Leaks...
...

📊 Generating Report...

================================================================================
  RUNSTR PRE-LAUNCH AUDIT REPORT
================================================================================

📈 Summary:
  🔴 Critical Issues: 2
  🟠 High Priority:   5
  🟡 Medium Priority: 12
  🟢 Low Priority:    8
  📊 Total Issues:    27

🔴 CRITICAL ISSUES (Fix Before Launch)
────────────────────────────────────────

1. Memory Leaks: useEffect with subscription but no cleanup function
   File: src/screens/EventsScreen.tsx:45
   Fix:  Add return () => { /* cleanup subscription */ } to useEffect

...
```

---

## Approach 2: Claude Manual Review (Deep Analysis)

### When to Use
- After running automated audit
- Before final launch
- When you need human judgment on UX/design decisions
- For architecture-level recommendations

### How to Use

#### Step 1: Give Claude the Review Script
Send this message to Claude Sonnet 4.5:

```
I need you to conduct a comprehensive pre-launch review of the RUNSTR app.
Please read and follow the instructions in PRE_LAUNCH_REVIEW_SCRIPT.md
```

#### Step 2: Claude Follows the Script
Claude will systematically work through 6 review phases:

1. **Critical Issues Audit** (15 min)
   - TypeScript compilation
   - Authentication/wallet security
   - Nostr connection stability

2. **User Experience Quick Wins** (20 min)
   - Loading states
   - Button feedback
   - Navigation edge cases

3. **Data Integrity & Performance** (15 min)
   - Query optimization
   - Memory leak prevention
   - Cache management

4. **UI Polish & Accessibility** (10 min)
   - Visual consistency
   - Messaging clarity
   - Accessibility basics

5. **Error Handling & Edge Cases** (15 min)
   - Network failures
   - Empty states
   - Data validation

6. **Launch Readiness Checklist** (10 min)
   - Version metadata
   - Production config
   - Performance baseline

#### Step 3: Review Claude's Report
Claude will generate a structured report:

```markdown
# RUNSTR Pre-Launch Review - [Date]

## Executive Summary
- Total issues found: X
- Critical (fix before launch): X
- High impact (fix if time): X
- Nice-to-have (post-launch): X

## Critical Issues (MUST FIX)
1. [Specific issue with file/line and fix recommendation]

## High Impact Quick Wins (SHOULD FIX)
[Prioritized list]

## Launch Readiness: [READY / NOT READY]
```

---

## Recommended Workflow

### Phase 1: Automated Check (Day 1)
```bash
# Run automated audit
npm run audit:pre-launch

# Review AUDIT_REPORT.md
# Fix critical issues immediately
```

### Phase 2: Manual Review (Day 2)
```bash
# Give Claude the review script
# Let Claude conduct deep analysis
# Get prioritized recommendations
```

### Phase 3: Implementation (Day 3-4)
```bash
# Fix critical issues first
# Then high-impact quick wins
# Defer nice-to-haves to post-launch
```

### Phase 4: Final Validation (Day 5)
```bash
# Re-run automated audit
npm run audit:pre-launch

# Verify all critical issues resolved
# Run TypeScript check
npm run typecheck

# Run lint check
npm run lint

# Test on physical device
# Measure performance metrics
```

---

## Issue Severity Guide

### 🔴 Critical (Fix Before Launch)
- App crashes on core flows
- Data loss or corruption
- Security vulnerabilities (exposed keys)
- Zero-state crashes
- Memory leaks causing crashes

**Action**: Fix immediately, test thoroughly

### 🟠 High Priority (Quick Wins)
- Missing loading states
- Poor error messages
- Performance bottlenecks (>3s)
- Navigation dead ends
- Missing empty states

**Action**: Fix if time allows (2-4 hours total)

### 🟡 Medium Priority (Post-Launch OK)
- UI inconsistencies (colors)
- Console.log cleanup
- Accessibility improvements
- Code style issues

**Action**: Create GitHub issues for post-launch

### 🟢 Low Priority (Technical Debt)
- Refactoring opportunities
- Documentation improvements
- Test coverage
- Code organization

**Action**: Backlog for future sprints

---

## Success Metrics

### Launch Ready When:
- ✅ No critical issues in automated audit
- ✅ TypeScript compiles without errors
- ✅ All core flows tested on physical device
- ✅ Cold start time < 3 seconds
- ✅ Key screens load < 2 seconds
- ✅ No crashes in 30-minute testing session

### Core Flows to Test:
1. **Authentication**: Login with nsec → Auto-wallet creation
2. **Team Discovery**: Browse teams → Join team
3. **Competition**: View leaderboard → Post workout
4. **Bitcoin**: Send zap → Receive zap
5. **Profile**: View workouts → Post to Nostr

---

## Integration with CI/CD (Future)

The automated audit can be integrated into your CI pipeline:

```yaml
# .github/workflows/pre-release.yml
name: Pre-Release Audit

on:
  push:
    tags:
      - 'v*'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run audit:pre-launch
      - run: npm run typecheck
      - run: npm run lint
```

---

## FAQ

### Q: How long does the automated audit take?
**A**: ~5 minutes for the full codebase

### Q: Can I customize the audit rules?
**A**: Yes! Edit `scripts/preLaunchAudit.ts` to add/remove checks

### Q: Should I fix all issues before launch?
**A**: Only critical issues. High-priority items are "nice to have"

### Q: How often should I run this?
**A**:
- Automated audit: Daily during pre-launch week
- Manual review: Once before launch, once after major features

### Q: What if the automated audit shows 100+ issues?
**A**: Normal for first run. Focus on critical first, then batch-fix by category

---

## Support

For questions or issues with the review process:
1. Check the automated audit output in `AUDIT_REPORT.md`
2. Review the manual script in `PRE_LAUNCH_REVIEW_SCRIPT.md`
3. Ask Claude for clarification on specific recommendations

---

**Last Updated**: 2025-10-06
**Version**: 1.0.0
