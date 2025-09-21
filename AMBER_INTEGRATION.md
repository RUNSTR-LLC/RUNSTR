# Amber Integration for RUNSTR

## Overview
Amber login has been successfully integrated into RUNSTR, providing secure Nostr authentication for Android users where private keys never leave the Amber app.

## Implementation Summary

### Files Created:
1. **AmberNDKSigner.ts** - NDK Signer implementation for Amber
   - Implements NDKSigner interface
   - Handles deep linking callbacks
   - Manages signing, encryption, and decryption operations

2. **amberAuthProvider.ts** - Authentication provider for Amber
   - Checks Amber installation
   - Manages authentication flow
   - Integrates with existing auth system

### Files Modified:
1. **LoginScreen.tsx** - Added Amber login UI
   - Shows "Login with Amber" button below nsec input
   - Only visible on Android devices
   - Detects if Amber is installed

2. **AuthContext.tsx** - Added `signInWithAmber` method
   - Seamless integration with existing auth flow
   - Caches user profile data
   - Handles session persistence

3. **AuthService.ts** - Added Amber authentication method
   - Parallel to existing nsec and Apple auth
   - Validates Amber availability
   - Returns standardized auth result

4. **app.json** - Configured deep linking
   - Added Android intent filters
   - Configured `runstrproject://amber-callback` URL scheme

5. **nutzapService.ts** - Added receive-only mode
   - Allows Amber users to receive zaps
   - No wallet management without nsec access

## User Experience

### Login Flow:
1. User taps "Sign in with Nostr"
2. Sees nsec input field with "OR" divider below
3. Android users see amber-colored "Login with Amber" button
4. Tapping button opens Amber app
5. User approves permissions in Amber
6. Returns to RUNSTR authenticated

### Features:
- **Secure**: Private keys never leave Amber
- **Simple**: One-tap authentication
- **Persistent**: Auto-reconnects on app restart
- **Compatible**: Works alongside existing nsec login

## Testing Instructions

### Prerequisites:
1. Android device (physical or emulator)
2. Amber app installed from Play Store

### Testing Steps:
1. Build and run the app:
   ```bash
   npx expo start --ios  # For Metro bundler
   # Then open Xcode and run on Android device
   ```

2. Navigate to login screen
3. Tap "Sign in with Nostr"
4. Verify "Login with Amber" button appears (Android only)
5. Tap Amber button
6. Approve permissions in Amber app
7. Verify successful authentication
8. Check that profile loads correctly
9. Test creating workout events
10. Force quit app and reopen to test session persistence

### Expected Behavior:
- iOS devices: No Amber option shown
- Android without Amber: Shows "Install Amber" button
- Android with Amber: Shows "Login with Amber" button
- After auth: User profile and workouts load normally
- Event signing: All Nostr events signed through Amber

## Technical Details

### Deep Linking:
- Scheme: `runstrproject://amber-callback`
- Handles callbacks with request ID tracking
- 60-second timeout for auth requests
- 30-second timeout for signing requests

### Security:
- No private keys stored in app
- All cryptographic operations through Amber
- Secure intent-based communication
- Public key cached for session persistence

### Compatibility:
- NDK-only implementation (no nostr-tools)
- Works with existing AuthContext
- Supports all required event kinds (0, 1, 1301, 30000, 33404)
- NIP-04 encryption/decryption support

## Known Limitations:
1. Android-only (Amber not available on iOS)
2. NutZap wallet creation requires nsec (receive-only for Amber users)
3. User must have Amber installed first
4. Requires user interaction for each signing operation

## Future Enhancements:
1. Background event signing queue
2. Batch signing support
3. NIP-44 encryption when Amber supports it
4. Wallet management integration when available