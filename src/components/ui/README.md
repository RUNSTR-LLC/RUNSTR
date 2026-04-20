# UI Components Directory

Basic reusable UI components for consistent design across the RUNSTR application.

## Files

- **Avatar.tsx** - User avatar component with image loading and fallback.
- **BottomNavigation.tsx** - Bottom tab navigation bar component.
- **Button.tsx** - Primary/add/menu button variants. Use `variant="primary"` for CTAs.
- **Card.tsx** - Card container component with consistent styling.
- **CharityZapIconButton.tsx** - Compact charity zap heart icon for user lists, enabling quick charity donations next to usernames.
- **CustomAlert.tsx** - Black/orange themed alert modal replacing React Native's unstyled Alert.alert().
- **DetailHeader.tsx** - Header component for detail screens with navigation.
- **DifficultyIndicator.tsx** - Visual indicator for competition difficulty levels.
- **DropdownMenu.tsx** - Dropdown menu component with selection options.
- **FilterChips.tsx** - Horizontal scrollable filter chips for multi-option filtering (e.g., activity type filters).
- **index.ts** - Barrel exports for all UI components.
- **LeaderboardLimiter.tsx** - Shared component for "Top N + Your Position" display pattern, showing top entries and the logged-in user's rank.
- **LoadingStates.tsx** - Loading indicators and skeleton screens.
- **MemberAvatar.tsx** - Team member avatar with online status and team context.
- **NostrConnectionStatus.tsx** - Visual indicator for Nostr relay connection status.
- **ParticipantList.tsx** - List component for displaying competition participants.
- **PostingErrorBoundary.tsx** - Error boundary for workout posting flows, displaying fallback UI instead of crashing the app.
- **PrivacyNoticeModal.tsx** - Modal explaining local-only analytics processing with no data transmission.
- **PrizeDisplay.tsx** - Component for displaying Bitcoin prizes and rewards.
- **ProgressBar.tsx** - Progress indicator component for various contexts.
- **SettingsAccordion.tsx** - Collapsible accordion component for Settings screen with Profile aesthetic.
- **SplashScreen.tsx** - App loading splash screen with RUNSTR branding.
- **StatCard.tsx** - Statistics display card for workout and competition metrics.
- **TexturedBackground.tsx** - Subtle dark gradient background, drop-in replacement for SafeAreaView with a radial-style gradient.
- **TimeRemaining.tsx** - Countdown timer component for competitions and events.
- **toastConfig.tsx** - Custom dark-themed toast notification configuration for the app.
- **ToggleButtons.tsx** - Shared toggle/tab component with orange active background and black text.
- **UserListItem.tsx** - Reusable user list item with integrated charity zap button, used across leaderboards and team lists.
- **ZapModal.tsx** - Modal for sending P2P Cashu payments (Zaps) via NIP-60 wallets.
- **ZappableUserRow.tsx** - Reusable row component displaying users with profile resolution and P2P zapping.
