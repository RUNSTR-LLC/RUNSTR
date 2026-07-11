# Onboarding Components

Simplified onboarding components for new user experience.

## Files

**ProfileSetupStep.tsx** - (UNUSED) Optional profile customization component

**WalletSetupStep.tsx** - (UNUSED) Optional wallet setup component

## Onboarding Flow

The onboarding flow has been simplified and the former welcome-permission modal has been removed:

1. **User clicks "Start" or "Login"** → Authentication happens
2. **Main App** → User enters authenticated app immediately
3. Location permission is requested from workout/GPS flows when needed

**Key Changes:**
- No multi-step wizard
- No splash screens
- Password saved silently (accessible in Settings → Backup Password)
- Background data loading (non-blocking)
- No first-launch WelcomePermissionModal
