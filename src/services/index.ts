// Barrel exports for services
// Import specific services from their subdirectories as needed

// Core services
export { GlobalNDKService } from './nostr/GlobalNDKService';
export { NostrProfileService } from './nostr/NostrProfileService';
export { NostrRelayManager } from './nostr/NostrRelayManager';

// Competition services
export { SimpleCompetitionService } from './competition/SimpleCompetitionService';
export { SimpleLeaderboardService } from './competition/SimpleLeaderboardService';

// Fitness services
export { LocalWorkoutStorageService } from './fitness/LocalWorkoutStorageService';

// Notification services
export { notificationService } from './notificationService';

// Cache services
export { UnifiedCacheService } from './cache/UnifiedCacheService';
