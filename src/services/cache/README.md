# Cache Services

- **UnifiedNostrCache.ts** - In-memory + AsyncStorage cache with TTLs and subscribers. Used for the kind 0 profile (`CacheKeys.USER_PROFILE`, see `src/constants/cacheTTL.ts`). Cleared on sign-out.
