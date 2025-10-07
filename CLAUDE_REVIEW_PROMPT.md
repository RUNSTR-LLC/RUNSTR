# Claude Pre-Launch Review - Quick Start Prompt

Copy and paste this entire message to Claude Sonnet 4.5 to initiate the pre-launch review:

---

## 🚀 RUNSTR Pre-Launch Comprehensive Review

I need you to conduct a systematic pre-launch review of the RUNSTR app to identify **quick, high-impact, safe improvements** before our initial launch.

### Your Task

Follow the detailed instructions in `PRE_LAUNCH_REVIEW_SCRIPT.md` to conduct a 90-minute review covering:

1. **Critical Issues Audit** - TypeScript, auth, wallet, Nostr connectivity
2. **User Experience** - Loading states, feedback, navigation
3. **Performance** - Query optimization, memory leaks, caching
4. **UI Polish** - Consistency, messaging, accessibility
5. **Error Handling** - Network failures, empty states, validation
6. **Launch Readiness** - Version, config, performance baseline

### Review Guidelines

**Prioritize:**
- ✅ User-facing issues over internal refactoring
- ✅ Quick wins (< 1 hour to fix) over long-term improvements
- ✅ Critical path flows (auth, wallet, teams, zaps) over edge features
- ✅ Safety and security over performance optimization

**Focus Areas:**
- Missing loading states and error handling
- Security issues (exposed keys, insecure storage)
- Memory leaks (useEffect cleanup)
- Performance bottlenecks (unbounded queries)
- Crash-prone code (null pointers, missing try-catch)
- Poor UX (confusing messages, no feedback)

**Avoid Recommending:**
- Major architectural refactoring
- New feature additions
- Unproven third-party libraries
- Complex state management changes

### Deliverable Format

Provide a structured report with:

```markdown
# RUNSTR Pre-Launch Review - [Date]

## Executive Summary
- Total issues: X
- Critical (must fix): X
- High impact (should fix): X
- Medium/Low (post-launch): X

## 🔴 Critical Issues (Fix Before Launch)
[List with file:line, impact, and specific fix]

## 🟠 High Impact Quick Wins (Fix If Time)
[List with file:line and recommendations]

## 🟡 Post-Launch Improvements
[Brief list of lower-priority items]

## Performance Metrics
[If tested on device]

## Launch Readiness: READY / NOT READY
[Brief explanation]
```

### Start Here

Begin by:
1. Reading `PRE_LAUNCH_REVIEW_SCRIPT.md` for detailed instructions
2. Running automated checks: `npm run typecheck` and `npm run lint`
3. Systematically working through each review phase
4. Generating the final report

**Time Budget**: 90 minutes total (time-box each phase as specified in script)

Let me know when you're ready to begin, and I'll assist with any questions during the review process.

---

## Alternative: Quick Automated Audit

If you prefer to start with automated checks first, run:
```bash
npm run audit:pre-launch
```

This will generate `AUDIT_REPORT.md` in ~5 minutes, which you can then use to guide the manual review.
