# September 2024 - RUNSTR Development Roadmap

## Core Team & Competition Flow Improvements

### 1. Captain Recognition & Dashboard Access
- **Goal**: Automatically detect team captains from Nostr team notes
- **Implementation**: Parse team Nostr events to identify captain npub, show captain dashboard button when user matches
- **User Flow**: Team click → Captain check → Conditional UI (member view vs captain dashboard)

### 2. League Ranking System (Replace Team Members)
- **Goal**: Transform static team member lists into dynamic league rankings
- **Implementation**: Replace "team members" section with "league" showing ranked participants
- **Ranking Logic**: Use metrics determined during captain's league creation wizard
- **Display**: Real-time leaderboard based on accumulated performance data

### 3. Local Workout Data Storage & Metrics Extraction
- **Goal**: Efficiently store and retrieve workout data from Nostr 1301 events
- **Implementation**: Local database/cache for workout metrics (distance, time, calories, etc.)
- **Benefits**: Fast calculations for total distance, best times, PR tracking without constant Nostr queries
- **Data Sources**: Parse 1301 notes on fetch, store locally for instant access

### 4. Event Workflow & Competition Integration
- **Goal**: Seamless workout submission into events with clear user/captain flows
- **User Flow**: Complete workout → Auto-detect eligible events → One-click submission
- **Captain Flow**: Create event → Define parameters → Monitor submissions → View real-time results
- **Integration**: Connect local workout storage with event scoring logic

## Implementation Priority
1. Local workout data architecture (foundation for all other features)
2. Captain recognition system
3. League ranking transformation
4. Event workflow optimization

## Success Metrics
- Sub-second leaderboard updates
- Zero-friction workout submissions
- Clear captain vs member UI distinction
- Accurate metric calculations from stored data