# RUNSTR Pre-Launch Comprehensive Review Script

## Instructions for Claude Sonnet 4.5
This script guides you through a systematic pre-launch review of the RUNSTR app. Focus on **quick, high-impact, safe improvements** that will enhance the initial launch experience. Prioritize user-facing issues over internal refactoring.

## Review Process

### Phase 1: Critical Issues Audit (15 minutes)

#### 1.1 TypeScript & Build Validation
```bash
# Run these commands and report ALL errors
npm run typecheck
npm run lint
```

**Task**: List every TypeScript error with file path and line number. Categorize as:
- **Critical** (prevents build): Fix immediately
- **Warning** (cosmetic): Note for post-launch
- **Type-only** (no runtime impact): Low priority

#### 1.2 Authentication & Wallet Critical Path
**Files to audit**:
- `src/contexts/AuthContext.tsx`
- `src/services/auth/*`
- `src/services/nutzap/NutzapService.ts`
- `src/services/nutzap/WalletInitializationService.ts`

**Check for**:
- ✅ Error boundaries around wallet initialization
- ✅ Graceful fallback if wallet creation fails
- ✅ Clear user messaging for auth failures
- ✅ No exposed private keys in logs
- ✅ Proper AsyncStorage key cleanup on logout

**Output**: List any missing error handling or security issues.

#### 1.3 Nostr Connection Stability
**Files to audit**:
- `src/services/nostr/GlobalNDKService.ts`
- `src/services/cache/UnifiedNostrCache.ts`

**Check for**:
- ✅ Connection retry logic on failure
- ✅ User feedback when relays are disconnected
- ✅ Timeout handling for slow queries
- ✅ No infinite loops in reconnection logic
- ✅ Memory leak prevention (event listener cleanup)

**Output**: Identify any potential connection issues or missing user feedback.

---

### Phase 2: User Experience Quick Wins (20 minutes)

#### 2.1 Loading States Audit
**Scan all screens** in `src/screens/`:

**Check each screen for**:
- ✅ Loading spinner while fetching data
- ✅ Empty state messages (e.g., "No teams found")
- ✅ Error state with retry button
- ✅ Skeleton loaders for better perceived performance

**Output**: List screens missing loading/empty/error states with specific recommendations.

#### 2.2 Button & Interaction Feedback
**Scan all components** in `src/components/`:

**Check for**:
- ✅ Disabled state on buttons after click (prevent double-submit)
- ✅ Loading indicators on async actions
- ✅ Success/failure toast messages
- ✅ Haptic feedback on important actions (using expo-haptics)

**Output**: List components missing interaction feedback.

#### 2.3 Navigation Edge Cases
**Files to audit**:
- `src/navigation/AppNavigator.tsx`
- `src/navigation/navigationHandlers.ts`

**Check for**:
- ✅ Back button behavior (no dead ends)
- ✅ Deep link handling (if applicable)
- ✅ Tab state preservation
- ✅ No navigation loops
- ✅ Proper stack reset on logout

**Output**: Identify any navigation issues or improvements.

---

### Phase 3: Data Integrity & Performance (15 minutes)

#### 3.1 Nostr Event Query Optimization
**Files to audit**:
- `src/services/competition/leaderboardService.ts`
- `src/services/fitness/*`
- `src/services/team/*`

**Check for**:
- ✅ Proper date range filters (avoid unbounded queries)
- ✅ Pagination or limits on large result sets
- ✅ Deduplication of events (by event.id)
- ✅ Cache invalidation strategy
- ✅ No redundant queries (check for duplicate fetchEvents calls)

**Output**: List any unbounded queries or missing optimizations.

#### 3.2 Memory Leak Prevention
**Scan for**:
```typescript
// Search pattern: useEffect with subscriptions
grep -r "useEffect" src/screens/ src/components/
```

**Check each useEffect for**:
- ✅ Cleanup function that unsubscribes
- ✅ Event listener removal
- ✅ Timer/interval cleanup
- ✅ Proper dependency arrays

**Output**: List any useEffect hooks missing cleanup functions.

#### 3.3 AsyncStorage Key Management
**Files to audit**:
- Search all files for `AsyncStorage.setItem`

**Check for**:
- ✅ Consistent key naming convention
- ✅ No sensitive data stored unencrypted
- ✅ Proper error handling on storage failures
- ✅ Cleanup on logout/account deletion

**Output**: List any AsyncStorage issues or security concerns.

---

### Phase 4: UI Polish & Accessibility (10 minutes)

#### 4.1 Visual Consistency
**Check**:
- Colors from `src/styles/theme.ts` used consistently
- No hardcoded colors in components
- Consistent spacing (no arbitrary margins)
- Button styles match design system

**Scan**: `src/components/` and `src/screens/` for inline styles

**Output**: List components with hardcoded colors or inconsistent styling.

#### 4.2 Text & Messaging
**Check all user-facing text for**:
- ✅ No Lorem Ipsum or placeholder text
- ✅ Clear error messages (no technical jargon)
- ✅ Consistent capitalization (Button Labels vs Sentence case)
- ✅ No typos in critical paths

**Output**: List any placeholder text or confusing messages.

#### 4.3 Accessibility Quick Wins
**Check for**:
- ✅ Touchable components have minimum 44x44pt hit area
- ✅ Important buttons have `accessibilityLabel`
- ✅ Text contrast meets WCAG AA standards
- ✅ No text in images (use accessible components)

**Output**: List top 5 accessibility improvements.

---

### Phase 5: Error Handling & Edge Cases (15 minutes)

#### 5.1 Network Failure Scenarios
**Simulate**:
- Device in airplane mode
- Slow 3G connection
- Relay timeouts

**Check these screens**:
- Login screen
- Teams discovery
- Competition leaderboards
- Wallet operations

**Output**: Identify screens that crash or freeze without network.

#### 5.2 Empty State Handling
**Check for proper handling of**:
- User has no teams
- Competition has no participants
- Workout history is empty
- Wallet has 0 balance
- No join requests for captain

**Output**: List screens with poor empty state UX.

#### 5.3 Data Validation
**Files to audit**:
- `src/services/competition/leaderboardService.ts`
- `src/services/fitness/WorkoutDataProcessor.ts`

**Check for**:
- ✅ Null/undefined checks before accessing properties
- ✅ Array bounds checking
- ✅ Type guards for unknown data
- ✅ Graceful degradation on malformed events

**Output**: List any potential null pointer crashes.

---

### Phase 6: Launch Readiness Checklist (10 minutes)

#### 6.1 Version & Metadata
**Check**:
- [ ] `app.json` version number is correct
- [ ] `package.json` description is accurate
- [ ] App name/bundle ID match intended values
- [ ] Privacy policy URL is set (if required)

#### 6.2 Production Configuration
**Check**:
- [ ] No console.log statements in critical paths
- [ ] Debug mode disabled in production builds
- [ ] No hardcoded API keys or secrets
- [ ] Environment variables properly configured

#### 6.3 Performance Baseline
**Measure on physical device**:
- [ ] App cold start time < 3 seconds
- [ ] Team discovery loads < 2 seconds
- [ ] Leaderboard calculation < 1 second
- [ ] Zap send completes < 3 seconds

**Output**: Report any performance bottlenecks.

---

## Final Deliverable Format

### Summary Report Structure:

```markdown
# RUNSTR Pre-Launch Review - [Date]

## Executive Summary
- Total issues found: X
- Critical (fix before launch): X
- High impact (fix if time): X
- Nice-to-have (post-launch): X

## Critical Issues (MUST FIX)
1. [Issue] - File: X, Line: Y
   - Impact: [User-facing impact]
   - Fix: [Specific code change needed]
   - Effort: [Minutes/Hours]

## High Impact Quick Wins (SHOULD FIX)
[Same format as above]

## Recommendations for Post-Launch
[Lower priority items]

## Performance Metrics
- Cold start: X seconds
- Team discovery: X seconds
- [Other key metrics]

## Code Quality Score
- TypeScript errors: X
- Lint warnings: X
- Missing error handling: X components
- Missing loading states: X screens

## Launch Readiness: [READY / NOT READY]
[Brief explanation]
```

---

## Review Guidelines

### Prioritization Matrix:
**Fix NOW (Critical)**:
- Crashes on core flows (login, wallet, zaps)
- Data loss or corruption risks
- Security vulnerabilities
- Zero-state or network failure crashes

**Fix if Time (High Impact)**:
- Missing loading states on key screens
- Confusing error messages
- Performance bottlenecks (>3s loads)
- Visual inconsistencies

**Post-Launch (Nice-to-Have)**:
- Code refactoring for maintainability
- Additional accessibility features
- Minor visual polish
- Internal documentation

### Safety Filter:
**Only recommend changes that**:
- ✅ Have clear, isolated scope
- ✅ Don't require architectural changes
- ✅ Can be tested quickly
- ✅ Have low regression risk

**Avoid recommending**:
- ❌ Major refactoring near launch
- ❌ New feature additions
- ❌ Unproven third-party libraries
- ❌ Complex state management changes

---

## Time Budget: 90 minutes total

Use this script to conduct a thorough but time-boxed review. Focus on user-facing improvements that can be implemented quickly and safely before launch.

**Start your review by running the TypeScript and lint checks, then proceed systematically through each phase.**
