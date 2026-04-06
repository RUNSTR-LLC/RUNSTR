# RUNSTR Pre-Launch Audit Report

**Date**: 2026-04-05

## Summary

- 🔴 Critical: 10
- 🟠 High: 34
- 🟡 Medium: 1026
- 🟢 Low: 3208
- **Total**: 4278

## 🔴 Critical Issues

### 1. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/App.tsx`:822
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 2. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/profile/tabs/PublicWorkoutsTab.tsx`:48
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 3. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/ui/NostrConnectionStatus.tsx`:32
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 4. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/hooks/useSeason2.ts`:244
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 5. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/CyclingTrackerScreen.tsx`:141
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 6. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/CyclingTrackerScreen.tsx`:372
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 7. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/HikingTrackerScreen.tsx`:110
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 8. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/RunningTrackerScreen.tsx`:189
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 9. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/RunningTrackerScreen.tsx`:416
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 10. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/activity/WalkingTrackerScreen.tsx`:159
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

## 🟠 High Priority Issues

### 1. Error Handling: Async operations without error handling

- **File**: `src/screens/CommentsScreen.tsx`
- **Fix**: Add try-catch blocks around async operations or wrap component in ErrorBoundary

### 2. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/DietTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 3. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/ManualEntryScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 4. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/MeditationTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 5. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/StrengthTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 6. User Experience: Data fetching without loading indicator

- **File**: `src/screens/activity/WaterTrackerScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 7. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/backup/RestoreService.ts`:114
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 8. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:31
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 9. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:38
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 10. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:45
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 11. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:213
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 12. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:280
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 13. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:413
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 14. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:484
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 15. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:576
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 16. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:625
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 17. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:634
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 18. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:635
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 19. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:636
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 20. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:638
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 21. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:660
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 22. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/cache/UnifiedWorkoutCache.ts`:662
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 23. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:85
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 24. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:138
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 25. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:312
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 26. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:509
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 27. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:557
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 28. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:613
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 29. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:667
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 30. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/GlobalNDKService.ts`:13
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 31. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:428
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 32. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:496
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 33. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season2Service.ts`:56
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 34. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/wot/WoTService.ts`:94
- **Fix**: Add limit, since, or until to prevent fetching too many events

## 🟡 Medium Priority Issues

<details>
<summary>Click to expand (1026 issues)</summary>

1. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/activity/CameraPositionGuide.tsx`
2. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
3. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
4. **UI Consistency**: Hardcoded color found: #f7931a - `src/components/activity/WorkoutSummaryModal.tsx`
5. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
6. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
7. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
8. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
9. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
10. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
11. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
12. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
13. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
14. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
15. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
16. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
17. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
18. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
19. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
20. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ai/PPQAPIKeyModal.tsx`
21. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
22. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ai/PPQAPIKeyModal.tsx`
23. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
24. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
25. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/ai/PPQAPIKeyModal.tsx`
26. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/ai/PPQAPIKeyModal.tsx`
27. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
28. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
29. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
30. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAPIKeyModal.tsx`
31. **UI Consistency**: Hardcoded color found: #3a3a3a - `src/components/ai/PPQAPIKeyModal.tsx`
32. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
33. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
34. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
35. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAPIKeyModal.tsx`
36. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
37. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ai/PPQAPIKeyModal.tsx`
38. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/ai/PPQAPIKeyModal.tsx`
39. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAPIKeyModal.tsx`
40. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
41. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
42. **UI Consistency**: Hardcoded color found: #000 - `src/components/ai/PPQAccountSetupModal.tsx`
43. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAccountSetupModal.tsx`
44. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ai/PPQAccountSetupModal.tsx`
45. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
46. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/ai/PPQAccountSetupModal.tsx`
47. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/ai/PPQAccountSetupModal.tsx`
48. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
49. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAccountSetupModal.tsx`
50. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
51. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/ai/PPQAccountSetupModal.tsx`
52. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
53. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ai/PPQAccountSetupModal.tsx`
54. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ai/PPQAccountSetupModal.tsx`
55. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
56. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
57. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
58. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
59. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
60. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
61. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
62. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/analytics/AchievementsCard.tsx`
63. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/AchievementsCard.tsx`
64. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
65. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/AchievementsCard.tsx`
66. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
67. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
68. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/AchievementsCard.tsx`
69. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
70. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/AchievementsCard.tsx`
71. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
72. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
73. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
74. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
75. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
76. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
77. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
78. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleAchievementsCard.tsx`
79. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleAchievementsCard.tsx`
80. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/CollapsibleSection.tsx`
81. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/CollapsibleSection.tsx`
82. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleSection.tsx`
83. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/CollapsibleSection.tsx`
84. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/HealthSnapshotCard.tsx`
85. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
86. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
87. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/analytics/HealthSnapshotCard.tsx`
88. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/HealthSnapshotCard.tsx`
89. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/analytics/HealthSnapshotCard.tsx`
90. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/HealthSnapshotCard.tsx`
91. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/HealthSnapshotCard.tsx`
92. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
93. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
94. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
95. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
96. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
97. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
98. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
99. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
100. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
101. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/LevelCard.tsx`
102. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
103. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
104. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/analytics/LevelCard.tsx`
105. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/analytics/LevelCard.tsx`
106. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/analytics/LevelCard.tsx`
107. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
108. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
109. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/analytics/LevelCard.tsx`
110. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/analytics/LevelCard.tsx`
111. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
112. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
113. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
114. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
115. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
116. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/backup/ExportDataModal.tsx`
117. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/backup/ExportDataModal.tsx`
118. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
119. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
120. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
121. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ExportDataModal.tsx`
122. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
123. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
124. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ExportDataModal.tsx`
125. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ExportDataModal.tsx`
126. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
127. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
128. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ExportDataModal.tsx`
129. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ExportDataModal.tsx`
130. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ExportDataModal.tsx`
131. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/backup/ExportDataModal.tsx`
132. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/backup/ExportDataModal.tsx`
133. **UI Consistency**: Hardcoded color found: #666 - `src/components/backup/ImportDataModal.tsx`
134. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
135. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
136. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
137. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
138. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
139. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
140. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
141. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
142. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
143. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
144. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
145. **UI Consistency**: Hardcoded color found: #888 - `src/components/backup/ImportDataModal.tsx`
146. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
147. **UI Consistency**: Hardcoded color found: #000 - `src/components/backup/ImportDataModal.tsx`
148. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/backup/ImportDataModal.tsx`
149. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/backup/ImportDataModal.tsx`
150. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/cards/WorkoutCardRenderer.tsx`
151. **UI Consistency**: Hardcoded color found: #888 - `src/components/cards/WorkoutCardRenderer.tsx`
152. **UI Consistency**: Hardcoded color found: #111111 - `src/components/club/ClubEarningsCard.tsx`
153. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/competition/JoinRequestCard.tsx`
154. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
155. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
156. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
157. **UI Consistency**: Hardcoded color found: #111111 - `src/components/creation/SimpleEventCreationModal.tsx`
158. **UI Consistency**: Hardcoded color found: #111111 - `src/components/creation/SimpleEventCreationModal.tsx`
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
192. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
193. **UI Consistency**: Hardcoded color found: #000000 - `src/components/event/EventPaymentModal.tsx`
194. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
195. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/EventPaymentModal.tsx`
196. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/event/EventPaymentModal.tsx`
197. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
198. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
199. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
200. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
201. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
202. **UI Consistency**: Hardcoded color found: #222222 - `src/components/events/DynamicEventCard.tsx`
203. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
204. **UI Consistency**: Hardcoded color found: #666666 - `src/components/events/DynamicEventCard.tsx`
205. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
206. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
207. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
208. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/DynamicEventCard.tsx`
209. **UI Consistency**: Hardcoded color found: #333333 - `src/components/events/DynamicEventCard.tsx`
210. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/DynamicEventCard.tsx`
211. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
212. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
213. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
214. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/EinundzwanzigEventCard.tsx`
215. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/LeaderboardEventCard.tsx`
216. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
217. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/LeaderboardEventCard.tsx`
218. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
219. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
220. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
221. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/events/RunstrEventCreationModal.tsx`
222. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/events/RunstrEventCreationModal.tsx`
223. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
224. **UI Consistency**: Hardcoded color found: #000000 - `src/components/events/Season2EventCard.tsx`
225. **UI Consistency**: Hardcoded color found: #111111 - `src/components/events/Season2EventCard.tsx`
226. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/EnergySelector.tsx`
227. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEditorModal.tsx`
228. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/JournalEntryCard.tsx`
229. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/journal/MoodSelector.tsx`
230. **UI Consistency**: Hardcoded color found: #fff - `src/components/journal/VoiceRecordButton.tsx`
231. **UI Consistency**: Hardcoded color found: #0f0f0f - `src/components/lightning/NWCLightningButton.tsx`
232. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/lottery/LotteryWheel.tsx`
233. **UI Consistency**: Hardcoded color found: #2a1a0a - `src/components/lottery/LotteryWheel.tsx`
234. **UI Consistency**: Hardcoded color found: #2ecc71 - `src/components/music/AddToPlaylistSheet.tsx`
235. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomPlaylistEditModal.tsx`
236. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/BlossomTrackEditModal.tsx`
237. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/CreatePlaylistModal.tsx`
238. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
239. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
240. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/ExpandedMusicPlayer.tsx`
241. **UI Consistency**: Hardcoded color found: #fff - `src/components/music/PlaylistBrowser.tsx`
242. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
243. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
244. **UI Consistency**: Hardcoded color found: #000 - `src/components/music/WavlakeZapButton.tsx`
245. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/EarningsDisplay.tsx`
246. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/EarningsDisplay.tsx`
247. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/EarningsDisplay.tsx`
248. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/GroupedNotificationCard.tsx`
249. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
250. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/GroupedNotificationCard.tsx`
251. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
252. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
253. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
254. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/GroupedNotificationCard.tsx`
255. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
256. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/GroupedNotificationCard.tsx`
257. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
258. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/LiveIndicator.tsx`
259. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/LiveIndicator.tsx`
260. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/MiniLeaderboard.tsx`
261. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
262. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
263. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/MiniLeaderboard.tsx`
264. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
265. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
266. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
267. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/NotificationActions.tsx`
268. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
269. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
270. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationActions.tsx`
271. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/NotificationCard.tsx`
272. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
273. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
274. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
275. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
276. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
277. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/NotificationCard.tsx`
278. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/NotificationCard.tsx`
279. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
280. **UI Consistency**: Hardcoded color found: #999 - `src/components/notifications/NotificationCard.tsx`
281. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
282. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/CompactTeamCard.tsx`
283. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/CompactTeamCard.tsx`
284. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
285. **UI Consistency**: Hardcoded color found: #666666 - `src/components/profile/CompactTeamCard.tsx`
286. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
287. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
288. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
289. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
290. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
291. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/DebugAuthBanner.tsx`
292. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
293. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
294. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
295. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
296. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
297. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MonthlyStatsPanel.tsx`
298. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
299. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/MonthlyStatsPanel.tsx`
300. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
301. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/MonthlyStatsPanel.tsx`
302. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
303. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
304. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
305. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
306. **UI Consistency**: Hardcoded color found: #999999 - `src/components/profile/MonthlyStatsPanel.tsx`
307. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
308. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
309. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
310. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/NotificationBadge.tsx`
311. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/ProfileHeader.tsx`
312. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
313. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
314. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
315. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WalletSection.tsx`
316. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WalletSection.tsx`
317. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
318. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
319. **UI Consistency**: Hardcoded color found: #9ca3af - `src/components/profile/WatchSyncSection.tsx`
320. **UI Consistency**: Hardcoded color found: #1f1f1f - `src/components/profile/WatchSyncSection.tsx`
321. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/WatchSyncSection.tsx`
322. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
323. **UI Consistency**: Hardcoded color found: #6b7280 - `src/components/profile/WatchSyncSection.tsx`
324. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/profile/WorkoutLevelRing.tsx`
325. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
326. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
327. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WorkoutLevelRing.tsx`
328. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
329. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
330. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
331. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
332. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
333. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/WorkoutLevelRing.tsx`
334. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
335. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/WorkoutStatsSheet.tsx`
336. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
337. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
338. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
339. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
340. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
341. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
342. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
343. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
344. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
345. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
346. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
347. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
348. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
349. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
350. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
351. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
352. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
353. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
354. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
355. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
356. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
357. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
358. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
359. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
360. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
361. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
362. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
363. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
364. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
365. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
366. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
367. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/EnhancedWorkoutCard.tsx`
368. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/shared/FullScreenCardModal.tsx`
369. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
370. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
371. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
372. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
373. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
374. **UI Consistency**: Hardcoded color found: #8b7355 - `src/components/profile/shared/FullScreenCardModal.tsx`
375. **UI Consistency**: Hardcoded color found: #FF3333 - `src/components/profile/shared/FullScreenCardModal.tsx`
376. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
377. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
378. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
379. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
380. **UI Consistency**: Hardcoded color found: #111 - `src/components/profile/shared/FullScreenCardModal.tsx`
381. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
382. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
383. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
384. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
385. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
386. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenCardModal.tsx`
387. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
388. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
389. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
390. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/FullScreenCardModal.tsx`
391. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
392. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
393. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
394. **UI Consistency**: Hardcoded color found: #888 - `src/components/profile/shared/FullScreenCardModal.tsx`
395. **UI Consistency**: Hardcoded color found: #333 - `src/components/profile/shared/FullScreenCardModal.tsx`
396. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/shared/FullScreenCardModal.tsx`
397. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenCardModal.tsx`
398. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/FullScreenVerticalCard.tsx`
399. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
400. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
401. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/shared/FullScreenVerticalCard.tsx`
402. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/MonthlyWorkoutGroup.tsx`
403. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/shared/SocialShareModal.tsx`
404. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/SyncDropdown.tsx`
405. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
406. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
407. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
408. **UI Consistency**: Hardcoded color found: #8B7355 - `src/components/profile/shared/TimelineEntryCard.tsx`
409. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
410. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/shared/TimelineEntryCard.tsx`
411. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/TimelineEntryCard.tsx`
412. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/AppleHealthTab.tsx`
413. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/AppleHealthTab.tsx`
414. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/tabs/HealthConnectTab.tsx`
415. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/tabs/HealthConnectTab.tsx`
416. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
417. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
418. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
419. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
420. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
421. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
422. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
423. **UI Consistency**: Hardcoded color found: #111111 - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
424. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
425. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRDisplayModal.tsx`
426. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRDisplayModal.tsx`
427. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
428. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
429. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
430. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
431. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
432. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
433. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
434. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
435. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
436. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
437. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
438. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
439. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
440. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
441. **UI Consistency**: Hardcoded color found: #996633 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
442. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
443. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
444. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
445. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
446. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
447. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/CharityPayoutLeaderboard.tsx`
448. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
449. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
450. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/CharityPayoutLeaderboard.tsx`
451. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
452. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/EarningsHeroCard.tsx`
453. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
454. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
455. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
456. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/EarningsHeroCard.tsx`
457. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
458. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
459. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
460. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/EarningsHeroCard.tsx`
461. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
462. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/EarningsHeroCard.tsx`
463. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
464. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/EarningsHeroCard.tsx`
465. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/EarningsHeroCard.tsx`
466. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/EarningsHeroCard.tsx`
467. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
468. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/EarningsHeroCard.tsx`
469. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/GlobalBreakdownCard.tsx`
470. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/GlobalBreakdownCard.tsx`
471. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
472. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
473. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
474. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/GlobalBreakdownCard.tsx`
475. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/GlobalBreakdownCard.tsx`
476. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
477. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/GlobalBreakdownCard.tsx`
478. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
479. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
480. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/GlobalBreakdownCard.tsx`
481. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/GlobalBreakdownCard.tsx`
482. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
483. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/ImpactHeroCard.tsx`
484. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
485. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/ImpactHeroCard.tsx`
486. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
487. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
488. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
489. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
490. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
491. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/ImpactHeroCard.tsx`
492. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
493. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/ImpactHeroCard.tsx`
494. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
495. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
496. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/ImpactHeroCard.tsx`
497. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/ImpactHeroCard.tsx`
498. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
499. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/ImpactHeroCard.tsx`
500. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
501. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
502. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/ImpactHeroCard.tsx`
503. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/ImpactHeroCard.tsx`
504. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PendingPayoutsCard.tsx`
505. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
506. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
507. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
508. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PendingPayoutsCard.tsx`
509. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PendingPayoutsCard.tsx`
510. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/PendingPayoutsCard.tsx`
511. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PeriodSelector.tsx`
512. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PeriodSelector.tsx`
513. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/PeriodSelector.tsx`
514. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/PeriodSelector.tsx`
515. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
516. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
517. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/PersonalImpactSection.tsx`
518. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/PersonalImpactSection.tsx`
519. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
520. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
521. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
522. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
523. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/PersonalImpactSection.tsx`
524. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
525. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/PersonalImpactSection.tsx`
526. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
527. **UI Consistency**: Hardcoded color found: #111 - `src/components/rewards/PersonalImpactSection.tsx`
528. **UI Consistency**: Hardcoded color found: #1a1510 - `src/components/rewards/PersonalImpactSection.tsx`
529. **UI Consistency**: Hardcoded color found: #2a2010 - `src/components/rewards/PersonalImpactSection.tsx`
530. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
531. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
532. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
533. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/PersonalImpactSection.tsx`
534. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/PersonalImpactSection.tsx`
535. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/PersonalImpactSection.tsx`
536. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
537. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
538. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
539. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
540. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
541. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/RewardBreakdownCard.tsx`
542. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
543. **UI Consistency**: Hardcoded color found: #444 - `src/components/rewards/RewardBreakdownCard.tsx`
544. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardBreakdownCard.tsx`
545. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
546. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
547. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
548. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/RewardBreakdownCard.tsx`
549. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardBreakdownCard.tsx`
550. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardBreakdownCard.tsx`
551. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
552. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/RewardBreakdownCard.tsx`
553. **UI Consistency**: Hardcoded color found: #000000 - `src/components/rewards/RewardDestinationPicker.tsx`
554. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
555. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
556. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationPicker.tsx`
557. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationPicker.tsx`
558. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
559. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationPicker.tsx`
560. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
561. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/RewardDestinationSection.tsx`
562. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
563. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/RewardDestinationSection.tsx`
564. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/RewardDestinationSection.tsx`
565. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/rewards/RewardDestinationSection.tsx`
566. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/rewards/RewardDestinationSection.tsx`
567. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/SponsorBanner.tsx`
568. **UI Consistency**: Hardcoded color found: #888 - `src/components/rewards/SponsorBanner.tsx`
569. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
570. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
571. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
572. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
573. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
574. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
575. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
576. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
577. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TotalRewardsCard.tsx`
578. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
579. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
580. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
581. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TotalRewardsCard.tsx`
582. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
583. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/rewards/TotalRewardsCard.tsx`
584. **UI Consistency**: Hardcoded color found: #999 - `src/components/rewards/TotalRewardsCard.tsx`
585. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/rewards/TotalRewardsCard.tsx`
586. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TotalRewardsCard.tsx`
587. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
588. **UI Consistency**: Hardcoded color found: #000 - `src/components/rewards/TransparencyDashboardModal.tsx`
589. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
590. **UI Consistency**: Hardcoded color found: #666 - `src/components/rewards/TransparencyDashboardModal.tsx`
591. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/rewards/TransparencyDashboardModal.tsx`
592. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/rewards/TransparencyDashboardModal.tsx`
593. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
594. **UI Consistency**: Hardcoded color found: #555 - `src/components/rewards/TransparencyDashboardModal.tsx`
595. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
596. **UI Consistency**: Hardcoded color found: #111111 - `src/components/routes/RouteSelectionModal.tsx`
597. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/season2/Season2Banner.tsx`
598. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/season2/Season2Banner.tsx`
599. **UI Consistency**: Hardcoded color found: #f5a623 - `src/components/season2/Season2Banner.tsx`
600. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
601. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
602. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/AgentSkillSetupModal.tsx`
603. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
604. **UI Consistency**: Hardcoded color found: #333 - `src/components/settings/AgentSkillSetupModal.tsx`
605. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/settings/AgentSkillSetupModal.tsx`
606. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
607. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
608. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
609. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
610. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
611. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
612. **UI Consistency**: Hardcoded color found: #ccc - `src/components/settings/AgentSkillSetupModal.tsx`
613. **UI Consistency**: Hardcoded color found: #222 - `src/components/settings/AgentSkillSetupModal.tsx`
614. **UI Consistency**: Hardcoded color found: #000 - `src/components/settings/AgentSkillSetupModal.tsx`
615. **UI Consistency**: Hardcoded color found: #111 - `src/components/settings/AgentSkillSetupModal.tsx`
616. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
617. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
618. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/AgentSkillSetupModal.tsx`
619. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
620. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
621. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/settings/WearableConnectionModal.tsx`
622. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/settings/WearableConnectionModal.tsx`
623. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
624. **UI Consistency**: Hardcoded color found: #111111 - `src/components/settings/WearableConnectionModal.tsx`
625. **UI Consistency**: Hardcoded color found: #999999 - `src/components/settings/WearableConnectionModal.tsx`
626. **UI Consistency**: Hardcoded color found: #000000 - `src/components/settings/WearableConnectionModal.tsx`
627. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/settings/WearableConnectionModal.tsx`
628. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/CharitySection.tsx`
629. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
630. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
631. **UI Consistency**: Hardcoded color found: #000000 - `src/components/team/CharitySection.tsx`
632. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/team/DailyLeaderboardCard.tsx`
633. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
634. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
635. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
636. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/DailyLeaderboardCard.tsx`
637. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
638. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/DailyLeaderboardCard.tsx`
639. **UI Consistency**: Hardcoded color found: #FF8C00 - `src/components/team/DailyLeaderboardCard.tsx`
640. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/SimpleLeagueDisplay.tsx`
641. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/SimpleLeagueDisplay.tsx`
642. **UI Consistency**: Hardcoded color found: #333 - `src/components/team/SimpleLeagueDisplay.tsx`
643. **UI Consistency**: Hardcoded color found: #999 - `src/components/team/SimpleLeagueDisplay.tsx`
644. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/ActionButton.tsx`
645. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/ActionButton.tsx`
646. **UI Consistency**: Hardcoded color found: #ccc - `src/components/ui/ActionButton.tsx`
647. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/BottomNavigation.tsx`
648. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/BottomNavigation.tsx`
649. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
650. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/BottomNavigation.tsx`
651. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
652. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
653. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
654. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
655. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/Card.tsx`
656. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/CharityZapIconButton.tsx`
657. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/CustomAlert.tsx`
658. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/CustomAlert.tsx`
659. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/DifficultyIndicator.tsx`
660. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/DifficultyIndicator.tsx`
661. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/DifficultyIndicator.tsx`
662. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/DropdownMenu.tsx`
663. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/DropdownMenu.tsx`
664. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/FilterChips.tsx`
665. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/MemberAvatar.tsx`
666. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
667. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
668. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
669. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
670. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
671. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/ui/NostrConnectionStatus.tsx`
672. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/ui/PrimaryButton.tsx`
673. **UI Consistency**: Hardcoded color found: #CCCCCC - `src/components/ui/PrimaryButton.tsx`
674. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
675. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
676. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
677. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
678. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
679. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/PrivacyNoticeModal.tsx`
680. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
681. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
682. **UI Consistency**: Hardcoded color found: #111111 - `src/components/ui/PrivacyNoticeModal.tsx`
683. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/PrivacyNoticeModal.tsx`
684. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
685. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
686. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/PrivacyNoticeModal.tsx`
687. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/PrivacyNoticeModal.tsx`
688. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
689. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
690. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/SettingsAccordion.tsx`
691. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
692. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
693. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/SettingsAccordion.tsx`
694. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/SettingsAccordion.tsx`
695. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/SettingsAccordion.tsx`
696. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
697. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
698. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
699. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
700. **UI Consistency**: Hardcoded color found: #333333 - `src/components/ui/SplashScreen.tsx`
701. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/StatCard.tsx`
702. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/StatCard.tsx`
703. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
704. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
705. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/StatCard.tsx`
706. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/StatCard.tsx`
707. **UI Consistency**: Hardcoded color found: #0d0d0d - `src/components/ui/TexturedBackground.tsx`
708. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
709. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
710. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/toastConfig.tsx`
711. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/toastConfig.tsx`
712. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
713. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/ui/toastConfig.tsx`
714. **UI Consistency**: Hardcoded color found: #888888 - `src/components/ui/toastConfig.tsx`
715. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
716. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
717. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/AutoWithdrawSection.tsx`
718. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
719. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
720. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
721. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
722. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
723. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
724. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
725. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
726. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
727. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
728. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
729. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
730. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
731. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/CoinOSAccountSetupModal.tsx`
732. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/CoinOSAccountSetupModal.tsx`
733. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
734. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
735. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
736. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/HistoryModal.tsx`
737. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
738. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
739. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/LightningAddressSetupModal.tsx`
740. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
741. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
742. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
743. **UI Consistency**: Hardcoded color found: #0a1a0a - `src/components/wallet/LightningAddressSetupModal.tsx`
744. **UI Consistency**: Hardcoded color found: #1a3a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
745. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
746. **UI Consistency**: Hardcoded color found: #2a2a2a - `src/components/wallet/LightningAddressSetupModal.tsx`
747. **UI Consistency**: Hardcoded color found: #2a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
748. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/LightningAddressSetupModal.tsx`
749. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/LightningAddressSetupModal.tsx`
750. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
751. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
752. **UI Consistency**: Hardcoded color found: #000 - `src/components/wallet/NWCQRConfirmationModal.tsx`
753. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
754. **UI Consistency**: Hardcoded color found: #1a0a0a - `src/components/wallet/NWCQRConfirmationModal.tsx`
755. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
756. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/NWCQRConfirmationModal.tsx`
757. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/NWCQRConfirmationModal.tsx`
758. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
759. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
760. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
761. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
762. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
763. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/SendModal.tsx`
764. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletActivityList.tsx`
765. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
766. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletBalanceCard.tsx`
767. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletBalanceCard.tsx`
768. **UI Consistency**: Hardcoded color found: #FF6B00 - `src/components/wallet/WalletConnectionError.tsx`
769. **Error Handling**: AsyncStorage operation without try-catch - `src/components/activity/WorkoutSummaryModal.tsx`
770. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubChatSection.tsx`
771. **Error Handling**: AsyncStorage operation without try-catch - `src/components/club/ClubEventsSection.tsx`
772. **Error Handling**: AsyncStorage operation without try-catch - `src/components/compete/LeaderboardsContent.tsx`
773. **Error Handling**: AsyncStorage operation without try-catch - `src/components/lottery/LotteryWheelSection.tsx`
774. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
775. **Error Handling**: AsyncStorage operation without try-catch - `src/components/team/CharitySection.tsx`
776. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
777. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
778. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSeason2.ts`
779. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
780. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
781. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useSupabaseLeaderboard.ts`
782. **Error Handling**: AsyncStorage operation without try-catch - `src/hooks/useUnitPreference.ts`
783. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ClubChatScreen.tsx`
784. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ContactSupportScreen.tsx`
785. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
786. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/RewardsScreen.tsx`
787. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
788. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
789. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
790. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/TeamsScreen.tsx`
791. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
792. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
793. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/DynamicEventDetailScreen.tsx`
794. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/events/EinundzwanzigDetailScreen.tsx`
795. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/useSettingsState.ts`
796. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/useSettingsState.ts`
797. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/useSettingsState.ts`
798. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/useSettingsState.ts`
799. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
800. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
801. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
802. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BatteryOptimizationService.ts`
803. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
804. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
805. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
806. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
807. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTracker.ts`
808. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SimpleRunTrackerTask.ts`
809. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
810. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/WorkoutRecovery.ts`
811. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
812. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
813. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/SecureNsecStorage.ts`
814. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
815. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
816. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
817. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
818. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
819. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
820. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
821. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
822. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
823. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
824. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
825. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
826. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
827. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
828. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
829. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
830. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
831. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
832. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
833. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
834. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
835. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
836. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
837. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
838. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
839. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
840. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
841. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
842. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
843. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
844. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
845. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/__tests__/UnifiedSigningService.test.ts`
846. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
847. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
848. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
849. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
850. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
851. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
852. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/__tests__/AmberNDKSigner.test.ts`
853. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
854. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
855. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
856. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
857. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
858. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
859. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
860. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
861. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
862. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
863. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/ClubChatService.ts`
864. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
865. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backend/SupabaseCompetitionService.ts`
866. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/AutoBackupService.ts`
867. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
868. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
869. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
870. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/BackupService.ts`
871. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
872. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
873. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
874. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
875. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
876. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
877. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
878. **Error Handling**: AsyncStorage operation without try-catch - `src/services/backup/RestoreService.ts`
879. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/EinundzwanzigService.ts`
880. **Error Handling**: AsyncStorage operation without try-catch - `src/services/club/ClubChatAutoShare.ts`
881. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/AutoJoinService.ts`
882. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/DailyLeaderboardService.ts`
883. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
884. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/PendingSubmissionService.ts`
885. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
886. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
887. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
888. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
889. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
890. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
891. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
892. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
893. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
894. **Error Handling**: AsyncStorage operation without try-catch - `src/services/core/AppInitializationService.ts`
895. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
896. **Error Handling**: AsyncStorage operation without try-catch - `src/services/donation/DonationTrackingService.ts`
897. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
898. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/CaptainEventStore.ts`
899. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
900. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventParticipationStore.ts`
901. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
902. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
903. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/EventSnapshotStore.ts`
904. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
905. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
906. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
907. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/FitnessTestService.ts`
908. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
909. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
910. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
911. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
912. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
913. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
914. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
915. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
916. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/WorkoutEventStore.ts`
917. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
918. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
919. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthConnectService.ts`
920. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
921. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
922. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/healthKitService.ts`
923. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
924. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
925. **Error Handling**: AsyncStorage operation without try-catch - `src/services/habits/HabitTrackerService.ts`
926. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
927. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
928. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
929. **Error Handling**: AsyncStorage operation without try-catch - `src/services/initialization/AppInitializationService.ts`
930. **Error Handling**: AsyncStorage operation without try-catch - `src/services/integrations/NostrCompetitionContextService.ts`
931. **Error Handling**: AsyncStorage operation without try-catch - `src/services/lottery/LotteryService.ts`
932. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
933. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
934. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
935. **Error Handling**: AsyncStorage operation without try-catch - `src/services/music/BlossomService.ts`
936. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
937. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
938. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
939. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
940. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
941. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/workoutPublishingService.ts`
942. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
943. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
944. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/BroadcastTokenService.ts`
945. **Error Handling**: AsyncStorage operation without try-catch - `src/services/notifications/ExpoNotificationProvider.ts`
946. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
947. **Error Handling**: AsyncStorage operation without try-catch - `src/services/pledge/PledgeService.ts`
948. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
949. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
950. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
951. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
952. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/DailyRewardService.ts`
953. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
954. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
955. **Error Handling**: AsyncStorage operation without try-catch - `src/services/rewards/RewardPollingService.ts`
956. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
957. **Error Handling**: AsyncStorage operation without try-catch - `src/services/routes/RouteStorageService.ts`
958. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
959. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season2Service.ts`
960. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
961. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/LocalTeamMembershipService.ts`
962. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
963. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
964. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
965. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
966. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
967. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
968. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
969. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
970. **Error Handling**: AsyncStorage operation without try-catch - `src/services/verification/VerificationService.ts`
971. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
972. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
973. **Error Handling**: AsyncStorage operation without try-catch - `src/services/wallet/CoinOSAccountService.ts`
974. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
975. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/asyncStorageTimeout.ts`
976. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
977. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
978. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
979. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
980. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/cache.ts`
981. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/captainCache.ts`
982. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/networkUtils.ts`
983. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
984. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
985. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
986. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
987. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
988. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
989. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
990. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
991. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
992. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
993. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
994. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
995. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
996. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
997. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
998. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
999. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1000. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1001. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1002. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
1003. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1004. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1005. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1006. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/rewardTags.ts`
1007. **User Experience**: List without empty state message - `src/screens/CommentsScreen.tsx`
1008. **User Experience**: List without empty state message - `src/screens/CompeteScreen.tsx`
1009. **User Experience**: List without empty state message - `src/screens/ContactSupportScreen.tsx`
1010. **User Experience**: List without empty state message - `src/screens/DonateScreen.tsx`
1011. **User Experience**: List without empty state message - `src/screens/HealthProfileScreen.tsx`
1012. **User Experience**: List without empty state message - `src/screens/HelpSupportScreen.tsx`
1013. **User Experience**: List without empty state message - `src/screens/LeaderboardsScreen.tsx`
1014. **User Experience**: List without empty state message - `src/screens/LevelDetailScreen.tsx`
1015. **User Experience**: List without empty state message - `src/screens/PrivacyPolicyScreen.tsx`
1016. **User Experience**: List without empty state message - `src/screens/ProfileEditScreen.tsx`
1017. **User Experience**: List without empty state message - `src/screens/RewardsScreen.tsx`
1018. **User Experience**: List without empty state message - `src/screens/SettingsScreen.tsx`
1019. **User Experience**: List without empty state message - `src/screens/StatsDetailScreen.tsx`
1020. **User Experience**: List without empty state message - `src/screens/TeamScreen.tsx`
1021. **User Experience**: List without empty state message - `src/screens/WalletScreen.tsx`
1022. **User Experience**: List without empty state message - `src/screens/activity/DietTrackerScreen.tsx`
1023. **User Experience**: List without empty state message - `src/screens/activity/ManualEntryScreen.tsx`
1024. **User Experience**: List without empty state message - `src/screens/activity/ManualWorkoutScreen.tsx`
1025. **User Experience**: List without empty state message - `src/screens/activity/RunningTrackerScreen.tsx`
1026. **User Experience**: List without empty state message - `src/screens/activity/WaterTrackerScreen.tsx`

</details>

## 🟢 Low Priority Issues

<details>
<summary>Click to expand (3208 issues)</summary>

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
53. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
54. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
55. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
56. **Production Readiness**: Console.log statement found - `src/cache/ProfileCache.ts`
57. **Production Readiness**: Console.log statement found - `src/components/activity/CameraPositionGuide.tsx`
58. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
59. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
60. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
61. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
62. **Production Readiness**: Console.log statement found - `src/components/ai/PPQAPIKeyModal.tsx`
63. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
64. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
65. **Production Readiness**: Console.log statement found - `src/components/ai/PPQCreditTopupModal.tsx`
66. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
67. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
68. **Production Readiness**: Console.log statement found - `src/components/analytics/LevelCard.tsx`
69. **Production Readiness**: Console.log statement found - `src/components/cards/WorkoutCardRenderer.tsx`
70. **Production Readiness**: Console.log statement found - `src/components/club/ClubLeaderboardSection.tsx`
71. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
72. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
73. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
74. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
75. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
76. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
77. **Production Readiness**: Console.log statement found - `src/components/compete/LeaderboardsContent.tsx`
78. **Production Readiness**: Console.log statement found - `src/components/creation/SimpleEventCreationModal.tsx`
79. **Production Readiness**: Console.log statement found - `src/components/creation/SimpleEventCreationModal.tsx`
80. **Production Readiness**: Console.log statement found - `src/components/creation/SimpleTeamCreationModal.tsx`
81. **Production Readiness**: Console.log statement found - `src/components/creation/SimpleTeamCreationModal.tsx`
82. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
83. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
84. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
85. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
86. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
87. **Production Readiness**: Console.log statement found - `src/components/event/EventPaymentModal.tsx`
88. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
89. **Production Readiness**: Console.log statement found - `src/components/journal/JournalEditorModal.tsx`
90. **Production Readiness**: Console.log statement found - `src/components/journal/VoiceRecordButton.tsx`
91. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
92. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
93. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
94. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
95. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
96. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
97. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
98. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
99. **Production Readiness**: Console.log statement found - `src/components/lightning/NWCLightningButton.tsx`
100. **Production Readiness**: Console.log statement found - `src/components/music/AddToPlaylistSheet.tsx`
101. **Production Readiness**: Console.log statement found - `src/components/music/CreatePlaylistModal.tsx`
102. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
103. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
104. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
105. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
106. **Production Readiness**: Console.log statement found - `src/components/music/PlaylistBrowser.tsx`
107. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
108. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
109. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
110. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
111. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
112. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
113. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
114. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
115. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
116. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
117. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
118. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
119. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
120. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
121. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
122. **Production Readiness**: Console.log statement found - `src/components/nutzap/ExternalZapModal.tsx`
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
139. **Production Readiness**: Console.log statement found - `src/components/permissions/GPSPermissionsDiagnostics.tsx`
140. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
141. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
142. **Production Readiness**: Console.log statement found - `src/components/permissions/PermissionRequestModal.tsx`
143. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
144. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
145. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
146. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
147. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
148. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
149. **Production Readiness**: Console.log statement found - `src/components/profile/ProfileHeader.tsx`
150. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
151. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
152. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
153. **Production Readiness**: Console.log statement found - `src/components/profile/shared/EnhancedSocialShareModal.tsx`
154. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
155. **Production Readiness**: Console.log statement found - `src/components/profile/shared/FullScreenCardModal.tsx`
156. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
157. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
158. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
159. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
160. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
161. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
162. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
163. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
164. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
165. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
166. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
167. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
168. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
169. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
170. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
171. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
172. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
173. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
174. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
175. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
176. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
177. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
178. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
179. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
180. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
181. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/HealthConnectTab.tsx`
182. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
183. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
184. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
185. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
186. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
187. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
188. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
189. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
190. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
191. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
192. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
193. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
194. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
195. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
196. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
197. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
198. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
199. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
200. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
201. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
202. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
203. **Production Readiness**: Console.log statement found - `src/components/qr/QRScannerModal.tsx`
204. **Production Readiness**: Console.log statement found - `src/components/rewards/RewardDestinationPicker.tsx`
205. **Production Readiness**: Console.log statement found - `src/components/routes/RouteSelectionModal.tsx`
206. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
207. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
208. **Production Readiness**: Console.log statement found - `src/components/season2/Season2Leaderboard.tsx`
209. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
210. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
211. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
212. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
213. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
214. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
215. **Production Readiness**: Console.log statement found - `src/components/team/CharitySection.tsx`
216. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardCard.tsx`
217. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
218. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
219. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
220. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
221. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
222. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
223. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
224. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
225. **Production Readiness**: Console.log statement found - `src/components/team/LeaderboardShareModal.tsx`
226. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
227. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
228. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
229. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
230. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
231. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
232. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
233. **Production Readiness**: Console.log statement found - `src/components/ui/Avatar.tsx`
234. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
235. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
236. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
237. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
238. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
239. **Production Readiness**: Console.log statement found - `src/components/wallet/ReceiveModal.tsx`
240. **Production Readiness**: Console.log statement found - `src/components/wallet/WalletConfigModal.tsx`
241. **Production Readiness**: Console.log statement found - `src/constants/season2.ts`
242. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
243. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
244. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
245. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
246. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
247. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
248. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
249. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
250. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
251. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
252. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
253. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
254. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
255. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
256. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
257. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
258. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
259. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
260. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
261. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
262. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
263. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
264. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
265. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
266. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
267. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
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
280. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
281. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
282. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
283. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
284. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
285. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
286. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
287. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
288. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
289. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
290. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
291. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
292. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
293. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
294. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
295. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
296. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
297. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
298. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
299. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
300. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
301. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
302. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
303. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
304. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
305. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
306. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
307. **Production Readiness**: Console.log statement found - `src/hooks/useCachedData.ts`
308. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
309. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
310. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
311. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
312. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
313. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
314. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
315. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
316. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
317. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
318. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
319. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
320. **Production Readiness**: Console.log statement found - `src/hooks/useNWCZap.ts`
321. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
322. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
323. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
324. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
325. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
326. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
327. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
328. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
329. **Production Readiness**: Console.log statement found - `src/hooks/useNutzapCompat.ts`
330. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
331. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
332. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
333. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
334. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
335. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
336. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
337. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
338. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
339. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
340. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
341. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
342. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
343. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
344. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
345. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
346. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
347. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
348. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
349. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
350. **Production Readiness**: Console.log statement found - `src/hooks/useSeason2.ts`
351. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
352. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
353. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
354. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
355. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
356. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
357. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
358. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
359. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
360. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
361. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
362. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
363. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
364. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
365. **Production Readiness**: Console.log statement found - `src/hooks/useSupabaseLeaderboard.ts`
366. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
367. **Production Readiness**: Console.log statement found - `src/i18n/index.ts`
368. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
369. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
370. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
371. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
372. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
373. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
374. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
375. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
376. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
377. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
378. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
379. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
380. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
381. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
382. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
383. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
384. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
385. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
386. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
387. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
388. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
389. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
390. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
391. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
392. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
393. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
394. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
395. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
396. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
397. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
398. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
399. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
400. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
401. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
402. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
403. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
404. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
405. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
406. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
407. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
408. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
409. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
410. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
411. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
412. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
413. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
414. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
415. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
416. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
417. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
418. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
419. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
420. **Production Readiness**: Console.log statement found - `src/navigation/navigationRef.ts`
421. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
422. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
423. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
424. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
425. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
426. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
427. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
428. **Production Readiness**: Console.log statement found - `src/screens/AdvancedAnalyticsScreen.tsx`
429. **Production Readiness**: Console.log statement found - `src/screens/ClubsScreen.tsx`
430. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
431. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
432. **Production Readiness**: Console.log statement found - `src/screens/ContactSupportScreen.tsx`
433. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
434. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
435. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
436. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
437. **Production Readiness**: Console.log statement found - `src/screens/EventsScreen.tsx`
438. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
439. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
440. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
441. **Production Readiness**: Console.log statement found - `src/screens/FitnessTestResultsScreen.tsx`
442. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
443. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
444. **Production Readiness**: Console.log statement found - `src/screens/HealthProfileScreen.tsx`
445. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
446. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
447. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
448. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
449. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
450. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
451. **Production Readiness**: Console.log statement found - `src/screens/LeaderboardsScreen.tsx`
452. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
453. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
454. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
455. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
456. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
457. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
458. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
459. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
460. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
461. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
462. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
463. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
464. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
465. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
466. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
467. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
468. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
469. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
470. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
471. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
472. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
473. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
474. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
475. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
476. **Production Readiness**: Console.log statement found - `src/screens/SimpleTeamScreen.tsx`
477. **Production Readiness**: Console.log statement found - `src/screens/StatsDetailScreen.tsx`
478. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
479. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
480. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
481. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
482. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
483. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
484. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
485. **Production Readiness**: Console.log statement found - `src/screens/TeamsScreen.tsx`
486. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
487. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
488. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
489. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
490. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
491. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
492. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
493. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
494. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
495. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
496. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
497. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
498. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
499. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
500. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
501. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
502. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
503. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
504. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
505. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
506. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
507. **Production Readiness**: Console.log statement found - `src/screens/activity/ActivityTrackerScreen.tsx`
508. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
509. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
510. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
511. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
512. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
513. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
514. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
515. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
516. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
517. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
518. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
519. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
520. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
521. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
522. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
523. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
524. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
525. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
526. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
527. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
528. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
529. **Production Readiness**: Console.log statement found - `src/screens/activity/DietTrackerScreen.tsx`
530. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
531. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
532. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualEntryScreen.tsx`
533. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualWorkoutScreen.tsx`
534. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
535. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
536. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
537. **Production Readiness**: Console.log statement found - `src/screens/activity/MeditationTrackerScreen.tsx`
538. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
539. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
540. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
541. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
542. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
543. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
544. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
545. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
546. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
547. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
548. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
549. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
550. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
551. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
552. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
553. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
554. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
555. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
556. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
557. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
558. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
559. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
560. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
561. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
562. **Production Readiness**: Console.log statement found - `src/screens/activity/StepsDisplayScreen.tsx`
563. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
564. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
565. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
566. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
567. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
568. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
569. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
570. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
571. **Production Readiness**: Console.log statement found - `src/screens/activity/StrengthTrackerScreen.tsx`
572. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
573. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
574. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
575. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
576. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
577. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
578. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
579. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
580. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
581. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
582. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
583. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
584. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
585. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
586. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
587. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
588. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
589. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
590. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
591. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
592. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
593. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
594. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
595. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
596. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
597. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
598. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
599. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
600. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
601. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
602. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
603. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
604. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
605. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
606. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
607. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
608. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
609. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
610. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
611. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
612. **Production Readiness**: Console.log statement found - `src/screens/activity/WaterTrackerScreen.tsx`
613. **Production Readiness**: Console.log statement found - `src/screens/events/DynamicEventDetailScreen.tsx`
614. **Production Readiness**: Console.log statement found - `src/screens/events/EinundzwanzigDetailScreen.tsx`
615. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
616. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
617. **Production Readiness**: Console.log statement found - `src/screens/routes/SavedRoutesScreen.tsx`
618. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
619. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
620. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
621. **Production Readiness**: Console.log statement found - `src/screens/season2/Season2Screen.tsx`
622. **Production Readiness**: Console.log statement found - `src/screens/useSettingsState.ts`
623. **Production Readiness**: Console.log statement found - `src/screens/useSettingsState.ts`
624. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
625. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityGridService.ts`
626. **Production Readiness**: Console.log statement found - `src/services/activity/AutoCompetePreferencesService.ts`
627. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
628. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
629. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
630. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
631. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
632. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
633. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
634. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
635. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
636. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
637. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
638. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
639. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
640. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
641. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
642. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
643. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
644. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
645. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
646. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
647. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
648. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
649. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
650. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
651. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
652. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
653. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
654. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
655. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
656. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
657. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
658. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
659. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
660. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
661. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
662. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
663. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
664. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepCounterService.ts`
665. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
666. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
667. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
668. **Production Readiness**: Console.log statement found - `src/services/activity/DailyStepGoalService.ts`
669. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
670. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
671. **Production Readiness**: Console.log statement found - `src/services/activity/DefaultActivityService.ts`
672. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
673. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
674. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
675. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
676. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
677. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
678. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
679. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
680. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
681. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
682. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
683. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
684. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
685. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
686. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
687. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
688. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
689. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
690. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
691. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
692. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
693. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
694. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
695. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
696. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
697. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
698. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
699. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
700. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
701. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
702. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
703. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
704. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
705. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
706. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
707. **Production Readiness**: Console.log statement found - `src/services/activity/NativeStepCounterService.ts`
708. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
709. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
710. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
711. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
712. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
713. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
714. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
715. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
716. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
717. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
718. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
719. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
720. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
721. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
722. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
723. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
724. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
725. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
726. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
727. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
728. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
729. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
730. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
731. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
732. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
733. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
734. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
735. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
736. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
737. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
738. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
739. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
740. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
741. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
742. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
743. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
744. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
745. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
746. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
747. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
748. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
749. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
750. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
751. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
752. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
753. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
754. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
755. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
756. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
757. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
758. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
759. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
760. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
761. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
762. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
763. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
764. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
765. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
766. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
767. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
768. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
769. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
770. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
771. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
772. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
773. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
774. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
775. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
776. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
777. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
778. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
779. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
780. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
781. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTracker.ts`
782. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
783. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
784. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
785. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
786. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
787. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
788. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
789. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
790. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
791. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
792. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
793. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
794. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
795. **Production Readiness**: Console.log statement found - `src/services/activity/SimpleRunTrackerTask.ts`
796. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
797. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
798. **Production Readiness**: Console.log statement found - `src/services/activity/StepDiagnosticsService.ts`
799. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
800. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
801. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
802. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
803. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
804. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
805. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
806. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
807. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
808. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
809. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
810. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
811. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
812. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
813. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
814. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
815. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
816. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
817. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
818. **Production Readiness**: Console.log statement found - `src/services/activity/WeeklyDistanceGoalService.ts`
819. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
820. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
821. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
822. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
823. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
824. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
825. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
826. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutRecovery.ts`
827. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
828. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
829. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
830. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
831. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
832. **Production Readiness**: Console.log statement found - `src/services/activity/WorkoutSessionBridge.ts`
833. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
834. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
835. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
836. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
837. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
838. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
839. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
840. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
841. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
842. **Production Readiness**: Console.log statement found - `src/services/ai/PPQAccountService.ts`
843. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
844. **Production Readiness**: Console.log statement found - `src/services/analytics/BodyCompositionAnalytics.ts`
845. **Production Readiness**: Console.log statement found - `src/services/anticheat/AntiCheatRequestService.ts`
846. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
847. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
848. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
849. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
850. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
851. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
852. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
853. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
854. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
855. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
856. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
857. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
858. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
859. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
860. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
861. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
862. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
863. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
864. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
865. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
866. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
867. **Production Readiness**: Console.log statement found - `src/services/auth/SecureNsecStorage.ts`
868. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
869. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
870. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
871. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
872. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
873. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
874. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
875. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
876. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
877. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
878. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
879. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
880. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
881. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
882. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
883. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
884. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
885. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
886. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
887. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
888. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
889. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
890. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
891. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
892. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
893. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
894. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
895. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
896. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
897. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
898. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
899. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
900. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
901. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
902. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
903. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
904. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
905. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
906. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
907. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
908. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
909. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
910. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
911. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
912. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
913. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
914. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
915. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
916. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
917. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
918. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
919. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
920. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
921. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
922. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
923. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
924. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
925. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
926. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
927. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
928. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
929. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
930. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
931. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
932. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
933. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
934. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
935. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
936. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
937. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
938. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
939. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
940. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
941. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
942. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
943. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
944. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
945. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
946. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
947. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
948. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
949. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
950. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
951. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
952. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
953. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
954. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
955. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
956. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
957. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
958. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
959. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
960. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
961. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
962. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
963. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
964. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
965. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
966. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
967. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
968. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
969. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
970. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
971. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
972. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
973. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
974. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
975. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
976. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
977. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
978. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
979. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
980. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
981. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
982. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
983. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
984. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
985. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
986. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
987. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
988. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
989. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
990. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
991. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
992. **Production Readiness**: Console.log statement found - `src/services/backend/ClubChatService.ts`
993. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
994. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
995. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
996. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
997. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
998. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
999. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1000. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1001. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1002. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1003. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1004. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1005. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1006. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1007. **Production Readiness**: Console.log statement found - `src/services/backend/ClubMembershipService.ts`
1008. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1009. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1010. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1011. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1012. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1013. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1014. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1015. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1016. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1017. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1018. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1019. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1020. **Production Readiness**: Console.log statement found - `src/services/backend/ClubService.ts`
1021. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1022. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1023. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1024. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1025. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1026. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1027. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1028. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1029. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1030. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1031. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1032. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1033. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1034. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1035. **Production Readiness**: Console.log statement found - `src/services/backend/ProfileDataService.ts`
1036. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1037. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1038. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1039. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1040. **Production Readiness**: Console.log statement found - `src/services/backend/SponsorService.ts`
1041. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1042. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1043. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1044. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1045. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1046. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1047. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1048. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1049. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1050. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1051. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1052. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1053. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1054. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1055. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1056. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1057. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1058. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1059. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1060. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1061. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1062. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1063. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1064. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1065. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1066. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1067. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1068. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1069. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1070. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1071. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1072. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1073. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1074. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1075. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1076. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1077. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1078. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1079. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1080. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1081. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1082. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1083. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1084. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1085. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1086. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1087. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1088. **Production Readiness**: Console.log statement found - `src/services/backend/SupabaseCompetitionService.ts`
1089. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1090. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1091. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1092. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1093. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1094. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1095. **Production Readiness**: Console.log statement found - `src/services/backend/UserTeamService.ts`
1096. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1097. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1098. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1099. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1100. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1101. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1102. **Production Readiness**: Console.log statement found - `src/services/backup/AutoBackupService.ts`
1103. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1104. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1105. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1106. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1107. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1108. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1109. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1110. **Production Readiness**: Console.log statement found - `src/services/backup/BackupService.ts`
1111. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1112. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1113. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1114. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1115. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1116. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1117. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1118. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1119. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1120. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1121. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1122. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1123. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1124. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1125. **Production Readiness**: Console.log statement found - `src/services/backup/RestoreService.ts`
1126. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1127. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1128. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1129. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1130. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1131. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1132. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1133. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1134. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1135. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1136. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1137. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1138. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1139. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1140. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1141. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidationService.ts`
1142. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1143. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1144. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1145. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1146. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1147. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1148. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1149. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1150. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1151. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1152. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1153. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1154. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1155. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1156. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1157. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
1158. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1159. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1160. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1161. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1162. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1163. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1164. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1165. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1166. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1167. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1168. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1169. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1170. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1171. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1172. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1173. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1174. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
1175. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1176. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1177. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1178. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1179. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1180. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1181. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1182. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1183. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1184. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1185. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1186. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1187. **Production Readiness**: Console.log statement found - `src/services/cache/FrozenEventStore.ts`
1188. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1189. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1190. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1191. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1192. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1193. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1194. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1195. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1196. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1197. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1198. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1199. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1200. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1201. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1202. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1203. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1204. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1205. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1206. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1207. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1208. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1209. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1210. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1211. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1212. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1213. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1214. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
1215. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1216. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1217. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1218. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1219. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1220. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1221. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1222. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1223. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1224. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1225. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1226. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1227. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1228. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1229. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1230. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1231. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1232. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1233. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1234. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1235. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1236. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1237. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1238. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1239. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1240. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1241. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1242. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1243. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
1244. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1245. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1246. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1247. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1248. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1249. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1250. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1251. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1252. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1253. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1254. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1255. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1256. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1257. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1258. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1259. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1260. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1261. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1262. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1263. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1264. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1265. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1266. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1267. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1268. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1269. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1270. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1271. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1272. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1273. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1274. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1275. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1276. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1277. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1278. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1279. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1280. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1281. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1282. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1283. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1284. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1285. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1286. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1287. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1288. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1289. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1290. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1291. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1292. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1293. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1294. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1295. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1296. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1297. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1298. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1299. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1300. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1301. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1302. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1303. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1304. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1305. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1306. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1307. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1308. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1309. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1310. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1311. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1312. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1313. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1314. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1315. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1316. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1317. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1318. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1319. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1320. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1321. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1322. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1323. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1324. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1325. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1326. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1327. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1328. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1329. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1330. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1331. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1332. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1333. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1334. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1335. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1336. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1337. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1338. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1339. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedWorkoutCache.ts`
1340. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1341. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1342. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1343. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1344. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1345. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1346. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1347. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1348. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1349. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1350. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1351. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1352. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1353. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1354. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
1355. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1356. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1357. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1358. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1359. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1360. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1361. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1362. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1363. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1364. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1365. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1366. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1367. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1368. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1369. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1370. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1371. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1372. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigPayoutService.ts`
1373. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1374. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1375. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1376. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1377. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1378. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1379. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1380. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1381. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1382. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1383. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1384. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1385. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1386. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1387. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1388. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1389. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1390. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1391. **Production Readiness**: Console.log statement found - `src/services/challenge/EinundzwanzigService.ts`
1392. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1393. **Production Readiness**: Console.log statement found - `src/services/charity/CharitySelectionService.ts`
1394. **Production Readiness**: Console.log statement found - `src/services/club/ClubWalletService.ts`
1395. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1396. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1397. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1398. **Production Readiness**: Console.log statement found - `src/services/competition/AutoJoinService.ts`
1399. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1400. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1401. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1402. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1403. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1404. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1405. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1406. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1407. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1408. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1409. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1410. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1411. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1412. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1413. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1414. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1415. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1416. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1417. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1418. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1419. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1420. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1421. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1422. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1423. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1424. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1425. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1426. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1427. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1428. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1429. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1430. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
1431. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1432. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1433. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1434. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1435. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1436. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1437. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1438. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1439. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1440. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1441. **Production Readiness**: Console.log statement found - `src/services/competition/DailyLeaderboardService.ts`
1442. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1443. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1444. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1445. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1446. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1447. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1448. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1449. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1450. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1451. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1452. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1453. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1454. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1455. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1456. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1457. **Production Readiness**: Console.log statement found - `src/services/competition/PendingSubmissionService.ts`
1458. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1459. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1460. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1461. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1462. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1463. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1464. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1465. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1466. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1467. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1468. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1469. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1470. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1471. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1472. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1473. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1474. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1475. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1476. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1477. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1478. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1479. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1480. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1481. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1482. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1483. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1484. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1485. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1486. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1487. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1488. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1489. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1490. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1491. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1492. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1493. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1494. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1495. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1496. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1497. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1498. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1499. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1500. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1501. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1502. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1503. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1504. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1505. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1506. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1507. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1508. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1509. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1510. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1511. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1512. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1513. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1514. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1515. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1516. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1517. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1518. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1519. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1520. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1521. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1522. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1523. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1524. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1525. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1526. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1527. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1528. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1529. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1530. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1531. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1532. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1533. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1534. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1535. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1536. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1537. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1538. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1539. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1540. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1541. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1542. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1543. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1544. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1545. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1546. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1547. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1548. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1549. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1550. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1551. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1552. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1553. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1554. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1555. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1556. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1557. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1558. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1559. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1560. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1561. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1562. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1563. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1564. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1565. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1566. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1567. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1568. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1569. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1570. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1571. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1572. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1573. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1574. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1575. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1576. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1577. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1578. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1579. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1580. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1581. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1582. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1583. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1584. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1585. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1586. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1587. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1588. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1589. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1590. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1591. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1592. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1593. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1594. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1595. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1596. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1597. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1598. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1599. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1600. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1601. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1602. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1603. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1604. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1605. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1606. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1607. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1608. **Production Readiness**: Console.log statement found - `src/services/competition/StepCompetitionService.ts`
1609. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1610. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1611. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1612. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1613. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1614. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1615. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1616. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1617. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1618. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1619. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1620. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1621. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1622. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1623. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1624. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1625. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1626. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1627. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1628. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1629. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1630. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1631. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1632. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1633. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1634. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1635. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1636. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1637. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1638. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1639. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1640. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1641. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1642. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1643. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1644. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1645. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1646. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1647. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1648. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1649. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1650. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1651. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1652. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1653. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1654. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1655. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1656. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1657. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1658. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1659. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1660. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1661. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1662. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1663. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1664. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1665. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1666. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1667. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1668. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1669. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1670. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1671. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1672. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1673. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1674. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1675. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1676. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1677. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1678. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1679. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1680. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1681. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1682. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1683. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1684. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1685. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1686. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1687. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1688. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1689. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1690. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1691. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1692. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1693. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1694. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1695. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1696. **Production Readiness**: Console.log statement found - `src/services/core/AppInitializationService.ts`
1697. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1698. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1699. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1700. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1701. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1702. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1703. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1704. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1705. **Production Readiness**: Console.log statement found - `src/services/core/AppStateManager.ts`
1706. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1707. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1708. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1709. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1710. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1711. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1712. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1713. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1714. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1715. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1716. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1717. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1718. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1719. **Production Readiness**: Console.log statement found - `src/services/donation/DonationTrackingService.ts`
1720. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1721. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1722. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1723. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1724. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1725. **Production Readiness**: Console.log statement found - `src/services/event/CaptainEventStore.ts`
1726. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1727. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1728. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1729. **Production Readiness**: Console.log statement found - `src/services/event/EventParticipationStore.ts`
1730. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1731. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1732. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1733. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1734. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1735. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1736. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1737. **Production Readiness**: Console.log statement found - `src/services/event/EventSnapshotStore.ts`
1738. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1739. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1740. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1741. **Production Readiness**: Console.log statement found - `src/services/events/EventFinalizationService.ts`
1742. **Production Readiness**: Console.log statement found - `src/services/events/EventFinalizationService.ts`
1743. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1744. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1745. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1746. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1747. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1748. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1749. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1750. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1751. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1752. **Production Readiness**: Console.log statement found - `src/services/events/RunstrAutoPayoutService.ts`
1753. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1754. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1755. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1756. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1757. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1758. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1759. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1760. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1761. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1762. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1763. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1764. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1765. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1766. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1767. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1768. **Production Readiness**: Console.log statement found - `src/services/events/RunstrEventPublishService.ts`
1769. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1770. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1771. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1772. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1773. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1774. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1775. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1776. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1777. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1778. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1779. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1780. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1781. **Production Readiness**: Console.log statement found - `src/services/fitness/AndroidBackgroundSyncTask.ts`
1782. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1783. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1784. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1785. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1786. **Production Readiness**: Console.log statement found - `src/services/fitness/BackgroundSyncRegistration.ts`
1787. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1788. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1789. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1790. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1791. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1792. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1793. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1794. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1795. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1796. **Production Readiness**: Console.log statement found - `src/services/fitness/FitnessTestService.ts`
1797. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1798. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1799. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1800. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1801. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1802. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1803. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1804. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1805. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1806. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1807. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1808. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1809. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1810. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1811. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1812. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1813. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1814. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1815. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1816. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1817. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1818. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1819. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1820. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1821. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1822. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1823. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1824. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1825. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1826. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1827. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundService.ts`
1828. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1829. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1830. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1831. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1832. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1833. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1834. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthKitBackgroundTask.ts`
1835. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1836. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1837. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1838. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1839. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1840. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1841. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1842. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1843. **Production Readiness**: Console.log statement found - `src/services/fitness/HealthSyncManager.ts`
1844. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1845. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1846. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1847. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1848. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1849. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1850. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1851. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1852. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1853. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1854. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1855. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1856. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1857. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1858. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1859. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1860. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1861. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1862. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1863. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1864. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1865. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1866. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1867. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1868. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1869. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1870. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1871. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1872. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1873. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1874. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1875. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1876. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1877. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1878. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1879. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1880. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1881. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1882. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1883. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1884. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1885. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1886. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1887. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1888. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1889. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1890. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1891. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1892. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1893. **Production Readiness**: Console.log statement found - `src/services/fitness/Nostr1301ImportService.ts`
1894. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1895. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1896. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1897. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1898. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1899. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1900. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1901. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1902. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1903. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1904. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1905. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1906. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1907. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1908. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1909. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1910. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1911. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1912. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1913. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1914. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1915. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1916. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1917. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1918. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1919. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1920. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1921. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1922. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1923. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1924. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1925. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1926. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1927. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1928. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1929. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1930. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1931. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1932. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1933. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1934. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1935. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1936. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1937. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1938. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1939. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1940. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1941. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1942. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1943. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1944. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1945. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1946. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1947. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1948. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutEventStore.ts`
1949. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1950. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1951. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1952. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1953. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1954. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1955. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1956. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1957. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1958. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1959. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1960. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1961. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1962. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1963. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1964. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1965. **Production Readiness**: Console.log statement found - `src/services/fitness/healthConnectService.ts`
1966. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1967. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1968. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1969. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1970. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1971. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1972. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1973. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1974. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1975. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1976. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1977. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1978. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1979. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1980. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1981. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1982. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1983. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1984. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1985. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1986. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1987. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1988. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1989. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1990. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1991. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1992. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1993. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1994. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1995. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1996. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1997. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1998. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1999. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2000. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2001. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2002. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2003. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2004. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2005. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2006. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2007. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2008. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2009. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2010. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2011. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2012. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2013. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2014. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2015. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2016. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2017. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2018. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2019. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2020. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2021. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2022. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2023. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2024. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2025. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2026. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
2027. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2028. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2029. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2030. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2031. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2032. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2033. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2034. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2035. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2036. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2037. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2038. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2039. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2040. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2041. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2042. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2043. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2044. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2045. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2046. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2047. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2048. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2049. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2050. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2051. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2052. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2053. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2054. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2055. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2056. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2057. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2058. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2059. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2060. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2061. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2062. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2063. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2064. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2065. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2066. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2067. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2068. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2069. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2070. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2071. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2072. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2073. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2074. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2075. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2076. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2077. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2078. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2079. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2080. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
2081. **Production Readiness**: Console.log statement found - `src/services/habits/HabitTrackerService.ts`
2082. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2083. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2084. **Production Readiness**: Console.log statement found - `src/services/i18n/LanguagePreferenceService.ts`
2085. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2086. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2087. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2088. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2089. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2090. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2091. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2092. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2093. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2094. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2095. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2096. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2097. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2098. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2099. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
2100. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2101. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2102. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2103. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2104. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2105. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2106. **Production Readiness**: Console.log statement found - `src/services/initialization/AppPermissionService.ts`
2107. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2108. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2109. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2110. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2111. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2112. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2113. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2114. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2115. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2116. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2117. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2118. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
2119. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2120. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2121. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2122. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2123. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2124. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2125. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2126. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
2127. **Production Readiness**: Console.log statement found - `src/services/lottery/LotteryService.ts`
2128. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2129. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2130. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2131. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2132. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2133. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2134. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2135. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2136. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2137. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2138. **Production Readiness**: Console.log statement found - `src/services/media/ImageUploadService.ts`
2139. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2140. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2141. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2142. **Production Readiness**: Console.log statement found - `src/services/music/BlossomAuthService.ts`
2143. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2144. **Production Readiness**: Console.log statement found - `src/services/music/BlossomMetadataService.ts`
2145. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2146. **Production Readiness**: Console.log statement found - `src/services/music/BlossomPlaylistMetadataService.ts`
2147. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2148. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2149. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2150. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2151. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2152. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2153. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2154. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2155. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2156. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2157. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2158. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2159. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2160. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2161. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2162. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2163. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2164. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2165. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2166. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2167. **Production Readiness**: Console.log statement found - `src/services/music/BlossomService.ts`
2168. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerPreferencesService.ts`
2169. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2170. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2171. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2172. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2173. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2174. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2175. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2176. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2177. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2178. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2179. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2180. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2181. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2182. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2183. **Production Readiness**: Console.log statement found - `src/services/music/MusicPlayerService.ts`
2184. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2185. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2186. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2187. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeAuthService.ts`
2188. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2189. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2190. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2191. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2192. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2193. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2194. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2195. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2196. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2197. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2198. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2199. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2200. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2201. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2202. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2203. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2204. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2205. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2206. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2207. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2208. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2209. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2210. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2211. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2212. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2213. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2214. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2215. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2216. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2217. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2218. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2219. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2220. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2221. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2222. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2223. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2224. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2225. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2226. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2227. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2228. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2229. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2230. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2231. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2232. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2233. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2234. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2235. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2236. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2237. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2238. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2239. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2240. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2241. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2242. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2243. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeService.ts`
2244. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2245. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2246. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2247. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2248. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2249. **Production Readiness**: Console.log statement found - `src/services/music/WavlakeZapService.ts`
2250. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2251. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2252. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2253. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2254. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2255. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2256. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2257. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2258. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2259. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2260. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2261. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2262. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2263. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2264. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2265. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2266. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2267. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2268. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2269. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2270. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2271. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2272. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2273. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2274. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2275. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2276. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2277. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2278. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2279. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2280. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2281. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2282. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2283. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2284. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2285. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2286. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2287. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2288. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2289. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2290. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2291. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2292. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2293. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2294. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2295. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2296. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2297. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2298. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2299. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2300. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2301. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2302. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2303. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2304. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2305. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2306. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2307. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2308. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2309. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2310. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2311. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2312. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2313. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2314. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2315. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2316. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2317. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2318. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2319. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2320. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2321. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2322. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2323. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2324. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2325. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2326. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2327. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2328. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2329. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2330. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2331. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2332. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2333. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2334. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2335. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2336. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
2337. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionParticipantService.ts`
2338. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2339. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2340. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2341. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2342. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2343. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2344. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2345. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2346. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2347. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2348. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2349. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2350. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2351. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2352. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2353. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
2354. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2355. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2356. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2357. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2358. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2359. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2360. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2361. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2362. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2363. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2364. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2365. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
2366. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2367. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2368. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2369. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2370. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2371. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2372. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2373. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2374. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2375. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2376. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2377. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2378. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
2379. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2380. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2381. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2382. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2383. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2384. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2385. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
2386. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2387. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2388. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2389. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2390. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2391. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2392. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2393. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2394. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2395. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2396. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2397. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2398. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2399. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2400. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2401. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
2402. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2403. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2404. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2405. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2406. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2407. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2408. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2409. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2410. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2411. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2412. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2413. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
2414. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2415. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2416. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2417. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2418. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2419. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2420. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2421. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2422. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2423. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2424. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2425. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2426. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2427. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2428. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2429. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2430. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2431. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2432. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2433. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2434. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2435. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2436. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2437. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
2438. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2439. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2440. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2441. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2442. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2443. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2444. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2445. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2446. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2447. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2448. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2449. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2450. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2451. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2452. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2453. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2454. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2455. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
2456. **Production Readiness**: Console.log statement found - `src/services/nostr/leaderboardCardGenerator.ts`
2457. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2458. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2459. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2460. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2461. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2462. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2463. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2464. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2465. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2466. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2467. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2468. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2469. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2470. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2471. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2472. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2473. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2474. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2475. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2476. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2477. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2478. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2479. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2480. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2481. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2482. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2483. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2484. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2485. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2486. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2487. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2488. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2489. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2490. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2491. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2492. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2493. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2494. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2495. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2496. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2497. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2498. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2499. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2500. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2501. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2502. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2503. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2504. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2505. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2506. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2507. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2508. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2509. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2510. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2511. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2512. **Production Readiness**: Console.log statement found - `src/services/notifications/BroadcastTokenService.ts`
2513. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2514. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2515. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2516. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2517. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2518. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2519. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2520. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2521. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2522. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2523. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2524. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2525. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2526. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2527. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2528. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2529. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2530. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2531. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2532. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2533. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2534. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2535. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2536. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2537. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2538. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2539. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2540. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2541. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2542. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2543. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2544. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2545. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2546. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2547. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2548. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2549. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2550. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2551. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationPreferencesService.ts`
2552. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2553. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2554. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2555. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2556. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2557. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2558. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2559. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2560. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2561. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2562. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2563. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2564. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2565. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2566. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2567. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2568. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2569. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2570. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2571. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2572. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2573. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2574. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2575. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2576. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamJoinNotificationHandler.ts`
2577. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamNotificationFormatter.ts`
2578. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2579. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2580. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2581. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2582. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2583. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2584. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2585. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2586. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2587. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2588. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2589. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2590. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2591. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2592. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2593. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2594. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2595. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2596. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2597. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2598. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2599. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2600. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2601. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2602. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2603. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2604. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2605. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2606. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2607. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2608. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2609. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2610. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2611. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2612. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2613. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2614. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2615. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2616. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2617. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2618. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2619. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2620. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2621. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2622. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2623. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2624. **Production Readiness**: Console.log statement found - `src/services/nutzap/LightningZapService.ts`
2625. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2626. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2627. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2628. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2629. **Production Readiness**: Console.log statement found - `src/services/platform/PrivacyROMDetectionService.ts`
2630. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2631. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2632. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2633. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2634. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2635. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2636. **Production Readiness**: Console.log statement found - `src/services/pledge/PledgeService.ts`
2637. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2638. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2639. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2640. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2641. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2642. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2643. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2644. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2645. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2646. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2647. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2648. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2649. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2650. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2651. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2652. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2653. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2654. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2655. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2656. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2657. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2658. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2659. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2660. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2661. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2662. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2663. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2664. **Production Readiness**: Console.log statement found - `src/services/rewards/DailyRewardService.ts`
2665. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2666. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2667. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2668. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2669. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2670. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2671. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2672. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2673. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2674. **Production Readiness**: Console.log statement found - `src/services/rewards/NWCGatewayService.ts`
2675. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
2676. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
2677. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
2678. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardDestinationService.ts`
2679. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
2680. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
2681. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardLightningAddressService.ts`
2682. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
2683. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
2684. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
2685. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardNotificationManager.ts`
2686. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2687. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2688. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2689. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2690. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2691. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2692. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2693. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2694. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2695. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2696. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2697. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2698. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2699. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2700. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2701. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardPollingService.ts`
2702. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
2703. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
2704. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
2705. **Production Readiness**: Console.log statement found - `src/services/rewards/RewardsTransparencyService.ts`
2706. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2707. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2708. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2709. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2710. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2711. **Production Readiness**: Console.log statement found - `src/services/rewards/SupabaseRewardService.ts`
2712. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2713. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2714. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2715. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2716. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2717. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2718. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2719. **Production Readiness**: Console.log statement found - `src/services/routes/RouteStorageService.ts`
2720. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2721. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2722. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2723. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2724. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2725. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2726. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2727. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2728. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2729. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2730. **Production Readiness**: Console.log statement found - `src/services/scoring/SatlantisEventScoringService.ts`
2731. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2732. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2733. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2734. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2735. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2736. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2737. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2738. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2739. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2740. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2741. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2742. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2743. **Production Readiness**: Console.log statement found - `src/services/season/LeaderboardBaselineService.ts`
2744. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2745. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2746. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2747. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2748. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2749. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2750. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2751. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2752. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2753. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2754. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2755. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2756. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2757. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2758. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2759. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2760. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2761. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2762. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2763. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2764. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2765. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2766. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2767. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2768. **Production Readiness**: Console.log statement found - `src/services/season/Season2PayoutService.ts`
2769. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2770. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2771. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2772. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2773. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2774. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2775. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2776. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2777. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2778. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2779. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2780. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2781. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2782. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2783. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2784. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2785. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2786. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2787. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2788. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2789. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2790. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2791. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2792. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2793. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2794. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2795. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2796. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2797. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2798. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2799. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2800. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2801. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2802. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2803. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2804. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2805. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2806. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2807. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2808. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2809. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2810. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2811. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2812. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2813. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2814. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2815. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2816. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2817. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2818. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2819. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2820. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2821. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2822. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2823. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2824. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2825. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2826. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2827. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2828. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2829. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2830. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2831. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2832. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2833. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2834. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2835. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2836. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2837. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2838. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2839. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2840. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2841. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2842. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2843. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2844. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2845. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2846. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2847. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2848. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2849. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2850. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2851. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2852. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2853. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2854. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2855. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2856. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2857. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2858. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2859. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2860. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2861. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2862. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2863. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2864. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2865. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2866. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2867. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2868. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2869. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2870. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2871. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2872. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2873. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2874. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2875. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2876. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2877. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2878. **Production Readiness**: Console.log statement found - `src/services/season/Season2Service.ts`
2879. **Production Readiness**: Console.log statement found - `src/services/social/SocialInteractionService.ts`
2880. **Production Readiness**: Console.log statement found - `src/services/social/SocialInteractionService.ts`
2881. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2882. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2883. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2884. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2885. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2886. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2887. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2888. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2889. **Production Readiness**: Console.log statement found - `src/services/team/LocalTeamMembershipService.ts`
2890. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2891. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2892. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2893. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2894. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2895. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2896. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2897. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2898. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2899. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2900. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2901. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2902. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2903. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2904. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2905. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2906. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2907. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2908. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2909. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2910. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2911. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2912. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2913. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2914. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2915. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2916. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2917. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2918. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2919. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2920. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2921. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2922. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2923. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2924. **Production Readiness**: Console.log statement found - `src/services/verification/PoseDetectionService.ts`
2925. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2926. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2927. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2928. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2929. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2930. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2931. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2932. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2933. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2934. **Production Readiness**: Console.log statement found - `src/services/verification/VerificationService.ts`
2935. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2936. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2937. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2938. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2939. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2940. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2941. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2942. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2943. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2944. **Production Readiness**: Console.log statement found - `src/services/wallet/CoinOSAccountService.ts`
2945. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2946. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2947. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2948. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2949. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2950. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCStorageService.ts`
2951. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2952. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2953. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2954. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2955. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2956. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2957. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2958. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2959. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2960. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2961. **Production Readiness**: Console.log statement found - `src/services/wallet/NWCWalletService.ts`
2962. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
2963. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
2964. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
2965. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
2966. **Production Readiness**: Console.log statement found - `src/services/wallet/PaymentRouter.ts`
2967. **Production Readiness**: Console.log statement found - `src/services/watch/watchConnectivityService.ts`
2968. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2969. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2970. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2971. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2972. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2973. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2974. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2975. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2976. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2977. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2978. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2979. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2980. **Production Readiness**: Console.log statement found - `src/services/wot/WoTService.ts`
2981. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2982. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2983. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2984. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2985. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2986. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2987. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2988. **Production Readiness**: Console.log statement found - `src/store/musicStore.ts`
2989. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2990. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2991. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2992. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2993. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2994. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2995. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2996. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2997. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2998. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2999. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3000. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3001. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3002. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3003. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3004. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
3005. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3006. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3007. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3008. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
3009. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3010. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3011. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3012. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3013. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3014. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3015. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3016. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3017. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3018. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3019. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3020. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3021. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3022. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3023. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3024. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3025. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3026. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3027. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3028. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3029. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3030. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3031. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3032. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3033. **Production Readiness**: Console.log statement found - `src/utils/NostrFetchLogger.ts`
3034. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3035. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3036. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3037. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3038. **Production Readiness**: Console.log statement found - `src/utils/PerformanceLogger.ts`
3039. **Production Readiness**: Console.log statement found - `src/utils/TTLDeduplicator.ts`
3040. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
3041. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
3042. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3043. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3044. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3045. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3046. **Production Readiness**: Console.log statement found - `src/utils/applyGlobalPolyfills.ts`
3047. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3048. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3049. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3050. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3051. **Production Readiness**: Console.log statement found - `src/utils/asyncStorageTimeout.ts`
3052. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3053. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3054. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3055. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3056. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3057. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3058. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3059. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3060. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3061. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3062. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3063. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3064. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3065. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3066. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3067. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3068. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3069. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3070. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3071. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3072. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3073. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3074. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3075. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
3076. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3077. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3078. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3079. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
3080. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3081. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3082. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3083. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3084. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3085. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3086. **Production Readiness**: Console.log statement found - `src/utils/gpsValidation.ts`
3087. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3088. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3089. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3090. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3091. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
3092. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3093. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3094. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3095. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3096. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3097. **Production Readiness**: Console.log statement found - `src/utils/lnurl.ts`
3098. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3099. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3100. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3101. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
3102. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3103. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3104. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3105. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3106. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3107. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3108. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3109. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3110. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3111. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3112. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3113. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3114. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3115. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3116. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3117. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3118. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
3119. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3120. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3121. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3122. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3123. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3124. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3125. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3126. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3127. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3128. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3129. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3130. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3131. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3132. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3133. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3134. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3135. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3136. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3137. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3138. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3139. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3140. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
3141. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
3142. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
3143. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3144. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3145. **Production Readiness**: Console.log statement found - `src/utils/nostrTimeout.ts`
3146. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
3147. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
3148. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3149. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3150. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3151. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3152. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3153. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3154. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3155. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3156. **Production Readiness**: Console.log statement found - `src/utils/rewardTags.ts`
3157. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3158. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3159. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
3160. **Production Readiness**: Console.log statement found - `src/utils/supabase.ts`
3161. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3162. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3163. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3164. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3165. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3166. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3167. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3168. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3169. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3170. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3171. **Production Readiness**: Console.log statement found - `src/utils/walletDeepLinks.ts`
3172. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3173. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3174. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3175. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3176. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3177. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3178. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3179. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3180. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3181. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3182. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3183. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3184. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3185. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3186. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3187. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3188. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3189. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3190. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3191. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3192. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3193. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3194. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3195. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3196. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3197. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3198. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3199. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3200. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3201. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3202. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3203. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3204. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3205. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3206. **Production Readiness**: Console.log statement found - `src/utils/webSocketDebugger.ts`
3207. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`
3208. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`

</details>

