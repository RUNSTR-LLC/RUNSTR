# Auth Providers Directory

Authentication provider implementations for different login methods.

## Files

- **appleAuthProvider.ts** - Apple Sign In authentication provider with deterministic Nostr key generation (active for iOS)
- **googleAuthProvider.ts** - Google Sign In authentication provider (legacy, not currently used)
- **nostrAuthProvider.ts** - Nostr key-based authentication provider (primary auth method)