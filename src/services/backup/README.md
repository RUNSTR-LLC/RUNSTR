# Backup Services

Encrypted workout backup to Nostr relays using NIP-44 self-encryption.

## Files

| File | Description |
|------|-------------|
| `BackupService.ts` | Export encrypted workout data to Nostr relays (kind 30078) |
| `AutoBackupService.ts` | Automatic backup orchestration with 3-min debounce, auth-aware scheduling |
| `RestoreService.ts` | Import and decrypt backup data from Nostr relays |

## How It Works

### Export
1. User taps "Export Data" in Settings
2. Collects all local data (workouts, habits, journal entries)
3. Encrypts with NIP-44 self-encryption (user's nsec → user's pubkey)
4. Publishes kind 30078 replaceable event to relays
5. Only the user can decrypt their own backup

### Import
1. User taps "Import Data" in Settings
2. Searches relays for kind 30078 events with `d` tag `runstr-workout-backup`
3. Decrypts content with user's nsec
4. Merges into local storage with automatic deduplication
5. Shows summary of imported vs skipped items

## Event Structure (kind 30078)

```typescript
{
  kind: 30078,
  pubkey: "<user's hex pubkey>",
  tags: [
    ["d", "runstr-workout-backup"],
    ["client", "RUNSTR", "<version>"],
    ["encrypted", "nip44"],
    ["backup_version", "1"],
    ["workout_count", "<count>"],
    ["habit_count", "<count>"],
    ["journal_count", "<count>"],
    ["date_range", "<oldest>", "<newest>"]
  ],
  content: "<NIP-44 encrypted JSON payload>"
}
```

## Data Included

- **Workouts**: All local workouts with full detail
- **Habits**: Habit tracking data with streaks
- **Journal**: Journal entries with mood/energy
- **Preferences**: Unit system, selected charity

## Privacy

- All content is encrypted with NIP-44
- Only metadata tags (counts) are visible to relays
- Only the user (with their nsec) can decrypt

## Components

Related UI components:
- `src/components/backup/ExportDataModal.tsx`
- `src/components/backup/ImportDataModal.tsx`
