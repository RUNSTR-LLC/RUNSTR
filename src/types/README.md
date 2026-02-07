# Types Directory

TypeScript type definitions and interfaces for the RUNSTR application.

## Files

- **analytics.ts** - Advanced analytics data structures including health profile, cardio performance metrics, pace trends, VO2max estimates, and personal records.
- **bitcoin.ts** - Bitcoin and Lightning Network types for wallets, transactions, payments, and event creation data.
- **blossom.ts** - Blossom server integration types including server configuration, blob descriptors, and track types for decentralized media.
- **fitnessTest.ts** - RUNSTR Fitness Test types for the standardized assessment (pushups, situps, 5K run) with composite scoring (0-300).
- **garmin.ts** - Garmin Health API type definitions for activity summaries, speed/pace metrics, and heart rate data.
- **index.ts** - Central re-export file that aggregates types from user, team, workout, bitcoin, and notifications modules. Also defines navigation param types.
- **journal.ts** - Journal system data models for mood tracking, energy levels, and free-form reflection entries used by the AI synthesis feature.
- **music.ts** - Music player types for Wavlake and Blossom integration including unified track types, playlist structures, and player state.
- **nostrCompetition.ts** - Nostr event structures for competitions using custom kinds (30100 leagues, 30101 events, 30102 challenges) with parameterized replaceable events.
- **nostrWorkout.ts** - Kind 1301 workout event types for Nostr publishing, including parsed workout content, charity info, and split data.
- **notifications.ts** - Notification type definitions for challenges, leaderboard updates, Bitcoin earnings, team announcements, and competition events.
- **nutzap.ts** - NIP-60/61 ecash wallet types for NutZap functionality including wallet state, send results, and claim results.
- **pledge.ts** - Workout pledge system types where users commit future daily rewards (50 sats each) to event destinations or charities.
- **runstrEvent.ts** - User-created fitness event types published as NIP-52 kind 31923 calendar events with scoring, payout schemes, and join methods.
- **satlantis.ts** - Satlantis NIP-52 calendar event integration types for race discovery, RSVPs, and sport-specific event metadata.
- **season.ts** - Season 1 competition types including participant data, leaderboard structures, and season configuration.
- **season2.ts** - Season 2 competition types with charity integration, participant tracking, charity rankings, and private competitor support.
- **team.ts** - Team and competition types including team definitions, leagues, leaderboards, challenges, and charity associations.
- **timeline.ts** - Unified health timeline data model that combines workouts, journal entries, and habit check-ins into a single chronological feed.
- **transparencyDashboard.ts** - Rewards transparency dashboard types for pool status, aggregated summaries, and payment flow visualization. Maps to Supabase migration 123.
- **unifiedNotifications.ts** - Central unified notification system types covering all notification categories (challenges, competitions, zaps, team requests, workout interactions).
- **user.ts** - User profile and authentication types including Nostr profile fields (kind 0), Lightning address, and role definitions.
- **workout.ts** - Core workout and fitness types including WorkoutType, WorkoutSource, FitnessProvider, and the main Workout interface.
- **workoutLevel.ts** - Distance-based XP level system with exponential scaling, milestone titles, and streak tracking.
- **wot.ts** - Web of Trust (NIP-85) types for Brainstorm trusted assertions, cached WoT scores, and fraud prevention thresholds.
