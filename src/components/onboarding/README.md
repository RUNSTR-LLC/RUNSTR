# Onboarding Components

Components used in the new user onboarding flow.

## Files

**OnboardingWizard.tsx** - Multi-slide introduction wizard showing app features and benefits

**ProfileSetupStep.tsx** - Optional profile customization (name, picture, about) with Nostr publishing

**PasswordNotice.tsx** - Critical password (nsec) display and acknowledgement before app access

**PermissionRequestStep.tsx** - Location permission request with clear explanation and platform-specific handling

## Onboarding Flow

1. **Slides** - OnboardingWizard introduces app features
2. **Profile** - ProfileSetupStep for optional profile customization
3. **Password** - PasswordNotice ensures user saves their nsec
4. **Permissions** - PermissionRequestStep requests location access for workout tracking
5. **Main App** - User enters authenticated app

All steps are required except profile setup (skippable) and permissions (can grant later).
