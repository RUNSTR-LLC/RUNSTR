# Nutzap Components

This folder contains components for the nutzap (Lightning/eCash) payment functionality in RUNSTR.

## Components

### NutzapLightningButton.tsx
Lightning bolt button component that enables quick zapping with single tap (21 sats default) or press-and-hold for custom amounts. Features visual feedback where the bolt changes from black to yellow after successful zap. Tracks zapped users locally and persists state appropriately.

### EnhancedZapModal.tsx
Modal component for sending custom zap amounts. Triggered by long-press on the NutzapLightningButton. Features preset amounts (21, 100, 500, 1000, 2100, 5000 sats), custom amount input, default amount setting capability, optional memo field, and balance display. Allows users to set their preferred default zap amount.

## Usage

These components integrate with the existing nutzap infrastructure (`useNutzap` hook and `nutzapService`) to provide a seamless P2P payment experience throughout the app. The NutzapLightningButton can be added to any user display context (team members, leaderboards, profile cards) to enable instant zapping functionality.

## Key Features

- **Single-tap zapping**: Send 21 sats (or custom default) instantly
- **Press-and-hold**: Open modal for custom amounts and settings
- **Visual feedback**: Black to yellow color change on successful zap
- **Persistent state**: Remember zapped users and default amounts
- **Universal integration**: Works in any user display context