# Amber Integration for RUNSTR

## Overview
Amber login has been successfully integrated into RUNSTR, providing secure Nostr authentication for Android users where private keys never leave the Amber app.

## Implementation Summary

### Architecture Overview
Amber integration uses **GlobalNDK** and **UnifiedSigningService** to provide seamless external signing for Android users. All signing operations flow through a single NDK instance with the Amber signer properly attached, ensuring consistent behavior across the app.

**Key Architectural Components:**
1. **GlobalNDK**: Single shared NDK instance for entire app (4 relay connections, not 36)
2. **UnifiedSigningService**: Central signing hub detecting auth method (nsec vs Amber)
3. **AmberNDKSigner**: NDK Signer implementation using NIP-55 Activity Result pattern
4. **Signer Attachment**: Critical step where AmberNDKSigner is set on GlobalNDK instance

### Files Created:
1. **AmberNDKSigner.ts** (`src/services/auth/amber/`) - NDK Signer implementation for Amber
   - Implements NDKSigner interface from `@nostr-dev-kit/ndk`
   - Uses NIP-55 Activity Result pattern (IntentLauncher, not deep links)
   - Manages signing, encryption, and decryption operations
   - 60-second timeout prevents indefinite hangs
   - Enhanced error detection (not installed, timeout, rejection)

2. **amberAuthProvider.ts** (`src/services/auth/providers/`) - Authentication provider for Amber
   - Checks Amber installation
   - Manages authentication flow
   - Integrates with existing auth system
   - Stores Amber pubkey for session persistence

### Files Modified:
1. **UnifiedSigningService.ts** (`src/services/auth/`) - **CRITICAL AMBER INTEGRATION**
   - Detects authentication method (nsec vs Amber)
   - Creates appropriate signer (NDKPrivateKeySigner or AmberNDKSigner)
   - **Sets signer on GlobalNDK instance** (fixes #1 signing issue)
   - Provides unified `signEvent()` interface for both auth methods
   - Enhanced Amber-specific error messages

2. **GlobalNDKService.ts** (`src/services/nostr/`) - Shared NDK instance
   - Single NDK instance for entire app
   - 4 relay connections (vs 36 before)
   - **`ndk.signer` must be set here for Amber users**
   - All services use this instance, not create their own

3. **joinRequestPublisher.ts** (`src/utils/`) - Team join requests
   - Updated to use GlobalNDKService instead of NostrRelayManager
   - Prevents bypassing GlobalNDK signer
   - Works with both nsec and Amber authentication

4. **NostrProtocolHandler.ts** (`src/services/nostr/`) - Nostr protocol operations
   - Removed top-level nostr-tools imports
   - Uses NDK's nip19 to prevent crypto conflicts
   - Dynamic imports for legacy nostr-tools functions only when needed

5. **LoginScreen.tsx** (`src/screens/auth/`) - Added Amber login UI
   - Shows "Login with Amber" button below nsec input
   - Only visible on Android devices
   - Detects if Amber is installed

6. **AuthContext.tsx** (`src/contexts/`) - Added `signInWithAmber` method
   - Seamless integration with existing auth flow
   - Caches user profile data
   - Handles session persistence
   - Initializes signer on GlobalNDK after login (belt & suspenders)

7. **AuthService.ts** (`src/services/auth/`) - Added Amber authentication method
   - Parallel to existing nsec and Apple auth
   - Validates Amber availability
   - Returns standardized auth result

8. **nutzapService.ts** (`src/services/nutzap/`) - Added receive-only mode
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

### NIP-55 Activity Result Communication:
Amber integration uses **IntentLauncher Activity Result pattern** (NOT deep linking):

```typescript
// Launch Amber with Activity Result
const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
  data: 'nostrsigner:',  // NIP-55 URI scheme
  extra: {
    'type': 'get_public_key',
    'permissions': JSON.stringify(permissions)
  }
});

// Amber returns result synchronously (not via deep link callback)
if (result.resultCode === IntentLauncher.ResultCode.Success) {
  const pubkey = result.extra?.result || result.data;
  // Use pubkey immediately
}
```

**Key Differences from Deep Linking:**
- ✅ **Synchronous**: No callback URL, result returned directly
- ✅ **Timeout Support**: Wrapped in Promise.race() for 60s timeout
- ✅ **Error Detection**: Can detect "Amber not installed" immediately
- ✅ **No URL Scheme Conflicts**: Uses Android Intent system, not URL routing

**Timeout Protection:**
```typescript
Promise.race([
  IntentLauncher.startActivityAsync(...),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 60000)
  )
]);
```

### GlobalNDK Architecture:
**Critical Requirement:** All services must use the same NDK instance for Amber to work.

**Before GlobalNDK (broken):**
```typescript
// ❌ Each service created its own NDK
const relayManager = new NostrRelayManager(); // New NDK, no signer!
await relayManager.publishEvent(event); // Fails for Amber users
```

**After GlobalNDK (working):**
```typescript
// ✅ All services share one NDK with signer
const ndk = await GlobalNDKService.getInstance(); // Has signer attached
const event = new NDKEvent(ndk, eventData);
await event.publish(); // Works for both nsec and Amber
```

**Why GlobalNDK Matters:**
- **Connection Efficiency**: 4 relay connections (not 36)
- **Signer Consistency**: Single place to set `ndk.signer`
- **No Timing Issues**: No 2-3 second connection delays per query
- **Performance**: Reusing connection pool instead of creating/destroying

### UnifiedSigningService Pattern:
Central hub for all signing operations:

```typescript
// Service code (supports both nsec and Amber):
const signingService = UnifiedSigningService.getInstance();
const signature = await signingService.signEvent(event);

// UnifiedSigningService handles:
// 1. Detects auth method (nsec vs Amber)
// 2. Gets appropriate signer
// 3. Sets signer on GlobalNDK
// 4. Signs event
// 5. Returns signature
```

**Anti-Pattern (don't do this):**
```typescript
// ❌ Creating signers directly
const signer = new AmberNDKSigner(); // Bypasses UnifiedSigningService
await signer.sign(event); // May not be attached to GlobalNDK
```

### Security:
- No private keys stored in app
- All cryptographic operations through Amber
- Secure Intent-based communication (Android system)
- Public key cached for session persistence
- Request timeout prevents indefinite hangs
- Enhanced error messages prevent confusion

### Compatibility:
- **NDK-only**: Uses `@nostr-dev-kit/ndk` exclusively
- **No nostr-tools mixing**: Prevents crypto initialization conflicts
- Works with existing AuthContext
- Supports all required event kinds (0, 1, 1301, 30000, 33404, etc.)
- NIP-04 encryption/decryption support
- NIP-55 Activity Result protocol

## Known Limitations:
1. **Android-only** (Amber not available on iOS)
2. **NutZap wallet creation requires nsec** (receive-only for Amber users)
3. **User must have Amber installed first** (app provides helpful error with Play Store link if missing)
4. **Requires user interaction for each signing operation** (60s timeout prevents indefinite hangs)

## Fixed Issues (January 2025):
**6 critical/high priority issues resolved:**
- ✅ Kind 1/1301 signing failures (GlobalNDK signer not set) - Fixed in commit 248e2d5
- ✅ Join requests bypass GlobalNDK (separate NDK instance) - Fixed in commit 3faead6
- ✅ nostr-tools crypto initialization conflicts - Fixed in commit 3faead6
- ✅ Amber requests hang indefinitely (no timeout) - Fixed in commit 3faead6
- ✅ Amber not installed shows confusing errors - Fixed in commit 3faead6
- ✅ Poor error messages for Amber failures - Fixed in commit 3faead6

**See "Troubleshooting History" section below for detailed analysis of each issue.**

## Future Enhancements:
1. Background event signing queue
2. Batch signing support
3. NIP-44 encryption when Amber supports it
4. Wallet management integration when available

---

## Troubleshooting History

### Issue #1: Kind 1/1301 Events Fail to Sign (January 2025)

**Symptom:**
- User tries to post kind 1 (social) or kind 1301 (workout) event
- Error message appears immediately
- Amber app never pulls up for signing
- Login with Amber works perfectly

**Root Cause:**
The `AmberNDKSigner` was created successfully during login, but was **never attached to the GlobalNDK instance**. When services tried to sign events:
1. `UnifiedSigningService.getSigner()` created an AmberNDKSigner
2. Signer was cached locally in UnifiedSigningService
3. BUT: `ndk.signer` on GlobalNDK remained undefined
4. Services using GlobalNDK directly couldn't sign (no signer)
5. Error occurred before Amber was called

**Affected Code Paths:**
- Workout posting (`WorkoutPublishingService`)
- Social posts (kind 1 events)
- Team join requests (`joinRequestPublisher`)
- Any Nostr event creation

**Solution (Commit 248e2d5):**
Set the signer on GlobalNDK immediately after creating it:

```typescript
// UnifiedSigningService.ts
if (authMethod === 'amber') {
  const signer = new AmberNDKSigner();
  await signer.blockUntilReady();

  this.cachedSigner = signer;

  // CRITICAL FIX: Set signer on GlobalNDK
  const ndk = await GlobalNDKService.getInstance();
  ndk.signer = signer;

  console.log('✅ UnifiedSigningService: Created AmberNDKSigner and set on GlobalNDK');
  return signer;
}
```

**Testing:**
- ✅ Login with Amber
- ✅ Try posting a workout (kind 1301)
- ✅ Verify Amber pulls up with signing request
- ✅ Approve in Amber
- ✅ Event posts successfully

---

### Issue #2: Join Requests Bypass GlobalNDK (January 2025)

**Symptom:**
- Team join requests silently fail for Amber users
- No error message, just nothing happens
- Works fine for nsec users

**Root Cause:**
`joinRequestPublisher.ts` created its own `NostrRelayManager()` instance, which internally created a fresh NDK instance without the Amber signer set on GlobalNDK.

```typescript
// OLD CODE (broken):
const relayManager = new NostrRelayManager(); // New NDK, no signer
const publishResult = await relayManager.publishEvent(signedEvent);
```

**Solution (Commit 3faead6):**
Use `GlobalNDKService` instead, which has the signer properly set:

```typescript
// NEW CODE (fixed):
const signingService = UnifiedSigningService.getInstance();
const signature = await signingService.signEvent(eventTemplate);
const signedEvent = { ...eventTemplate, sig: signature };

const ndk = await GlobalNDKService.getInstance(); // Has signer
const ndkEvent = new NDKEvent(ndk, signedEvent);
await ndkEvent.publish();
```

**Testing:**
- ✅ Login with Amber
- ✅ Browse teams
- ✅ Request to join a team
- ✅ Verify Amber pulls up for signing
- ✅ Approve request in Amber
- ✅ Join request appears in captain's dashboard

---

### Issue #3: nostr-tools Crypto Initialization Conflicts (January 2025)

**Symptom:**
- Random crypto errors during signing
- "Cannot initialize crypto module" errors
- Intermittent failures

**Root Cause:**
`NostrProtocolHandler.ts` and `AmberNDKSigner.ts` imported functions from `nostr-tools` at the top level, mixing with NDK's crypto. Per CLAUDE.md: "NEVER use nostr-tools in wallet code - Use NDK exclusively."

```typescript
// OLD CODE (broken):
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent, nip19 } from 'nostr-tools';
```

**Solution (Commit 3faead6):**
1. Use NDK's built-in `nip19` instead of nostr-tools
2. Dynamic imports for legacy nostr-tools functions only when needed
3. Removed all top-level nostr-tools imports

```typescript
// NEW CODE (fixed):
import { nip19 } from '@nostr-dev-kit/ndk'; // Use NDK's nip19

// Dynamic imports only when necessary:
const { finalizeEvent } = await import('nostr-tools');
```

**Files Fixed:**
- `NostrProtocolHandler.ts`
- `AmberNDKSigner.ts`

**Testing:**
- ✅ Sign multiple events in succession
- ✅ Watch for crypto initialization errors
- ✅ Verify consistent signing behavior

---

### Issue #4: Amber Requests Hang Indefinitely (January 2025)

**Symptom:**
- User taps action that requires Amber signing
- Amber app opens
- User gets distracted, doesn't approve
- RUNSTR app hangs forever waiting for response

**Root Cause:**
`IntentLauncher.startActivityAsync()` has no built-in timeout. If user never responds in Amber, the Promise never resolves.

**Solution (Commit 3faead6):**
Wrap all Intent launches in a timeout using `Promise.race()`:

```typescript
private async startActivityWithTimeout(
  action: string,
  options: any,
  timeoutMs: number = 60000 // 60 seconds
): Promise<any> {
  return Promise.race([
    IntentLauncher.startActivityAsync(action, options),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Amber request timed out after ${timeoutMs / 1000} seconds`)),
        timeoutMs
      )
    )
  ]);
}
```

**Testing:**
- ✅ Trigger signing action
- ✅ Open Amber but don't approve
- ✅ Wait 60 seconds
- ✅ Verify timeout error appears
- ✅ User can retry without force-quitting app

---

### Issue #5: Amber Not Installed - Confusing Errors (January 2025)

**Symptom:**
- User tries to sign with Amber
- Generic error: "Could not get public key from Amber: Unknown error"
- No guidance to install Amber

**Root Cause:**
`IntentLauncher` throws generic errors when no app can handle the Intent. No detection of "Amber not installed" scenario.

**Solution (Commit 3faead6):**
Enhanced error detection in `startActivityWithTimeout()`:

```typescript
catch (error) {
  const errorMessage = String(error);

  if (errorMessage.includes('No Activity found') ||
      errorMessage.includes('ActivityNotFoundException') ||
      errorMessage.includes('No app can perform this action')) {
    throw new Error(
      'Amber app not found. Please install Amber from Google Play Store:\n' +
      'https://play.google.com/store/apps/details?id=com.greenart7c3.nostrsigner'
    );
  }

  throw error;
}
```

**Testing:**
- ❌ Uninstall Amber from test device
- ✅ Try to login with Amber
- ✅ Verify helpful error message with Play Store link

---

### Issue #6: Poor Error Messages for Amber Failures (January 2025)

**Symptom:**
- Amber signing fails for various reasons (timeout, rejection, crash)
- Generic error: "Amber signing failed: Unknown error"
- User doesn't know what went wrong or how to fix it

**Solution (Commit 3faead6):**
Enhanced error handling in `UnifiedSigningService.signEvent()`:

```typescript
if (authMethod === 'amber') {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // User rejected/canceled
  if (errorMessage.includes('rejected') || errorMessage.includes('canceled')) {
    throw new Error('Signing request rejected in Amber. Please approve the request...');
  }

  // Amber not installed
  if (errorMessage.includes('not found') || errorMessage.includes('ActivityNotFoundException')) {
    throw new Error('Could not connect to Amber. Please ensure Amber is installed...');
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    throw new Error('Amber response timed out. Please try again and respond promptly...');
  }

  // Permission denied
  if (errorMessage.includes('permission')) {
    throw new Error('Amber permission denied. Check app permissions in Amber settings.');
  }

  // Amber crashed
  if (errorMessage.includes('crash') || errorMessage.includes('stopped')) {
    throw new Error('Amber app crashed. Please restart Amber and try again.');
  }

  throw new Error(`Amber signing failed: ${errorMessage}`);
}
```

**Testing:**
- ✅ Reject request in Amber → See helpful message
- ✅ Let request timeout → See timeout message
- ✅ Try without Amber installed → See install guidance

---

## Architecture Deep Dive

### GlobalNDK Integration Requirements

**Critical Rule:** All Amber signing operations MUST use the GlobalNDK instance, not create new NDK instances.

**Why GlobalNDK?**
- **Connection Efficiency**: Before GlobalNDK, 9 services × 4 relays = 36 WebSocket connections. After: 1 NDK × 4 relays = 4 connections (90% reduction)
- **Signer Consistency**: Single place to set `ndk.signer` for entire app
- **Timing Issues**: New relay managers need 2-3 seconds to connect
- **Performance**: Reusing one connection pool instead of creating/destroying

**Correct Pattern:**
```typescript
// ✅ CORRECT - Use GlobalNDK
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';

const ndk = await GlobalNDKService.getInstance();
// ndk.signer is already set to AmberNDKSigner
const event = new NDKEvent(ndk, eventData);
await event.publish();
```

**Anti-Pattern:**
```typescript
// ❌ WRONG - Creates new NDK without signer
import { NostrRelayManager } from '../services/nostr/NostrRelayManager';

const relayManager = new NostrRelayManager(); // New NDK, no signer!
await relayManager.publishEvent(event); // Fails for Amber users
```

### UnifiedSigningService Role

The `UnifiedSigningService` is the central hub for all signing operations:

1. **Detects Authentication Method**: Determines if user is using nsec or Amber
2. **Creates Appropriate Signer**:
   - nsec → `NDKPrivateKeySigner`
   - Amber → `AmberNDKSigner`
3. **Sets Signer on GlobalNDK**: Critical step for Amber users
4. **Provides Signing Interface**: `signEvent()` works for both auth methods
5. **Enhanced Error Handling**: Amber-specific error messages

**Services should use UnifiedSigningService, NOT create signers directly.**

---

## Comprehensive Audit Results (January 2025)

A full audit of Amber integration identified 10 issues across 4 severity levels:

### Critical Issues (Fixed ✅)
1. **joinRequestPublisher creates own NDK** → Fixed: Use GlobalNDK (Commit 3faead6)
2. **NostrProtocolHandler uses nostr-tools** → Fixed: Use NDK + dynamic imports (Commit 3faead6)

### High Priority Issues (Fixed ✅)
3. **AmberNDKSigner uses nostr-tools nip19** → Fixed: Use NDK's nip19 (Commit 3faead6)
4. **No timeout for Amber prompts** → Fixed: 60s timeout (Commit 3faead6)
5. **No Amber not installed detection** → Fixed: Helpful error (Commit 3faead6)
6. **Missing Amber error messages** → Fixed: Enhanced errors (Commit 3faead6)

### Medium Priority Issues (Remaining)
7. **WalletSync overwrites GlobalNDK signer** → Could cause race conditions
8. **No loading state for Amber operations** → Users think app froze
9. **blockUntilReady() naming confusion** → Minor clarity issue

### Low Priority Issues (Tech Debt)
10. **30+ files still use nostr-tools** → Long-term migration needed

**Commits:**
- `248e2d5`: Set Amber/nsec signer on GlobalNDK
- `3faead6`: Fix join requests, crypto conflicts, timeouts, error handling

---

## Common Errors & Solutions

### Error: "Amber doesn't pull up when signing"

**Symptoms:**
- Error message appears immediately
- Amber app never opens
- Login works fine

**Diagnosis:**
Check if signer is set on GlobalNDK:
```typescript
const ndk = await GlobalNDKService.getInstance();
console.log('Signer set?', !!ndk.signer); // Should be true
```

**Solution:**
- Ensure `UnifiedSigningService.getSigner()` is called after login
- Verify `ndk.signer = signer` is executed
- Check console logs for "✅ UnifiedSigningService: Set AmberNDKSigner on GlobalNDK"

---

### Error: "Cannot initialize crypto module"

**Symptoms:**
- Random crypto errors during signing
- Intermittent failures
- Works sometimes, fails other times

**Diagnosis:**
Check for nostr-tools imports:
```bash
grep -r "from 'nostr-tools'" src/
```

**Solution:**
- Replace with NDK equivalents:
  - `nip19` → Import from `@nostr-dev-kit/ndk`
  - `finalizeEvent`, `verifyEvent` → Dynamic imports only when needed
- Never import nostr-tools at top level alongside NDK

---

### Error: "Amber request timed out after 60 seconds"

**Symptoms:**
- User opens Amber but doesn't approve
- App waits 60 seconds
- Timeout error appears

**Diagnosis:**
Working as intended! Timeout prevents indefinite hangs.

**Solution:**
- User should retry and respond promptly in Amber
- Consider increasing timeout if 60s isn't enough
- Timeout configured in `AmberNDKSigner.AMBER_TIMEOUT_MS`

---

### Error: "Amber app not found. Please install Amber..."

**Symptoms:**
- Error message with Play Store link
- Happens when Amber not installed

**Diagnosis:**
Working as intended! Helpful error for users without Amber.

**Solution:**
- User needs to install Amber from Play Store
- Link provided in error message: `com.greenart7c3.nostrsigner`
- After install, retry login/signing

---

### Error: "Signing request rejected in Amber"

**Symptoms:**
- User explicitly denies request in Amber
- Error message explains rejection

**Diagnosis:**
Working as intended! User chose to cancel.

**Solution:**
- User should retry and approve in Amber
- Check if request looks suspicious (wrong app, unexpected event)
- Verify user intended to sign this event

---

## Testing Checklist for Amber Signing

### Initial Setup
- [ ] Android device with Amber installed
- [ ] RUNSTR app running with Metro bundler
- [ ] Test account with existing Amber identity

### Login Test
- [ ] Open RUNSTR app
- [ ] Tap "Sign in with Nostr"
- [ ] Tap "Login with Amber" button
- [ ] Amber opens with permission request
- [ ] Approve permissions in Amber
- [ ] App returns to RUNSTR
- [ ] Profile loads correctly
- [ ] Console shows "✅ UnifiedSigningService: Set AmberNDKSigner on GlobalNDK"

### Kind 1301 Workout Posting Test
- [ ] Navigate to Profile tab
- [ ] Tap on a HealthKit workout
- [ ] Tap "Save to Nostr" button
- [ ] Amber pulls up with signing request
- [ ] Review event details in Amber
- [ ] Approve signing in Amber
- [ ] Success message appears in RUNSTR
- [ ] Workout shows "Saved to Nostr" badge

### Kind 1 Social Post Test
- [ ] Navigate to Profile tab
- [ ] Tap on a HealthKit workout
- [ ] Tap "Post to Nostr" button (social card)
- [ ] Amber pulls up with signing request
- [ ] Review event details in Amber
- [ ] Approve signing in Amber
- [ ] Success message appears
- [ ] Workout shows "Posted to Nostr" badge

### Team Join Request Test
- [ ] Navigate to Teams tab
- [ ] Find a team you're not a member of
- [ ] Tap "Request to Join" button
- [ ] Amber pulls up with signing request
- [ ] Review join request event in Amber
- [ ] Approve signing in Amber
- [ ] Success message: "Join request sent"
- [ ] Team shows "Pending" status

### Error Scenario Tests
- [ ] **Timeout Test**: Trigger signing, open Amber, don't approve for 60s, verify timeout error
- [ ] **Rejection Test**: Trigger signing, open Amber, deny request, verify rejection error
- [ ] **No Amber Test**: Uninstall Amber, try to sign, verify helpful error with Play Store link

### Expected Console Logs
```
✅ UnifiedSigningService: Created AmberNDKSigner and set on GlobalNDK
[Amber] Signing event kind 1301 via Activity Result
✅ Signed event with NDKSigner: abc123... (kind 1301)
📤 Publishing join request for team: RUNSTR (attempt 1/3)
✅ Join request published successfully on attempt 1: xyz789...
```

### Common Issues During Testing
- **Amber doesn't open**: Check if signer set on GlobalNDK
- **Crypto errors**: Check for nostr-tools imports
- **App hangs**: Timeout should trigger after 60s
- **Generic errors**: Check `UnifiedSigningService` error handling

---

## Remaining Work (Medium/Low Priority)

### Medium Priority
1. **Fix WalletSync GlobalNDK Signer Override**
   - Currently overwrites `ndk.signer` unconditionally
   - Should check if signer already exists
   - Low risk but could cause race conditions

2. **Add Loading States for Amber Operations**
   - Show "Waiting for Amber approval..." message
   - Prevents users thinking app is frozen
   - Affects workout posting, social posts, join requests

3. **Rename blockUntilReady() Method**
   - Current name implies blocking/waiting
   - Behavior is instant if pubkey cached
   - Consider `initialize()` or add clarifying comment

### Low Priority (Tech Debt)
4. **Migrate All nostr-tools Usage to NDK**
   - 30+ files still import from nostr-tools
   - Create migration task
   - Add ESLint rule to prevent future nostr-tools imports
   - Most critical: `utils/nostr.ts`, `utils/teamUtils.ts`

---

## References

### Key Commits
- **248e2d5**: Fix: Set Amber/nsec signer on GlobalNDK to enable signing
- **3faead6**: Fix: Critical Amber signing issues (join requests, crypto, timeouts, errors)

### Related Documentation
- **CLAUDE.md**: Project architecture and Amber integration guidelines
- **NOSTR_AGENT_MEMORY.md**: Nostr implementation patterns and lessons learned
- **docs/nostr-native-fitness-competitions.md**: Event kinds and Nostr data model

### External Resources
- **Amber GitHub**: https://github.com/greenart7c3/Amber
- **NIP-55 Spec**: Android Signer Application protocol
- **NDK Documentation**: https://github.com/nostr-dev-kit/ndk