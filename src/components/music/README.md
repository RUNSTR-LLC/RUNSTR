# Music Components

UI components for Wavlake music player integration.

## Files

- **ProfileMusicBar.tsx** - Always-visible music bar at top of Profile screen. Shows "Browse Music" when empty, or current track info with play/pause when playing.

- **MiniMusicPlayer.tsx** - Collapsed 56px music player bar (currently unused, replaced by ProfileMusicBar). Shows current track, progress bar, and basic play/pause/skip controls.

- **ExpandedMusicPlayer.tsx** - Full-screen music player modal with album art, full playback controls, shuffle/repeat options, and "up next" queue display.

- **PlaylistBrowser.tsx** - Modal for browsing music. Features Top 40 trending tracks and genre-based browsing with track lists.

- **TrackRow.tsx** - Individual track row component showing artwork, title, artist, duration. Used in playlist views and queue.

- **WavlakeZapButton.tsx** - Lightning zap button for tipping Wavlake artists. Opens modal with amount selection and sends payment via NWC.

## Layout

```
Profile Screen:
┌─────────────────────────────┐
│      Header (Settings)       │
├─────────────────────────────┤
│    ProfileMusicBar (58px)    │ ← Always visible, tap to browse/expand
├─────────────────────────────┤
│      Profile Content         │
│                              │
├─────────────────────────────┤
│   BottomTabNavigator (85px)  │
└─────────────────────────────┘

ProfileMusicBar States:
┌─────────────────────────────────────┐
│ Browse Music                   [>]  │  ← Empty state
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [Art] Track Title - Artist    [⏸]  │  ← Playing state
└─────────────────────────────────────┘
```

## Usage

Components are integrated at different levels:

**ProfileMusicBar** - In ProfileScreen.tsx below header:
```tsx
<SafeAreaView>
  <View style={styles.header}>...</View>
  <ProfileMusicBar />  {/* Always visible */}
  <ScrollView>...</ScrollView>
</SafeAreaView>
```

**ExpandedMusicPlayer & PlaylistBrowser** - In App.tsx at root level:
```tsx
<SafeAreaProvider>
  <NavigationContainer>
    {/* Navigation content */}
  </NavigationContainer>

  <ExpandedMusicPlayer />
  <PlaylistBrowser />
</SafeAreaProvider>
```

## Bug Fixes (Jan 2026)

- Fixed React hooks violations (early returns before hooks)
- Fixed image fallback using onError handler instead of defaultSource
- Fixed getState() called in render causing re-render issues
- Moved music player from App.tsx to Profile screen for better UX
