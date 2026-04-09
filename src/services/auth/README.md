# Auth Services

Authentication services, secure key storage, and signing providers for RUNSTR user management.

## Files

- **authService.ts** - Main authentication coordination service managing login flows and sign-out with Nostr/wallet cleanup.
- **DeleteAccountService.ts** - Complete account deletion with NIP-09 deletion requests to Nostr relays and local data cleanup.
- **SecureNsecStorage.ts** - Hardware-backed nsec storage using expo-secure-store (iOS Keychain, Android Keystore) with backwards-compatible migration from AsyncStorage.
- **UnifiedSigningService.ts** - Unified signing abstraction that detects authentication method (nsec or Amber) and provides the appropriate NDK signer.

## Subdirectories

- **amber/** - Amber signer implementation for Android external key management.
- **providers/** - Authentication provider implementations (Nostr, Apple, Google, Amber).

### amber/

- **amber/AmberNDKSigner.ts** - NDK Signer implementation that delegates all signing to the Amber app on Android. Private keys never leave Amber.
- **amber/__tests__/AmberNDKSigner.test.ts** - Unit tests for the AmberNDKSigner.

### providers/

See `providers/README.md` for details.
