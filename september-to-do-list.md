# September 2024 - RUNSTR Development Roadmap

## 🎯 Mission: Local Workout Data Layer + Dynamic Team Competition UI

Transform static team displays into live competitive experiences with fast local data calculations and seamless captain/member flows.

---

## 📊 **PHASE 1: Local Workout Database Foundation** (Week 1)
*Foundation for all competition features - High Priority*

### 1.1 SQLite Database Architecture 
**File**: `src/services/database/workoutDatabase.ts` (~400 lines)
```sql
-- Core tables for fast competition calculations
workouts (id, npub, nostr_event_id, type, duration, distance, calories, start_time, created_at)
workout_metrics (workout_id, total_distance, best_5k, avg_pace, calories_burned, pr_achieved)
competition_cache (competition_id, type, parameters, participants, last_updated)
leaderboard_cache (competition_id, npub, score, rank, last_calculated)
```

### 1.2 Workout Metrics Calculator 
**File**: `src/services/competition/workoutMetricsCalculator.ts` (~300 lines)
- Extract metrics from Nostr 1301 events (distance, time, calories, pace)
- Calculate competition scores based on wizard parameters
- Track personal records and achievements
- Handle different activity types (running, cycling, walking, etc.)

### 1.3 Background Sync Service Enhancement
**File**: `src/services/database/workoutSyncService.ts` (~350 lines)
- Background sync: Nostr 1301 events → SQLite storage
- Deduplication logic (same workout from multiple sources)
- Metric calculation pipeline integration
- Progress tracking and error handling

---

## 🎖️ **PHASE 2: Captain UI Integration** (Week 2)
*Build on existing captain detection service*

### 2.1 Enhanced Team Screen Captain Logic
**Modify**: `src/screens/TeamScreen.tsx` (~150 lines)
- Integrate existing `CaptainDetectionService` into team view
- Conditional captain dashboard button rendering
- Captain vs member UI state management

### 2.2 Captain Button Component
**File**: `src/components/team/CaptainDashboardButton.tsx` (~100 lines)
- Styled captain dashboard access button
- Animated reveal when captain status detected
- Integration with existing navigation system

### 2.3 Team Context Service Integration
**Modify**: `src/services/notifications/TeamContextService.ts` (~50 lines)
- Add captain status to team context
- Cache captain detection results
- Provide team-wide captain state management

---

## 🏆 **PHASE 3: Dynamic League Rankings** (Week 3)
*Transform static members into live competition leaderboards*

### 3.1 League Ranking Calculator
**File**: `src/services/competition/leagueRankingService.ts` (~400 lines)
- Real-time ranking calculations from SQLite metrics
- Competition-specific scoring logic (total distance, best time, streaks, etc.)
- Handle different league types from wizard parameters
- Efficient caching and update strategies

### 3.2 Dynamic League Display Component
**Modify**: `src/components/team/TeamMembersSection.tsx` → `LeagueRankingsSection.tsx` (~350 lines)
- Replace static member list with live rankings
- Real-time score updates and position changes
- Competition progress indicators
- Member performance trend displays

### 3.3 League Data Bridge Service
**File**: `src/services/competition/leagueDataBridge.ts` (~250 lines)
- Connect wizard competition parameters to ranking calculations
- Map league settings to scoring algorithms
- Handle multiple active leagues per team
- Competition lifecycle management

---

## 🎮 **PHASE 4: Event Integration & Auto-Entry** (Week 4)
*Seamless workout-to-competition flow*

### 4.1 Event Eligibility Detector
**File**: `src/services/competition/eventEligibilityService.ts` (~300 lines)
- Auto-detect eligible events for completed workouts
- Match workout criteria to event parameters
- Smart notification for potential submissions
- One-click event entry system

### 4.2 Competition Auto-Entry UI
**File**: `src/components/competition/AutoEntryPrompt.tsx` (~200 lines)
- Workout completion → Event suggestion UI
- Quick entry with competition preview
- Progress tracking and confirmation
- Integration with existing workout posting flow

### 4.3 Event Scoring Integration
**Modify**: `src/services/competition/competitionService.ts` (~100 lines)
- Connect local workout metrics to event scoring
- Real-time leaderboard updates
- Competition completion detection
- Results aggregation and display

---

## ⚡ **Technical Implementation Strategy**

### Database Choice: SQLite with expo-sqlite
```bash
npm install expo-sqlite
```
- Native performance for calculations
- Offline-first architecture
- React Native optimized
- Minimal dependencies

### File Organization (Maintain <500 lines)
```
src/services/database/
  ├── workoutDatabase.ts         # Core SQLite operations
  ├── workoutSyncService.ts      # Background sync
  └── README.md                  # Database documentation

src/services/competition/
  ├── workoutMetricsCalculator.ts # Metrics extraction
  ├── leagueRankingService.ts    # Live rankings
  ├── eventEligibilityService.ts # Auto-entry logic
  └── leagueDataBridge.ts        # Competition parameters
```

### Build on Existing Systems
- ✅ **CaptainDetectionService**: Already implemented, just integrate UI
- ✅ **Competition Wizards**: Already capture parameters, connect to calculations
- ✅ **NostrWorkoutService**: Already fetches data, enhance with SQLite storage
- ✅ **Team Components**: Already structured, transform static → dynamic

### Performance Targets
- **Sub-100ms**: Leaderboard calculations from local SQLite
- **<2s**: Background sync of new workout data
- **Real-time**: UI updates when new workouts detected
- **Progressive**: Load essential data first, details on-demand

---

## 🎯 **Implementation Order & Dependencies**

**Week 1**: SQLite foundation (enables everything else)
**Week 2**: Captain UI (depends on existing detection service)
**Week 3**: League rankings (depends on SQLite + metrics)
**Week 4**: Event integration (depends on all previous phases)

### Success Metrics
- ✅ **<100ms** leaderboard updates from local data
- ✅ **Zero friction** workout-to-event submissions
- ✅ **Clear visual distinction** captain vs member UI
- ✅ **Accurate calculations** from 1301 event data
- ✅ **Real-time updates** as team members complete workouts

### Risk Mitigation
- **SQLite Performance**: Index competition_id, npub columns for fast queries
- **Data Consistency**: Implement robust sync error handling and retry logic
- **UI Complexity**: Progressive enhancement - start with basic rankings, add features
- **Competition Logic**: Extensive testing with different wizard configurations

---

## 🚀 **Immediate Action Items & Development Tasks**

### **Phase 1 Kickoff Tasks** (Start Immediately)
1. **Install Dependencies**
   ```bash
   npm install expo-sqlite
   ```

2. **Create Database Service Structure**
   ```bash
   mkdir -p src/services/database
   mkdir -p src/services/competition
   ```

3. **Database Schema Design & Implementation**
   - Design SQLite tables for workout metrics and competition caching
   - Implement database initialization and migration system
   - Create indexes for performance-critical queries

4. **Workout Metrics Extraction Service**
   - Build parser for Nostr 1301 event data
   - Extract distance, duration, calories, pace metrics
   - Handle different workout types and data formats

### **Key Integration Points**
- **Existing CaptainDetectionService** → Enhanced with UI integration
- **Existing Competition Wizards** → Connect parameters to local calculations
- **Existing NostrWorkoutService** → Enhanced with SQLite storage layer
- **Existing TeamMembersSection** → Transform to dynamic LeagueRankingsSection

### **Testing Strategy**
- **Phase 1**: Test SQLite performance with 1000+ workout records
- **Phase 2**: Test captain UI with different team configurations
- **Phase 3**: Test ranking calculations with various competition types
- **Phase 4**: Test auto-entry flow with real workout data

### **Success Validation**
Each phase has specific deliverables and performance benchmarks:
- **Phase 1**: Sub-100ms local queries, reliable background sync
- **Phase 2**: Captain button appears within 500ms of team load
- **Phase 3**: League rankings update in real-time as workouts complete
- **Phase 4**: Auto-entry suggestions appear immediately after workout completion

---

## 📋 **Implementation Checklist**

### **Before Starting Development**
- [ ] Review existing codebase architecture
- [ ] Test current captain detection functionality
- [ ] Examine wizard competition parameter structures
- [ ] Verify Nostr workout data parsing capabilities

### **Phase 1 Completion Criteria**
- [ ] SQLite database successfully stores workout metrics
- [ ] Background sync reliably imports 1301 events
- [ ] Local queries return results in <100ms
- [ ] Database handles 1000+ workout records efficiently

### **Phase 2 Completion Criteria**
- [ ] Captain button appears automatically when user is team captain
- [ ] Captain vs member UI clearly distinguished
- [ ] Captain detection integrates seamlessly with existing team flow
- [ ] No performance degradation from captain status checking

### **Phase 3 Completion Criteria**
- [ ] Static team members replaced with dynamic league rankings
- [ ] Rankings update automatically when new workouts detected
- [ ] Different competition types display appropriate scoring
- [ ] Leaderboard calculations match wizard competition parameters

### **Phase 4 Completion Criteria**
- [ ] Completed workouts automatically suggest eligible events
- [ ] One-click event entry from workout completion
- [ ] Event leaderboards update in real-time
- [ ] Competition completion detection and results display

---

## 🎯 **Next Steps to Begin Implementation**

1. **Start with Phase 1.1** - SQLite Database Architecture
2. **Review existing services** - CaptainDetectionService, NostrWorkoutService, Competition Wizards
3. **Design database schema** - Focus on fast competition queries
4. **Build metrics calculator** - Extract data from Nostr 1301 events
5. **Test with real data** - Use existing workout data for validation

The roadmap builds incrementally on existing systems while maintaining your architectural principles of simplicity, direct methods, and <500 line files. Each phase unlocks the next, creating a solid foundation for competitive team fitness experiences.