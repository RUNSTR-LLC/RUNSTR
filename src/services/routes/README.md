# Route Services

Services for managing GPS routes and course comparison functionality.

## Current Files

### `RouteStorageService.ts`
Persistent storage service for saved GPS routes. Allows users to:
- Save favorite workout routes from completed workouts
- Store full GPS track data with elevation and metrics
- Track route usage statistics (times used, last used)
- Record best performance on each route (fastest time/pace)
- Organize routes with tags and descriptions
- Filter routes by activity type

**Key Features:**
- Local AsyncStorage persistence
- Automatic best time tracking
- Route metadata management (rename, tag, describe)
- Usage statistics and analytics
- Supports all workout types (running, cycling, walking, hiking)

**Data Model:**
- `SavedRoute`: Full route definition with GPS coordinates
- `GPSPoint`: Latitude/longitude with optional altitude/timestamp
- Route metrics: distance, elevation gain, average grade
- Performance tracking: best time, best pace, linked workout ID

**Usage:**
```typescript
import routeStorage from '../services/routes/RouteStorageService';

// Save a route from completed workout
const routeId = await routeStorage.saveRoute({
  name: "Morning Loop",
  activityType: 'running',
  coordinates: gpsPoints,
  distance: 5200, // meters
  elevationGain: 120,
  workoutTime: 1800, // 30 minutes
});

// Get all routes for specific activity
const runningRoutes = await routeStorage.getRoutesByActivity('running');

// Update stats after completing route again
await routeStorage.updateRouteStats(routeId, {
  workoutId: 'workout_123',
  workoutTime: 1750, // New PR!
  workoutPace: 5.6,
});
```

## Planned Files

### `RouteMatchingService.ts` (Future)
GPS-based route comparison and matching helper for route detection and PR pacing feedback.

### `RouteSimplificationService.ts` (Future)
GPS track optimization. Will reduce storage size by:
- Douglas-Peucker algorithm for coordinate simplification
- Removes redundant GPS points while preserving route shape
- Configurable precision levels (high/medium/low)
- Reduces storage usage by 60-80% without visual quality loss
