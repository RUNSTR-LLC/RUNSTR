# Profile Shared Components

Reusable components used across different workout source tabs.

## Files

- **WorkoutCard.tsx** - Universal workout display component with consistent styling, used by all workout source tabs (Nostr, Apple Health, Garmin, Google Fit)

## Design Philosophy

These components follow the **separation of concerns** principle:

- **Single Responsibility** - Each component has one clear purpose
- **Reusability** - Can be used by any workout source tab
- **Consistency** - Provides uniform UI/UX across all workout sources
- **Simplicity** - No complex data merging or source-specific logic

This architecture makes adding new workout sources trivial - just create a new tab component and use the shared WorkoutCard for display.