# RUNSTR Pre-Launch Audit Report

**Date**: 2026-02-25

## Summary

- 🔴 Critical: 10
- 🟠 High: 51
- 🟡 Medium: 1135
- 🟢 Low: 4412
- **Total**: 5608

## 🔴 Critical Issues

### 1. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/App.tsx`:995
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 2. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/profile/tabs/PublicWorkoutsTab.tsx`:50
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 3. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/ui/NostrConnectionStatus.tsx`:32
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 4. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/hooks/useSeason2.ts`:244
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 5. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/CyclingTrackerScreen.tsx`:143
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 6. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/CyclingTrackerScreen.tsx`:364
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 7. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/HikingTrackerScreen.tsx`:110
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 8. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/RunningTrackerScreen.tsx`:193
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 9. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/RunningTrackerScreen.tsx`:424
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 10. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/WalkingTrackerScreen.tsx`:162
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

## 🟠 High Priority Issues

### 1. Error Handling: Async operations without error handling

- **File**: `src/screens/CompeteScreen.tsx`
- **Fix**: Add try-catch blocks around async operations or wrap component in ErrorBoundary

### 2. User Experience: Data fetching without loading indicator

- **File**: `src/screens/CompeteScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 3. User Experience: Data fetching without loading indicator

- **File**: `src/screens/ContactSupportScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 4. User Experience: Data fetching without loading indicator

- **File**: `src/screens/LeaderboardsScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 5. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/DietTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 6. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/ManualEntryScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 7. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/MeditationTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 8. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/StrengthTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 9. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/WaterTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 10. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/backup/RestoreService.ts`:112
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 11. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:31
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 12. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:38
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 13. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:45
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 14. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:213
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 15. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:280
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 16. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:413
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 17. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:484
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 18. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:576
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 19. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:625
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 20. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:634
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 21. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:635
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 22. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:636
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 23. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:638
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 24. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:660
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 25. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:662
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 26. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/JoinRequestService.ts`:126
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 27. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/NostrLeaderboardService.ts`:374
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 28. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:86
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 29. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:139
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 30. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:313
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 31. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:521
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 32. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:569
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 33. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:625
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 34. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:679
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 35. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/core/AppInitializationService.ts`:152
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 36. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/GlobalNDKService.ts`:13
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 37. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:428
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 38. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:496
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 39. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:104
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 40. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:169
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 41. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:483
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 42. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisRSVPService.ts`:105
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 43. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisRSVPService.ts`:132
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 44. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season2Service.ts`:56
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 45. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:120
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 46. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:121
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 47. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:174
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 48. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:175
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 49. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:228
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 50. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/team/TeamJoinRequestService.ts`:229
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 51. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/wot/WoTService.ts`:93
- **Fix**: Add limit, since, or until to prevent fetching too many events

## 🟡 Medium Priority Issues

<details>
<summary>Click to expand (1135 issues)</summary>

1. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
2. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
3. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
4. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
5. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
6. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
7. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
8. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
9. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
10. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
11. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
12. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
13. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
14. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
15. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
16. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
17. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
18. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
19. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ai/PPQAPIKeyModal.tsx`
20. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
21. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ai/PPQAPIKeyModal.tsx`
22. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
23. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
24. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/ai/PPQAPIKeyModal.tsx`
25. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/ai/PPQAPIKeyModal.tsx`
26. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
27. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
28. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
29. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
30. **UI Consistency**: Hardcoded color found: #3a3a3a - `src/components/ai/PPQAPIKeyModal.tsx`
31. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
32. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
33. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
34. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
35. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
36. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
37. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
38. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
39. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
40. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
41. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
42. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAccountSetupModal.tsx`
43. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ai/PPQAccountSetupModal.tsx`
44. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
45. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/ai/PPQAccountSetupModal.tsx`
46. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/ai/PPQAccountSetupModal.tsx`
47. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
48. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAccountSetupModal.tsx`
49. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
50. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAccountSetupModal.tsx`
51. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
52. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAccountSetupModal.tsx`
53. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
54. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
55. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
56. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
57. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
58. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
59. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
60. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
61. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
62. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/AchievementsCard.tsx`
63. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
64. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/AchievementsCard.tsx`
65. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
66. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
67. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
68. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
69. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
70. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
71. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
72. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
73. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
74. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
75. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
76. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
77. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
78. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
79. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleSection.tsx`
80. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleSection.tsx`
81. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleSection.tsx`
82. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleSection.tsx`
83. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/HealthSnapshotCard.tsx`
84. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
85. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
86. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/analytics/HealthSnapshotCard.tsx`
87. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/HealthSnapshotCard.tsx`
88. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/analytics/HealthSnapshotCard.tsx`
89. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/HealthSnapshotCard.tsx`
90. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
91. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
92. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
93. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
94. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
95. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
96. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
97. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
98. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
99. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
100. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/LevelCard.tsx`
101. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
102. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
103. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/analytics/LevelCard.tsx`
104. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/analytics/LevelCard.tsx`
105. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/LevelCard.tsx`
106. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
107. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
108. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
109. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
110. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
111. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
112. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
113. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
114. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
115. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/backup/ExportDataModal.tsx`
116. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/backup/ExportDataModal.tsx`
117. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
118. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
119. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
120. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ExportDataModal.tsx`
121. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
122. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
123. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ExportDataModal.tsx`
124. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ExportDataModal.tsx`
125. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
126. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
127. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
128. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
129. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
130. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/backup/ExportDataModal.tsx`
131. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/backup/ExportDataModal.tsx`
132. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ImportDataModal.tsx`
133. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
134. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
135. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
136. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
137. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
138. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
139. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
140. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
141. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
142. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
143. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
144. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
145. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
146. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
147. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
148. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
149. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/cards/WorkoutCardRenderer.tsx`
150. **UI Consistency**: Hardcoded color found: #fff - `src/components/cards/WorkoutCardRenderer.tsx`
151. **UI Consistency**: Hardcoded color found: #888 - `src/components/cards/WorkoutCardRenderer.tsx`
152. **UI Consistency**: Hardcoded color found: #FFFFFF - `src/components/club/ChallengeCard.tsx`
153. **UI Consistency**: Hardcoded color found: #111111 - `src/components/club/ClubEarningsCard.tsx`
154. **UI Consistency**: Hardcoded color found: #111111 - `src/components/competition/EventCreationModal.tsx`
155. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/competition/JoinRequestCard.tsx`
156. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
157. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
158. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
159. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/debug/ActivityDebugOverlay.tsx`
160. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/debug/ActivityDebugOverlay.tsx`
161. **UI Consistency**: Hardcoded color found: #FF5500 - `src/components/debug/ActivityDebugOverlay.tsx`
162. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/debug/ActivityDebugOverlay.tsx`
163. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
164. **UI Consistency**: Hardcoded color found: #000 - `src/components/debug/ActivityDebugOverlay.tsx`
165. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
166. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/ActivityDebugOverlay.tsx`
167. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
168. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
169. **UI Consistency**: Hardcoded color found: #eab308 - `src/components/debug/ActivityDebugOverlay.tsx`
170. **UI Consistency**: Hardcoded color found: #000 - `src/components/debug/ActivityDebugOverlay.tsx`
171. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/ActivityDebugOverlay.tsx`
172. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
173. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
174. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/ActivityDebugOverlay.tsx`
175. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
176. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/debug/ActivityDebugOverlay.tsx`
177. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
178. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
179. **UI Consistency**: Hardcoded color found: #FF5500 - `src/components/debug/StepDebugOverlay.tsx`
180. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/debug/StepDebugOverlay.tsx`
181. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
182. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/StepDebugOverlay.tsx`
183. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
184. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
185. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
186. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
187. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
188. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/StepDebugOverlay.tsx`
189. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/StepDebugOverlay.tsx`
190. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/StepDebugOverlay.tsx`
191. **UI Consistency**: Hardcoded color found: #000 - `src/components/discovery/EventCard.tsx`
192. **UI Consistency**: Hardcoded color found: #fff - `src/components/discovery/EventCard.tsx`
193. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
194. **UI Consistency**: Hardcoded color found: #000000 - `src/components/event/EventPaymentModal.tsx`
195. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
196. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
197. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
198. **UI Consistency**: Hardcoded color found: #fff - `src/components/event/EventRewardsModal.tsx`
199. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
200. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
201. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
202. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
203. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
204. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
205. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
206. **UI Consistency**: Hardcoded color found: #666666 - `src/components/events/DynamicEventCard.tsx`
207. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
208. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
209. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
210. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
211. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
212. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
213. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
214. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
215. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
216. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
217. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/JanuaryWalkingEventCard.tsx`
218. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/JanuaryWalkingEventCard.tsx`
219. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/JanuaryWalkingEventCard.tsx`
220. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/JanuaryWalkingEventCard.tsx`
221. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/LeaderboardEventCard.tsx`
222. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
223. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
224. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/RunningBitcoinEventCard.tsx`
225. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/RunningBitcoinEventCard.tsx`
226. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/RunningBitcoinEventCard.tsx`
227. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/RunningBitcoinEventCard.tsx`
228. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
229. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
230. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
231. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
232. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/events/RunstrEventCreationModal.tsx`
233. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
234. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
235. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
236. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/Season2EventCard.tsx`
237. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
238. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/EnergySelector.tsx`
239. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEditorModal.tsx`
240. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEntryCard.tsx`
241. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/MoodSelector.tsx`
242. **UI Consistency**: Hardcoded color found: #fff - `src/components/journal/VoiceRecordButton.tsx`
243. **UI Consistency**: Hardcoded color found: #0f0f0f - `src/components/lightning/NWCLightningButton.tsx`
244. **UI Consistency**: Hardcoded color found: #2ecc71 - `src/components/music/AddToPlaylistSheet.tsx`
245. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomPlaylistEditModal.tsx`
246. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomPlaylistEditModal.tsx`
247. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomTrackEditModal.tsx`
248. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomTrackEditModal.tsx`
249. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/CreatePlaylistModal.tsx`
250. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
251. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
252. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
253. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/PlaylistBrowser.tsx`
254. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
255. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
256. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
257. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/EarningsDisplay.tsx`
258. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/EarningsDisplay.tsx`
259. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/EarningsDisplay.tsx`
260. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/GroupedNotificationCard.tsx`
261. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
262. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/GroupedNotificationCard.tsx`
263. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
264. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
265. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
266. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/GroupedNotificationCard.tsx`
267. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
268. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/GroupedNotificationCard.tsx`
269. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
270. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/LiveIndicator.tsx`
271. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/LiveIndicator.tsx`
272. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/MiniLeaderboard.tsx`
273. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
274. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
275. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/MiniLeaderboard.tsx`
276. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
277. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
278. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
279. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/NotificationActions.tsx`
280. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
281. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
282. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationActions.tsx`
283. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/NotificationCard.tsx`
284. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
285. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
286. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
287. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
288. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
289. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/NotificationCard.tsx`
290. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/NotificationCard.tsx`
291. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
292. **UI Consistency**: Hardcoded color found: #999 - `src/components/notifications/NotificationCard.tsx`
293. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
294. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/CompactTeamCard.tsx`
295. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/CompactTeamCard.tsx`
296. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
297. **UI Consistency**: Hardcoded color found: #666666 - `src/components/profile/CompactTeamCard.tsx`
298. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
299. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
300. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
301. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
302. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
303. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/DebugAuthBanner.tsx`
304. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
305. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
306. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
307. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
308. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
309. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MonthlyStatsPanel.tsx`
310. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
311. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/MonthlyStatsPanel.tsx`
312. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
313. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/MonthlyStatsPanel.tsx`
314. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
315. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
316. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
317. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
318. **UI Consistency**: Hardcoded color found: #999999 - `src/components/profile/MonthlyStatsPanel.tsx`
319. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
320. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
321. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
322. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MyTeamsBox.tsx`
323. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MyTeamsBox.tsx`
324. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/NotificationBadge.tsx`
325. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/ProfileHeader.tsx`
326. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
327. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
328. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
329. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WalletSection.tsx`
330. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WalletSection.tsx`
331. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
332. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
333. **UI Consistency**: Hardcoded color found: #9ca3af - `src/components/profile/WatchSyncSection.tsx`
334. **UI Consistency**: Hardcoded color found: #1f1f1f - `src/components/profile/WatchSyncSection.tsx`
335. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
336. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
337. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
338. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/profile/WorkoutLevelRing.tsx`
339. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
340. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
341. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WorkoutLevelRing.tsx`
342. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
343. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
344. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
345. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
346. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
347. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
348. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/WorkoutLevelRing.tsx`
349. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
350. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
351. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
352. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
353. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
354. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
355. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
356. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/profile/WorkoutLevelRing.tsx`
357. **UI Consistency**: Hardcoded color found: #2a2010 - `src/components/profile/WorkoutLevelRing.tsx`
358. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
359. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/WorkoutStatsSheet.tsx`
360. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourCompetitionsBox.tsx`
361. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourCompetitionsBox.tsx`
362. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourWorkoutsBox.tsx`
363. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourWorkoutsBox.tsx`
364. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
365. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
366. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
367. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
368. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
369. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
370. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
371. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
372. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
373. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
374. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
375. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
376. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
377. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
378. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
379. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
380. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
381. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
382. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
383. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
384. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
385. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
386. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
387. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
388. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
389. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
390. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
391. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
392. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
393. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
394. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
395. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
396. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/shared/FullScreenCardModal.tsx`
397. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
398. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
399. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
400. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
401. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
402. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
403. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/FullScreenCardModal.tsx`
404. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
405. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
406. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
407. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
408. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/FullScreenCardModal.tsx`
409. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
410. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
411. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
412. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
413. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
414. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
415. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
416. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
417. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
418. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
419. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
420. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
421. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
422. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
423. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
424. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
425. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
426. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenVerticalCard.tsx`
427. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
428. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
429. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
430. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/MonthlyWorkoutGroup.tsx`
431. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/shared/SocialShareModal.tsx`
432. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/SyncDropdown.tsx`
433. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
434. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
435. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
436. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
437. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
438. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
439. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
440. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/AppleHealthTab.tsx`
441. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/AppleHealthTab.tsx`
442. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/HealthConnectTab.tsx`
443. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/HealthConnectTab.tsx`
444. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
445. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
446. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
447. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
448. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
449. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
450. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
451. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
452. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
453. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRDisplayModal.tsx`
454. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRDisplayModal.tsx`
455. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
456. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
457. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
458. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
459. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
460. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
461. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
462. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
463. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
464. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
465. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
466. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
467. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
468. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
469. **UI Consistency**: Hardcoded color found: #996633 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
470. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
471. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
472. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
473. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
474. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
475. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
476. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
477. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
478. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
479. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
480. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
481. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
482. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
483. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
484. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/EarningsHeroCard.tsx`
485. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
486. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
487. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
488. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
489. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
490. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/EarningsHeroCard.tsx`
491. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
492. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
493. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
494. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
495. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
496. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
497. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/GlobalBreakdownCard.tsx`
498. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/GlobalBreakdownCard.tsx`
499. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
500. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
501. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
502. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
503. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/GlobalBreakdownCard.tsx`
504. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
505. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
506. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
507. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
508. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
509. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/GlobalBreakdownCard.tsx`
510. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
511. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
512. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
513. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/ImpactHeroCard.tsx`
514. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
515. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
516. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
517. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
518. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
519. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/ImpactHeroCard.tsx`
520. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
521. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
522. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
523. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
524. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
525. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
526. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
527. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
528. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
529. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PendingPayoutsCard.tsx`
530. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
531. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
532. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
533. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
534. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
535. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/PendingPayoutsCard.tsx`
536. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PeriodSelector.tsx`
537. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PeriodSelector.tsx`
538. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/PeriodSelector.tsx`
539. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/PeriodSelector.tsx`
540. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
541. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
542. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/PersonalImpactSection.tsx`
543. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PersonalImpactSection.tsx`
544. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
545. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
546. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
547. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
548. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/PersonalImpactSection.tsx`
549. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
550. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
551. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
552. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/PersonalImpactSection.tsx`
553. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/rewards/PersonalImpactSection.tsx`
554. **UI Consistency**: Hardcoded color found: #2a2010 - `src/components/rewards/PersonalImpactSection.tsx`
555. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
556. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
557. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
558. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
559. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
560. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
561. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
562. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
563. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
564. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
565. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
566. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
567. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
568. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/RewardBreakdownCard.tsx`
569. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardBreakdownCard.tsx`
570. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
571. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
572. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
573. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
574. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
575. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardBreakdownCard.tsx`
576. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
577. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
578. **UI Consistency**: Hardcoded color found: #000000 - `src/components/rewards/RewardDestinationPicker.tsx`
579. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
580. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
581. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationPicker.tsx`
582. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationPicker.tsx`
583. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
584. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
585. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationPicker.tsx`
586. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
587. **UI Consistency**: Hardcoded color found: #333 - `src/components/rewards/RewardDestinationPicker.tsx`
588. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
589. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationSection.tsx`
590. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
591. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
592. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardDestinationSection.tsx`
593. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
594. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/rewards/RewardDestinationSection.tsx`
595. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/SponsorBanner.tsx`
596. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/SponsorBanner.tsx`
597. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
598. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
599. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
600. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
601. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
602. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
603. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
604. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
605. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
606. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
607. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
608. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
609. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
610. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
611. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
612. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
613. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
614. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
615. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
616. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/TransparencyDashboardModal.tsx`
617. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
618. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TransparencyDashboardModal.tsx`
619. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TransparencyDashboardModal.tsx`
620. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
621. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
622. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
623. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
624. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
625. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/satlantis/EventCreatorControls.tsx`
626. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/satlantis/EventCreatorControls.tsx`
627. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/satlantis/EventCreatorControls.tsx`
628. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/satlantis/EventJoinButton.tsx`
629. **UI Consistency**: Hardcoded color found: #111111 - `src/components/satlantis/SatlantisEventCard.tsx`
630. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/season2/Season2Banner.tsx`
631. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/season2/Season2Banner.tsx`
632. **UI Consistency**: Hardcoded color found: #f5a623 - `src/components/season2/Season2Banner.tsx`
633. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
634. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
635. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/AgentSkillSetupModal.tsx`
636. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
637. **UI Consistency**: Hardcoded color found: #333 - `src/components/settings/AgentSkillSetupModal.tsx`
638. **UI Consistency**: Hardcoded color found: #fff - `src/components/settings/AgentSkillSetupModal.tsx`
639. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/settings/AgentSkillSetupModal.tsx`
640. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
641. **UI Consistency**: Hardcoded color found: #fff - `src/components/settings/AgentSkillSetupModal.tsx`
642. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
643. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
644. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
645. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
646. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
647. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
648. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
649. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
650. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
651. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
652. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
653. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
654. **UI Consistency**: Hardcoded color found: #fff - `src/components/settings/AgentSkillSetupModal.tsx`
655. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
656. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
657. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/WearableConnectionModal.tsx`
658. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/WearableConnectionModal.tsx`
659. **UI Consistency**: Hardcoded color found: #FFFFFF - `src/components/settings/WearableConnectionModal.tsx`
660. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
661. **UI Consistency**: Hardcoded color found: #111111 - `src/components/settings/WearableConnectionModal.tsx`
662. **UI Consistency**: Hardcoded color found: #FFFFFF - `src/components/settings/WearableConnectionModal.tsx`
663. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
664. **UI Consistency**: Hardcoded color found: #000000 - `src/components/settings/WearableConnectionModal.tsx`
665. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
666. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/subscription/SimpleEventCreationModal.tsx`
667. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/subscription/SimpleEventCreationModal.tsx`
668. **UI Consistency**: Hardcoded color found: #111111 - `src/components/subscription/SimpleEventCreationModal.tsx`
669. **UI Consistency**: Hardcoded color found: #111111 - `src/components/subscription/SubscriptionInfoModal.tsx`
670. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/CharitySection.tsx`
671. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
672. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
673. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
674. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/team/DailyLeaderboardCard.tsx`
675. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
676. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
677. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
678. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/DailyLeaderboardCard.tsx`
679. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
680. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
681. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
682. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/SimpleLeagueDisplay.tsx`
683. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/SimpleLeagueDisplay.tsx`
684. **UI Consistency**: Hardcoded color found: #333 - `src/components/team/SimpleLeagueDisplay.tsx`
685. **UI Consistency**: Hardcoded color found: #999 - `src/components/team/SimpleLeagueDisplay.tsx`
686. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/TeamCard.tsx`
687. **UI Consistency**: Hardcoded color found: #333333 - `src/components/team/TeamCard.tsx`
688. **UI Consistency**: Hardcoded color found: #666666 - `src/components/team/TeamCard.tsx`
689. **UI Consistency**: Hardcoded color found: #666666 - `src/components/team/TeamCard.tsx`
690. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/ActionButton.tsx`
691. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/ActionButton.tsx`
692. **UI Consistency**: Hardcoded color found: #ccc - `src/components/ui/ActionButton.tsx`
693. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/BottomNavigation.tsx`
694. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/BottomNavigation.tsx`
695. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
696. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/BottomNavigation.tsx`
697. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
698. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
699. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
700. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
701. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/Card.tsx`
702. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/CharityZapIconButton.tsx`
703. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/CustomAlert.tsx`
704. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/DifficultyIndicator.tsx`
705. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/DifficultyIndicator.tsx`
706. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/DifficultyIndicator.tsx`
707. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/DropdownMenu.tsx`
708. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/DropdownMenu.tsx`
709. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/FilterChips.tsx`
710. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/MemberAvatar.tsx`
711. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
712. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
713. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
714. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
715. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
716. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
717. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/PrimaryButton.tsx`
718. **UI Consistency**: Hardcoded color found: #CCCCCC - `src/components/ui/PrimaryButton.tsx`
719. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
720. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
721. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
722. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
723. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
724. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/PrivacyNoticeModal.tsx`
725. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
726. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
727. **UI Consistency**: Hardcoded color found: #111111 - `src/components/ui/PrivacyNoticeModal.tsx`
728. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
729. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
730. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
731. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
732. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/PrivacyNoticeModal.tsx`
733. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
734. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
735. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/SettingsAccordion.tsx`
736. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
737. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
738. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
739. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/SettingsAccordion.tsx`
740. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
741. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
742. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
743. **UI Consistency**: Hardcoded color found: #FFFFFF - `src/components/ui/SplashScreen.tsx`
744. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
745. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
746. **UI Consistency**: Hardcoded color found: #333333 - `src/components/ui/SplashScreen.tsx`
747. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/StatCard.tsx`
748. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/StatCard.tsx`
749. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
750. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
751. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/StatCard.tsx`
752. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/StatCard.tsx`
753. **UI Consistency**: Hardcoded color found: #0d0d0d - `src/components/ui/TexturedBackground.tsx`
754. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
755. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
756. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
757. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
758. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
759. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/toastConfig.tsx`
760. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/toastConfig.tsx`
761. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
762. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
763. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
764. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/ui/toastConfig.tsx`
765. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
766. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/ui/toastConfig.tsx`
767. **UI Consistency**: Hardcoded color found: #888888 - `src/components/ui/toastConfig.tsx`
768. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
769. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
770. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/AutoWithdrawSection.tsx`
771. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
772. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
773. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
774. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
775. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
776. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
777. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
778. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
779. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
780. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
781. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
782. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
783. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
784. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
785. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
786. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSWalletModal.tsx`
787. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSWalletModal.tsx`
788. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSWalletModal.tsx`
789. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSWalletModal.tsx`
790. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/wallet/CoinOSWalletModal.tsx`
791. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSWalletModal.tsx`
792. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSWalletModal.tsx`
793. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSWalletModal.tsx`
794. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSWalletModal.tsx`
795. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
796. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
797. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSWalletModal.tsx`
798. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
799. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSWalletModal.tsx`
800. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
801. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSWalletModal.tsx`
802. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
803. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSWalletModal.tsx`
804. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSWalletModal.tsx`
805. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/CoinOSWalletModal.tsx`
806. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSWalletModal.tsx`
807. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
808. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
809. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
810. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/HistoryModal.tsx`
811. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
812. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
813. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
814. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
815. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
816. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
817. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
818. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
819. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
820. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/LightningAddressSetupModal.tsx`
821. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
822. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
823. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
824. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
825. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
826. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/NWCQRConfirmationModal.tsx`
827. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
828. **UI Consistency**: Hardcoded color found: #1a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
829. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
830. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
831. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
832. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
833. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
834. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
835. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
836. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
837. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/SendModal.tsx`
838. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletActivityList.tsx`
839. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
840. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
841. **UI Consistency**: Hardcoded color found: #fff - `src/components/wallet/WalletBalanceCard.tsx`
842. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletBalanceCard.tsx`
843. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletConnectionError.tsx`
844. **Error Handling**: AsyncStorage operation without try-catch - `src/components/activity/WorkoutSummaryModal.tsx`
845. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubChatSection.tsx`
846. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubEventsSection.tsx`
847. **Error Handling**: AsyncStorage operation without try-catch - `src/components/compete/LeaderboardsContent.tsx`
848. **Error Handling**: AsyncStorage operation without try-catch - `src/components/subscription/SubscriptionInfoModal.tsx`
849. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
850. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
851. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
852. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
853. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useJanuaryWalking.ts`
854. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useRunningBitcoin.ts`
855. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSeason2.ts`
856. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
857. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
858. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
859. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useUnitPreference.ts`
860. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ClubChatScreen.tsx`
861. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/CompeteScreen.tsx`
862. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ContactSupportScreen.tsx`
863. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/EventDetailScreen.tsx`
864. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/EventDetailScreen.tsx`
865. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/EventDetailScreen.tsx`
866. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/HealthProfileScreen.tsx`
867. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ProfileScreen.tsx`
868. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
869. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
870. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/SettingsScreen.tsx`
871. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/SettingsScreen.tsx`
872. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
873. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
874. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
875. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
876. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
877. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
878. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
879. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
880. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
881. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/EinundzwanzigDetailScreen.tsx`
882. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
883. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
884. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
885. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
886. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
887. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
888. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
889. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
890. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTracker.ts`
891. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTrackerTask.ts`
892. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
893. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
894. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
895. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
896. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
897. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
898. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
899. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
900. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
901. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
902. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
903. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
904. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
905. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
906. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
907. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
908. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
909. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
910. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
911. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
912. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
913. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
914. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
915. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
916. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
917. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
918. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
919. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
920. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
921. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
922. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
923. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
924. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
925. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
926. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
927. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
928. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
929. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
930. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
931. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
932. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
933. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
934. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
935. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
936. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
937. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
938. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
939. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
940. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
941. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
942. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
943. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
944. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
945. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
946. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/ClubChatService.ts`
947. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
948. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
949. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
950. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/AutoBackupService.ts`
951. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
952. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
953. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
954. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
955. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
956. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
957. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
958. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
959. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
960. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
961. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
962. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
963. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/EinundzwanzigService.ts`
964. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/RunningBitcoinService.ts`
965. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/RunningBitcoinService.ts`
966. **Error Handling**: AsyncStorage operation without try-catch - `src/services/club/ClubChatAutoShare.ts`
967. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/AutoJoinService.ts`
968. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/DailyLeaderboardService.ts`
969. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
970. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
971. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
972. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
973. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
974. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
975. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
976. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
977. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
978. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
979. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
980. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
981. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
982. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
983. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
984. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
985. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
986. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
987. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
988. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
989. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
990. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
991. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
992. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
993. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
994. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
995. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
996. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
997. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
998. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
999. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
1000. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
1001. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
1002. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/WorkoutEventStore.ts`
1003. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1004. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1005. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1006. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1007. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1008. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1009. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1010. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
1011. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
1012. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
1013. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
1014. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
1015. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
1016. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
1017. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
1018. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
1019. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
1020. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutSyncService.ts`
1021. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
1022. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
1023. **Error Handling**: AsyncStorage operation without try-catch - `src/services/habits/HabitTrackerService.ts`
1024. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
1025. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
1026. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
1027. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
1028. **Error Handling**: AsyncStorage operation without try-catch - `src/services/integrations/NostrCompetitionContextService.ts`
1029. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
1030. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
1031. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
1032. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
1033. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/NostrTeamCreationService.ts`
1034. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1035. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1036. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1037. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1038. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1039. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
1040. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
1041. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
1042. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
1043. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/ExpoNotificationProvider.ts`
1044. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
1045. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
1046. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
1047. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
1048. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
1049. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
1050. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
1051. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
1052. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
1053. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
1054. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
1055. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
1056. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
1057. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
1058. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
1059. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
1060. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season2Service.ts`
1061. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
1062. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
1063. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamStorageService.ts`
1064. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamStorageService.ts`
1065. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/NdkTeamService.ts`
1066. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1067. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1068. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1069. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1070. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1071. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
1072. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
1073. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
1074. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
1075. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1076. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1077. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1078. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
1079. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
1080. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1081. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1082. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1083. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1084. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1085. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1086. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1087. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1088. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1089. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1090. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1091. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/cache.ts`
1092. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/captainCache.ts`
1093. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/networkUtils.ts`
1094. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
1095. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
1096. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1097. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1098. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1099. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1100. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1101. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1102. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1103. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1104. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1105. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1106. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1107. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1108. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1109. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1110. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1111. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1112. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1113. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1114. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1115. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1116. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1117. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/testCaptainFlow.ts`
1118. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/walletRecovery.ts`
1119. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/walletRecovery.ts`
1120. **User Experience**: List without empty state message - `src/screens/ContactSupportScreen.tsx`
1121. **User Experience**: List without empty state message - `src/screens/DonateScreen.tsx`
1122. **User Experience**: List without empty state message - `src/screens/HealthProfileScreen.tsx`
1123. **User Experience**: List without empty state message - `src/screens/HelpSupportScreen.tsx`
1124. **User Experience**: List without empty state message - `src/screens/LeaderboardsScreen.tsx`
1125. **User Experience**: List without empty state message - `src/screens/PrivacyPolicyScreen.tsx`
1126. **User Experience**: List without empty state message - `src/screens/ProfileEditScreen.tsx`
1127. **User Experience**: List without empty state message - `src/screens/ProfileScreen.tsx`
1128. **User Experience**: List without empty state message - `src/screens/RewardsScreen.tsx`
1129. **User Experience**: List without empty state message - `src/screens/TeamScreen.tsx`
1130. **User Experience**: List without empty state message - `src/screens/WalletScreen.tsx`
1131. **User Experience**: List without empty state message - `src/screens/activity/DietTrackerScreen.tsx`
1132. **User Experience**: List without empty state message - `src/screens/activity/ManualEntryScreen.tsx`
1133. **User Experience**: List without empty state message - `src/screens/activity/ManualWorkoutScreen.tsx`
1134. **User Experience**: List without empty state message - `src/screens/activity/RunningTrackerScreen.tsx`
1135. **User Experience**: List without empty state message - `src/screens/activity/WaterTrackerScreen.tsx`

</details>

## 🟢 Low Priority Issues

<details>
<summary>Click to expand (4412 issues)</summary>

1. **Production Readiness**: Console.log statement found - `src/App.tsx`
2. **Production Readiness**: Console.log statement found - `src/App.tsx`
3. **Production Readiness**: Console.log statement found - `src/App.tsx`
4. **Production Readiness**: Console.log statement found - `src/App.tsx`
5. **Production Readiness**: Console.log statement found - `src/App.tsx`
6. **Production Readiness**: Console.log statement found - `src/App.tsx`
7. **Production Readiness**: Console.log statement found - `src/App.tsx`
8. **Production Readiness**: Console.log statement found - `src/App.tsx`
9. **Production Readiness**: Console.log statement found - `src/App.tsx`
10. **Production Readiness**: Console.log statement found - `src/App.tsx`
11. **Production Readiness**: Console.log statement found - `src/App.tsx`
12. **Production Readiness**: Console.log statement found - `src/App.tsx`
13. **Production Readiness**: Console.log statement found - `src/App.tsx`
14. **Production Readiness**: Console.log statement found - `src/App.tsx`
15. **Production Readiness**: Console.log statement found - `src/App.tsx`
16. **Production Readiness**: Console.log statement found - `src/App.tsx`
17. **Production Readiness**: Console.log statement found - `src/App.tsx`
18. **Production Readiness**: Console.log statement found - `src/App.tsx`
19. **Production Readiness**: Console.log statement found - `src/App.tsx`
20. **Production Readiness**: Console.log statement found - `src/App.tsx`
21. **Production Readiness**: Console.log statement found - `src/App.tsx`
22. **Production Readiness**: Console.log statement found - `src/App.tsx`
23. **Production Readiness**: Console.log statement found - `src/App.tsx`
24. **Production Readiness**: Console.log statement found - `src/App.tsx`
25. **Production Readiness**: Console.log statement found - `src/App.tsx`
26. **Production Readiness**: Console.log statement found - `src/App.tsx`
27. **Production Readiness**: Console.log statement found - `src/App.tsx`
28. **Production Readiness**: Console.log statement found - `src/App.tsx`
29. **Production Readiness**: Console.log statement found - `src/App.tsx`
30. **Production Readiness**: Console.log statement found - `src/App.tsx`
31. **Production Readiness**: Console.log statement found - `src/App.tsx`
32. **Production Readiness**: Console.log statement found - `src/App.tsx`
33. **Production Readiness**: Console.log statement found - `src/App.tsx`
34. **Production Readiness**: Console.log statement found - `src/App.tsx`
35. **Production Readiness**: Console.log statement found - `src/App.tsx`
36. **Production Readiness**: Console.log statement found - `src/App.tsx`
37. **Production Readiness**: Console.log statement found - `src/App.tsx`
38. **Production Readiness**: Console.log statement found - `src/App.tsx`
39. **Production Readiness**: Console.log statement found - `src/App.tsx`
40. **Production Readiness**: Console.log statement found - `src/App.tsx`
41. **Production Readiness**: Console.log statement found - `src/App.tsx`
42. **Production Readiness**: Console.log statement found - `src/App.tsx`
43. **Production Readiness**: Console.log statement found - `src/App.tsx`
44. **Production Readiness**: Console.log statement found - `src/App.tsx`
45. **Production Readiness**: Console.log statement found - `src/App.tsx`
46. **Production Readiness**: Console.log statement found - `src/App.tsx`
47. **Production Readiness**: Console.log statement found - `src/App.tsx`
48. **Production Readiness**: Console.log statement found - `src/App.tsx`
49. **Production Readiness**: Console.log statement found - `src/App.tsx`
50. **Production Readiness**: Console.log statement found - `src/App.tsx`
51. **Production Readiness**: Console.log statement found - `src/App.tsx`
52. **Production Readiness**: Console.log statement found - `src/App.tsx`
53. **Production Readiness**: Console.log statement found - `src/App.tsx`
54. **Production Readiness**: Console.log statement found - `src/App.tsx`
55. **Production Readiness**: Console.log statement found - `src/App.tsx`
56. **Production Readiness**: Console.log statement found - `src/App.tsx`
57. **Production Readiness**: Console.log statement found - `src/App.tsx`
58. **Production Readiness**: Console.log statement found - `src/App.tsx`
59. **Production Readiness**: Console.log statement found - `src/App.tsx`
60. **Production Readiness**: Console.log statement found - `src/App.tsx`
61. **Production Readiness**: Console.log statement found - `src/App.tsx`
62. **Production Readiness**: Console.log statement found - `src/App.tsx`
63. **Production Readiness**: Console.log statement found - `src/App.tsx`
64. **Production Readiness**: Console.log statement found - `src/App.tsx`
65. **Production Readiness**: Console.log statement found - `src/App.tsx`
66. **Production Readiness**: Console.log statement found - `src/App.tsx`
67. **Production Readiness**: Console.log statement found - `src/App.tsx`
68. **Production Readiness**: Console.log statement found - `src/App.tsx`
69. **Production Readiness**: Console.log statement found - `src/App.tsx`
70. **Production Readiness**: Console.log statement found - `src/App.tsx`
71. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
72. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
73. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
74. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
75. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
76. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
77. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
78. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
79. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
80. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
81. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
82. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
83. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
84. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
85. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
86. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
87. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
88. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
89. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
90. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
91. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
92. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
93. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
94. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
95. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
96. **Production Readiness**: Console.log statement found - `src/components/cards/WorkoutCardRenderer.tsx`
97. **Production Readiness**: Console.log statement found - `src/components/club/ClubLeaderboardSection.tsx`
98. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
99. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
100. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
101. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
102. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
103. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
104. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
105. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
106. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
107. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
108. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
109. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
110. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
111. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
112. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
113. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
114. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
115. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
116. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
117. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
118. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
119. **Production Readiness**: Console.log statement found - `src/components/journal/VoiceRecordButton.tsx`
120. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
121. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
122. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
123. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
124. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
125. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
126. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
127. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
128. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
129. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
130. **Production Readiness**: Console.log statement found - `src/components/music/AddToPlaylistSheet.tsx`
131. **Production Readiness**: Console.log statement found - `src/components/music/CreatePlaylistModal.tsx`
132. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
133. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
134. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
135. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
136. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
137. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
138. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
139. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
140. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
141. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
142. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
143. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
144. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
145. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
146. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
147. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
148. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
149. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
150. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
151. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
152. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
153. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
154. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
155. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
156. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
157. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
158. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
159. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
160. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
161. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
162. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
163. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
164. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
165. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
166. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
167. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
168. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
169. **Production Readiness**: Console.log statement found - `src/components/permissions/GPSPermissionsDiagnostics.tsx`
170. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
171. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
172. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
173. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
174. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
175. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
176. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
177. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
178. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
179. **Production Readiness**: Console.log statement found - `src/components/profile/ProfileHeader.tsx`
180. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
181. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
182. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
183. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
184. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
185. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
186. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
187. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
188. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
189. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
190. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
191. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
192. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
193. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
194. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
195. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
196. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
197. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
198. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
199. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
200. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
201. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
202. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
203. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
204. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
205. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
206. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
207. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
208. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
209. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
210. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
211. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
212. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
213. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
214. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
215. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
216. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
217. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
218. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
219. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
220. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
221. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
222. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
223. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
224. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
225. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
226. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
227. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
228. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
229. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
230. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
231. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
232. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
233. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
234. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
235. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
236. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
237. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
238. **Production Readiness**: Console.log statement found - `src/components/rewards/RewardDestinationPicker.tsx`
239. **Production Readiness**: Console.log statement found - `src/components/rewards/RewardDestinationPicker.tsx`
240. **Production Readiness**: Console.log statement found - `src/components/routes/RouteSelectionModal.tsx`
241. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventCreatorControls.tsx`
242. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
243. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
244. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
245. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
246. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
247. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
248. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
249. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
250. **Production Readiness**: Console.log statement found - `src/components/satlantis/SatlantisEventCard.tsx`
251. **Production Readiness**: Console.log statement found - `src/components/satlantis/SatlantisEventCard.tsx`
252. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
253. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
254. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
255. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleEventCreationModal.tsx`
256. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleTeamCreationModal.tsx`
257. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleTeamCreationModal.tsx`
258. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
259. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
260. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
261. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
262. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
263. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
264. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
265. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
266. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
267. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
268. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
269. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
270. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardCard.tsx`
271. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
272. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
273. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
274. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
275. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
276. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
277. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
278. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
279. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
280. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
281. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
282. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
283. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
284. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
285. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
286. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
287. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
288. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
289. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
290. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
291. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
292. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
293. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
294. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
295. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
296. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
297. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
298. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
299. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
300. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
301. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
302. **Production Readiness**: Console.log statement found - `src/components/wallet/CoinOSWalletModal.tsx`
303. **Production Readiness**: Console.log statement found - `src/components/wallet/CoinOSWalletModal.tsx`
304. **Production Readiness**: Console.log statement found - `src/components/wallet/ReceiveModal.tsx`
305. **Production Readiness**: Console.log statement found - `src/components/wallet/WalletConfigModal.tsx`
306. **Production Readiness**: Console.log statement found - `src/constants/season2.ts`
307. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
308. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
309. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
310. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
311. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
312. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
313. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
314. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
315. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
316. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
317. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
318. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
319. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
320. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
321. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
322. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
323. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
324. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
325. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
326. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
327. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
328. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
329. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
330. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
331. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
332. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
333. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
334. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
335. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
336. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
337. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
338. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
339. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
340. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
341. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
342. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
343. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
344. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
345. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
346. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
347. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
348. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
349. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
350. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
351. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
352. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
353. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
354. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
355. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
356. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
357. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
358. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
359. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
360. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
361. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
362. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
363. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
364. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
365. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
366. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
367. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
368. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
369. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
370. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
371. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
372. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
373. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
374. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
375. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
376. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
377. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
378. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
379. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
380. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
381. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
382. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
383. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
384. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
385. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
386. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
387. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
388. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
389. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
390. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
391. **Production Readiness**: Console.log statement found - `src/hooks/useJanuaryWalking.ts`
392. **Production Readiness**: Console.log statement found - `src/hooks/useJanuaryWalking.ts`
393. **Production Readiness**: Console.log statement found - `src/hooks/useJanuaryWalking.ts`
394. **Production Readiness**: Console.log statement found - `src/hooks/useJanuaryWalking.ts`
395. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
396. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
397. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
398. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
399. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
400. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
401. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
402. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
403. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
404. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
405. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
406. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
407. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
408. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
409. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
410. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
411. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
412. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
413. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
414. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
415. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
416. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
417. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
418. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
419. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
420. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
421. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
422. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
423. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
424. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
425. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
426. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
427. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
428. **Production Readiness**: Console.log statement found - `src/hooks/useRunningBitcoin.ts`
429. **Production Readiness**: Console.log statement found - `src/hooks/useRunningBitcoin.ts`
430. **Production Readiness**: Console.log statement found - `src/hooks/useRunningBitcoin.ts`
431. **Production Readiness**: Console.log statement found - `src/hooks/useRunningBitcoin.ts`
432. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
433. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
434. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
435. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
436. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
437. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
438. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
439. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
440. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
441. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
442. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
443. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
444. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
445. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
446. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
447. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
448. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
449. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
450. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
451. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
452. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
453. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
454. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
455. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
456. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
457. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
458. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
459. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
460. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
461. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
462. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
463. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
464. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
465. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
466. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
467. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
468. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
469. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
470. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
471. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
472. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
473. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
474. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
475. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
476. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
477. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
478. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
479. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
480. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
481. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
482. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
483. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
484. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
485. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
486. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
487. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
488. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
489. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
490. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
491. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
492. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
493. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
494. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
495. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
496. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
497. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
498. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
499. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
500. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
501. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
502. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
503. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
504. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
505. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
506. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
507. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
508. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
509. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
510. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
511. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
512. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
513. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
514. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
515. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
516. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
517. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
518. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
519. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
520. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
521. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
522. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
523. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
524. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
525. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
526. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
527. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
528. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
529. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
530. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
531. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
532. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
533. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
534. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
535. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
536. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
537. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
538. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
539. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
540. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
541. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
542. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
543. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
544. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
545. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
546. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
547. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
548. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
549. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
550. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
551. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
552. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
553. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
554. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
555. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
556. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
557. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
558. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
559. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
560. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
561. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
562. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
563. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
564. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
565. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
566. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
567. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
568. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
569. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
570. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
571. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
572. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
573. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
574. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
575. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
576. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
577. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
578. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
579. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
580. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
581. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
582. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
583. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
584. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
585. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
586. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
587. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
588. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
589. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
590. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
591. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
592. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
593. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
594. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
595. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
596. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
597. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
598. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
599. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
600. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
601. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
602. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
603. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
604. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
605. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
606. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
607. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
608. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
609. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
610. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
611. **Production Readiness**: Console.log statement found - `src/navigation/navigationRef.ts`
612. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
613. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
614. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
615. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
616. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
617. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
618. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
619. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
620. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
621. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
622. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
623. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
624. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
625. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
626. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
627. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
628. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
629. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
630. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
631. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
632. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
633. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
634. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
635. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
636. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
637. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
638. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
639. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
640. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
641. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
642. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
643. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
644. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
645. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
646. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
647. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
648. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
649. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
650. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
651. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
652. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
653. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
654. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
655. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
656. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
657. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
658. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
659. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
660. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
661. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
662. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
663. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
664. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
665. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
666. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
667. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
668. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
669. **Production Readiness**: Console.log statement found - `src/screens/ClubPageScreen.tsx`
670. **Production Readiness**: Console.log statement found - `src/screens/ClubsScreen.tsx`
671. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
672. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
673. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
674. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
675. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
676. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
677. **Production Readiness**: Console.log statement found - `src/screens/ContactSupportScreen.tsx`
678. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
679. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
680. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
681. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
682. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
683. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
684. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
685. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
686. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
687. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
688. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
689. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
690. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
691. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
692. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
693. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
694. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
695. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
696. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
697. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
698. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
699. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
700. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
701. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
702. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
703. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
704. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
705. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
706. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
707. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
708. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
709. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
710. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
711. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
712. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
713. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
714. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
715. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
716. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
717. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
718. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
719. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
720. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
721. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
722. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
723. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
724. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
725. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
726. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
727. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
728. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
729. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
730. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
731. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
732. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
733. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
734. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
735. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
736. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
737. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
738. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
739. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
740. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
741. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
742. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
743. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
744. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
745. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
746. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
747. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
748. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
749. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
750. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
751. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
752. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
753. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
754. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
755. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
756. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
757. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
758. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
759. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
760. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
761. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
762. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
763. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
764. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
765. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
766. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
767. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
768. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
769. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
770. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
771. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
772. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
773. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
774. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
775. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
776. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
777. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
778. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
779. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
780. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
781. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
782. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
783. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
784. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
785. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
786. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
787. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
788. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
789. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
790. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
791. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
792. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
793. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
794. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
795. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
796. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
797. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
798. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
799. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
800. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
801. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
802. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
803. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
804. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
805. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
806. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
807. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
808. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
809. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
810. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
811. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
812. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
813. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
814. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
815. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
816. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
817. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
818. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
819. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
820. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
821. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
822. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
823. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
824. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
825. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
826. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
827. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
828. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
829. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
830. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
831. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
832. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
833. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
834. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
835. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
836. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
837. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
838. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
839. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
840. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
841. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
842. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
843. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
844. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
845. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
846. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
847. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
848. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
849. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
850. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
851. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
852. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
853. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
854. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
855. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
856. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
857. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
858. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
859. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
860. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
861. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
862. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
863. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
864. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
865. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
866. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
867. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
868. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
869. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
870. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
871. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
872. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
873. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
874. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
875. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
876. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
877. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
878. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
879. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualWorkoutScreen.tsx`
880. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
881. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
882. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
883. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
884. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
885. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
886. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
887. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
888. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
889. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
890. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
891. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
892. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
893. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
894. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
895. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
896. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
897. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
898. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
899. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
900. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
901. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
902. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
903. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
904. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
905. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
906. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
907. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
908. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
909. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
910. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
911. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
912. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
913. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
914. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
915. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
916. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
917. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
918. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
919. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
920. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
921. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
922. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
923. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
924. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
925. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
926. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
927. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
928. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
929. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
930. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
931. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
932. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
933. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
934. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
935. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
936. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
937. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
938. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
939. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
940. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
941. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
942. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
943. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
944. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
945. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
946. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
947. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
948. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
949. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
950. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
951. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
952. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
953. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
954. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
955. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
956. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
957. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
958. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
959. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
960. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
961. **Production Readiness**: Console.log statement found - `src/screens/events/EinundzwanzigDetailScreen.tsx`
962. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
963. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
964. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
965. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisDiscoveryScreen.tsx`
966. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
967. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
968. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
969. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
970. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
971. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
972. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
973. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
974. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
975. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
976. **Production Readiness**: Console.log statement found - `src/services/activity/AutoCompetePreferencesService.ts`
977. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
978. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
979. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
980. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
981. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
982. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
983. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
984. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
985. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
986. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
987. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
988. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
989. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
990. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
991. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
992. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
993. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
994. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
995. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
996. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
997. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
998. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
999. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1000. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1001. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1002. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1003. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1004. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1005. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1006. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1007. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1008. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1009. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1010. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1011. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1012. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1013. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1014. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
1015. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
1016. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
1017. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
1018. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
1019. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
1020. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
1021. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
1022. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1023. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1024. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1025. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1026. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1027. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1028. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1029. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1030. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1031. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1032. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1033. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1034. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1035. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1036. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1037. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1038. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1039. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1040. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
1041. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1042. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1043. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1044. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1045. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1046. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1047. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1048. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1049. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1050. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1051. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1052. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1053. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1054. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1055. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1056. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1057. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
1058. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1059. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1060. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1061. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1062. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1063. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1064. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1065. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1066. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1067. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1068. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1069. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1070. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1071. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1072. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1073. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1074. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1075. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1076. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1077. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1078. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1079. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1080. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1081. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1082. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1083. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1084. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1085. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1086. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1087. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1088. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1089. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1090. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1091. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1092. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1093. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1094. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1095. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1096. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1097. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1098. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1099. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1100. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1101. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1102. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1103. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1104. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1105. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1106. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1107. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1108. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1109. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1110. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1111. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1112. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1113. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1114. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1115. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1116. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1117. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1118. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1119. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1120. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1121. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1122. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1123. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1124. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1125. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1126. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1127. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1128. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1129. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1130. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1131. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
1132. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1133. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1134. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1135. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1136. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1137. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1138. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1139. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1140. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1141. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1142. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1143. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1144. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1145. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
1146. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
1147. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
1148. **Production Readiness**: Console.log statement found - `src/services/activity/StepDiagnosticsService.ts`
1149. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1150. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1151. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1152. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1153. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1154. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1155. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1156. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1157. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1158. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1159. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1160. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1161. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
1162. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
1163. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
1164. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
1165. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
1166. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
1167. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
1168. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
1169. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
1170. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
1171. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
1172. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1173. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1174. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1175. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1176. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1177. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1178. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1179. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
1180. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1181. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1182. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1183. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1184. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1185. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
1186. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1187. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1188. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1189. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1190. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1191. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1192. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1193. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1194. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1195. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1196. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
1197. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
1198. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
1199. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
1200. **Production Readiness**: Console.log statement found - `src/services/anticheat/AntiCheatRequestService.ts`
1201. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1202. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1203. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1204. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1205. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1206. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1207. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1208. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1209. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1210. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1211. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1212. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1213. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1214. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1215. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1216. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1217. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1218. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1219. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1220. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1221. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1222. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1223. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1224. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1225. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1226. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1227. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1228. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1229. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1230. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1231. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1232. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1233. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1234. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1235. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1236. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1237. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1238. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1239. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1240. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1241. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1242. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1243. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1244. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1245. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1246. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1247. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1248. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1249. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1250. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1251. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1252. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1253. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1254. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1255. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1256. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1257. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1258. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1259. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1260. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1261. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1262. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1263. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1264. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1265. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1266. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1267. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1268. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1269. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1270. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1271. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1272. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1273. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1274. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1275. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1276. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1277. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1278. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1279. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1280. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1281. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1282. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1283. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1284. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1285. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1286. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1287. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1288. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1289. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1290. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1291. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1292. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1293. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1294. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1295. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1296. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1297. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1298. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1299. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1300. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1301. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1302. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1303. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1304. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1305. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1306. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1307. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1308. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1309. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1310. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1311. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1312. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1313. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1314. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1315. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1316. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1317. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1318. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1319. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1320. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1321. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1322. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1323. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1324. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1325. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1326. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1327. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1328. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1329. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1330. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1331. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1332. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1333. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1334. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1335. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1336. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1337. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1338. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1339. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1340. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1341. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1342. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1343. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1344. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1345. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1346. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1347. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1348. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1349. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1350. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1351. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1352. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1353. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1354. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1355. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1356. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1357. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1358. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1359. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1360. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1361. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1362. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1363. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1364. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1365. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1366. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1367. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1368. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1369. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1370. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1371. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1372. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1373. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1374. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1375. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1376. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1377. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1378. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1379. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1380. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1381. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1382. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1383. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1384. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1385. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1386. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1387. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1388. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1389. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1390. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1391. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1392. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1393. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1394. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1395. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1396. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1397. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1398. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1399. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1400. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1401. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1402. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1403. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1404. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1405. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1406. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1407. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1408. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1409. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1410. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1411. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1412. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1413. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1414. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1415. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1416. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1417. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1418. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1419. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1420. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1421. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1422. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1423. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1424. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1425. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1426. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1427. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1428. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1429. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1430. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1431. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1432. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1433. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1434. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1435. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1436. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1437. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1438. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1439. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1440. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1441. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1442. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1443. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1444. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1445. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1446. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1447. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1448. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1449. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1450. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1451. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1452. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1453. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1454. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1455. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1456. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1457. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1458. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1459. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1460. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1461. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1462. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1463. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1464. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1465. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1466. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1467. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1468. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1469. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1470. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1471. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1472. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1473. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1474. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1475. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1476. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1477. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1478. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1479. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1480. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1481. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1482. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1483. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1484. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1485. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1486. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1487. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1488. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1489. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1490. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1491. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1492. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1493. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1494. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1495. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1496. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1497. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1498. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1499. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1500. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1501. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1502. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1503. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1504. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1505. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1506. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1507. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1508. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1509. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1510. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1511. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1512. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1513. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1514. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1515. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1516. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1517. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1518. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1519. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1520. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1521. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1522. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1523. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1524. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1525. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1526. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1527. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1528. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1529. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1530. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1531. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1532. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1533. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1534. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1535. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1536. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1537. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1538. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1539. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1540. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1541. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1542. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1543. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1544. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1545. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1546. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1547. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1548. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1549. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1550. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1551. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1552. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1553. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1554. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1555. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1556. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1557. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1558. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1559. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1560. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1561. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1562. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1563. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1564. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1565. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1566. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1567. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1568. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1569. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1570. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1571. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1572. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1573. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1574. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1575. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1576. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1577. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1578. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1579. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
1580. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1581. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1582. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1583. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1584. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1585. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1586. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1587. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1588. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1589. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1590. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
1591. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1592. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1593. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1594. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1595. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1596. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1597. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1598. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1599. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1600. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1601. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1602. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1603. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1604. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1605. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1606. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1607. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1608. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1609. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1610. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1611. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1612. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1613. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1614. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1615. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1616. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1617. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1618. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1619. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1620. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1621. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1622. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1623. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1624. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1625. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1626. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1627. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1628. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1629. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1630. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1631. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1632. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1633. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1634. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1635. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1636. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1637. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1638. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1639. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1640. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1641. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1642. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1643. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1644. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1645. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1646. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1647. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1648. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1649. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1650. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1651. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1652. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1653. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1654. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1655. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1656. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1657. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1658. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1659. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1660. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1661. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1662. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1663. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1664. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1665. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1666. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1667. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1668. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1669. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1670. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1671. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1672. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1673. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1674. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1675. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1676. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1677. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1678. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1679. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1680. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1681. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1682. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1683. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1684. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1685. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1686. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1687. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1688. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1689. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1690. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1691. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1692. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1693. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1694. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1695. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1696. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1697. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1698. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1699. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1700. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1701. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1702. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1703. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1704. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1705. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1706. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1707. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1708. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1709. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1710. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1711. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1712. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1713. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1714. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1715. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1716. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1717. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1718. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1719. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1720. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1721. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1722. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1723. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1724. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1725. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1726. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1727. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1728. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1729. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1730. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1731. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1732. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1733. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1734. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1735. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1736. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1737. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1738. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1739. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1740. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1741. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1742. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1743. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1744. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1745. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1746. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1747. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1748. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1749. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1750. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1751. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1752. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1753. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1754. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1755. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1756. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1757. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1758. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1759. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1760. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1761. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1762. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1763. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1764. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1765. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1766. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1767. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1768. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1769. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1770. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1771. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1772. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1773. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1774. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1775. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1776. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1777. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1778. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1779. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1780. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1781. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1782. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1783. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1784. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1785. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1786. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1787. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1788. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1789. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1790. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1791. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1792. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1793. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1794. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1795. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1796. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1797. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1798. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1799. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1800. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1801. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1802. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1803. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1804. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1805. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1806. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1807. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1808. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1809. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1810. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1811. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1812. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1813. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1814. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1815. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1816. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1817. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1818. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1819. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1820. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1821. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1822. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1823. **Production Readiness**: Console.log statement found - `src/services/challenge/JanuaryWalkingService.ts`
1824. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1825. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1826. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1827. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1828. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1829. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1830. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1831. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1832. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1833. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1834. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1835. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1836. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1837. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1838. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1839. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1840. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1841. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1842. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1843. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1844. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1845. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1846. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1847. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1848. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1849. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1850. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1851. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1852. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1853. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1854. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1855. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1856. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1857. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1858. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1859. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1860. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1861. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1862. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1863. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1864. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1865. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1866. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1867. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1868. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1869. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1870. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1871. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1872. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1873. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1874. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1875. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1876. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1877. **Production Readiness**: Console.log statement found - `src/services/challenge/RunningBitcoinService.ts`
1878. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1879. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1880. **Production Readiness**: Console.log statement found - `src/services/club/ClubWalletService.ts`
1881. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1882. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1883. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1884. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1885. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1886. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1887. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1888. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1889. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1890. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1891. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1892. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1893. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1894. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1895. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1896. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1897. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1898. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1899. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1900. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1901. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1902. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1903. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1904. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1905. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1906. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1907. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1908. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1909. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1910. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1911. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1912. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1913. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1914. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1915. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1916. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1917. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1918. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1919. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1920. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1921. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1922. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1923. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1924. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1925. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1926. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1927. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1928. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1929. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1930. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1931. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1932. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1933. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1934. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1935. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1936. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1937. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1938. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1939. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1940. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1941. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1942. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1943. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1944. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1945. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1946. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1947. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1948. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1949. **Production Readiness**: Console.log statement found - `src/services/competition/NostrLeaderboardService.ts`
1950. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1951. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1952. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1953. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1954. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1955. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1956. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1957. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1958. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1959. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1960. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1961. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1962. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1963. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1964. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1965. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1966. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1967. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1968. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1969. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1970. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1971. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1972. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1973. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1974. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1975. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1976. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1977. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1978. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1979. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1980. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1981. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1982. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1983. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1984. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1985. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1986. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1987. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1988. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1989. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1990. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1991. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1992. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1993. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1994. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1995. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1996. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1997. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1998. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1999. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2000. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2001. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2002. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2003. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2004. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2005. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2006. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2007. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2008. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2009. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2010. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2011. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2012. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
2013. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2014. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2015. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2016. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2017. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2018. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2019. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2020. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2021. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2022. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2023. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2024. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2025. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2026. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2027. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2028. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2029. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2030. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2031. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2032. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2033. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2034. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2035. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2036. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2037. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2038. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2039. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2040. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2041. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2042. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2043. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2044. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2045. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2046. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2047. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2048. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2049. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2050. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2051. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2052. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2053. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2054. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2055. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2056. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2057. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2058. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2059. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2060. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2061. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2062. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2063. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2064. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2065. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2066. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2067. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2068. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2069. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2070. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2071. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2072. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2073. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2074. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2075. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2076. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2077. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2078. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2079. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2080. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2081. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2082. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2083. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2084. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2085. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2086. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2087. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2088. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2089. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2090. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2091. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2092. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2093. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2094. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2095. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2096. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
2097. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2098. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2099. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2100. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2101. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2102. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2103. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2104. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2105. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2106. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2107. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2108. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2109. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2110. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2111. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2112. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2113. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2114. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2115. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2116. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2117. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2118. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
2119. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2120. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2121. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2122. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2123. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2124. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2125. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2126. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2127. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2128. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2129. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2130. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2131. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
2132. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2133. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2134. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2135. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2136. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2137. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2138. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
2139. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2140. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2141. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2142. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2143. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2144. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2145. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2146. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2147. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2148. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2149. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
2150. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2151. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2152. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2153. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2154. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2155. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2156. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2157. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2158. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2159. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2160. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2161. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2162. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2163. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2164. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2165. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2166. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2167. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2168. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2169. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2170. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2171. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2172. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2173. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2174. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2175. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2176. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
2177. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2178. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2179. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2180. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2181. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2182. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2183. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2184. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2185. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2186. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2187. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2188. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2189. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2190. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2191. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2192. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2193. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
2194. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2195. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2196. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2197. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2198. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2199. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2200. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2201. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2202. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2203. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2204. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2205. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2206. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2207. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2208. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2209. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2210. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2211. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2212. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2213. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2214. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2215. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2216. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2217. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2218. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2219. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2220. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2221. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2222. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2223. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2224. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2225. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2226. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
2227. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2228. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2229. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2230. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2231. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2232. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2233. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2234. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2235. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
2236. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2237. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2238. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2239. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2240. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2241. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2242. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2243. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2244. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2245. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2246. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2247. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2248. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2249. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
2250. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2251. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2252. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2253. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2254. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2255. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
2256. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
2257. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
2258. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
2259. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
2260. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2261. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2262. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2263. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2264. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2265. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2266. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2267. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
2268. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
2269. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
2270. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
2271. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2272. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2273. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2274. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2275. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2276. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2277. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2278. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2279. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2280. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
2281. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2282. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2283. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2284. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2285. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2286. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2287. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2288. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2289. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2290. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2291. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2292. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2293. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2294. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2295. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2296. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
2297. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2298. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2299. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2300. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2301. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2302. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2303. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2304. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2305. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2306. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2307. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
2308. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
2309. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
2310. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
2311. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
2312. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
2313. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2314. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2315. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2316. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2317. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2318. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2319. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2320. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2321. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2322. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
2323. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2324. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2325. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2326. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2327. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2328. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2329. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2330. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2331. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2332. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2333. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2334. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2335. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2336. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2337. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2338. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2339. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2340. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2341. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2342. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2343. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2344. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2345. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2346. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2347. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2348. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2349. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2350. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2351. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2352. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2353. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2354. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2355. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2356. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2357. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2358. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2359. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2360. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2361. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2362. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2363. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2364. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2365. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2366. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2367. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2368. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2369. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2370. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2371. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2372. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2373. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2374. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2375. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2376. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2377. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2378. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2379. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2380. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2381. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2382. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2383. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2384. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2385. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2386. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2387. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2388. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2389. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2390. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2391. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2392. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2393. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2394. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2395. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2396. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2397. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2398. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2399. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2400. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2401. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2402. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2403. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2404. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2405. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2406. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2407. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2408. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2409. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2410. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2411. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2412. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2413. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2414. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2415. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2416. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2417. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2418. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2419. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2420. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2421. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2422. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2423. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2424. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2425. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2426. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2427. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2428. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2429. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2430. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2431. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2432. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2433. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2434. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2435. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2436. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2437. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2438. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2439. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2440. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2441. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2442. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2443. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2444. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2445. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2446. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2447. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2448. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2449. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2450. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2451. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2452. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2453. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2454. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2455. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2456. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2457. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2458. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2459. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2460. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2461. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2462. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2463. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2464. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2465. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2466. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2467. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2468. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2469. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2470. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2471. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2472. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2473. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2474. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2475. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2476. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2477. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2478. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2479. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2480. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2481. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2482. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2483. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2484. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2485. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2486. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2487. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2488. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2489. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2490. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2491. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2492. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2493. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
2494. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2495. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2496. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2497. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2498. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2499. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2500. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2501. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2502. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2503. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2504. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2505. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2506. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2507. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2508. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2509. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2510. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2511. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2512. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2513. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2514. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2515. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2516. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2517. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2518. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2519. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2520. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2521. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2522. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2523. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2524. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2525. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2526. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2527. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2528. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2529. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2530. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2531. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2532. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2533. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2534. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2535. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2536. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2537. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2538. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2539. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2540. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2541. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2542. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2543. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2544. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2545. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2546. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2547. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2548. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2549. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2550. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
2551. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2552. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2553. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2554. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2555. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2556. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2557. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2558. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2559. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2560. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2561. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2562. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2563. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2564. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2565. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2566. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2567. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2568. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2569. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2570. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2571. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2572. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2573. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2574. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2575. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2576. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2577. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2578. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2579. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2580. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2581. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2582. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2583. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2584. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2585. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2586. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2587. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2588. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2589. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2590. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2591. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2592. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2593. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2594. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2595. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2596. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2597. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2598. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2599. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2600. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2601. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2602. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2603. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2604. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2605. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2606. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2607. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2608. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2609. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2610. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2611. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2612. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2613. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2614. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2615. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2616. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2617. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2618. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2619. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2620. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2621. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2622. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2623. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2624. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2625. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2626. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2627. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2628. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2629. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2630. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2631. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2632. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2633. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2634. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2635. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2636. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2637. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2638. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2639. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2640. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2641. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2642. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2643. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2644. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2645. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2646. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2647. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2648. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2649. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2650. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2651. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2652. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2653. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2654. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2655. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2656. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2657. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2658. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2659. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2660. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2661. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2662. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2663. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2664. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2665. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2666. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2667. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2668. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2669. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2670. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2671. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2672. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2673. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2674. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2675. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2676. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2677. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2678. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2679. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2680. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2681. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
2682. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2683. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2684. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2685. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2686. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2687. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2688. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2689. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2690. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2691. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2692. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2693. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2694. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2695. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2696. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2697. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2698. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2699. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2700. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
2701. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2702. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2703. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2704. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2705. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2706. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2707. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2708. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2709. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2710. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2711. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2712. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2713. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
2714. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2715. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2716. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2717. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2718. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2719. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2720. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2721. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2722. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2723. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2724. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2725. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2726. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2727. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2728. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2729. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2730. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2731. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2732. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2733. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2734. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2735. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2736. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2737. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2738. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2739. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2740. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2741. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2742. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2743. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2744. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2745. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2746. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2747. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2748. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2749. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2750. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2751. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2752. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2753. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2754. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2755. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2756. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2757. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2758. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2759. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2760. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2761. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2762. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2763. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2764. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2765. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2766. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2767. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2768. **Production Readiness**: Console.log statement found - `src/services/habits/HabitTrackerService.ts`
2769. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2770. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2771. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2772. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2773. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2774. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2775. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2776. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2777. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2778. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2779. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2780. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2781. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2782. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2783. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2784. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2785. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2786. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2787. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2788. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2789. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2790. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2791. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2792. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2793. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2794. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2795. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2796. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2797. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2798. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2799. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2800. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2801. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2802. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2803. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2804. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2805. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2806. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2807. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2808. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2809. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2810. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2811. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2812. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2813. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2814. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2815. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2816. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2817. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2818. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2819. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2820. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2821. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2822. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2823. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2824. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2825. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2826. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2827. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2828. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2829. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2830. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2831. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2832. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2833. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2834. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2835. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2836. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2837. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2838. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2839. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2840. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2841. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2842. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2843. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2844. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2845. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2846. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2847. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2848. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2849. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2850. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2851. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2852. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerPreferencesService.ts`
2853. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2854. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2855. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2856. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2857. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2858. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2859. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2860. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2861. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2862. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2863. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2864. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2865. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2866. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2867. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2868. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2869. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2870. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2871. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2872. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2873. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2874. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2875. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2876. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2877. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2878. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2879. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2880. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2881. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2882. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2883. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2884. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2885. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2886. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2887. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2888. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2889. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2890. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2891. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2892. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2893. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2894. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2895. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2896. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2897. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2898. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2899. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2900. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2901. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2902. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2903. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2904. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2905. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2906. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2907. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2908. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2909. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2910. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2911. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2912. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2913. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2914. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2915. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2916. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2917. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2918. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2919. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2920. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2921. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2922. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2923. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2924. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2925. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2926. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2927. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2928. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2929. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2930. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2931. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2932. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2933. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2934. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2935. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2936. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2937. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2938. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2939. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2940. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2941. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2942. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2943. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2944. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2945. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2946. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2947. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2948. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2949. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2950. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2951. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2952. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2953. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2954. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2955. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2956. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2957. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2958. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2959. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2960. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2961. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2962. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2963. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2964. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2965. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2966. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2967. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2968. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2969. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2970. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2971. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2972. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2973. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2974. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2975. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2976. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2977. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2978. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2979. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2980. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2981. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2982. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2983. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2984. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2985. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2986. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2987. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2988. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2989. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2990. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2991. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2992. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2993. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2994. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2995. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2996. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2997. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2998. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2999. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3000. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3001. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3002. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3003. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3004. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3005. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3006. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3007. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3008. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3009. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3010. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3011. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3012. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3013. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3014. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3015. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3016. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3017. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3018. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3019. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
3020. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3021. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3022. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3023. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3024. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3025. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3026. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3027. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3028. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3029. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3030. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3031. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3032. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3033. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3034. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3035. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3036. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3037. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3038. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3039. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
3040. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3041. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3042. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3043. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3044. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3045. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3046. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3047. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3048. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3049. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3050. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3051. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3052. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3053. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3054. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3055. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3056. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3057. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3058. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3059. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
3060. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionParticipantService.ts`
3061. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3062. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3063. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3064. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3065. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3066. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3067. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3068. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3069. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3070. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3071. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3072. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3073. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3074. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3075. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3076. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
3077. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3078. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3079. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3080. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3081. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3082. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3083. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3084. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3085. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3086. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3087. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3088. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3089. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3090. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3091. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3092. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3093. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3094. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3095. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3096. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3097. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3098. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3099. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3100. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3101. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3102. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3103. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3104. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3105. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3106. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3107. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3108. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3109. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3110. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3111. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3112. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3113. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3114. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3115. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3116. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3117. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3118. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3119. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3120. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3121. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3122. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3123. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3124. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3125. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3126. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3127. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3128. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3129. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
3130. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3131. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3132. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3133. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3134. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3135. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3136. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3137. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3138. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3139. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3140. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3141. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3142. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3143. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3144. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3145. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3146. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3147. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3148. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3149. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3150. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3151. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3152. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3153. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3154. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3155. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3156. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3157. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
3158. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3159. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3160. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3161. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3162. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3163. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3164. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3165. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3166. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3167. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3168. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3169. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3170. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3171. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3172. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3173. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3174. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3175. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3176. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3177. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3178. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3179. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3180. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3181. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3182. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
3183. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3184. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3185. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3186. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3187. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3188. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3189. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
3190. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3191. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3192. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3193. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3194. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3195. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3196. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3197. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3198. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3199. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3200. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3201. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3202. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3203. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3204. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3205. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3206. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3207. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3208. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
3209. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3210. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3211. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3212. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3213. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3214. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3215. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3216. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3217. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3218. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3219. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3220. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
3221. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3222. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3223. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3224. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3225. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3226. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3227. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3228. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3229. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3230. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3231. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3232. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3233. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3234. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3235. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3236. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3237. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3238. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3239. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3240. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3241. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3242. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3243. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3244. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
3245. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3246. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3247. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3248. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3249. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3250. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3251. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3252. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3253. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
3254. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
3255. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
3256. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
3257. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
3258. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
3259. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3260. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3261. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3262. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3263. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3264. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3265. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3266. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3267. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3268. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3269. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3270. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3271. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3272. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3273. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3274. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3275. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3276. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
3277. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3278. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3279. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3280. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3281. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3282. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3283. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3284. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3285. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3286. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3287. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3288. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3289. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3290. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3291. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3292. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3293. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3294. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3295. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
3296. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3297. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3298. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3299. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3300. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3301. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3302. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3303. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3304. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3305. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3306. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3307. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3308. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3309. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3310. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3311. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3312. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3313. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3314. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3315. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3316. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3317. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3318. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3319. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3320. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3321. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3322. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3323. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3324. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3325. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3326. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3327. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3328. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3329. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3330. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3331. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3332. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3333. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3334. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3335. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3336. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3337. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3338. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3339. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3340. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3341. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3342. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3343. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3344. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
3345. **Production Readiness**: Console.log statement found - `src/services/nostr/leaderboardCardGenerator.ts`
3346. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
3347. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
3348. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
3349. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
3350. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
3351. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3352. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3353. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3354. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3355. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3356. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3357. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3358. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3359. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3360. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3361. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3362. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3363. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3364. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3365. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3366. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3367. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3368. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3369. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3370. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3371. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3372. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3373. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3374. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3375. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3376. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3377. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3378. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3379. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3380. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3381. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3382. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3383. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3384. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3385. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3386. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3387. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3388. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3389. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3390. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3391. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3392. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
3393. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
3394. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
3395. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
3396. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3397. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3398. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3399. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3400. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3401. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3402. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3403. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
3404. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
3405. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
3406. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
3407. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
3408. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
3409. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3410. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3411. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3412. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3413. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3414. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3415. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3416. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3417. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3418. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3419. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3420. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3421. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3422. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
3423. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
3424. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
3425. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
3426. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
3427. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3428. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3429. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3430. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3431. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3432. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3433. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3434. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3435. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3436. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3437. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3438. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3439. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3440. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
3441. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3442. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3443. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3444. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3445. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3446. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3447. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3448. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3449. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3450. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3451. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3452. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3453. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3454. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3455. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3456. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3457. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
3458. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationPreferencesService.ts`
3459. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3460. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3461. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3462. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3463. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3464. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3465. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3466. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3467. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3468. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3469. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3470. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
3471. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
3472. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
3473. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
3474. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
3475. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3476. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3477. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3478. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3479. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3480. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3481. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3482. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3483. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3484. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3485. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3486. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3487. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
3488. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamNotificationFormatter.ts`
3489. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3490. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3491. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3492. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3493. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3494. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3495. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3496. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3497. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3498. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3499. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3500. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3501. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3502. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3503. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3504. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3505. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3506. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
3507. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3508. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3509. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3510. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3511. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3512. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3513. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3514. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3515. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3516. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3517. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3518. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3519. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3520. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3521. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3522. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3523. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3524. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3525. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3526. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3527. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3528. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3529. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3530. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3531. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3532. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3533. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3534. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3535. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
3536. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
3537. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
3538. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
3539. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
3540. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
3541. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
3542. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
3543. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
3544. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
3545. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
3546. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3547. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3548. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3549. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3550. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3551. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3552. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3553. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3554. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3555. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3556. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3557. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3558. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3559. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3560. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3561. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3562. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3563. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3564. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3565. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3566. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3567. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3568. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3569. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3570. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3571. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3572. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3573. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3574. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3575. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3576. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3577. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3578. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3579. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3580. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3581. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3582. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3583. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3584. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3585. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3586. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3587. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3588. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3589. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3590. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3591. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3592. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3593. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3594. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3595. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3596. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3597. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3598. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3599. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3600. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3601. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3602. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3603. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3604. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3605. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3606. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3607. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3608. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3609. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3610. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3611. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3612. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3613. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3614. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3615. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3616. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3617. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3618. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3619. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3620. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3621. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3622. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3623. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3624. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3625. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3626. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3627. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3628. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3629. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3630. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3631. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3632. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3633. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3634. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3635. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3636. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3637. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3638. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3639. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3640. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3641. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3642. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3643. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3644. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3645. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3646. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3647. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3648. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3649. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3650. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3651. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3652. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3653. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3654. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3655. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3656. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3657. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3658. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3659. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3660. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3661. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3662. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3663. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3664. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3665. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3666. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3667. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3668. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3669. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3670. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3671. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3672. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3673. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3674. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3675. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3676. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3677. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3678. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3679. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3680. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3681. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3682. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3683. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3684. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3685. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3686. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3687. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3688. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3689. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3690. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3691. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3692. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3693. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3694. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3695. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3696. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3697. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3698. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3699. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3700. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3701. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3702. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3703. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3704. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3705. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3706. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3707. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3708. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3709. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3710. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3711. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3712. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3713. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3714. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3715. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3716. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3717. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3718. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3719. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3720. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3721. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3722. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3723. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3724. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3725. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3726. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3727. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3728. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3729. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3730. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3731. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3732. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3733. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3734. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3735. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3736. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3737. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3738. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3739. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3740. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3741. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3742. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3743. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3744. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3745. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3746. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3747. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3748. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3749. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3750. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3751. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3752. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3753. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3754. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3755. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3756. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3757. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3758. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3759. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3760. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3761. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3762. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3763. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3764. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3765. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3766. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3767. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3768. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3769. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3770. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3771. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3772. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3773. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3774. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3775. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3776. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3777. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3778. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3779. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3780. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3781. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3782. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3783. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3784. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3785. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3786. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3787. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3788. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3789. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3790. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3791. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3792. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3793. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3794. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3795. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3796. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3797. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3798. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3799. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3800. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3801. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3802. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3803. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3804. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3805. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3806. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3807. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3808. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3809. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3810. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3811. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3812. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3813. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3814. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3815. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3816. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3817. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3818. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3819. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3820. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3821. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3822. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3823. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3824. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3825. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3826. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3827. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3828. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3829. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3830. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3831. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3832. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3833. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3834. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3835. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3836. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3837. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3838. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3839. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3840. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3841. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3842. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3843. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3844. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3845. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3846. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3847. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3848. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3849. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3850. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3851. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3852. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3853. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3854. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3855. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3856. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3857. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3858. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3859. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3860. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3861. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3862. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3863. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3864. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3865. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3866. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3867. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3868. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3869. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3870. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3871. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3872. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3873. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3874. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3875. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3876. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3877. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3878. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3879. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3880. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3881. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3882. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3883. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3884. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3885. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3886. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3887. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3888. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3889. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3890. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3891. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3892. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3893. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3894. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3895. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3896. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3897. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3898. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3899. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3900. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3901. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3902. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3903. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3904. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3905. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3906. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3907. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3908. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3909. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3910. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3911. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3912. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3913. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3914. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3915. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3916. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3917. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3918. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
3919. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3920. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3921. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3922. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3923. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3924. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3925. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3926. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3927. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3928. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3929. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3930. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3931. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3932. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3933. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3934. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3935. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3936. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3937. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3938. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3939. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
3940. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3941. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3942. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3943. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3944. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3945. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3946. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3947. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3948. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3949. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3950. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3951. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3952. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3953. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
3954. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
3955. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
3956. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
3957. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
3958. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
3959. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3960. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3961. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3962. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3963. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3964. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3965. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3966. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3967. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3968. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3969. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3970. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3971. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3972. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3973. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3974. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3975. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3976. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3977. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3978. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3979. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3980. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3981. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3982. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3983. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3984. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3985. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3986. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3987. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3988. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3989. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3990. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3991. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3992. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3993. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3994. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3995. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3996. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3997. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3998. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3999. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
4000. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
4001. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
4002. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
4003. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
4004. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
4005. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4006. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4007. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4008. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4009. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4010. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4011. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4012. **Production Readiness**: Console.log statement found - `src/services/verification/PerWorkoutVerificationService.ts`
4013. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4014. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4015. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4016. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4017. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4018. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4019. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4020. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4021. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4022. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
4023. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4024. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4025. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4026. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4027. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4028. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4029. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4030. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4031. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4032. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
4033. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4034. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4035. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4036. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4037. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4038. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
4039. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4040. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4041. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4042. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4043. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4044. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4045. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4046. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
4047. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4048. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4049. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4050. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4051. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4052. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4053. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4054. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
4055. **Production Readiness**: Console.log statement found - `src/services/watch/watchConnectivityService.ts`
4056. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4057. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4058. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4059. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4060. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4061. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4062. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4063. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4064. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4065. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4066. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4067. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
4068. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4069. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4070. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4071. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4072. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4073. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4074. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4075. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
4076. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
4077. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
4078. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
4079. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
4080. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
4081. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
4082. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
4083. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
4084. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
4085. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
4086. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
4087. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
4088. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
4089. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
4090. **Production Readiness**: Console.log statement found - `src/utils/KalmanFilter.ts`
4091. **Production Readiness**: Console.log statement found - `src/utils/KalmanFilter.ts`
4092. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4093. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4094. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4095. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4096. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4097. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4098. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4099. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4100. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4101. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4102. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4103. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4104. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4105. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4106. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4107. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4108. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4109. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4110. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4111. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4112. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4113. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4114. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4115. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4116. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
4117. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
4118. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
4119. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
4120. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
4121. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
4122. **Production Readiness**: Console.log statement found - `src/utils/TTLDeduplicator.ts`
4123. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
4124. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
4125. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
4126. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
4127. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
4128. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
4129. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
4130. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
4131. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
4132. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
4133. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
4134. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
4135. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4136. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4137. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4138. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4139. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4140. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4141. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4142. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4143. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4144. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4145. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4146. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
4147. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4148. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4149. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4150. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4151. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4152. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4153. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4154. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4155. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4156. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4157. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4158. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4159. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4160. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4161. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4162. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4163. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4164. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4165. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4166. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4167. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4168. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4169. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4170. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
4171. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
4172. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
4173. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
4174. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
4175. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
4176. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
4177. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
4178. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
4179. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
4180. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4181. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4182. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4183. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4184. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4185. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4186. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
4187. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
4188. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
4189. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
4190. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
4191. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
4192. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4193. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4194. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4195. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4196. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4197. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
4198. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
4199. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
4200. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
4201. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
4202. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4203. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4204. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4205. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4206. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4207. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4208. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4209. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4210. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4211. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4212. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4213. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4214. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4215. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4216. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4217. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4218. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
4219. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4220. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4221. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4222. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4223. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4224. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4225. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4226. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4227. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4228. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4229. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4230. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4231. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4232. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4233. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4234. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4235. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4236. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4237. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4238. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4239. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4240. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
4241. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
4242. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
4243. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
4244. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
4245. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
4246. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4247. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4248. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4249. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4250. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4251. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4252. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4253. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4254. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
4255. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
4256. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
4257. **Production Readiness**: Console.log statement found - `src/utils/nwcDecryptor.ts`
4258. **Production Readiness**: Console.log statement found - `src/utils/nwcDecryptor.ts`
4259. **Production Readiness**: Console.log statement found - `src/utils/progressiveLoader.ts`
4260. **Production Readiness**: Console.log statement found - `src/utils/progressiveLoader.ts`
4261. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
4262. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
4263. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
4264. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
4265. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
4266. **Production Readiness**: Console.log statement found - `src/utils/secretDecryptor.ts`
4267. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
4268. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
4269. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
4270. **Production Readiness**: Console.log statement found - `src/utils/supabase.ts`
4271. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4272. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4273. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4274. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4275. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4276. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4277. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4278. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4279. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4280. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4281. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4282. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4283. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4284. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
4285. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4286. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4287. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4288. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4289. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4290. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4291. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4292. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4293. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4294. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4295. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4296. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4297. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4298. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4299. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4300. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4301. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4302. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4303. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4304. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4305. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4306. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4307. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4308. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4309. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4310. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4311. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4312. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4313. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4314. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4315. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4316. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4317. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4318. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4319. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4320. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4321. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4322. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4323. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4324. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4325. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4326. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4327. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4328. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4329. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
4330. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4331. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4332. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4333. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4334. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4335. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4336. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4337. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4338. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
4339. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4340. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4341. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4342. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4343. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4344. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4345. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4346. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4347. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4348. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4349. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4350. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4351. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4352. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4353. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4354. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4355. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4356. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4357. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4358. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4359. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
4360. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4361. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4362. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4363. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4364. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4365. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4366. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4367. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4368. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4369. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4370. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
4371. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
4372. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
4373. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
4374. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
4375. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
4376. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4377. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4378. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4379. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4380. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4381. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4382. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4383. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4384. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4385. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4386. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4387. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4388. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4389. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4390. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4391. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4392. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4393. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4394. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4395. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4396. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4397. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4398. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4399. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4400. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4401. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4402. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4403. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4404. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4405. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4406. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4407. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4408. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4409. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4410. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
4411. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`
4412. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`

</details>

