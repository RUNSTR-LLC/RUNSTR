# Invisible AI Learning Layer - Design Document

> Brainstorm from January 2026 - Feature concept for personalized AI coaching

## Concept

An AI that silently learns from your workouts and surfaces personalized moments through toasts and TTS. Users experience a smart app that "gets" them - not a chatbot. All data stays local on device.

## Design Principles

- **Invisible learning, visible moments** - Learning is silent; toasts/TTS are the payoff
- **Feels like the app, not an AI** - No "AI generated" branding, no chatbot UI
- **100% local** - All patterns stored on device, never sent externally
- **Privacy by default** - No disclosure needed because nothing leaves the device
- **Progressive personalization** - App gets more "you" over time

---

## User-Facing AI Touchpoints

### Toast Notifications
Personalized toasts at key moments (no "AI" branding):

| Trigger | Example Message | Pattern Used |
|---------|-----------------|--------------|
| Post-workout | "Your fastest 5K this month!" | Performance history |
| App open | "Tuesday runs are your thing - ready?" | Temporal patterns |
| Milestone | "10 runs in January! Unstoppable." | Streak/volume |
| Comeback | "First run in 5 days - welcome back!" | Activity gaps |

### TTS During Workouts
Voice coaching using learned patterns:

| Trigger | Example Message | Pattern Used |
|---------|-----------------|--------------|
| Pace check | "15 seconds faster than your usual pace" | typicalPaceMin/Max |
| Halfway | "Halfway there - you've got this" | raceDistance + time |
| Personal record | "This is your longest run since December" | Distance history |
| Warm-up complete | "Warm-up done, let's pick it up" | warmUpDistance |

### Privacy Guarantee
- All data stays in **local AsyncStorage**
- Patterns never sent to servers
- LLM API only called when generating messages (rate-limited)
- No analytics, no tracking, no external pattern storage

---

## The RUNSTR.md Learning File

The existing `@runstr:ai_context` (RUNSTR.md) already tracks:
- Physical profile (height, weight, age)
- Body composition (BMI, VO2 Max, Fitness Age)
- Workout history (last 20 workouts)
- Conversation memory (last 10 AI chats)

### New Sections to Add

```markdown
## Learned Patterns
### Temporal Patterns
- Primary workout days: [Monday, Wednesday, Friday]
- Preferred time: Morning (6-8am)
- Average workouts per week: 4.2
- Streak behavior: Strong (rarely misses 2 days)

### Performance Patterns
- Warm-up duration: ~0.5 miles / 5 minutes
- Typical pace decay: -3% over distance
- Best performance conditions: 55-65°F, low humidity
- Recovery pattern: Slower pace day after hard effort

### Route Intelligence
- Home coordinates: [lat, lng] (detected, not asked)
- Frequent routes: 3 identified
- GPS problem zones: [tunnel at mile 2.1 on Route A]
- Typical distances: 5K (60%), 10K (30%), Other (10%)

### Behavioral Signals
- Preferred activity: Running (85% of workouts)
- Uses manual entry: Rarely
- Social sharing: Occasional (30% of workouts)
- Team engaged: Yes, active donor

### Inferred Preferences
- Distance unit: Miles (based on viewing behavior)
- Pace display: min/mile preferred
- Notifications: Tolerant (doesn't dismiss quickly)
```

---

## Architecture

### New Service: `AmbientCoachService.ts`
Orchestrates personalized toasts and TTS using learned patterns + LLM.

```typescript
class AmbientCoachService {
  // Called after workout save - generates celebration message
  async onWorkoutComplete(workout: LocalWorkout): Promise<void>
  // 1. Load learned patterns
  // 2. Compare workout to history (is this a PR? streak? comeback?)
  // 3. Generate personalized message via CoachClaudeService
  // 4. Show toast + optionally TTS

  // Called on app foreground - generates greeting
  async onAppOpen(): Promise<void>
  // 1. Check rate limit (once per 4 hours)
  // 2. Load patterns (what day is it? do they usually workout now?)
  // 3. Generate contextual greeting via LLM
  // 4. Show toast

  // Called during workout - personalized coaching
  async onSplitComplete(split: Split, workout: LocalWorkout): Promise<void>
  // 1. Compare split pace to learned typical pace
  // 2. Generate encouragement if ahead/behind
  // 3. TTS announcement
}
```

### New Service: `AILearningService.ts`
Background learning engine that extracts patterns from workout data.

```typescript
class AILearningService {
  // Called after each workout save
  async learnFromWorkout(workout: LocalWorkout): Promise<void>

  // Full pattern analysis (periodic, on app foreground after 24hrs)
  async analyzeAllPatterns(): Promise<void>

  // Get current learned state for other services to consume
  async getLearnedPatterns(): Promise<LearnedPatterns | null>
}
```

### New Service: `PatternRecognitionService.ts`
Pure analysis functions (no storage, just algorithms).

```typescript
// Temporal: When does user workout?
export function detectTemporalPatterns(workouts: LocalWorkout[]): TemporalPatterns

// Performance: How does user pace/perform?
export function detectPacePatterns(workouts: LocalWorkout[]): PerformancePatterns

// Routes: Where does user go? (future phase)
export function detectRoutePatterns(workouts: LocalWorkout[]): RouteProfile[]

// Preferences: What does behavior suggest?
export function inferPreferences(workouts: LocalWorkout[]): Preferences
```

---

## Learning Pipeline

```
1. USER COMPLETES WORKOUT
        ↓
2. LocalWorkoutStorageService.save()
        ↓
3. AILearningService.learnFromWorkout()
   - Extract signals from this workout
   - Update rolling statistics
   - Detect anomalies (PR, unusual route, etc.)
        ↓
4. PatternRecognitionService (periodically)
   - Cluster workouts by time → temporal patterns
   - Cluster by location → route profiles
   - Analyze pacing → performance patterns
        ↓
5. RunstrContextGenerator.updateContext()
   - Merge learned patterns into RUNSTR.md
   - Context now includes both raw data + insights
        ↓
6. AmbientCoachService
   - Uses patterns to generate personalized messages
   - Shows toast / speaks TTS
```

---

## Storage Structure

| Key | Purpose |
|-----|---------|
| `@runstr:ai_context` | Full RUNSTR.md (existing) |
| `@runstr:ai_learned_patterns` | Extracted patterns JSON |
| `@runstr:ai_route_profiles` | GPS calibration data |
| `@runstr:ai_learning_state` | Last analysis timestamp, version |

---

## TypeScript Interfaces

```typescript
export interface LearnedPatterns {
  temporal: TemporalPatterns;
  performance: PerformancePatterns;
  routes: RouteProfile[];
  preferences: Preferences;
  version: number;
  lastUpdated: string;
  workoutsAnalyzed: number;
}

export interface TemporalPatterns {
  preferredDays: string[];          // ['Monday', 'Wednesday', 'Friday']
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening' | 'varied';
  avgWorkoutsPerWeek: number;
  streakBehavior: 'strong' | 'moderate' | 'inconsistent';
  usualStartHour?: number;          // 7 = 7am
}

export interface PerformancePatterns {
  warmUpDuration?: number;          // seconds
  warmUpDistance?: number;          // km
  typicalPaceMin?: number;          // min/km
  typicalPaceMax?: number;          // min/km
  paceDecayRate?: number;           // % drop over distance
  bestPerformanceConditions?: string;
}

export interface RouteProfile {
  id: string;
  centerLat: number;
  centerLng: number;
  typicalDistance: number;
  gpsProblemZones?: { lat: number; lng: number; radius: number }[];
  workoutCount: number;
}

export interface Preferences {
  preferredActivity: WorkoutType;
  distanceUnit: 'km' | 'miles';
  usesManualEntry: boolean;
  socialSharing: 'frequent' | 'occasional' | 'rare';
  teamEngaged: boolean;
}
```

---

## Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `src/services/ai/AmbientCoachService.ts` | Orchestrates toasts + TTS using patterns |
| 2 | `src/services/ai/AILearningService.ts` | Extracts patterns from workout history |
| 3 | `src/services/ai/PatternRecognitionService.ts` | Pure pattern detection functions |
| 4 | `src/types/aiLearning.ts` | TypeScript interfaces |

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `LocalWorkoutStorageService.ts` | Trigger learning + coach on save |
| 2 | `RunstrContextGenerator.ts` | Add Learned Patterns to RUNSTR.md |
| 3 | `toastConfig.tsx` | Add `coach` toast type |
| 4 | `App.tsx` | Trigger coach on app foreground |
| 5 | `TTSAnnouncementService.ts` | Add `announceCoachInsight()` |
| 6 | `ActivityTrackerScreen.tsx` | Hook personalized split coaching |

---

## Implementation Phases

### Phase 1: Foundation (This Design)
- Learning infrastructure (AILearningService, PatternRecognitionService)
- Ambient coach (toasts + TTS)
- Temporal and basic performance pattern detection

### Phase 2: Route Intelligence
- GPS coordinate clustering to detect frequent routes
- Problem zone detection (tunnels, urban canyons with GPS drift)
- Route-specific pace expectations

### Phase 3: Performance Calibration
- Warm-up detection and exclusion from "real" pace calculations
- Stride length estimation for better distance accuracy
- Fatigue/pacing pattern recognition

### Phase 4: Applied Intelligence
- GPS tracker uses route profiles for noise smoothing
- Smart defaults based on inferred preferences
- Predictive analytics ("You're on pace for a PR")

---

## Key Architecture Points

1. **All data stays local** - patterns in AsyncStorage, never sent externally
2. **LLM calls are rate-limited** - max 3 ambient messages/day to control costs
3. **Graceful fallback** - if LLM fails, no toast/TTS (silent failure)
4. **Non-blocking** - learning and coaching are async, never block workout save
5. **Privacy by default** - no disclosure needed because nothing leaves device

---

## Related Concepts (Future Brainstorming)

### Impact Level Feature Unlocks
Higher Impact Level (donation/contribution XP) could unlock:
- Better reward multipliers (1.5x, 2x sats)
- Exclusive challenges
- Custom achievement card themes
- Charity matching at high levels

### WOT (Web of Trust) Feature Unlocks
Higher WOT ranking could unlock:
- Post to Nostr (spam prevention)
- Social interactions (reactions, comments)
- Team leadership / event creation
- Profile verification badge

---

*The AI learns silently; users experience a smart app that celebrates their wins, knows their patterns, and coaches them with context. No chatbot, no "AI-generated" labels - just a fitness app that feels like it understands them.*
