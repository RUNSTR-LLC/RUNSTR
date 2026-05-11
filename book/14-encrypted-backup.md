# Chapter 14: Encrypted Backup

## What is Encrypted Backup?

RUNSTR supports **encrypted backup and restore** of all user data via Nostr kind 30078 events. Your workouts, habits, journal entries, and preferences are compressed, encrypted to your own public key using NIP-44, and published to Nostr relays. Only you can decrypt your backup.

**Key Point:** This is a privacy-first backup system. The event tags contain public metadata (workout count, date range), but the actual content is fully encrypted. Anyone can see that you backed up 47 workouts, but only you can read the details.

---

## How It Works

### Export Flow

1. Collect all local data (workouts, step history, habits, journal, preferences)
2. Serialize to JSON
3. Compress with gzip (NIP-44 has a 64KB payload limit)
4. Encrypt with NIP-44 self-encryption (your own pubkey)
5. Publish as kind 30078 to relays (damus, nos.lol, nostr.band)

### Import Flow

1. Fetch kind 30078 from relays using d-tag `runstr-workout-backup`
2. Decrypt with NIP-44 using your private key
3. Decompress gzip payload
4. Restore data to local storage

---

## What Gets Backed Up

| Data Type | Description |
|-----------|-------------|
| Local workouts | GPS-tracked, manual entry, imported workouts |
| Step history | Daily step counts |
| Habits | Habit definitions and streak data |
| Journal entries | Fitness journal notes |
| User preferences | Unit system (km/mi), lightning address, settings |

---

## Kind 30078 Event Structure

Kind 30078 is a **replaceable parameterized event** -- newer backups automatically overwrite older ones on relays.

### Event Format

```json
{
  "kind": 30078,
  "pubkey": "<user's hex pubkey>",
  "created_at": 1706500000,
  "tags": [
    ["d", "runstr-workout-backup"],
    ["client", "RUNSTR", "1.6.3"],
    ["encrypted", "nip44"],
    ["compression", "gzip"],
    ["backup_version", "1"],
    ["workout_count", "47"],
    ["habit_count", "3"],
    ["journal_count", "12"],
    ["date_range", "2025-08-15", "2026-01-28"]
  ],
  "content": "<NIP-44 encrypted + gzipped JSON payload>"
}
```

### Tag Details

| Tag | Purpose |
|-----|---------|
| `d` | Fixed identifier `runstr-workout-backup` (makes event replaceable) |
| `client` | App name and version |
| `encrypted` | Encryption method (always `nip44`) |
| `compression` | Compression method (always `gzip`) |
| `backup_version` | Schema version for forward compatibility |
| `workout_count` | Number of workouts in backup (public metadata) |
| `habit_count` | Number of habits in backup (public metadata) |
| `journal_count` | Number of journal entries (public metadata) |
| `date_range` | Oldest and newest data dates (public metadata) |

---

## NIP-44 Self-Encryption

The backup uses **self-encryption**: the user encrypts the payload to their own public key. This means:

- Only the user's private key can decrypt the backup
- Works across devices -- log in with your nsec on a new phone and restore
- No third-party server needed for backup storage
- Relay operators cannot read the content

### Why NIP-44?

NIP-44 is the modern Nostr encryption standard:
- Authenticated encryption (tamper-proof)
- Padding to prevent content length analysis
- 64KB payload limit (hence gzip compression)

---

## Gzip Compression

Backup payloads can be large (hundreds of workouts, journal entries, etc.). NIP-44 has a 64KB limit, so the data is compressed with gzip before encryption.

```
Raw JSON (e.g., 200KB)
        |
        v
Gzip compress (~30KB)
        |
        v
NIP-44 encrypt (~30KB + padding)
        |
        v
Base64 encode for event content
```

---

## Settings Integration

Export and Import buttons are available in the **Settings screen**:

```
Settings
  |
  +-- Backup & Restore
       |
       +-- [Export Backup]   -> Collects data, encrypts, publishes to relays
       +-- [Import Backup]   -> Fetches from relays, decrypts, restores locally
```

### Signer Support

The backup system works with both authentication methods:
- **nsec (direct)** -- Signs and encrypts using the local private key
- **Amber (external signer)** -- Delegates signing and encryption to the Amber app

---

## Technical Section

### BackupService

**File:** `src/services/backup/BackupService.ts`

Handles the export flow:
- Collects all local data from AsyncStorage
- Serializes and compresses
- Encrypts with NIP-44 via the user's signer
- Publishes kind 30078 to backup relays

### RestoreService

**File:** `src/services/backup/RestoreService.ts`

Handles the import flow:
- Fetches kind 30078 from relays by d-tag
- Decrypts with NIP-44
- Decompresses gzip payload
- Merges restored data into local storage

### Backup Relays

Backups are published to 3 relays:

| Relay | URL |
|-------|-----|
| Damus | `wss://relay.damus.io` |
| Nos.lol | `wss://nos.lol` |
| Nostr.band | `wss://relay.nostr.band` |

### Key Properties

- **Replaceable** -- Kind 30078 with a fixed `d` tag means only the latest backup exists per relay
- **Self-encrypted** -- Only the owner can decrypt
- **Compressed** -- Gzip handles large payloads within NIP-44's 64KB limit
- **Metadata tags** -- Public workout/habit counts for quick overview without decryption
- **Cross-device** -- Restore on any device by logging in with your nsec

---

## What Encrypted Backup Should Be

### Ideal Architecture
1. **One-tap export** -- Single button in Settings
2. **Self-encryption** -- NIP-44 to own pubkey, no trusted third parties
3. **Compressed** -- Gzip to fit within NIP-44 limits
4. **Replaceable events** -- Latest backup overwrites older ones
5. **Public metadata only** -- Tags show counts, content is encrypted

### What to Avoid
- Unencrypted backup data on relays
- Dependency on centralized backup servers
- Manual key management for encryption
- Multiple backup events (should be single replaceable event)

---

## Navigation

**Previous:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Next:** [Chapter 15: Conclusion](./15-conclusion.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
