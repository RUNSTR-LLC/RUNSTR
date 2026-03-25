# Integration Services Directory

External service integrations and bridging between Nostr events and RUNSTR competition internals.

## Active files

- **NostrCompetitionContextService.ts** - Nostr-specific competition context/state hydration used by integration flows.
- **nostrCompetitionBridge.ts** - Bridge service that maps Nostr competition events into internal competition models.

## Notes

- `competitionContextService.ts`, `competitionIntegrationService.ts`, and `nostrRealtimeCompetitionSync.ts` are no longer present in this directory.
- Keep this index aligned with actual files to avoid stale implementation references during audits and onboarding.
