# RUNSTR REWARDS App User Flow & Captain Experience

## Core User Journey: From Login to Bitcoin-Powered Fitness

RUNSTR REWARDS operates as a Bitcoin-powered fitness platform built on Nostr's decentralized protocol, where users begin their journey by logging in with their Nostr private key (nsec), which instantly accomplishes three critical tasks: imports their profile and existing workout data from kind 0 and kind 1301 Nostr events, automatically creates a Lightning wallet for instant Bitcoin transactions, and syncs Apple HealthKit workouts for iOS users. Upon successful authentication, every user immediately becomes part of a Bitcoin circular economy, landing on the Profile screen which serves as their fitness and financial dashboard - displaying a unified workout timeline combining both HealthKit and Nostr workouts with posting controls, their auto-created wallet balance with zap buttons, team membership status, and account settings across three tabs (Workouts, Account, Notifications). The bottom tab navigation provides seamless access between the Profile and Teams sections, with the Teams page functioning as the central hub where users can browse fitness teams, instantly zap satoshis to other members via lightning bolt buttons (tap for 21 sats, long-press for custom amounts), and join teams that operate as self-contained Bitcoin economies where every workout has value and achievements earn real satoshi rewards.

## Team Discovery & Bitcoin Economy Participation

The Teams page intelligently adapts based on the user's role and membership status, displaying all available Nostr fitness teams fetched in real-time from multiple relays including Damus, Primal, and nos.lol, with each team functioning as a Bitcoin circular economy where members exchange value through instant P2P zaps. Team discovery showcases not just fitness metrics but economic activity - members zapping each other for motivation, captains distributing rewards, and competitions with real satoshi prizes. When users select a team, they can view comprehensive team information including the captain's profile with zap button, current members (each with their own zap button showing lightning bolt icons), ongoing competitions with Bitcoin prize pools, and team statistics showing both fitness achievements and economic activity. The joining process creates an immediate local membership record for seamless user experience while publishing a kind 33406 join request event to Nostr relays, and once approved, new members can immediately start sending and receiving zaps - the app's auto-receive feature checks for incoming payments every 30 seconds, ensuring users never miss rewards while maintaining the frictionless experience of traditional fitness apps enhanced with Bitcoin's monetary incentives.

## Captain Dashboard & Direct Bitcoin Rewards

Captains experience a significantly enhanced interface when accessing the Teams page, which automatically detects their captain status through the CaptainDetectionService and displays a prominent "👑 Dashboard" button in the header. The Captain Dashboard serves as both team management center and Bitcoin distribution hub, featuring sections for team statistics, member management with integrated zap buttons next to each member (enabling instant rewards of 21 sats or custom amounts), join request approvals, and quick actions for competition creation with Bitcoin prize pools. Real-time join requests appear in a dedicated section where captains can approve or deny membership applications with immediate UI updates, while the underlying system manages official team membership through Nostr kind 30000 list updates. The revolutionary aspect is the direct P2P reward system - captains can tap the lightning bolt next to any member's name to instantly send satoshis for outstanding performances, milestone achievements, or motivation during challenging periods, transforming team leadership from administrative oversight into active financial motivation without any intermediary fees or platform cuts.

## Competition Creation Wizard System

The revolutionary wizard system transforms competition creation from a complex process into an intuitive, step-by-step experience accessible through prominent "⚡ Create Event" and "🏆 Create League" buttons in the captain dashboard. Each wizard guides captains through four distinct phases: Activity Type selection (Running, Walking, Cycling, Strength Training, Meditation, Yoga, Diet), Competition Type selection with dynamic options based on the chosen activity (e.g., Distance Challenge, Speed Challenge, Duration Challenge for running), timing configuration (single date for events, start/end dates for leagues), and additional settings including entry fees in satoshis, maximum participants, approval requirements, and league-specific options like scoring frequency. The cascading dropdown system intelligently presents relevant options at each step, while the progress indicator and validation system ensures captains can only proceed when each step is properly configured, resulting in fully parameterized competitions that automatically generate appropriate leaderboards and scoring mechanisms.

## Automated Scoring & P2P Bitcoin Prize Distribution

Once competitions are created through the wizard system and published as Nostr events (kind 30100 for leagues, kind 30101 for events), RUNSTR REWARDS' LeaderboardService automatically calculates real-time rankings based on the captain's specific choices, supporting activity-specific metrics like total distance for running challenges, step counts for walking competitions, session counts for meditation, or consistency streaks across all activity types. The scoring system dynamically processes workout data from Nostr kind 1301 events, filtering by team membership (from kind 30000 lists) and competition timeframes to generate accurate, real-time leaderboards. The Bitcoin magic happens through the Lightning P2P system - entry fees collected in satoshis go directly to captains who then distribute prizes via instant zaps to winners, while throughout the competition any member can zap others for encouragement, creating continuous value flow within the team's micro-economy. The auto-receiving feature ensures prize payouts and peer support zaps are claimed automatically every 30 seconds, creating a seamless experience where fitness effort translates directly into Bitcoin rewards through the decentralized Lightning infrastructure.

## P2P Zapping & Motivation System

The heart of RUNSTR REWARDS' Bitcoin economy is the ubiquitous zapping interface that appears throughout the app, enabling instant peer-to-peer value transfer between any team members without intermediaries or fees. Every user profile, team member listing, and leaderboard entry features a lightning bolt button that triggers the Lightning payment system - a simple tap sends 21 sats as quick appreciation, while a long-press opens a custom amount modal with preset options (21, 100, 500, 1000, 5000 sats) for more substantial rewards. This creates a continuous flow of micro-incentives where members zap each other for completing difficult workouts, maintaining consistency streaks, achieving personal records, or simply providing encouragement during challenging times. The auto-receive feature runs in the background checking for incoming zaps every 30 seconds, automatically claiming payments to users' wallets and updating balances in real-time, ensuring the Bitcoin economy operates as smoothly as likes and comments in traditional social apps but with real monetary value attached to every interaction.

## Bitcoin Circular Economy Flow

RUNSTR REWARDS transforms each fitness team into a self-contained Bitcoin circular economy where value flows continuously between participants through multiple channels. The economy begins when users join teams (potentially paying entry fees for exclusive groups), continues as they participate in competitions with satoshi prize pools, accelerates through peer-to-peer zaps for motivation and achievement recognition, and culminates in direct captain-to-member rewards for outstanding performance. Every workout posted as a kind 1301 event potentially earns zaps from teammates impressed by the effort, every competition victory results in automatic satoshi prizes, and every milestone achievement triggers celebratory zaps from the community. This creates a unique economic model where fitness effort has immediate monetary value - a morning run might earn 100 sats in peer appreciation, winning a weekly challenge could net 5000 sats in prizes, and consistent participation might trigger a 1000 sat bonus from the captain, all flowing through the instant, private Lightning infrastructure that makes Bitcoin as easy to send as a text message.

---

## Technical Implementation Summary

### User Authentication & Wallet Creation
- **Login**: Nsec input → Automatic profile import from kind 0 events + Auto-creation of Lightning wallet + HealthKit workout import (iOS)
- **Wallet Setup**: Automatic wallet creation on first login, Lightning connection established, ready for instant P2P zaps
- **Workout Data**: Real-time sync from kind 1301 events across multiple Nostr relays + Apple HealthKit integration
- **Workout Posting**: Two-button system - "Save to Nostr" (kind 1301) vs "Post to Nostr" (kind 1 social with beautiful cards)
- **Navigation**: Direct to Profile screen → Bottom tab navigation (Profile/Teams) with wallet balance display

### Team Management Architecture
- **Discovery**: Real-time team fetching from Damus, Primal, nos.lol relays
- **Membership**: Two-tier system (local instant + official Nostr list approval)
- **Join Requests**: Kind 33406 events with real-time captain notifications

### Captain Experience Components
- **Detection**: CaptainDetectionService automatically identifies captain status with caching
- **Dashboard**: Team stats, member management with zap buttons, join approvals, direct P2P reward distribution
- **Wizards**: Four-step competition creation with cascading dropdowns and validation
- **Reward Tools**: Lightning bolt buttons next to each member for instant zapping (21 sats default, custom amounts available)

### Competition & Scoring System
- **Creation**: Wizard-driven with 7 activity types and dynamic competition options
- **Storage**: Nostr kind 30100 (leagues) and 30101 (events) with complete wizard parameters
- **Scoring**: LeaderboardService with activity-specific metrics and real-time updates from kind 1301 workout events
- **Bitcoin**: Lightning P2P system for entry fees, direct captain-to-winner prize distribution via instant zaps

### Key Nostr Event Types
- **Kind 0**: User profiles and metadata
- **Kind 1**: Social workout posts with beautiful achievement cards and RUNSTR REWARDS branding
- **Kind 1301**: Structured workout data for competition scoring (from HealthKit or manual entry)
- **Kind 30000**: Team membership lists (single source of truth for competition queries)
- **Kind 30100**: League competitions with wizard-defined parameters
- **Kind 30101**: Event competitions (single-day challenges)
- **Kind 33404**: Team creation and metadata
- **Kind 33406**: Join requests for team membership

### Lightning P2P Bitcoin System
- **Wallet Implementation**: Complete Lightning wallet with auto-creation on login
- **Infrastructure**: Lightning Network integration for instant transactions
- **Zap Interface**: Lightning bolts throughout app (tap = 21 sats, long-press = custom amount)
- **Auto-Receive**: Background service claims incoming zaps every 30 seconds
- **Transaction History**: Complete logging of all sent/received zaps with amounts and timestamps
- **Low Fees**: Direct P2P Lightning transfers without platform cuts

This architecture delivers the world's first Bitcoin-powered fitness economy where every workout has value, every achievement earns recognition, and every team operates as a self-contained circular economy. RUNSTR REWARDS combines the social motivation of team fitness with the economic incentives of Bitcoin micropayments, creating a new paradigm where getting fit literally pays - all built on the uncensorable, decentralized foundation of Nostr and Bitcoin.