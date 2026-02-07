# Auth Providers

Authentication provider implementations for different login methods.

## Files

- **nostrAuthProvider.ts** - Nostr key-based authentication provider (primary auth method). Handles nsec login, key validation, and profile import.
- **amberAuthProvider.ts** - Amber app authentication provider for Android. Delegates signing to Amber so private keys never leave the external app.
- **appleAuthProvider.ts** - Apple Sign-In authentication provider with deterministic Nostr key generation (iOS only).
- **googleAuthProvider.ts** - *(Legacy/unused)* Google OAuth 2.0 authentication provider with deterministic Nostr key generation. Not currently active in the app.
