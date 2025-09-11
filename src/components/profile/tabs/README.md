# Workout Source Tabs

Individual tab components for different workout data sources. Each tab is completely isolated and handles its own data fetching, display, and user interactions.

## Files

- **NostrWorkoutsTab.tsx** - Displays Nostr kind 1301 workout events with "Published to Nostr" badges
- **AppleHealthTab.tsx** - Shows HealthKit workouts from last 30 days with "Post to Nostr" functionality
- **GarminTab.tsx** - Placeholder for Garmin Connect integration with "Coming Soon" message
- **GoogleFitTab.tsx** - Placeholder for Google Fit integration with "Coming Soon" message

## Architecture Benefits

**Complete Isolation**:
- Each tab fetches its own data independently
- No complex merge logic or data conflicts
- Individual error handling and loading states
- Tab-specific caching strategies

**Scalability**:
- Adding new workout sources requires only creating a new tab component
- No impact on existing tabs when adding integrations
- Each integration can use its optimal API patterns

**User Experience**:
- Clear source identification - users know exactly where each workout came from
- Transparent "Post to Nostr" workflow for non-Nostr sources
- Each tab can have source-specific features and optimizations

**Maintainability**:
- Simple, focused components under 200 lines each
- Easy to debug individual integrations
- Clean separation of concerns