# Types Directory

- **index.ts** - Re-exports `user` and `workout`.
- **user.ts** - User profile (kind 0 fields), auth results, `ApiResponse`.
- **workout.ts** - `Workout`, `WorkoutType`, `WorkoutSource`, `FitnessProvider`.
- **nostrWorkout.ts** - Kind 1301 workout event types used by the relay backfill.
- **journal.ts** - Journal entries (round-tripped by the encrypted backup).
- **timeline.ts** - Month-grouped history items.
- **verification.ts** - Legacy `VerificationReceipt` field on stored runs.
- **text-encoding.d.ts** - Polyfill typings.
