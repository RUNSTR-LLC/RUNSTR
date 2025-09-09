# RUNSTR App User Flow & Captain Experience

## Core User Journey: From Discovery to Competition

RUNSTR operates as a Nostr-native fitness platform where users begin their journey by logging in with their Nostr private key (nsec), which automatically imports their profile and existing workout data from kind 0 and kind 1301 Nostr events, while simultaneously importing Apple HealthKit workouts for iOS users. Upon successful authentication, users land directly on the Profile screen, which serves as their fitness dashboard displaying a unified workout timeline combining both HealthKit and Nostr workouts with posting controls, team membership status, and account settings across three tabs (Workouts, Account, Notifications). The bottom tab navigation provides seamless access between the Profile and Teams sections, with the Teams page functioning as the central hub for team discovery and participation. Users can browse available fitness teams created by captains, view team details including member counts and activity levels, and join teams with a simple tap that creates local membership for instant UX while simultaneously publishing a join request to the Nostr network for official captain approval.

## Team Discovery & Membership Flow

The Teams page intelligently adapts based on the user's role and membership status, displaying all available Nostr fitness teams fetched in real-time from multiple relays including Damus, Primal, and nos.lol. Team discovery utilizes a sophisticated two-tier membership system where users can join teams locally for immediate participation while their join requests are processed through the Nostr protocol for official membership verification. When users select a team, they can view comprehensive team information including the captain's profile, current members, ongoing competitions, and team statistics. The joining process creates an immediate local membership record for seamless user experience, while simultaneously publishing a kind 33406 join request event to Nostr relays, notifying the team captain for approval. This dual approach ensures users can begin participating immediately while maintaining the decentralized integrity of official team membership through captain-controlled Nostr lists.

## Captain Dashboard & Team Management

Captains experience a significantly enhanced interface when accessing the Teams page, which automatically detects their captain status through the CaptainDetectionService and displays a prominent "👑 Dashboard" button in the header. The Captain Dashboard serves as the command center for team management, featuring sections for team statistics, member management, join request approvals, and quick actions for competition creation. Real-time join requests appear in a dedicated section where captains can approve or deny membership applications with immediate UI updates, while the underlying system manages official team membership through Nostr list updates. The dashboard integrates seamlessly with the team's Bitcoin wallet management, allowing captains to fund prize pools, distribute rewards, and track financial activity related to competitions and team incentives.

## Competition Creation Wizard System

The revolutionary wizard system transforms competition creation from a complex process into an intuitive, step-by-step experience accessible through prominent "⚡ Create Event" and "🏆 Create League" buttons in the captain dashboard. Each wizard guides captains through four distinct phases: Activity Type selection (Running, Walking, Cycling, Strength Training, Meditation, Yoga, Diet), Competition Type selection with dynamic options based on the chosen activity (e.g., Distance Challenge, Speed Challenge, Duration Challenge for running), timing configuration (single date for events, start/end dates for leagues), and additional settings including entry fees in satoshis, maximum participants, approval requirements, and league-specific options like scoring frequency. The cascading dropdown system intelligently presents relevant options at each step, while the progress indicator and validation system ensures captains can only proceed when each step is properly configured, resulting in fully parameterized competitions that automatically generate appropriate leaderboards and scoring mechanisms.

## Automated Scoring & Bitcoin Integration

Once competitions are created through the wizard system, RUNSTR's LeaderboardService automatically calculates real-time rankings based on the captain's specific choices, supporting activity-specific metrics like total distance for running challenges, step counts for walking competitions, session counts for meditation, or consistency streaks across all activity types. The scoring system dynamically processes workout data from Nostr kind 1301 events, filtering by team membership and competition timeframes to generate accurate, real-time leaderboards that reflect exactly what the captain configured in their creation wizard. Bitcoin integration flows seamlessly through this system, with entry fees collected in satoshis, prize pools managed through team wallets, and automatic reward distribution to winners based on final leaderboard positions. This creates a complete ecosystem where captains design competitions through intuitive wizards, members participate by logging workouts to Nostr, and the platform automatically handles scoring, ranking, and Bitcoin prize distribution without requiring manual intervention, delivering on the promise of "invisible-first" operation while maintaining complete transparency through the decentralized Nostr protocol.

---

## Technical Implementation Summary

### User Authentication & Data Flow
- **Login**: Nsec input → Automatic profile import from kind 0 events + HealthKit workout import (iOS)
- **Workout Data**: Real-time sync from kind 1301 events across multiple Nostr relays + Apple HealthKit integration
- **Workout Posting**: Two-button system - "Save to Nostr" (kind 1301) vs "Post to Nostr" (kind 1 social with beautiful cards)
- **Navigation**: Direct to Profile screen → Bottom tab navigation (Profile/Teams)

### Team Management Architecture
- **Discovery**: Real-time team fetching from Damus, Primal, nos.lol relays
- **Membership**: Two-tier system (local instant + official Nostr list approval)
- **Join Requests**: Kind 33406 events with real-time captain notifications

### Captain Experience Components
- **Detection**: CaptainDetectionService automatically identifies captain status
- **Dashboard**: Integrated team stats, member management, join approvals, Bitcoin wallets
- **Wizards**: Four-step competition creation with cascading dropdowns and validation

### Competition & Scoring System
- **Creation**: Wizard-driven with 7 activity types and dynamic competition options
- **Storage**: Nostr kind 31013 events with complete wizard parameter preservation
- **Scoring**: LeaderboardService with activity-specific metrics and real-time updates
- **Bitcoin**: CoinOS integration for entry fees, prize pools, and automatic distribution

### Key Nostr Event Types
- **Kind 0**: User profiles and metadata
- **Kind 1**: Social workout posts with beautiful achievement cards and RUNSTR branding
- **Kind 1301**: Structured workout data for competition scoring (from HealthKit or manual entry)
- **Kind 30000/30001**: Team membership lists for fast queries
- **Kind 31013**: Competition definitions with wizard parameters
- **Kind 33404**: Team creation and metadata
- **Kind 33406**: Join requests for team membership

This architecture delivers a seamless, decentralized fitness competition platform where the complexity of Nostr protocols is completely hidden from users while maintaining the transparency and decentralization benefits of the underlying technology.