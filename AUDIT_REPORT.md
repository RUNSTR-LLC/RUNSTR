# RUNSTR Pre-Launch Audit Report

**Date**: 2026-03-02

## Summary

- 🔴 Critical: 10
- 🟠 High: 44
- 🟡 Medium: 1067
- 🟢 Low: 3731
- **Total**: 4852

## 🔴 Critical Issues

### 1. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/App.tsx`:851
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

- **File**: `src/screens/activity/CyclingTrackerScreen.tsx`:372
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

- **File**: `src/services/competition/JoinRequestService.ts`:125
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 27. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:86
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 28. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:139
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 29. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:313
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 30. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:510
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 31. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:558
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 32. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:614
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 33. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:668
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 34. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/core/AppInitializationService.ts`:152
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 35. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/GlobalNDKService.ts`:13
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 36. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:428
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 37. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:496
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 38. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:104
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 39. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:169
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 40. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisEventService.ts`:483
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 41. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisRSVPService.ts`:105
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 42. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/satlantis/SatlantisRSVPService.ts`:132
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 43. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season2Service.ts`:56
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 44. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/wot/WoTService.ts`:94
- **Fix**: Add limit, since, or until to prevent fetching too many events

## 🟡 Medium Priority Issues

<details>
<summary>Click to expand (1067 issues)</summary>

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
150. **UI Consistency**: Hardcoded color found: #888 - `src/components/cards/WorkoutCardRenderer.tsx`
151. **UI Consistency**: Hardcoded color found: #111111 - `src/components/club/ClubEarningsCard.tsx`
152. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/competition/JoinRequestCard.tsx`
153. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
154. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
155. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
156. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/debug/ActivityDebugOverlay.tsx`
157. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/debug/ActivityDebugOverlay.tsx`
158. **UI Consistency**: Hardcoded color found: #FF5500 - `src/components/debug/ActivityDebugOverlay.tsx`
159. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/debug/ActivityDebugOverlay.tsx`
160. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
161. **UI Consistency**: Hardcoded color found: #000 - `src/components/debug/ActivityDebugOverlay.tsx`
162. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
163. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/ActivityDebugOverlay.tsx`
164. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
165. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
166. **UI Consistency**: Hardcoded color found: #eab308 - `src/components/debug/ActivityDebugOverlay.tsx`
167. **UI Consistency**: Hardcoded color found: #000 - `src/components/debug/ActivityDebugOverlay.tsx`
168. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/ActivityDebugOverlay.tsx`
169. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
170. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
171. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/ActivityDebugOverlay.tsx`
172. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
173. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/debug/ActivityDebugOverlay.tsx`
174. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/ActivityDebugOverlay.tsx`
175. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/ActivityDebugOverlay.tsx`
176. **UI Consistency**: Hardcoded color found: #FF5500 - `src/components/debug/StepDebugOverlay.tsx`
177. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/debug/StepDebugOverlay.tsx`
178. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
179. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/StepDebugOverlay.tsx`
180. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
181. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
182. **UI Consistency**: Hardcoded color found: #333 - `src/components/debug/StepDebugOverlay.tsx`
183. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
184. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/debug/StepDebugOverlay.tsx`
185. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/StepDebugOverlay.tsx`
186. **UI Consistency**: Hardcoded color found: #fff - `src/components/debug/StepDebugOverlay.tsx`
187. **UI Consistency**: Hardcoded color found: #888 - `src/components/debug/StepDebugOverlay.tsx`
188. **UI Consistency**: Hardcoded color found: #000 - `src/components/discovery/EventCard.tsx`
189. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
190. **UI Consistency**: Hardcoded color found: #000000 - `src/components/event/EventPaymentModal.tsx`
191. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
192. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
193. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
194. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
195. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
196. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
197. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
198. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
199. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
200. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
201. **UI Consistency**: Hardcoded color found: #666666 - `src/components/events/DynamicEventCard.tsx`
202. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
203. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
204. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
205. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
206. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
207. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
208. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
209. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
210. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
211. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
212. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/LeaderboardEventCard.tsx`
213. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
214. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
215. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
216. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
217. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
218. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
219. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/events/RunstrEventCreationModal.tsx`
220. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
221. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
222. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
223. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/Season2EventCard.tsx`
224. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
225. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/EnergySelector.tsx`
226. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEditorModal.tsx`
227. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEntryCard.tsx`
228. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/MoodSelector.tsx`
229. **UI Consistency**: Hardcoded color found: #fff - `src/components/journal/VoiceRecordButton.tsx`
230. **UI Consistency**: Hardcoded color found: #0f0f0f - `src/components/lightning/NWCLightningButton.tsx`
231. **UI Consistency**: Hardcoded color found: #2ecc71 - `src/components/music/AddToPlaylistSheet.tsx`
232. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomPlaylistEditModal.tsx`
233. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomTrackEditModal.tsx`
234. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/CreatePlaylistModal.tsx`
235. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
236. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
237. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
238. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/PlaylistBrowser.tsx`
239. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
240. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
241. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
242. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/EarningsDisplay.tsx`
243. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/EarningsDisplay.tsx`
244. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/EarningsDisplay.tsx`
245. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/GroupedNotificationCard.tsx`
246. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
247. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/GroupedNotificationCard.tsx`
248. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
249. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
250. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
251. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/GroupedNotificationCard.tsx`
252. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
253. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/GroupedNotificationCard.tsx`
254. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
255. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/LiveIndicator.tsx`
256. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/LiveIndicator.tsx`
257. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/MiniLeaderboard.tsx`
258. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
259. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
260. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/MiniLeaderboard.tsx`
261. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
262. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
263. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
264. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/NotificationActions.tsx`
265. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
266. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
267. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationActions.tsx`
268. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/NotificationCard.tsx`
269. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
270. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
271. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
272. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
273. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
274. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/NotificationCard.tsx`
275. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/NotificationCard.tsx`
276. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
277. **UI Consistency**: Hardcoded color found: #999 - `src/components/notifications/NotificationCard.tsx`
278. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
279. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/CompactTeamCard.tsx`
280. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/CompactTeamCard.tsx`
281. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
282. **UI Consistency**: Hardcoded color found: #666666 - `src/components/profile/CompactTeamCard.tsx`
283. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
284. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
285. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
286. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
287. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
288. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/DebugAuthBanner.tsx`
289. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
290. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
291. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
292. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
293. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
294. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MonthlyStatsPanel.tsx`
295. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
296. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/MonthlyStatsPanel.tsx`
297. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
298. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/MonthlyStatsPanel.tsx`
299. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
300. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
301. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
302. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
303. **UI Consistency**: Hardcoded color found: #999999 - `src/components/profile/MonthlyStatsPanel.tsx`
304. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
305. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
306. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
307. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MyTeamsBox.tsx`
308. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MyTeamsBox.tsx`
309. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/NotificationBadge.tsx`
310. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/ProfileHeader.tsx`
311. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
312. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
313. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
314. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WalletSection.tsx`
315. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WalletSection.tsx`
316. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
317. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
318. **UI Consistency**: Hardcoded color found: #9ca3af - `src/components/profile/WatchSyncSection.tsx`
319. **UI Consistency**: Hardcoded color found: #1f1f1f - `src/components/profile/WatchSyncSection.tsx`
320. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
321. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
322. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
323. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/profile/WorkoutLevelRing.tsx`
324. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
325. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
326. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WorkoutLevelRing.tsx`
327. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
328. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
329. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
330. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
331. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
332. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
333. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/WorkoutLevelRing.tsx`
334. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
335. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
336. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
337. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
338. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
339. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
340. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
341. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/profile/WorkoutLevelRing.tsx`
342. **UI Consistency**: Hardcoded color found: #2a2010 - `src/components/profile/WorkoutLevelRing.tsx`
343. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
344. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/WorkoutStatsSheet.tsx`
345. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourCompetitionsBox.tsx`
346. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourCompetitionsBox.tsx`
347. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourWorkoutsBox.tsx`
348. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourWorkoutsBox.tsx`
349. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
350. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
351. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
352. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
353. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
354. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
355. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
356. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
357. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
358. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
359. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
360. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
361. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
362. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
363. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
364. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
365. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
366. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
367. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
368. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
369. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
370. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
371. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
372. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
373. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
374. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
375. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
376. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
377. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
378. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
379. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
380. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
381. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/shared/FullScreenCardModal.tsx`
382. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
383. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
384. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
385. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
386. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
387. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
388. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/FullScreenCardModal.tsx`
389. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
390. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
391. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
392. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
393. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/FullScreenCardModal.tsx`
394. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
395. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
396. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
397. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
398. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
399. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
400. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
401. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
402. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
403. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
404. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
405. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
406. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
407. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
408. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
409. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
410. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
411. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenVerticalCard.tsx`
412. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
413. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
414. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
415. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/MonthlyWorkoutGroup.tsx`
416. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/shared/SocialShareModal.tsx`
417. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/SyncDropdown.tsx`
418. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
419. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
420. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
421. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
422. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
423. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
424. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
425. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/AppleHealthTab.tsx`
426. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/AppleHealthTab.tsx`
427. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/HealthConnectTab.tsx`
428. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/HealthConnectTab.tsx`
429. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
430. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
431. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
432. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
433. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
434. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
435. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
436. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
437. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
438. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRDisplayModal.tsx`
439. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRDisplayModal.tsx`
440. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
441. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
442. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
443. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
444. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
445. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
446. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
447. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
448. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
449. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
450. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
451. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
452. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
453. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
454. **UI Consistency**: Hardcoded color found: #996633 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
455. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
456. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
457. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
458. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
459. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
460. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
461. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
462. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
463. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
464. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
465. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
466. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
467. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
468. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
469. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/EarningsHeroCard.tsx`
470. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
471. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
472. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
473. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
474. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
475. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/EarningsHeroCard.tsx`
476. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
477. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
478. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
479. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
480. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
481. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
482. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/GlobalBreakdownCard.tsx`
483. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/GlobalBreakdownCard.tsx`
484. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
485. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
486. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
487. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
488. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/GlobalBreakdownCard.tsx`
489. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
490. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
491. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
492. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
493. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
494. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/GlobalBreakdownCard.tsx`
495. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
496. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
497. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
498. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/ImpactHeroCard.tsx`
499. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
500. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
501. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
502. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
503. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
504. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/ImpactHeroCard.tsx`
505. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
506. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
507. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
508. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
509. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
510. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
511. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
512. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
513. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
514. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PendingPayoutsCard.tsx`
515. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
516. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
517. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
518. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
519. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
520. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/PendingPayoutsCard.tsx`
521. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PeriodSelector.tsx`
522. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PeriodSelector.tsx`
523. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/PeriodSelector.tsx`
524. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/PeriodSelector.tsx`
525. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
526. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
527. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/PersonalImpactSection.tsx`
528. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PersonalImpactSection.tsx`
529. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
530. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
531. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
532. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
533. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/PersonalImpactSection.tsx`
534. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
535. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
536. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
537. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/PersonalImpactSection.tsx`
538. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/rewards/PersonalImpactSection.tsx`
539. **UI Consistency**: Hardcoded color found: #2a2010 - `src/components/rewards/PersonalImpactSection.tsx`
540. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
541. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
542. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
543. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
544. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
545. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
546. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
547. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
548. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
549. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
550. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
551. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
552. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
553. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/RewardBreakdownCard.tsx`
554. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardBreakdownCard.tsx`
555. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
556. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
557. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
558. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
559. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
560. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardBreakdownCard.tsx`
561. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
562. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
563. **UI Consistency**: Hardcoded color found: #000000 - `src/components/rewards/RewardDestinationPicker.tsx`
564. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
565. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
566. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationPicker.tsx`
567. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationPicker.tsx`
568. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
569. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
570. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationPicker.tsx`
571. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
572. **UI Consistency**: Hardcoded color found: #333 - `src/components/rewards/RewardDestinationPicker.tsx`
573. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
574. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationSection.tsx`
575. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
576. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
577. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardDestinationSection.tsx`
578. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
579. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/rewards/RewardDestinationSection.tsx`
580. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/SponsorBanner.tsx`
581. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/SponsorBanner.tsx`
582. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
583. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
584. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
585. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
586. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
587. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
588. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
589. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
590. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
591. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
592. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
593. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
594. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
595. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
596. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
597. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
598. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
599. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
600. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
601. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/TransparencyDashboardModal.tsx`
602. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
603. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TransparencyDashboardModal.tsx`
604. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TransparencyDashboardModal.tsx`
605. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
606. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
607. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
608. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
609. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
610. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/satlantis/EventCreatorControls.tsx`
611. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/satlantis/EventCreatorControls.tsx`
612. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/satlantis/EventCreatorControls.tsx`
613. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/satlantis/EventJoinButton.tsx`
614. **UI Consistency**: Hardcoded color found: #111111 - `src/components/satlantis/SatlantisEventCard.tsx`
615. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/season2/Season2Banner.tsx`
616. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/season2/Season2Banner.tsx`
617. **UI Consistency**: Hardcoded color found: #f5a623 - `src/components/season2/Season2Banner.tsx`
618. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
619. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
620. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/AgentSkillSetupModal.tsx`
621. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
622. **UI Consistency**: Hardcoded color found: #333 - `src/components/settings/AgentSkillSetupModal.tsx`
623. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/settings/AgentSkillSetupModal.tsx`
624. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
625. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
626. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
627. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
628. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
629. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
630. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
631. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
632. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
633. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
634. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
635. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
636. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
637. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
638. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
639. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/WearableConnectionModal.tsx`
640. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/WearableConnectionModal.tsx`
641. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
642. **UI Consistency**: Hardcoded color found: #111111 - `src/components/settings/WearableConnectionModal.tsx`
643. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
644. **UI Consistency**: Hardcoded color found: #000000 - `src/components/settings/WearableConnectionModal.tsx`
645. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
646. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/subscription/SimpleEventCreationModal.tsx`
647. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/subscription/SimpleEventCreationModal.tsx`
648. **UI Consistency**: Hardcoded color found: #111111 - `src/components/subscription/SimpleEventCreationModal.tsx`
649. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/CharitySection.tsx`
650. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
651. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
652. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
653. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/team/DailyLeaderboardCard.tsx`
654. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
655. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
656. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
657. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/DailyLeaderboardCard.tsx`
658. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
659. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
660. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
661. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/SimpleLeagueDisplay.tsx`
662. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/SimpleLeagueDisplay.tsx`
663. **UI Consistency**: Hardcoded color found: #333 - `src/components/team/SimpleLeagueDisplay.tsx`
664. **UI Consistency**: Hardcoded color found: #999 - `src/components/team/SimpleLeagueDisplay.tsx`
665. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/ActionButton.tsx`
666. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/ActionButton.tsx`
667. **UI Consistency**: Hardcoded color found: #ccc - `src/components/ui/ActionButton.tsx`
668. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/BottomNavigation.tsx`
669. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/BottomNavigation.tsx`
670. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
671. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/BottomNavigation.tsx`
672. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
673. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
674. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
675. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
676. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/Card.tsx`
677. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/CharityZapIconButton.tsx`
678. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/CustomAlert.tsx`
679. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/CustomAlert.tsx`
680. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/DifficultyIndicator.tsx`
681. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/DifficultyIndicator.tsx`
682. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/DifficultyIndicator.tsx`
683. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/DropdownMenu.tsx`
684. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/DropdownMenu.tsx`
685. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/FilterChips.tsx`
686. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/MemberAvatar.tsx`
687. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
688. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
689. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
690. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
691. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
692. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
693. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/PrimaryButton.tsx`
694. **UI Consistency**: Hardcoded color found: #CCCCCC - `src/components/ui/PrimaryButton.tsx`
695. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
696. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
697. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
698. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
699. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
700. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/PrivacyNoticeModal.tsx`
701. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
702. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
703. **UI Consistency**: Hardcoded color found: #111111 - `src/components/ui/PrivacyNoticeModal.tsx`
704. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
705. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
706. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
707. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
708. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/PrivacyNoticeModal.tsx`
709. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
710. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
711. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/SettingsAccordion.tsx`
712. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
713. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
714. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
715. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/SettingsAccordion.tsx`
716. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
717. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
718. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
719. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
720. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
721. **UI Consistency**: Hardcoded color found: #333333 - `src/components/ui/SplashScreen.tsx`
722. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/StatCard.tsx`
723. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/StatCard.tsx`
724. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
725. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
726. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/StatCard.tsx`
727. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/StatCard.tsx`
728. **UI Consistency**: Hardcoded color found: #0d0d0d - `src/components/ui/TexturedBackground.tsx`
729. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
730. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
731. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/toastConfig.tsx`
732. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/toastConfig.tsx`
733. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
734. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
735. **UI Consistency**: Hardcoded color found: #888888 - `src/components/ui/toastConfig.tsx`
736. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
737. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
738. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/AutoWithdrawSection.tsx`
739. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
740. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
741. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
742. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
743. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
744. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
745. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
746. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
747. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
748. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
749. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
750. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
751. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
752. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
753. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
754. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
755. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
756. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
757. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/HistoryModal.tsx`
758. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
759. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
760. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
761. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
762. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
763. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
764. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
765. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
766. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
767. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/LightningAddressSetupModal.tsx`
768. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
769. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
770. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
771. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
772. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
773. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/NWCQRConfirmationModal.tsx`
774. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
775. **UI Consistency**: Hardcoded color found: #1a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
776. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
777. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
778. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
779. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
780. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
781. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
782. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
783. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
784. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/SendModal.tsx`
785. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletActivityList.tsx`
786. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
787. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
788. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletBalanceCard.tsx`
789. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletConnectionError.tsx`
790. **Error Handling**: AsyncStorage operation without try-catch - `src/components/activity/WorkoutSummaryModal.tsx`
791. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubChatSection.tsx`
792. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubEventsSection.tsx`
793. **Error Handling**: AsyncStorage operation without try-catch - `src/components/compete/LeaderboardsContent.tsx`
794. **Error Handling**: AsyncStorage operation without try-catch - `src/components/subscription/SubscriptionInfoModal.tsx`
795. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
796. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
797. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
798. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
799. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSeason2.ts`
800. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
801. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
802. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
803. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useUnitPreference.ts`
804. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ClubChatScreen.tsx`
805. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/CompeteScreen.tsx`
806. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ContactSupportScreen.tsx`
807. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/HealthProfileScreen.tsx`
808. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ProfileScreen.tsx`
809. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
810. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
811. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/SettingsScreen.tsx`
812. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/SettingsScreen.tsx`
813. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
814. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
815. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
816. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
817. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
818. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
819. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
820. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
821. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
822. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/EinundzwanzigDetailScreen.tsx`
823. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
824. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
825. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
826. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
827. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
828. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
829. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
830. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
831. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTracker.ts`
832. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTrackerTask.ts`
833. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
834. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
835. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
836. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
837. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
838. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
839. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
840. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
841. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
842. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
843. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
844. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
845. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
846. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
847. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
848. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
849. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
850. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
851. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
852. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
853. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
854. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
855. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
856. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
857. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
858. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
859. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
860. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
861. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
862. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
863. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
864. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
865. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
866. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
867. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
868. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
869. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
870. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
871. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
872. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
873. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
874. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
875. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
876. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
877. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
878. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
879. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
880. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
881. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
882. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
883. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
884. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
885. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
886. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
887. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/ClubChatService.ts`
888. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
889. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
890. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/AutoBackupService.ts`
891. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
892. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
893. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
894. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
895. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
896. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
897. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
898. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
899. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
900. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
901. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
902. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
903. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/EinundzwanzigService.ts`
904. **Error Handling**: AsyncStorage operation without try-catch - `src/services/club/ClubChatAutoShare.ts`
905. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/AutoJoinService.ts`
906. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/DailyLeaderboardService.ts`
907. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
908. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
909. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
910. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
911. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
912. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
913. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
914. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
915. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
916. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
917. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
918. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
919. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
920. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
921. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
922. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
923. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
924. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
925. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
926. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
927. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
928. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
929. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
930. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
931. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
932. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
933. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
934. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
935. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
936. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
937. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
938. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
939. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
940. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/WorkoutEventStore.ts`
941. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
942. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
943. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
944. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
945. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
946. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
947. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
948. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/garminAuthService.ts`
949. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
950. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
951. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
952. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
953. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
954. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
955. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
956. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
957. **Error Handling**: AsyncStorage operation without try-catch - `src/services/habits/HabitTrackerService.ts`
958. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
959. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
960. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
961. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
962. **Error Handling**: AsyncStorage operation without try-catch - `src/services/integrations/NostrCompetitionContextService.ts`
963. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
964. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
965. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
966. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
967. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
968. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
969. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
970. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
971. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
972. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
973. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
974. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
975. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
976. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/ExpoNotificationProvider.ts`
977. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
978. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
979. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
980. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
981. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
982. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
983. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
984. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
985. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
986. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
987. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
988. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
989. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
990. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
991. **Error Handling**: AsyncStorage operation without try-catch - `src/services/satlantis/SatlantisEventJoinService.ts`
992. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
993. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season2Service.ts`
994. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
995. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
996. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamStorageService.ts`
997. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamStorageService.ts`
998. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
999. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1000. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1001. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1002. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
1003. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
1004. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
1005. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
1006. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
1007. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1008. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1009. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
1010. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
1011. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
1012. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1013. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1014. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1015. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1016. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1017. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1018. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
1019. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1020. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1021. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1022. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
1023. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/cache.ts`
1024. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/captainCache.ts`
1025. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/networkUtils.ts`
1026. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
1027. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
1028. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1029. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1030. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1031. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1032. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1033. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1034. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1035. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1036. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1037. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1038. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1039. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1040. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
1041. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1042. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1043. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1044. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1045. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1046. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1047. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1048. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1049. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/testCaptainFlow.ts`
1050. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/walletRecovery.ts`
1051. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/walletRecovery.ts`
1052. **User Experience**: List without empty state message - `src/screens/ContactSupportScreen.tsx`
1053. **User Experience**: List without empty state message - `src/screens/DonateScreen.tsx`
1054. **User Experience**: List without empty state message - `src/screens/HealthProfileScreen.tsx`
1055. **User Experience**: List without empty state message - `src/screens/HelpSupportScreen.tsx`
1056. **User Experience**: List without empty state message - `src/screens/LeaderboardsScreen.tsx`
1057. **User Experience**: List without empty state message - `src/screens/PrivacyPolicyScreen.tsx`
1058. **User Experience**: List without empty state message - `src/screens/ProfileEditScreen.tsx`
1059. **User Experience**: List without empty state message - `src/screens/ProfileScreen.tsx`
1060. **User Experience**: List without empty state message - `src/screens/RewardsScreen.tsx`
1061. **User Experience**: List without empty state message - `src/screens/TeamScreen.tsx`
1062. **User Experience**: List without empty state message - `src/screens/WalletScreen.tsx`
1063. **User Experience**: List without empty state message - `src/screens/activity/DietTrackerScreen.tsx`
1064. **User Experience**: List without empty state message - `src/screens/activity/ManualEntryScreen.tsx`
1065. **User Experience**: List without empty state message - `src/screens/activity/ManualWorkoutScreen.tsx`
1066. **User Experience**: List without empty state message - `src/screens/activity/RunningTrackerScreen.tsx`
1067. **User Experience**: List without empty state message - `src/screens/activity/WaterTrackerScreen.tsx`

</details>

## 🟢 Low Priority Issues

<details>
<summary>Click to expand (3731 issues)</summary>

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
54. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
55. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
56. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
57. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
58. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
59. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
60. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
61. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
62. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
63. **Production Readiness**: Console.log statement found - `src/cache/FeedCache.ts`
64. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
65. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
66. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
67. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
68. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
69. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
70. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
71. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
72. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
73. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
74. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
75. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
76. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
77. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
78. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
79. **Production Readiness**: Console.log statement found - `src/components/cards/WorkoutCardRenderer.tsx`
80. **Production Readiness**: Console.log statement found - `src/components/club/ClubLeaderboardSection.tsx`
81. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
82. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
83. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
84. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
85. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
86. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
87. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
88. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
89. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
90. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
91. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
92. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
93. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
94. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
95. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
96. **Production Readiness**: Console.log statement found - `src/components/journal/VoiceRecordButton.tsx`
97. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
98. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
99. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
100. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
101. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
102. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
103. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
104. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
105. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
106. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
107. **Production Readiness**: Console.log statement found - `src/components/music/AddToPlaylistSheet.tsx`
108. **Production Readiness**: Console.log statement found - `src/components/music/CreatePlaylistModal.tsx`
109. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
110. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
111. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
112. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
113. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
114. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
115. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
116. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
117. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
118. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
119. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
120. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
121. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
122. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
123. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
124. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
125. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
126. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
127. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
128. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
129. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
130. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
131. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
132. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
133. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
134. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
135. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
136. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
137. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
138. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
139. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
140. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
141. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
142. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
143. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
144. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
145. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
146. **Production Readiness**: Console.log statement found - `src/components/permissions/GPSPermissionsDiagnostics.tsx`
147. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
148. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
149. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
150. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
151. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
152. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
153. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
154. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
155. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
156. **Production Readiness**: Console.log statement found - `src/components/profile/ProfileHeader.tsx`
157. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
158. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
159. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
160. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
161. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
162. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
163. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
164. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
165. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
166. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
167. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
168. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
169. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
170. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
171. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
172. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
173. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
174. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
175. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
176. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
177. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
178. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
179. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
180. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
181. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
182. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
183. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/GarminHealthTab.tsx`
184. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
185. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
186. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
187. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
188. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
189. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
190. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
191. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
192. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
193. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
194. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
195. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
196. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
197. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
198. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
199. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
200. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
201. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
202. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
203. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
204. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
205. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
206. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
207. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
208. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
209. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
210. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
211. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
212. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
213. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
214. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
215. **Production Readiness**: Console.log statement found - `src/components/rewards/RewardDestinationPicker.tsx`
216. **Production Readiness**: Console.log statement found - `src/components/rewards/RewardDestinationPicker.tsx`
217. **Production Readiness**: Console.log statement found - `src/components/routes/RouteSelectionModal.tsx`
218. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventCreatorControls.tsx`
219. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
220. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
221. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
222. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
223. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
224. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
225. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
226. **Production Readiness**: Console.log statement found - `src/components/satlantis/EventJoinButton.tsx`
227. **Production Readiness**: Console.log statement found - `src/components/satlantis/SatlantisEventCard.tsx`
228. **Production Readiness**: Console.log statement found - `src/components/satlantis/SatlantisEventCard.tsx`
229. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
230. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
231. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
232. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleEventCreationModal.tsx`
233. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleTeamCreationModal.tsx`
234. **Production Readiness**: Console.log statement found - `src/components/subscription/SimpleTeamCreationModal.tsx`
235. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
236. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
237. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
238. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
239. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
240. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
241. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
242. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardCard.tsx`
243. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
244. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
245. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
246. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
247. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
248. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
249. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
250. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
251. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
252. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
253. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
254. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
255. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
256. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
257. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
258. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
259. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
260. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
261. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
262. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
263. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
264. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
265. **Production Readiness**: Console.log statement found - `src/components/wallet/ReceiveModal.tsx`
266. **Production Readiness**: Console.log statement found - `src/components/wallet/WalletConfigModal.tsx`
267. **Production Readiness**: Console.log statement found - `src/constants/season2.ts`
268. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
269. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
270. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
271. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
272. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
273. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
274. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
275. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
276. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
277. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
278. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
279. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
280. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
281. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
282. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
283. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
284. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
285. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
286. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
287. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
288. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
289. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
290. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
291. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
292. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
293. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
294. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
295. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
296. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
297. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
298. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
299. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
300. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
301. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
302. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
303. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
304. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
305. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
306. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
307. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
308. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
309. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
310. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
311. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
312. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
313. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
314. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
315. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
316. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
317. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
318. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
319. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
320. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
321. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
322. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
323. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
324. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
325. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
326. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
327. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
328. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
329. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
330. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
331. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
332. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
333. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
334. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
335. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
336. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
337. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
338. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
339. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
340. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
341. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
342. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
343. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
344. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
345. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
346. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
347. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
348. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
349. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
350. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
351. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
352. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
353. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
354. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
355. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
356. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
357. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
358. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
359. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
360. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
361. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
362. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
363. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
364. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
365. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
366. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
367. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
368. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
369. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
370. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
371. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
372. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
373. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
374. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
375. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
376. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
377. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
378. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
379. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
380. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
381. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
382. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
383. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
384. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
385. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
386. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
387. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
388. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
389. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
390. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
391. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
392. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
393. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
394. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
395. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
396. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
397. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
398. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
399. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
400. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
401. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
402. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
403. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
404. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
405. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
406. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
407. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
408. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
409. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
410. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
411. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
412. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
413. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
414. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
415. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
416. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
417. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
418. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
419. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
420. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
421. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
422. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
423. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
424. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
425. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
426. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
427. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
428. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
429. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
430. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
431. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
432. **Production Readiness**: Console.log statement found - `src/hooks/useSatlantisEvents.ts`
433. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
434. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
435. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
436. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
437. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
438. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
439. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
440. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
441. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
442. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
443. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
444. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
445. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
446. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
447. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
448. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
449. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
450. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
451. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
452. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
453. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
454. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
455. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
456. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
457. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
458. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
459. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
460. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
461. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
462. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
463. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
464. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
465. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
466. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
467. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
468. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
469. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
470. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
471. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
472. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
473. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
474. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
475. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
476. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
477. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
478. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
479. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
480. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
481. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
482. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
483. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
484. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
485. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
486. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
487. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
488. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
489. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
490. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
491. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
492. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
493. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
494. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
495. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
496. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
497. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
498. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
499. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
500. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
501. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
502. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
503. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
504. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
505. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
506. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
507. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
508. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
509. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
510. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
511. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
512. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
513. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
514. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
515. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
516. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
517. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
518. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
519. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
520. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
521. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
522. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
523. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
524. **Production Readiness**: Console.log statement found - `src/navigation/navigationRef.ts`
525. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
526. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
527. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
528. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
529. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
530. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
531. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
532. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
533. **Production Readiness**: Console.log statement found - `src/screens/ClubsScreen.tsx`
534. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
535. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
536. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
537. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
538. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
539. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
540. **Production Readiness**: Console.log statement found - `src/screens/ContactSupportScreen.tsx`
541. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
542. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
543. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
544. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
545. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
546. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
547. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
548. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
549. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
550. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
551. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
552. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
553. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
554. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
555. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
556. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
557. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
558. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
559. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
560. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
561. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
562. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
563. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
564. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
565. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
566. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
567. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
568. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
569. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
570. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
571. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
572. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
573. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
574. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
575. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
576. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
577. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
578. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
579. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
580. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
581. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
582. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
583. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
584. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
585. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
586. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
587. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
588. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
589. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
590. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
591. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
592. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
593. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
594. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
595. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
596. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
597. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
598. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
599. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
600. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
601. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
602. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
603. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
604. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
605. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
606. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
607. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
608. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
609. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
610. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
611. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
612. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
613. **Production Readiness**: Console.log statement found - `src/screens/SettingsScreen.tsx`
614. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
615. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
616. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
617. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
618. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
619. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
620. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
621. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
622. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
623. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
624. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
625. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
626. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
627. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
628. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
629. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
630. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
631. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
632. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
633. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
634. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
635. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
636. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
637. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
638. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
639. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
640. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
641. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
642. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
643. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
644. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
645. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
646. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
647. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
648. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
649. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
650. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
651. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
652. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
653. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
654. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
655. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
656. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
657. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
658. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
659. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
660. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
661. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
662. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
663. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
664. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
665. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
666. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
667. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
668. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
669. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
670. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
671. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
672. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
673. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
674. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
675. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
676. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
677. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
678. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
679. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
680. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
681. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
682. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
683. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
684. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
685. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
686. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
687. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
688. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualWorkoutScreen.tsx`
689. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
690. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
691. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
692. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
693. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
694. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
695. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
696. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
697. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
698. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
699. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
700. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
701. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
702. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
703. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
704. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
705. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
706. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
707. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
708. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
709. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
710. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
711. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
712. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
713. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
714. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
715. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
716. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
717. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
718. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
719. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
720. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
721. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
722. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
723. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
724. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
725. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
726. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
727. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
728. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
729. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
730. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
731. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
732. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
733. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
734. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
735. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
736. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
737. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
738. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
739. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
740. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
741. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
742. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
743. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
744. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
745. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
746. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
747. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
748. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
749. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
750. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
751. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
752. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
753. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
754. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
755. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
756. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
757. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
758. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
759. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
760. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
761. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
762. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
763. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
764. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
765. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
766. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
767. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
768. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
769. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
770. **Production Readiness**: Console.log statement found - `src/screens/events/EinundzwanzigDetailScreen.tsx`
771. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
772. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
773. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
774. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisDiscoveryScreen.tsx`
775. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
776. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
777. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
778. **Production Readiness**: Console.log statement found - `src/screens/satlantis/SatlantisEventDetailScreen.tsx`
779. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
780. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
781. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
782. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
783. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
784. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
785. **Production Readiness**: Console.log statement found - `src/services/activity/AutoCompetePreferencesService.ts`
786. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
787. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
788. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
789. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
790. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
791. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
792. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
793. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
794. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
795. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
796. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
797. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
798. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
799. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
800. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
801. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
802. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
803. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
804. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
805. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
806. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
807. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
808. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
809. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
810. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
811. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
812. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
813. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
814. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
815. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
816. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
817. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
818. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
819. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
820. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
821. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
822. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
823. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
824. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
825. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
826. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
827. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
828. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
829. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
830. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
831. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
832. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
833. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
834. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
835. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
836. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
837. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
838. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
839. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
840. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
841. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
842. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
843. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
844. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
845. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
846. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
847. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
848. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
849. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
850. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
851. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
852. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
853. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
854. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
855. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
856. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
857. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
858. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
859. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
860. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
861. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
862. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
863. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
864. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
865. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
866. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
867. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
868. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
869. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
870. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
871. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
872. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
873. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
874. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
875. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
876. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
877. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
878. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
879. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
880. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
881. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
882. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
883. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
884. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
885. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
886. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
887. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
888. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
889. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
890. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
891. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
892. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
893. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
894. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
895. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
896. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
897. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
898. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
899. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
900. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
901. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
902. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
903. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
904. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
905. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
906. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
907. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
908. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
909. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
910. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
911. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
912. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
913. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
914. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
915. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
916. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
917. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
918. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
919. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
920. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
921. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
922. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
923. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
924. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
925. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
926. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
927. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
928. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
929. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
930. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
931. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
932. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
933. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
934. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
935. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
936. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
937. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
938. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
939. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
940. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
941. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
942. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
943. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
944. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
945. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
946. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
947. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
948. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
949. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
950. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
951. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
952. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
953. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
954. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
955. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
956. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
957. **Production Readiness**: Console.log statement found - `src/services/activity/StepDiagnosticsService.ts`
958. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
959. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
960. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
961. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
962. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
963. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
964. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
965. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
966. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
967. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
968. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
969. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
970. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
971. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
972. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
973. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
974. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
975. **Production Readiness**: Console.log statement found - `src/services/activity/WeatherService.ts`
976. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
977. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
978. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
979. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
980. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
981. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
982. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
983. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
984. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
985. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
986. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
987. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
988. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
989. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
990. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
991. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
992. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
993. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
994. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
995. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
996. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
997. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
998. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
999. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1000. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1001. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1002. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1003. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1004. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
1005. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
1006. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
1007. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
1008. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
1009. **Production Readiness**: Console.log statement found - `src/services/anticheat/AntiCheatRequestService.ts`
1010. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1011. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1012. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1013. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1014. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1015. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1016. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1017. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1018. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1019. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1020. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1021. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1022. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1023. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
1024. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1025. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1026. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1027. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1028. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1029. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1030. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1031. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
1032. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1033. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1034. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1035. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1036. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1037. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1038. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1039. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
1040. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1041. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1042. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1043. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1044. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1045. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1046. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1047. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1048. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1049. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1050. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1051. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1052. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1053. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1054. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1055. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1056. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1057. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1058. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1059. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1060. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1061. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1062. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
1063. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1064. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1065. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1066. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1067. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1068. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1069. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1070. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1071. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1072. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1073. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1074. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1075. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1076. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1077. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1078. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1079. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1080. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1081. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1082. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1083. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1084. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1085. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1086. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1087. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1088. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1089. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1090. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1091. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1092. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1093. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1094. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1095. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1096. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1097. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1098. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1099. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1100. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
1101. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1102. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1103. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1104. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1105. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1106. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
1107. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1108. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1109. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1110. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1111. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
1112. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1113. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1114. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1115. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1116. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1117. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1118. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1119. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
1120. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1121. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1122. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1123. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1124. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1125. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1126. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1127. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1128. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1129. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1130. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1131. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1132. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1133. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1134. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1135. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1136. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1137. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1138. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1139. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1140. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1141. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1142. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1143. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1144. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1145. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1146. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1147. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1148. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1149. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1150. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1151. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1152. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
1153. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1154. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1155. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1156. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1157. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1158. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1159. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1160. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1161. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1162. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1163. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1164. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1165. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1166. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1167. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1168. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1169. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1170. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1171. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1172. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
1173. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1174. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1175. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1176. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1177. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1178. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1179. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1180. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1181. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1182. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1183. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1184. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1185. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1186. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1187. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1188. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1189. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1190. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1191. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1192. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1193. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1194. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1195. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1196. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1197. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1198. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1199. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1200. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1201. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1202. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1203. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1204. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1205. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1206. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1207. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1208. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1209. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1210. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1211. **Production Readiness**: Console.log statement found - `src/services/backend/SubscriptionService.ts`
1212. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1213. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1214. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1215. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1216. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1217. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1218. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1219. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1220. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1221. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1222. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1223. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1224. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1225. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1226. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1227. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1228. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1229. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1230. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1231. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1232. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1233. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1234. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1235. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1236. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1237. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1238. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1239. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1240. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1241. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1242. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1243. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1244. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1245. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1246. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1247. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1248. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1249. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1250. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1251. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1252. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1253. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1254. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1255. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1256. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1257. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1258. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1259. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1260. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1261. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1262. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1263. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1264. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1265. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1266. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1267. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1268. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1269. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1270. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1271. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1272. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1273. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1274. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1275. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1276. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1277. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1278. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1279. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1280. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1281. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1282. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1283. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1284. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1285. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1286. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1287. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1288. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1289. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1290. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1291. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1292. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1293. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1294. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1295. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1296. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1297. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1298. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1299. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1300. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1301. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1302. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1303. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1304. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1305. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1306. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1307. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1308. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1309. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1310. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1311. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1312. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1313. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1314. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1315. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1316. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1317. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1318. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1319. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1320. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1321. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1322. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1323. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1324. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1325. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1326. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1327. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1328. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1329. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1330. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1331. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1332. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1333. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1334. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1335. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1336. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1337. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1338. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1339. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1340. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1341. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1342. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1343. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1344. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1345. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1346. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1347. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1348. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1349. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1350. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1351. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1352. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1353. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1354. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1355. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1356. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1357. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1358. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1359. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1360. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1361. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1362. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1363. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1364. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1365. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1366. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1367. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1368. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1369. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1370. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1371. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1372. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1373. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1374. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1375. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1376. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1377. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1378. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1379. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1380. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1381. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1382. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1383. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1384. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1385. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1386. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1387. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1388. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1389. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1390. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1391. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1392. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1393. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1394. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1395. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1396. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1397. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1398. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1399. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1400. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1401. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1402. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1403. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1404. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1405. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1406. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1407. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1408. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1409. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1410. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1411. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1412. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1413. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1414. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1415. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1416. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1417. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1418. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1419. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1420. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1421. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1422. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1423. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1424. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1425. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1426. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1427. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1428. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1429. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1430. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1431. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1432. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1433. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1434. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1435. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1436. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1437. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1438. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1439. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1440. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1441. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1442. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1443. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1444. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1445. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1446. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1447. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1448. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1449. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1450. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1451. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1452. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1453. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1454. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1455. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1456. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1457. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1458. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1459. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1460. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1461. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1462. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1463. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1464. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1465. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1466. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1467. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1468. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1469. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1470. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1471. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1472. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1473. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1474. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1475. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1476. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1477. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1478. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1479. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1480. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1481. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1482. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1483. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1484. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1485. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1486. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1487. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1488. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1489. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1490. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1491. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1492. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1493. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1494. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1495. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1496. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1497. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1498. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1499. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1500. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1501. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1502. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1503. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1504. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1505. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1506. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1507. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1508. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1509. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1510. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1511. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1512. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1513. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1514. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1515. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1516. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1517. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1518. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1519. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1520. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1521. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1522. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1523. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1524. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1525. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1526. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1527. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1528. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1529. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1530. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeService.ts`
1531. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1532. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1533. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1534. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1535. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1536. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1537. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1538. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1539. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1540. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1541. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1542. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1543. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1544. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1545. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1546. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1547. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1548. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1549. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1550. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1551. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1552. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1553. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1554. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1555. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1556. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1557. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1558. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1559. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1560. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1561. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1562. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1563. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1564. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1565. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1566. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1567. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1568. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1569. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1570. **Production Readiness**: Console.log statement found - `src/services/club/ClubWalletService.ts`
1571. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1572. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1573. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1574. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1575. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1576. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1577. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1578. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1579. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1580. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1581. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1582. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1583. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1584. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1585. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1586. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1587. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1588. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1589. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1590. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1591. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1592. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1593. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1594. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1595. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1596. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1597. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1598. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1599. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1600. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1601. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1602. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1603. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1604. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1605. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1606. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1607. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1608. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1609. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1610. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1611. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1612. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1613. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1614. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1615. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1616. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1617. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1618. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1619. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1620. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1621. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1622. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1623. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1624. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1625. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1626. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1627. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1628. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1629. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1630. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1631. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1632. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1633. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1634. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1635. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1636. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1637. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1638. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1639. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1640. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1641. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1642. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1643. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1644. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1645. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1646. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1647. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1648. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1649. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1650. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1651. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1652. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1653. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1654. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1655. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1656. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1657. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1658. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1659. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1660. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1661. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1662. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1663. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1664. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1665. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1666. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1667. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1668. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1669. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1670. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1671. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1672. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1673. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1674. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1675. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1676. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1677. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1678. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1679. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1680. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1681. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1682. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1683. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1684. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1685. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1686. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1687. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1688. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1689. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1690. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1691. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1692. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1693. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1694. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1695. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1696. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1697. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1698. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1699. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1700. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1701. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1702. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1703. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1704. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1705. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1706. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1707. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1708. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1709. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1710. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1711. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1712. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1713. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1714. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1715. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1716. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1717. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1718. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1719. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1720. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1721. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1722. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1723. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1724. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1725. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1726. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1727. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1728. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1729. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1730. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1731. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1732. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1733. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1734. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1735. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1736. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1737. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1738. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1739. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1740. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1741. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1742. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1743. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1744. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1745. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1746. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1747. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1748. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1749. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1750. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1751. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1752. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1753. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1754. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1755. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1756. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1757. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1758. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1759. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1760. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1761. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1762. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1763. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1764. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1765. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1766. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1767. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1768. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1769. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1770. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1771. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1772. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1773. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1774. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1775. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1776. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1777. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1778. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1779. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1780. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1781. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1782. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1783. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1784. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1785. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1786. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1787. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1788. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1789. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1790. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1791. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1792. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1793. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1794. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1795. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1796. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1797. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1798. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1799. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1800. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1801. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1802. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1803. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1804. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1805. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1806. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1807. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1808. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1809. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1810. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1811. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1812. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1813. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1814. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1815. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1816. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1817. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1818. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1819. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1820. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1821. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1822. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1823. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1824. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1825. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1826. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1827. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1828. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1829. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1830. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1831. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1832. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1833. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1834. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1835. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1836. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1837. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1838. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1839. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1840. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1841. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1842. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1843. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1844. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1845. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1846. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1847. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1848. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1849. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1850. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1851. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1852. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1853. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1854. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1855. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1856. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1857. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1858. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1859. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1860. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1861. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1862. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1863. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1864. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1865. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1866. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1867. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1868. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1869. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1870. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1871. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1872. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1873. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1874. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1875. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1876. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1877. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1878. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1879. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1880. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1881. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1882. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1883. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1884. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1885. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1886. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1887. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1888. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1889. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1890. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1891. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1892. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1893. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1894. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1895. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1896. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1897. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1898. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1899. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1900. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1901. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1902. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1903. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1904. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1905. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1906. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1907. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1908. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1909. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1910. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1911. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1912. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1913. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1914. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1915. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1916. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1917. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1918. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1919. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1920. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1921. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1922. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1923. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1924. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1925. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1926. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1927. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1928. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1929. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1930. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1931. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1932. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1933. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1934. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1935. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1936. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1937. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1938. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1939. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1940. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1941. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1942. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1943. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1944. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1945. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1946. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1947. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1948. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1949. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1950. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1951. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1952. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1953. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1954. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1955. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1956. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1957. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1958. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1959. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1960. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1961. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1962. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1963. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1964. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1965. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1966. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1967. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1968. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1969. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1970. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1971. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1972. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1973. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1974. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1975. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1976. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1977. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1978. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1979. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1980. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1981. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1982. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1983. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1984. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1985. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1986. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1987. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1988. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1989. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1990. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1991. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1992. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1993. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1994. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1995. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1996. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1997. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1998. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1999. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2000. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2001. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2002. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2003. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2004. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2005. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2006. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
2007. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2008. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2009. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2010. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2011. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2012. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2013. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
2014. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2015. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2016. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2017. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2018. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2019. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2020. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2021. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2022. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
2023. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2024. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2025. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2026. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2027. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2028. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2029. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2030. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2031. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2032. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2033. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2034. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2035. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2036. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2037. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2038. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2039. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2040. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2041. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2042. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2043. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2044. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2045. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2046. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2047. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2048. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2049. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2050. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2051. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2052. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2053. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2054. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2055. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2056. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2057. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2058. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2059. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2060. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2061. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2062. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
2063. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2064. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2065. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2066. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2067. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2068. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
2069. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2070. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2071. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2072. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2073. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2074. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2075. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2076. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2077. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2078. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2079. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2080. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2081. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2082. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2083. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2084. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2085. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2086. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2087. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2088. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2089. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2090. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2091. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2092. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2093. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2094. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2095. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2096. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2097. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2098. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2099. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
2100. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2101. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2102. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2103. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2104. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2105. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2106. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2107. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2108. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2109. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2110. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2111. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2112. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2113. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2114. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2115. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2116. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2117. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2118. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2119. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2120. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2121. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2122. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2123. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
2124. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2125. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2126. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2127. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2128. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
2129. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2130. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2131. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
2132. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2133. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2134. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2135. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2136. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2137. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2138. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2139. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2140. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2141. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2142. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2143. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2144. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2145. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2146. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2147. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2148. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2149. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2150. **Production Readiness**: Console.log statement found - `src/services/fitness/garminActivityService.ts`
2151. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2152. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2153. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2154. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2155. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2156. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2157. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2158. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2159. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2160. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2161. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2162. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2163. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2164. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2165. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2166. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2167. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2168. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2169. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2170. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2171. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2172. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2173. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2174. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2175. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2176. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2177. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2178. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2179. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2180. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2181. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2182. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2183. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2184. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2185. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2186. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2187. **Production Readiness**: Console.log statement found - `src/services/fitness/garminAuthService.ts`
2188. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2189. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2190. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2191. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2192. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2193. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2194. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
2195. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2196. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2197. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2198. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2199. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2200. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2201. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2202. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2203. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2204. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2205. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2206. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2207. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2208. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2209. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2210. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2211. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2212. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2213. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2214. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2215. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2216. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2217. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2218. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2219. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2220. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2221. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2222. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2223. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2224. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2225. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2226. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2227. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2228. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2229. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2230. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2231. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2232. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2233. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2234. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2235. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2236. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2237. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2238. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2239. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2240. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2241. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2242. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2243. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2244. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2245. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2246. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2247. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2248. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2249. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2250. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2251. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2252. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2253. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2254. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2255. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2256. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2257. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2258. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2259. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2260. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2261. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2262. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2263. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2264. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2265. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2266. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2267. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2268. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2269. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2270. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2271. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2272. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2273. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2274. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2275. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2276. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2277. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2278. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2279. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2280. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2281. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2282. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2283. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2284. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2285. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2286. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2287. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2288. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2289. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2290. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2291. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2292. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2293. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2294. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2295. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2296. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2297. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2298. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2299. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2300. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2301. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2302. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2303. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2304. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2305. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2306. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2307. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2308. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2309. **Production Readiness**: Console.log statement found - `src/services/habits/HabitTrackerService.ts`
2310. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2311. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2312. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2313. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2314. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2315. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2316. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2317. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2318. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2319. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2320. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2321. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2322. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2323. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2324. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2325. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2326. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2327. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2328. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2329. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2330. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2331. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2332. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2333. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2334. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2335. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2336. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2337. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2338. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2339. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2340. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2341. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2342. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2343. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2344. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2345. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2346. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2347. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2348. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2349. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2350. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2351. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2352. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2353. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2354. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2355. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2356. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2357. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2358. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2359. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2360. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2361. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2362. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2363. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2364. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2365. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2366. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2367. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2368. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2369. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2370. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2371. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2372. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2373. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2374. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2375. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2376. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2377. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2378. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2379. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2380. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2381. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2382. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2383. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2384. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2385. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2386. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2387. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2388. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2389. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2390. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2391. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2392. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2393. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2394. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2395. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerPreferencesService.ts`
2396. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2397. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2398. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2399. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2400. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2401. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2402. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2403. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2404. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2405. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2406. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2407. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2408. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2409. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2410. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2411. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2412. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2413. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2414. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2415. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2416. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2417. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2418. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2419. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2420. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2421. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2422. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2423. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2424. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2425. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2426. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2427. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2428. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2429. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2430. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2431. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2432. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2433. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2434. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2435. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2436. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2437. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2438. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2439. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2440. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2441. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2442. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2443. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2444. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2445. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2446. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2447. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2448. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2449. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2450. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2451. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2452. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2453. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2454. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2455. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2456. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2457. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2458. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2459. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2460. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2461. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2462. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2463. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2464. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2465. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2466. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2467. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2468. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2469. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2470. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2471. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2472. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2473. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2474. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2475. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2476. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2477. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2478. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2479. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2480. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2481. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2482. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2483. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2484. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2485. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2486. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2487. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2488. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2489. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2490. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2491. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2492. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2493. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2494. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2495. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2496. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2497. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2498. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2499. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2500. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2501. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2502. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2503. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2504. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2505. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2506. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2507. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2508. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2509. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2510. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2511. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2512. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2513. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2514. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2515. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2516. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2517. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2518. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2519. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2520. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2521. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2522. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2523. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2524. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2525. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2526. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2527. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2528. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2529. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2530. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2531. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2532. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2533. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2534. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2535. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2536. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2537. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2538. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2539. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2540. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2541. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2542. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2543. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2544. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2545. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2546. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2547. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2548. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2549. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2550. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2551. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2552. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2553. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2554. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2555. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2556. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2557. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2558. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2559. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2560. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2561. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2562. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2563. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionParticipantService.ts`
2564. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2565. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2566. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2567. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2568. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2569. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2570. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2571. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2572. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2573. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2574. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2575. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2576. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2577. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2578. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2579. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2580. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2581. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2582. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2583. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2584. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2585. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2586. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2587. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2588. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2589. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2590. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2591. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2592. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2593. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2594. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2595. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2596. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2597. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2598. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2599. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2600. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2601. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2602. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2603. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2604. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2605. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2606. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2607. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2608. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2609. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2610. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2611. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2612. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2613. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2614. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2615. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2616. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2617. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2618. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2619. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2620. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2621. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2622. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2623. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2624. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2625. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2626. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2627. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2628. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2629. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2630. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2631. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2632. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2633. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2634. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2635. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2636. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2637. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2638. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2639. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2640. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2641. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2642. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2643. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2644. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2645. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2646. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2647. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2648. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2649. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2650. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2651. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2652. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2653. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2654. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2655. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2656. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2657. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2658. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2659. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2660. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2661. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2662. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2663. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2664. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2665. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2666. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2667. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2668. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2669. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2670. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2671. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2672. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2673. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2674. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2675. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2676. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2677. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2678. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2679. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2680. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2681. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2682. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2683. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2684. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2685. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2686. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2687. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2688. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2689. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2690. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2691. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2692. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2693. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2694. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2695. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2696. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2697. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2698. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2699. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2700. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2701. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2702. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2703. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2704. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2705. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2706. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2707. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2708. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2709. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2710. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2711. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2712. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2713. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2714. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2715. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2716. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2717. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2718. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2719. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2720. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2721. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2722. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2723. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2724. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2725. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2726. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2727. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2728. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2729. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2730. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2731. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2732. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2733. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2734. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2735. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2736. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2737. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2738. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2739. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2740. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2741. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2742. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2743. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2744. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2745. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2746. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2747. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2748. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2749. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2750. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2751. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2752. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2753. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2754. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2755. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2756. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2757. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2758. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2759. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2760. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2761. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2762. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2763. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2764. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2765. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2766. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2767. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2768. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2769. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2770. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2771. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2772. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2773. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2774. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2775. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2776. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2777. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2778. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
2779. **Production Readiness**: Console.log statement found - `src/services/nostr/leaderboardCardGenerator.ts`
2780. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2781. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2782. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2783. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2784. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2785. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2786. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2787. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2788. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2789. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2790. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2791. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2792. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2793. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2794. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2795. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2796. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2797. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2798. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2799. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2800. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2801. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2802. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2803. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2804. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2805. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2806. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2807. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2808. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2809. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2810. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2811. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2812. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2813. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2814. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2815. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2816. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2817. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2818. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2819. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2820. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2821. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2822. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2823. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2824. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2825. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2826. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2827. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2828. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2829. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2830. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2831. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2832. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2833. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2834. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2835. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2836. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2837. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2838. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2839. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2840. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2841. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2842. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2843. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2844. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2845. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2846. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2847. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2848. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2849. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2850. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2851. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2852. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2853. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2854. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2855. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2856. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2857. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2858. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2859. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2860. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2861. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2862. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2863. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2864. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2865. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2866. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2867. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2868. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2869. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2870. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2871. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2872. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2873. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2874. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2875. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2876. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2877. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2878. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2879. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2880. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2881. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2882. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2883. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2884. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2885. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2886. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2887. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2888. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2889. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2890. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationCleanupService.ts`
2891. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationPreferencesService.ts`
2892. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2893. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2894. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2895. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2896. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2897. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2898. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2899. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2900. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2901. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2902. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2903. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2904. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2905. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2906. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2907. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2908. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2909. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2910. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2911. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2912. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2913. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2914. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2915. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2916. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2917. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamNotificationFormatter.ts`
2918. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2919. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2920. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2921. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2922. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2923. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2924. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2925. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2926. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2927. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2928. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2929. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2930. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2931. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2932. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2933. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2934. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2935. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2936. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2937. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2938. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2939. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2940. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2941. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2942. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2943. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2944. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2945. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2946. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2947. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2948. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2949. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2950. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2951. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2952. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2953. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2954. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2955. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2956. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2957. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2958. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2959. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2960. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2961. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2962. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2963. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2964. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2965. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2966. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2967. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2968. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2969. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2970. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2971. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2972. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2973. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2974. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2975. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2976. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2977. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2978. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2979. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2980. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2981. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2982. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2983. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2984. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2985. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2986. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2987. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2988. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2989. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2990. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2991. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2992. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2993. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2994. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2995. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2996. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2997. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2998. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2999. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3000. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3001. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3002. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3003. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3004. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3005. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3006. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3007. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
3008. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3009. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3010. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3011. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3012. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3013. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3014. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3015. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3016. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3017. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
3018. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3019. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3020. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3021. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
3022. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3023. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3024. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
3025. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3026. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3027. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3028. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
3029. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3030. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3031. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3032. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3033. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3034. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3035. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3036. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3037. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3038. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3039. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3040. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3041. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3042. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3043. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3044. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
3045. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3046. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3047. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3048. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
3049. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3050. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3051. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3052. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3053. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3054. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
3055. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3056. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3057. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3058. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3059. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3060. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3061. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3062. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
3063. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3064. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3065. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3066. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3067. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3068. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3069. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3070. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3071. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3072. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3073. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3074. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3075. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3076. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3077. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3078. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3079. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3080. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3081. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3082. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3083. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3084. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3085. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3086. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3087. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3088. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3089. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3090. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3091. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3092. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3093. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3094. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3095. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3096. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3097. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3098. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3099. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3100. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3101. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3102. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3103. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3104. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3105. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventJoinService.ts`
3106. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3107. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3108. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3109. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3110. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3111. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3112. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3113. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3114. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3115. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisEventService.ts`
3116. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3117. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3118. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3119. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3120. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3121. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3122. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3123. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3124. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3125. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3126. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3127. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3128. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3129. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3130. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3131. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3132. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3133. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3134. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3135. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3136. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3137. **Production Readiness**: Console.log statement found - `src/services/satlantis/SatlantisRSVPService.ts`
3138. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3139. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3140. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3141. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3142. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3143. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3144. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3145. **Production Readiness**: Console.log statement found - `src/services/satlantis/UnifiedEventParticipantService.ts`
3146. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3147. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3148. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3149. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3150. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3151. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3152. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3153. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3154. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3155. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3156. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
3157. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3158. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3159. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3160. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3161. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3162. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3163. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3164. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3165. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3166. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3167. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3168. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3169. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
3170. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3171. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3172. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3173. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3174. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3175. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3176. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3177. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3178. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
3179. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3180. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3181. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3182. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3183. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3184. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3185. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3186. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3187. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3188. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3189. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3190. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3191. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3192. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3193. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3194. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
3195. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3196. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3197. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3198. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3199. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3200. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3201. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3202. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3203. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3204. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3205. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3206. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3207. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3208. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3209. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3210. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3211. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3212. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3213. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3214. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3215. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3216. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3217. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3218. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3219. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3220. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3221. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3222. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3223. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3224. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3225. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3226. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3227. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3228. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3229. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3230. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3231. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3232. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3233. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3234. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3235. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3236. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3237. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3238. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3239. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3240. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3241. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3242. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3243. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3244. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3245. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3246. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3247. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3248. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3249. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3250. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3251. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3252. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3253. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3254. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3255. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3256. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3257. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3258. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3259. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3260. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3261. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3262. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3263. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3264. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3265. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3266. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3267. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3268. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3269. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3270. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3271. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3272. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3273. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3274. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3275. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3276. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3277. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3278. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3279. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3280. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3281. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3282. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3283. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3284. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3285. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3286. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3287. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3288. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3289. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3290. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3291. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3292. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3293. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3294. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3295. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3296. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3297. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3298. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3299. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3300. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3301. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3302. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3303. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3304. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
3305. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3306. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3307. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3308. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3309. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3310. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3311. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3312. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3313. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
3314. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3315. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3316. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3317. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3318. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3319. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3320. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3321. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3322. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3323. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3324. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3325. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3326. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamStorageService.ts`
3327. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3328. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3329. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3330. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3331. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3332. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3333. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3334. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3335. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3336. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
3337. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3338. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3339. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3340. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3341. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3342. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
3343. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3344. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3345. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3346. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3347. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3348. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3349. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3350. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3351. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3352. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3353. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3354. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3355. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3356. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3357. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3358. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3359. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3360. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3361. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3362. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
3363. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
3364. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
3365. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
3366. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
3367. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3368. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3369. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3370. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3371. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3372. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3373. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3374. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3375. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3376. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
3377. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3378. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3379. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3380. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3381. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3382. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3383. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3384. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3385. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3386. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
3387. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3388. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3389. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3390. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3391. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3392. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
3393. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3394. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3395. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3396. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3397. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3398. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3399. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3400. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
3401. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3402. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3403. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3404. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3405. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3406. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3407. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3408. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
3409. **Production Readiness**: Console.log statement found - `src/services/watch/watchConnectivityService.ts`
3410. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3411. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3412. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3413. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3414. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3415. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3416. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3417. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3418. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3419. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3420. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3421. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3422. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
3423. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3424. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3425. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3426. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3427. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3428. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3429. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3430. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
3431. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3432. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3433. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3434. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3435. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3436. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3437. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3438. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
3439. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3440. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3441. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3442. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3443. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3444. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3445. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3446. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3447. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3448. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3449. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3450. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3451. **Production Readiness**: Console.log statement found - `src/utils/KalmanFilter.ts`
3452. **Production Readiness**: Console.log statement found - `src/utils/KalmanFilter.ts`
3453. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3454. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3455. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3456. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3457. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3458. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3459. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3460. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3461. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3462. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3463. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3464. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3465. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3466. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3467. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3468. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3469. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3470. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3471. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3472. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3473. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3474. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3475. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3476. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3477. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3478. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3479. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3480. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3481. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3482. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3483. **Production Readiness**: Console.log statement found - `src/utils/TTLDeduplicator.ts`
3484. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
3485. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
3486. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3487. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3488. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3489. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3490. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3491. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3492. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3493. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3494. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3495. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3496. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3497. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3498. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3499. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3500. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3501. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3502. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3503. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3504. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3505. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3506. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3507. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
3508. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3509. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3510. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3511. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3512. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3513. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3514. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3515. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3516. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3517. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3518. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3519. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3520. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3521. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3522. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3523. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3524. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3525. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3526. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3527. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3528. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3529. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3530. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3531. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3532. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3533. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3534. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3535. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3536. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
3537. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
3538. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
3539. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
3540. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
3541. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3542. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3543. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3544. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3545. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3546. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3547. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3548. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3549. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3550. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3551. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3552. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3553. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3554. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3555. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3556. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3557. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3558. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3559. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3560. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3561. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3562. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3563. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3564. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3565. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3566. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3567. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3568. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3569. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3570. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3571. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3572. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3573. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3574. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3575. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3576. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3577. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3578. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3579. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3580. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3581. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3582. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3583. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3584. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3585. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3586. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3587. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3588. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3589. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3590. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3591. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3592. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3593. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3594. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3595. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3596. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3597. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3598. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3599. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3600. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3601. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3602. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
3603. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
3604. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3605. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3606. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3607. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3608. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3609. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3610. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3611. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3612. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3613. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3614. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3615. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
3616. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
3617. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
3618. **Production Readiness**: Console.log statement found - `src/utils/nwcDecryptor.ts`
3619. **Production Readiness**: Console.log statement found - `src/utils/nwcDecryptor.ts`
3620. **Production Readiness**: Console.log statement found - `src/utils/progressiveLoader.ts`
3621. **Production Readiness**: Console.log statement found - `src/utils/progressiveLoader.ts`
3622. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3623. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3624. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3625. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3626. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3627. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3628. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3629. **Production Readiness**: Console.log statement found - `src/utils/secretDecryptor.ts`
3630. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3631. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3632. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3633. **Production Readiness**: Console.log statement found - `src/utils/supabase.ts`
3634. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3635. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3636. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3637. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3638. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3639. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3640. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3641. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3642. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3643. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3644. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3645. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3646. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3647. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3648. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3649. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3650. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3651. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3652. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3653. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3654. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3655. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3656. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3657. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3658. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3659. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3660. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3661. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3662. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3663. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3664. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3665. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3666. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3667. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3668. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3669. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3670. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3671. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3672. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3673. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3674. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3675. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3676. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3677. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3678. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
3679. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3680. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3681. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3682. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3683. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3684. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3685. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3686. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3687. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3688. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3689. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3690. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
3691. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
3692. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
3693. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
3694. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
3695. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3696. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3697. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3698. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3699. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3700. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3701. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3702. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3703. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3704. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3705. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3706. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3707. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3708. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3709. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3710. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3711. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3712. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3713. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3714. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3715. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3716. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3717. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3718. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3719. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3720. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3721. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3722. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3723. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3724. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3725. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3726. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3727. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3728. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3729. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3730. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`
3731. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`

</details>

