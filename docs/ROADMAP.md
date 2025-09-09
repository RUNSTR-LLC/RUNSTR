# RUNSTR.APP Development Roadmap

## 🎯 MVP Core Loop
**User signs in → Joins team → Workouts auto-sync → Earns Bitcoin from competitions**

## 📅 Development Phases

### Phase 1: Foundation (Week 1-2)
**Goal: Complete UI framework and navigation**

#### Completed ✅
- [x] Project structure setup
- [x] Theme system (exact CSS match)  
- [x] Core UI components (Card, Button, Avatar, StatusBar)
- [x] TypeScript types definition

#### In Progress 🔄
- [ ] Team screen implementation (exact HTML match)
- [ ] Profile screen implementation (exact HTML match)
- [ ] Bottom navigation system
- [ ] Screen routing setup

#### Priority Tasks
1. Complete TeamScreen.tsx with all components
2. Complete ProfileScreen.tsx with all tabs
3. Implement BottomNavigation component
4. Set up React Navigation structure

### Phase 2: Authentication & Backend (Week 2-3)
**Goal: Users can sign in and data persists**

#### Core Tasks
- [ ] Supabase project setup and database schema
- [ ] Apple Sign In integration
- [ ] Google OAuth integration  
- [ ] Nostr authentication (nsec for iOS, Amber for Android)
- [ ] Automatic npub/nsec generation for OAuth users
- [ ] User profile management
- [ ] Session persistence

#### Database Schema Priority
```sql
-- Core tables needed for MVP
users, teams, team_members, leagues, workouts, 
events, challenges, wallets, transactions
```

### Phase 3: Workout Sync (Week 3-4)
**Goal: Workouts automatically sync and appear in app**

#### Integration Tasks
- [ ] HealthKit permissions and data extraction (iOS)
- [ ] Google Fit integration (Android)
- [ ] Nostr fitness protocol integration
- [ ] Background sync service
- [ ] Duplicate detection across sources
- [ ] Heart rate validation for anti-cheat

#### Workout Processing
- [ ] Automatic workout categorization
- [ ] Competition participation logic
- [ ] Leaderboard update system
- [ ] Real-time sync status display

### Phase 4: Competition System (Week 4-5)
**Goal: Users can participate in leagues, events, and challenges**

#### League System
- [ ] Team leaderboard calculations
- [ ] Ranking algorithms by metric type
- [ ] Real-time leaderboard updates
- [ ] Position change notifications

#### Events & Challenges
- [ ] Event creation and management
- [ ] Challenge system (user vs user)
- [ ] Prize pool calculation
- [ ] Automatic winner determination
- [ ] Result arbitration for captains

### Phase 5: Bitcoin Integration (Week 5-6)
**Goal: Users earn real Bitcoin from competitions**

#### CoinOS Integration
- [ ] Wallet creation via CoinOS API
- [ ] Lightning Network payment processing
- [ ] Balance display and updates
- [ ] Send/receive functionality
- [ ] Transaction history

#### Reward Distribution
- [ ] Automatic payout system
- [ ] Team prize pool management
- [ ] Challenge winner payments
- [ ] League reward distribution
- [ ] Exit fee processing (2000 sats)

### Phase 6: Wizard Flows (Week 6-7)
**Goal: Seamless onboarding for members and captains**

#### Member Onboarding Wizard
- [ ] Login screen (Apple/Google/Nostr options)
- [ ] Profile setup (name, avatar)
- [ ] Team selection with analytics
- [ ] Sync source permissions
- [ ] Wallet creation
- [ ] Welcome to team flow

#### Captain Team Creation Wizard  
- [ ] Team details (name, description, avatar)
- [ ] League configuration (metric, payout frequency)
- [ ] First event creation
- [ ] Arbitration fee setting
- [ ] Member invitation system
- [ ] Wallet setup and funding

### Phase 7: Polish & Launch (Week 7-8)
**Goal: Production-ready MVP**

#### User Experience
- [ ] Push notification system
- [ ] Team-branded notifications
- [ ] Error handling and loading states
- [ ] Offline functionality
- [ ] Performance optimization

#### Quality Assurance
- [ ] Anti-cheat system testing
- [ ] Bitcoin transaction testing
- [ ] Cross-platform compatibility
- [ ] Security audit
- [ ] App Store preparation

## 🔧 Technical Priorities

### Critical Integration Points
1. **Supabase Setup**: Database schema, real-time subscriptions, RLS policies
2. **Authentication Flow**: Seamless login with automatic Nostr key generation
3. **Workout Sync**: Background processing with proper iOS/Android permissions
4. **Bitcoin Wallet**: Reliable CoinOS integration with error handling
5. **Push Notifications**: Team-branded messaging system

### Architecture Requirements
- All files under 500 lines of code
- Exact UI match to HTML mockups
- Real data only (no mocking)
- Modular component structure
- TypeScript throughout

## 🎨 UI Implementation Status

### Team Screen Components
- [ ] Header with team name and menu
- [ ] About/Prize section with captain buttons
- [ ] League leaderboard (top 5)
- [ ] Events card with scrollable list
- [ ] Challenges card with scrollable list
- [ ] Bottom navigation

### Profile Screen Components  
- [ ] Profile header with edit button
- [ ] Wallet section with balance
- [ ] Tab navigation (Workouts/Account/Notifications)
- [ ] Auto-sync sources status
- [ ] Account settings
- [ ] Notification preferences

## 🚀 Success Metrics for MVP

### Technical Milestones
- [ ] User can sign up in under 2 minutes
- [ ] Workouts sync automatically within 5 minutes
- [ ] Leaderboard updates in real-time
- [ ] Bitcoin rewards work end-to-end
- [ ] App matches HTML mockups exactly

### User Experience Goals
- [ ] Invisible operation (minimal daily interaction)
- [ ] Push notifications as primary UI
- [ ] Team-branded experience
- [ ] Seamless Bitcoin earning
- [ ] Strategic team competition

## 🔄 Current Focus

**Immediate Next Steps:**
1. Complete TeamScreen.tsx implementation
2. Complete ProfileScreen.tsx implementation
3. Set up basic navigation
4. Begin Supabase backend setup

**This Week's Goal:**
Complete Phase 1 foundation with pixel-perfect UI matching HTML mockups.

**Next Week's Goal:**
Begin Phase 2 with working authentication and basic data persistence.