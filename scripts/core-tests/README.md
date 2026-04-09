# Core Tests

Standalone test scripts for auditing critical RUNSTR subsystems. Each file is a self-contained TypeScript script runnable with `npx tsx` -- no test framework required.

## Quick Start

```bash
# Run everything
npx tsx scripts/core-tests/run-all.ts

# Run a single test
npx tsx scripts/core-tests/test-charity-addresses.ts
```

## Tests

| Script | What It Tests |
|--------|---------------|
| `test-charity-addresses.ts` | Probes every charity Lightning address via LNURL to verify it resolves. Reports working vs dead addresses. Critical for the charity audit. |
| `test-workout-submission.ts` | Validates the workout submission pipeline: source file structure, WorkoutSubmissionData shape, Supabase connectivity, and edge function reachability. |
| `test-reward-destination.ts` | Tests reward routing logic for every destination type (self, charity, PPQ, community). Validates storage key consistency across services and Lightning address format validation. |
| `test-auth-flow.ts` | Generates Nostr identities, tests key round-tripping (nsec/npub encode/decode), validates uniqueness, and checks source code for correct crypto patterns (NDK, secure RNG). |
| `test-navigation-flows.ts` | Verifies critical screen/component files exist, then prints a comprehensive manual smoke test checklist (70+ items) for on-device testing. |
| `test-background-sync.ts` | Tests the HealthKit/Health Connect background sync pipeline: workout normalization, deduplication, CARDIO_TYPES filtering, TaskManager registration, 15-min Android interval, and auto-submit paths. |
| `test-competition-enrollment.ts` | Validates competition enrollment flow: join/leave/isParticipant methods, HARDCODED_EVENT_IDS filtering, leaderboard query structure, dynamic competition hook, and live Supabase connectivity. |
| `test-club-operations.ts` | Tests Fitness Club system: membership (join/leave/members), 7-day cooldown logic, chat service (send/get/subscribe/realtime), club creation path (Pro-only), reconciliation, and live Supabase queries against user_teams. |
| `test-encrypted-backup.ts` | Validates the encrypted backup/restore pipeline: Kind 30078 events, NIP-44 self-encryption, gzip compression via pako, backup payload (workouts/habits/journal), app version metadata, auto-backup triggers, and RestoreService decompression. |
| `run-all.ts` | Runs all tests in sequence and reports a pass/fail summary with timing. |

## Requirements

- Node.js 18+
- `npx tsx` (TypeScript execution)
- `.env` file at project root (for Supabase tests)
- `nostr-tools` package (for auth tests)
- Network access (for charity address probing and Supabase checks)

## Output

Each test prints `PASS` / `FAIL` for individual assertions and exits with code 0 (all pass) or 1 (any failure). The `run-all.ts` runner captures each suite's exit code independently so one failure does not block the rest.

## Adding Tests

Follow the existing pattern:
1. Create a new `test-*.ts` file in this directory
2. Use the `assert(name, condition, detail?)` helper pattern
3. Print a summary and call `process.exit(failed > 0 ? 1 : 0)`
4. Add the test to the `TESTS` array in `run-all.ts`
