# Nostr Services

All Nostr I/O goes through the one NDK instance in `GlobalNDKService`.

- **GlobalNDKService.ts** - Shared NDK singleton and relay connections. Never create another NDK instance.
- **publishRun.ts** - Publishes one run as a kind 1301 note and records it as published (status tracker + local run).
- **workoutPublishingService.ts** - Builds and publishes the 1301 event (allowlisted tags only).
- **NostrProfileService.ts** - Reads and caches kind 0 profiles.
- **NostrProfilePublisher.ts** - Publishes kind 0 profile edits, signed with the user's signer (nsec or Amber).
