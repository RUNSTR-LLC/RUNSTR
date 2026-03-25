# Auth Components Directory

This directory is intentionally empty.

## Status

Legacy social sign-in button components were removed during auth flow cleanup.
Authentication UI now lives in screen-level implementations.

## Current auth entry points

- `src/screens/LoginScreen.tsx` — login form and auth UI
- `src/contexts/AuthContext.tsx` — authentication state + sign-in/sign-up flows
- `src/services/auth/providers/amberAuthProvider.ts` — Android Amber auth provider

If shared auth components are reintroduced, document them here with exact file names and ownership.
