# Services Directory

Core application services handling business logic and external integrations for RUNSTR.

## Key Subdirectories

### Core Infrastructure
- **auth/** - Nostr nsec authentication and key management
- **nostr/** - GlobalNDKService, relay management, event publishing
- **cache/** - Unified caching for Nostr data and performance

### Fitness & Workouts
- **activity/** - GPS tracking, step counting, workout timers
- **fitness/** - HealthKit/Health Connect integration, workout processing

### Rewards & Donations
- **rewards/** - DailyRewardService, Lightning address delivery, server-side auto-rewards
- **donation/** - Charity donation splitting and tracking
- **impact/** - Impact Level XP calculations

### Events & Competitions
- **season/** - Season2Service, leaderboard calculations
- **satlantis/** - Satlantis event integration
- **scoring/** - Event scoring algorithms

### Other Services
- **ai/** - Coach Runstr AI assistant
- **wallet/** - Lightning address storage and NWC utilities
- **team/** - Charity (team) selection and display
- **notifications/** - In-app notification system