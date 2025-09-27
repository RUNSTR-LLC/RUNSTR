# Auth Services Directory

Authentication services and security providers for RUNSTR user management.

## Files

- **.authService.ts.swp** - Temporary swap file (should be cleaned up)
- **authService.ts** - Main authentication coordination service managing login flows
- **DeleteAccountService.ts** - Handles complete account deletion with NIP-09 requests and local data cleanup
- **teamWalletPermissions.ts** - Team Bitcoin wallet access control and permission management

## Subdirectories

- **providers/** - Authentication provider implementations (Nostr, Apple, Google)