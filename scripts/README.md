# RUNSTR Scripts

Development, testing, and diagnostic scripts for the RUNSTR fitness app.

## Directory Structure

```
scripts/
├── testing/        # Test suites and utilities
├── diagnostics/    # Debugging and analysis tools
├── maintenance/    # Build and project management
└── assets/         # Asset generation scripts
```

---

## Testing Scripts (`testing/`)

### Competition & Leaderboard Tests
| Script | Description |
|--------|-------------|
| `test-leaderboard-system.ts` | Comprehensive leaderboard scoring tests |
| `test-leaderboard.ts` | Leaderboard query and calculation tests |
| `test-leaderboard-query.ts` | Nostr kind 1301 query tests |
| `test-challenge-flow.ts` | 1v1 challenge creation and flow tests |
| `test-e2e-competition-flow.ts` | End-to-end competition workflow tests |
| `test-event-creation.ts` | Event creation validation tests |
| `test-join-requests.ts` | Team join request flow tests |
| `competitionIntegrationTests.ts` | Integration test suite for competitions |
| `competitionSimulator.ts` | Competition simulation utilities |
| `leaderboardTestScripts.ts` | Leaderboard test utilities |
| `memberManagementTests.ts` | Member management test suite |

### Wallet & Payment Tests
| Script | Description |
|--------|-------------|
| `test-amber-wallet-flow.ts` | Amber wallet signing flow tests |
| `test-amber-solutions.ts` | Amber wallet solution validation |
| `test-amber-deeplink.sh` | Amber deeplink testing |
| `test-wallet-fixes.js` | Wallet bug fix verification |
| `test-wallet-retrieval.js` | Wallet data retrieval tests |
| `test-wallet-duplicate-prevention.js` | Duplicate wallet prevention tests |
| `test-nwc-direct.cjs` | Direct NWC connection tests |
| `test-lightning-address-priority.cjs` | Lightning address priority tests |
| `test-reward-flow.cjs` | Reward distribution flow tests |

### Fitness & Activity Tests
| Script | Description |
|--------|-------------|
| `testActivityTrackerFixes.ts` | Activity tracker bug fixes |
| `testGPSTracker.ts` | GPS tracking accuracy tests |
| `testGPSTrackerSimple.ts` | Simplified GPS tracker tests |
| `simulate-gps.js` | GPS route simulation |
| `test-vo2max-calculations.js` | VO2max calculation validation |
| `test-fitness-age-calculation.js` | Fitness age algorithm tests |
| `test-adjusted-norms.js` | Adjusted fitness norm tests |
| `test-new-norms.js` | New fitness norm validation |
| `test-daily-limit.cjs` | Daily workout limit tests |
| `test-distance-eligibility.cjs` | Distance eligibility tests |

### Nostr & Data Tests
| Script | Description |
|--------|-------------|
| `test1301Format.js` | Kind 1301 workout event format validation |
| `test-team-tag-propagation.ts` | Team tag propagation tests |
| `test-team-tags-e2e.ts` | End-to-end team tag tests |
| `test-duration-parser.ts` | Duration parsing validation |
| `test-split-generation.ts` | Workout split generation tests |
| `test-alternative-query.ts` | Alternative Nostr query tests |

### Test Runners & Utilities
| Script | Description |
|--------|-------------|
| `runTerminalTests.js` | Terminal-based test runner |
| `testRunner.js` | Generic test runner |
| `runAllTests.ts` | Run all test suites |
| `validateTestLogic.js` | Test logic validation |
| `notificationTestUtils.ts` | Notification test utilities |
| `test-integration.js` | Integration test runner |
| `workoutQueryPerformanceTests.ts` | Performance benchmarks |
| `testIntegration.ts` | Integration test orchestrator |

---

## Diagnostic Scripts (`diagnostics/`)

### Wallet Diagnostics
| Script | Description |
|--------|-------------|
| `diagnose-wallet.ts` | General wallet state diagnosis |
| `diagnose-wallet-nostr-only.ts` | Nostr-specific wallet debugging |
| `check-wallet-state.ts` | Wallet state inspection |
| `find-nostr-wallet.ts` | Find stored wallet configurations |
| `recover-wallet.js` | Wallet recovery utilities |

### Event & Workout Diagnostics
| Script | Description |
|--------|-------------|
| `diagnose-event-display.js` | Event display debugging |
| `diagnose-event-tags.ts` | Event tag analysis |
| `diagnose-recent-workout.ts` | Recent workout inspection |
| `verify-nostr-events.ts` | Nostr event validation |
| `query-1301-stats.js` | Kind 1301 event statistics |
| `query-recent-workouts.ts` | Recent workout queries |

### Team & User Diagnostics
| Script | Description |
|--------|-------------|
| `analyzeTeamMembers.ts` | Team member analysis |
| `fetchTeams.ts` | Team data fetching |
| `check-pubkey-profile.mjs` | Public key profile lookup |
| `debug-user-workouts.mjs` | User workout debugging |

### Midnight Run Event Debugging
| Script | Description |
|--------|-------------|
| `debug-midnight-run.ts` | Midnight Run event debugging |
| `check-midnight-run.mjs` | Midnight Run status check |
| `check-midnight-run-workouts.mjs` | Midnight Run workout verification |
| `investigate-midnight-run.ts` | Deep investigation of Midnight Run |

### RSVP & Full Flow Debugging
| Script | Description |
|--------|-------------|
| `debug-rsvp-query.ts` | RSVP query debugging |
| `debug-event-details.mjs` | Event details inspection |
| `debug-full-flow.mjs` | Full app flow debugging |
| `debug-check-events.mjs` | Event check debugging |

### Utility
| Script | Description |
|--------|-------------|
| `clear-app-data.js` | Clear local app data |

---

## Maintenance Scripts (`maintenance/`)

| Script | Description |
|--------|-------------|
| `preLaunchAudit.ts` | Pre-launch quality audit |
| `build-android.sh` | Android APK build script |
| `publish-test-workout.ts` | Publish test workout events |

---

## Asset Scripts (`assets/`)

| Script | Description |
|--------|-------------|
| `scale_android_icons.py` | Scale Android icons to required sizes |
| `generate_splash_screens.py` | Generate splash screen assets |
| `create_circular_android_icons.py` | Create circular Android icons |

---

## NPM Script Shortcuts

```bash
# Core Development
npm run start                   # Start Expo development server
npm run ios                     # Run on iOS
npm run android                 # Run on Android
npm run typecheck               # TypeScript validation
npm run lint                    # Code linting

# Testing
npm run test                    # Run Jest tests
npm run test:activity-tracker   # Test activity tracker fixes
npm run test:amber-flow         # Test Amber wallet flow
npm run test:amber-solutions    # Test Amber solutions

# Diagnostics
npm run diagnose:wallet         # Diagnose wallet issues
npm run diagnose:wallet-nostr   # Nostr-specific wallet diagnosis
npm run find:wallet             # Find wallet configuration
npm run verify:events           # Verify Nostr events

# Maintenance
npm run audit:pre-launch        # Run pre-launch audit
```

---

## Running Scripts Directly

Most scripts can be run with `npx tsx`:

```bash
# TypeScript scripts
npx tsx scripts/testing/test-leaderboard-system.ts
npx tsx scripts/diagnostics/diagnose-wallet.ts
npx tsx scripts/maintenance/preLaunchAudit.ts

# JavaScript scripts
node scripts/testing/test-integration.js
node scripts/diagnostics/query-1301-stats.js

# CommonJS scripts
node scripts/testing/test-nwc-direct.cjs

# Shell scripts
./scripts/maintenance/build-android.sh
```

---

## Adding New Scripts

When adding a new script:

1. **Place in appropriate directory**:
   - `testing/` - Test suites, validation, benchmarks
   - `diagnostics/` - Debugging, analysis, inspection
   - `maintenance/` - Build, deploy, project management
   - `assets/` - Asset generation

2. **Add npm script** if frequently used:
   ```json
   "scripts": {
     "your-script": "npx tsx scripts/testing/yourScript.ts"
   }
   ```

3. **Update this README** with script description

4. **Add file header**:
   ```typescript
   /**
    * Script Name - Brief Description
    * Usage: npx tsx scripts/testing/scriptName.ts
    */
   ```

---

## Related Documentation

- [Pre-Launch Review Guide](../docs/PRE_LAUNCH_REVIEW_GUIDE.md)
- [Testing Guide](../docs/archive/PHASE_1_2_TESTING_GUIDE.md)
- [Amber Integration](../docs/AMBER_INTEGRATION.md)

---

**Last Updated**: 2025-12-16
