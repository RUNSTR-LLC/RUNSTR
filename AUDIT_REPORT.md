# RUNSTR Pre-Launch Audit Report

**Date**: 2025-10-07

## Summary

- 🔴 Critical: 3
- 🟠 High: 25
- 🟡 Medium: 561
- 🟢 Low: 2944
- **Total**: 3533

## 🔴 Critical Issues

### 1. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/team/JoinRequestsSection.tsx`:56
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 2. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/components/ui/NostrConnectionStatus.tsx`:32
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

### 3. Memory Leaks: useEffect with subscription but no cleanup function

- **File**: `src/screens/ProfileImportScreen.tsx`:47
- **Fix**: Add return () => { /* cleanup subscription */ } to useEffect

## 🟠 High Priority Issues

### 1. User Experience: Data fetching without loading indicator

- **File**: `src/screens/ContactSupportScreen.tsx`
- **Fix**: Add loading state and ActivityIndicator while fetching data

### 2. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/chat/ChatService.ts`:122
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 3. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/chat/ChatService.ts`:156
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 4. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/chat/ChatService.ts`:216
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 5. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/JoinRequestService.ts`:118
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 6. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:69
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 7. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:112
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 8. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:208
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 9. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleCompetitionService.ts`:246
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 10. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/competition/SimpleLeaderboardService.ts`:237
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 11. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/fitness/NdkWorkoutService.ts`:9
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 12. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/GlobalNDKService.ts`:13
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 13. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:398
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 14. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nostr/NostrCompetitionParticipantService.ts`:464
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 15. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nutzap/WalletSync.ts`:178
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 16. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nutzap/WalletSync.ts`:455
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 17. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nutzap/nutzapService.old.ts`:619
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 18. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nutzap/nutzapService.old.ts`:770
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 19. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/nutzap/nutzapService.old.ts`:876
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 20. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:74
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 21. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:80
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 22. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:117
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 23. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:129
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 24. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:245
- **Fix**: Add limit, since, or until to prevent fetching too many events

### 25. Performance: Unbounded Nostr query (no limit/since/until)

- **File**: `src/services/season/Season1Service.ts`:254
- **Fix**: Add limit, since, or until to prevent fetching too many events

## 🟡 Medium Priority Issues

<details>
<summary>Click to expand (561 issues)</summary>

1. **UI Consistency**: Hardcoded color found: #000000 - `src/components/activity/BaseTrackerComponent.tsx`
2. **UI Consistency**: Hardcoded color found: #000 - `src/components/auth/GoogleSignInButton.tsx`
3. **UI Consistency**: Hardcoded color found: #00ff00 - `src/components/captain/CompetitionParticipantsSection.tsx`
4. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/competition/CompetitionDistributionPanel.tsx`
5. **UI Consistency**: Hardcoded color found: #000 - `src/components/competition/JoinRequestCard.tsx`
6. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/competition/JoinRequestCard.tsx`
7. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
8. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
9. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/competition/JoinRequestCard.tsx`
10. **UI Consistency**: Hardcoded color found: #000 - `src/components/competition/JoinRequestsSection.tsx`
11. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/competition/LiveLeaderboard.tsx`
12. **UI Consistency**: Hardcoded color found: #cd7f32 - `src/components/competition/LiveLeaderboard.tsx`
13. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/QREventDisplayModal.tsx`
14. **UI Consistency**: Hardcoded color found: #000000 - `src/components/event/QREventDisplayModal.tsx`
15. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/event/QREventDisplayModal.tsx`
16. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/events/ActivityTypeSelector.tsx`
17. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/ActivityTypeSelector.tsx`
18. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/events/ActivityTypeSelector.tsx`
19. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/events/ActivityTypeSelector.tsx`
20. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/fitness/MonthlyWorkoutFolder.tsx`
21. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/fitness/MonthlyWorkoutFolder.tsx`
22. **UI Consistency**: Hardcoded color found: #999 - `src/components/fitness/MonthlyWorkoutFolder.tsx`
23. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
24. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
25. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
26. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
27. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
28. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
29. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
30. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
31. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
32. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
33. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
34. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
35. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
36. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
37. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/fitness/WorkoutActionButtons.tsx`
38. **UI Consistency**: Hardcoded color found: #000000 - `src/components/fitness/WorkoutActionButtons.tsx`
39. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/fitness/WorkoutCalendarHeatmap.tsx`
40. **UI Consistency**: Hardcoded color found: #FF9500 - `src/components/fitness/WorkoutSyncStatus.tsx`
41. **UI Consistency**: Hardcoded color found: #FF3B30 - `src/components/fitness/WorkoutSyncStatus.tsx`
42. **UI Consistency**: Hardcoded color found: #FF9500 - `src/components/fitness/WorkoutSyncStatus.tsx`
43. **UI Consistency**: Hardcoded color found: #FF9500 - `src/components/fitness/WorkoutSyncStatus.tsx`
44. **UI Consistency**: Hardcoded color found: #00ff00 - `src/components/notifications/ChallengeRequestCard.tsx`
45. **UI Consistency**: Hardcoded color found: #00ff00 - `src/components/notifications/ChallengeRequestCard.tsx`
46. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/EarningsDisplay.tsx`
47. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/EarningsDisplay.tsx`
48. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/EarningsDisplay.tsx`
49. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/GroupedNotificationCard.tsx`
50. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
51. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/GroupedNotificationCard.tsx`
52. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
53. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
54. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/GroupedNotificationCard.tsx`
55. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/GroupedNotificationCard.tsx`
56. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/GroupedNotificationCard.tsx`
57. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/GroupedNotificationCard.tsx`
58. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/GroupedNotificationCard.tsx`
59. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/LiveIndicator.tsx`
60. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/LiveIndicator.tsx`
61. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/MiniLeaderboard.tsx`
62. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
63. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
64. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/MiniLeaderboard.tsx`
65. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
66. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/MiniLeaderboard.tsx`
67. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/MiniLeaderboard.tsx`
68. **UI Consistency**: Hardcoded color found: #333 - `src/components/notifications/NotificationActions.tsx`
69. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
70. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationActions.tsx`
71. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationActions.tsx`
72. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/notifications/NotificationCard.tsx`
73. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
74. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
75. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
76. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
77. **UI Consistency**: Hardcoded color found: #000 - `src/components/notifications/NotificationCard.tsx`
78. **UI Consistency**: Hardcoded color found: #ccc - `src/components/notifications/NotificationCard.tsx`
79. **UI Consistency**: Hardcoded color found: #666 - `src/components/notifications/NotificationCard.tsx`
80. **UI Consistency**: Hardcoded color found: #fff - `src/components/notifications/NotificationCard.tsx`
81. **UI Consistency**: Hardcoded color found: #999 - `src/components/notifications/NotificationCard.tsx`
82. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/notifications/NotificationCard.tsx`
83. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/nutzap/NutzapLightningButton.tsx`
84. **UI Consistency**: Hardcoded color found: #0f0f0f - `src/components/nutzap/NutzapLightningButton.tsx`
85. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/AccountTab.tsx`
86. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/AccountTab.tsx`
87. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/AccountTab.tsx`
88. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/AccountTab.tsx`
89. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/AccountTab.tsx`
90. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/CompactTeamCard.tsx`
91. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/CompactTeamCard.tsx`
92. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
93. **UI Consistency**: Hardcoded color found: #666666 - `src/components/profile/CompactTeamCard.tsx`
94. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
95. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
96. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
97. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/profile/CompactTeamCard.tsx`
98. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/CompactTeamCard.tsx`
99. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/CompactWallet.tsx`
100. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/CompactWallet.tsx`
101. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
102. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
103. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
104. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
105. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
106. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MonthlyStatsPanel.tsx`
107. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
108. **UI Consistency**: Hardcoded color found: #000000 - `src/components/profile/MonthlyStatsPanel.tsx`
109. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
110. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/MonthlyStatsPanel.tsx`
111. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
112. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
113. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
114. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
115. **UI Consistency**: Hardcoded color found: #999999 - `src/components/profile/MonthlyStatsPanel.tsx`
116. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MonthlyStatsPanel.tsx`
117. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/MonthlyStatsPanel.tsx`
118. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/profile/MonthlyStatsPanel.tsx`
119. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/MonthlyStatsPanel.tsx`
120. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/MyTeamsBox.tsx`
121. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/MyTeamsBox.tsx`
122. **UI Consistency**: Hardcoded color found: #dc2626 - `src/components/profile/NotificationBadge.tsx`
123. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/NotificationBadge.tsx`
124. **UI Consistency**: Hardcoded color found: #dc2626 - `src/components/profile/NotificationItem.tsx`
125. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/NotificationsTab.tsx`
126. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/NotificationsTab.tsx`
127. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/NotificationsTab.tsx`
128. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/NotificationsTab.tsx`
129. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/NotificationsTab.tsx`
130. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/NotificationsTab.tsx`
131. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/NotificationsTab.tsx`
132. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/NotificationsTab.tsx`
133. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/NotificationsTab.tsx`
134. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/NotificationsTab.tsx`
135. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/NotificationsTab.tsx`
136. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/NotificationsTab.tsx`
137. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/NotificationsTab.tsx`
138. **UI Consistency**: Hardcoded color found: #ccc - `src/components/profile/NotificationsTab.tsx`
139. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/ProfileHeader.tsx`
140. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/ProfileHeader.tsx`
141. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/SimpleNavigationBox.tsx`
142. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/SimpleNavigationBox.tsx`
143. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/TabNavigation.tsx`
144. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/TabNavigation.tsx`
145. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/TabNavigation.tsx`
146. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/TabNavigation.tsx`
147. **UI Consistency**: Hardcoded color found: #fff - `src/components/profile/TabNavigation.tsx`
148. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/TeamManagementSection.tsx`
149. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/TeamManagementSection.tsx`
150. **UI Consistency**: Hardcoded color found: #666666 - `src/components/profile/TeamManagementSection.tsx`
151. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WalletSection.tsx`
152. **UI Consistency**: Hardcoded color found: #666 - `src/components/profile/WalletSection.tsx`
153. **UI Consistency**: Hardcoded color found: #FF7B1C - `src/components/profile/WorkoutLevelRing.tsx`
154. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
155. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
156. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/WorkoutLevelRing.tsx`
157. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
158. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
159. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
160. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/profile/WorkoutLevelRing.tsx`
161. **UI Consistency**: Hardcoded color found: #CC7A33 - `src/components/profile/WorkoutLevelRing.tsx`
162. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
163. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/WorkoutLevelRing.tsx`
164. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/WorkoutLevelRing.tsx`
165. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourCompetitionsBox.tsx`
166. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourCompetitionsBox.tsx`
167. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/profile/YourWorkoutsBox.tsx`
168. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/profile/YourWorkoutsBox.tsx`
169. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/profile/shared/MonthlyWorkoutGroup.tsx`
170. **UI Consistency**: Hardcoded color found: #000 - `src/components/profile/shared/SyncDropdown.tsx`
171. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/JoinPreviewModal.tsx`
172. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/JoinPreviewModal.tsx`
173. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/JoinPreviewModal.tsx`
174. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/JoinPreviewModal.tsx`
175. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/JoinPreviewModal.tsx`
176. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRDisplayModal.tsx`
177. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRDisplayModal.tsx`
178. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
179. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRDisplayModal.tsx`
180. **UI Consistency**: Hardcoded color found: #fff - `src/components/qr/QRDisplayModal.tsx`
181. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
182. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
183. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
184. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/qr/QRScannerModal.tsx`
185. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/qr/QRScannerModal.tsx`
186. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/qr/QRScannerModal.tsx`
187. **UI Consistency**: Hardcoded color found: #000 - `src/components/qr/QRScannerModal.tsx`
188. **UI Consistency**: Hardcoded color found: #fff - `src/components/team/CaptainHeader.tsx`
189. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/CaptainHeader.tsx`
190. **UI Consistency**: Hardcoded color found: #fff - `src/components/team/CaptainHeader.tsx`
191. **UI Consistency**: Hardcoded color found: #333 - `src/components/team/CaptainHeader.tsx`
192. **UI Consistency**: Hardcoded color found: #fff - `src/components/team/CaptainHeader.tsx`
193. **UI Consistency**: Hardcoded color found: #fff - `src/components/team/CaptainHeader.tsx`
194. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/team/CaptainHeader.tsx`
195. **UI Consistency**: Hardcoded color found: #4CAF50 - `src/components/team/CaptainHeader.tsx`
196. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/ChallengesCard.tsx`
197. **UI Consistency**: Hardcoded color found: #2a1a00 - `src/components/team/ChatHeader.tsx`
198. **UI Consistency**: Hardcoded color found: #3a2a10 - `src/components/team/ChatHeader.tsx`
199. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/CompetitionTabs.tsx`
200. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/CompetitionTabs.tsx`
201. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/CompetitionWinnersCard.tsx`
202. **UI Consistency**: Hardcoded color found: #333 - `src/components/team/DifficultyIndicator.tsx`
203. **UI Consistency**: Hardcoded color found: #fff - `src/components/team/DifficultyIndicator.tsx`
204. **UI Consistency**: Hardcoded color found: #666 - `src/components/team/DifficultyIndicator.tsx`
205. **UI Consistency**: Hardcoded color found: #4CAF50 - `src/components/team/JoinRequestCard.tsx`
206. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/JoinRequestsSection.tsx`
207. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/LeagueRankingsSection.tsx`
208. **UI Consistency**: Hardcoded color found: #22c55e - `src/components/team/LeagueRankingsSection.tsx`
209. **UI Consistency**: Hardcoded color found: #22c55e - `src/components/team/LeagueRankingsSection.tsx`
210. **UI Consistency**: Hardcoded color found: #ef4444 - `src/components/team/LeagueRankingsSection.tsx`
211. **UI Consistency**: Hardcoded color found: #FFD700 - `src/components/team/LeagueRankingsSectionCached.tsx`
212. **UI Consistency**: Hardcoded color found: #C0C0C0 - `src/components/team/LeagueRankingsSectionCached.tsx`
213. **UI Consistency**: Hardcoded color found: #CD7F32 - `src/components/team/LeagueRankingsSectionCached.tsx`
214. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/LeaguesCard.tsx`
215. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/NostrMemberManager.tsx`
216. **UI Consistency**: Hardcoded color found: #ff6b35 - `src/components/team/NostrMemberManager.tsx`
217. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/NostrMemberManager.tsx`
218. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/NostrMemberManager.tsx`
219. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/RewardDistributionPanel.tsx`
220. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/RewardDistributionPanel.tsx`
221. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/TeamActivityFeed.tsx`
222. **UI Consistency**: Hardcoded color found: #666 - `src/components/team/TeamActivityFeed.tsx`
223. **UI Consistency**: Hardcoded color found: #ccc - `src/components/team/TeamActivityFeed.tsx`
224. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/team/TeamCard.tsx`
225. **UI Consistency**: Hardcoded color found: #333333 - `src/components/team/TeamCard.tsx`
226. **UI Consistency**: Hardcoded color found: #666666 - `src/components/team/TeamCard.tsx`
227. **UI Consistency**: Hardcoded color found: #666666 - `src/components/team/TeamCard.tsx`
228. **UI Consistency**: Hardcoded color found: #999 - `src/components/team/TeamCardHeader.tsx`
229. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/TeamJoinModal.tsx`
230. **UI Consistency**: Hardcoded color found: #000 - `src/components/team/TeamJoinModal.tsx`
231. **UI Consistency**: Hardcoded color found: #1a1a00 - `src/components/team/TeamJoinModal.tsx`
232. **UI Consistency**: Hardcoded color found: #333300 - `src/components/team/TeamJoinModal.tsx`
233. **UI Consistency**: Hardcoded color found: #ffcc00 - `src/components/team/TeamJoinModal.tsx`
234. **UI Consistency**: Hardcoded color found: #cccccc - `src/components/team/TeamJoinModal.tsx`
235. **UI Consistency**: Hardcoded color found: #999999 - `src/components/team/TeamJoinModal.tsx`
236. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/TeamJoinModal.tsx`
237. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/team/TeamJoinModal.tsx`
238. **UI Consistency**: Hardcoded color found: #1a0000 - `src/components/team/TeamJoinModal.tsx`
239. **UI Consistency**: Hardcoded color found: #330000 - `src/components/team/TeamJoinModal.tsx`
240. **UI Consistency**: Hardcoded color found: #ff6666 - `src/components/team/TeamJoinModal.tsx`
241. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/team/TeamMembersSection.tsx`
242. **UI Consistency**: Hardcoded color found: #666 - `src/components/team/TeamPrizeSection.tsx`
243. **UI Consistency**: Hardcoded color found: #666 - `src/components/team/TeamPrizeSection.tsx`
244. **UI Consistency**: Hardcoded color found: #666 - `src/components/team/TeamStatsGrid.tsx`
245. **UI Consistency**: Hardcoded color found: #000 - `src/components/testing/AuthFlowTestScreen.tsx`
246. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/testing/AuthFlowTestScreen.tsx`
247. **UI Consistency**: Hardcoded color found: #333 - `src/components/testing/AuthFlowTestScreen.tsx`
248. **UI Consistency**: Hardcoded color found: #666 - `src/components/testing/AuthFlowTestScreen.tsx`
249. **UI Consistency**: Hardcoded color found: #333 - `src/components/testing/AuthFlowTestScreen.tsx`
250. **UI Consistency**: Hardcoded color found: #333 - `src/components/testing/AuthFlowTestScreen.tsx`
251. **UI Consistency**: Hardcoded color found: #333 - `src/components/testing/AuthFlowTestScreen.tsx`
252. **UI Consistency**: Hardcoded color found: #4CAF50 - `src/components/testing/AuthFlowTestScreen.tsx`
253. **UI Consistency**: Hardcoded color found: #FF6B6B - `src/components/testing/AuthFlowTestScreen.tsx`
254. **UI Consistency**: Hardcoded color found: #666 - `src/components/testing/AuthFlowTestScreen.tsx`
255. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/testing/AuthFlowTestScreen.tsx`
256. **UI Consistency**: Hardcoded color found: #4A90E2 - `src/components/testing/AuthFlowTestScreen.tsx`
257. **UI Consistency**: Hardcoded color found: #0d4f2d - `src/components/testing/AuthFlowTestScreen.tsx`
258. **UI Consistency**: Hardcoded color found: #0d4f2d - `src/components/testing/AuthFlowTestScreen.tsx`
259. **UI Consistency**: Hardcoded color found: #ccc - `src/components/testing/AuthFlowTestScreen.tsx`
260. **UI Consistency**: Hardcoded color found: #ffcccb - `src/components/testing/AuthFlowTestScreen.tsx`
261. **UI Consistency**: Hardcoded color found: #ccc - `src/components/testing/AuthFlowTestScreen.tsx`
262. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/testing/AuthFlowTestScreen.tsx`
263. **UI Consistency**: Hardcoded color found: #0a84ff - `src/components/testing/HealthKitTestScreen.tsx`
264. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/testing/HealthKitTestScreen.tsx`
265. **UI Consistency**: Hardcoded color found: #FF9D42 - `src/components/testing/NutzapTestComponent.tsx`
266. **UI Consistency**: Hardcoded color found: #000 - `src/components/testing/NutzapTestComponent.tsx`
267. **UI Consistency**: Hardcoded color found: #888 - `src/components/testing/NutzapTestComponent.tsx`
268. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/testing/NutzapTestComponent.tsx`
269. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/testing/NutzapTestComponent.tsx`
270. **UI Consistency**: Hardcoded color found: #888 - `src/components/testing/NutzapTestComponent.tsx`
271. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/testing/NutzapTestComponent.tsx`
272. **UI Consistency**: Hardcoded color found: #007AFF - `src/components/testing/NutzapTestComponent.tsx`
273. **UI Consistency**: Hardcoded color found: #333 - `src/components/testing/NutzapTestComponent.tsx`
274. **UI Consistency**: Hardcoded color found: #ff3b30 - `src/components/testing/NutzapTestComponent.tsx`
275. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/testing/NutzapTestComponent.tsx`
276. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/testing/NutzapTestComponent.tsx`
277. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/testing/NutzapTestComponent.tsx`
278. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/ActionButton.tsx`
279. **UI Consistency**: Hardcoded color found: #ccc - `src/components/ui/ActionButton.tsx`
280. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/Avatar.tsx`
281. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/BottomNavigation.tsx`
282. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/BottomNavigation.tsx`
283. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
284. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/BottomNavigation.tsx`
285. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/BottomNavigation.tsx`
286. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
287. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
288. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/Button.tsx`
289. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/CustomAlert.tsx`
290. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/DifficultyIndicator.tsx`
291. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/DifficultyIndicator.tsx`
292. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/DifficultyIndicator.tsx`
293. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/DropdownMenu.tsx`
294. **UI Consistency**: Hardcoded color found: #ff4444 - `src/components/ui/DropdownMenu.tsx`
295. **UI Consistency**: Hardcoded color found: #333 - `src/components/ui/MemberAvatar.tsx`
296. **UI Consistency**: Hardcoded color found: #ff6b6b - `src/components/ui/NostrConnectionStatus.tsx`
297. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
298. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
299. **UI Consistency**: Hardcoded color found: #51cf66 - `src/components/ui/NostrConnectionStatus.tsx`
300. **UI Consistency**: Hardcoded color found: #ffd43b - `src/components/ui/NostrConnectionStatus.tsx`
301. **UI Consistency**: Hardcoded color found: #ff6b6b - `src/components/ui/NostrConnectionStatus.tsx`
302. **UI Consistency**: Hardcoded color found: #FFB366 - `src/components/ui/PrimaryButton.tsx`
303. **UI Consistency**: Hardcoded color found: #CCCCCC - `src/components/ui/PrimaryButton.tsx`
304. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
305. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/PrizeDisplay.tsx`
306. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
307. **UI Consistency**: Hardcoded color found: #000000 - `src/components/ui/SplashScreen.tsx`
308. **UI Consistency**: Hardcoded color found: #FFFFFF - `src/components/ui/SplashScreen.tsx`
309. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
310. **UI Consistency**: Hardcoded color found: #666666 - `src/components/ui/SplashScreen.tsx`
311. **UI Consistency**: Hardcoded color found: #333333 - `src/components/ui/SplashScreen.tsx`
312. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/ui/StatCard.tsx`
313. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/ui/StatCard.tsx`
314. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
315. **UI Consistency**: Hardcoded color found: #fff - `src/components/ui/StatCard.tsx`
316. **UI Consistency**: Hardcoded color found: #000 - `src/components/ui/StatCard.tsx`
317. **UI Consistency**: Hardcoded color found: #666 - `src/components/ui/StatCard.tsx`
318. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
319. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
320. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
321. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
322. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/AutoWithdrawSection.tsx`
323. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/AutoWithdrawSection.tsx`
324. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/EarningsSummary.tsx`
325. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/EarningsSummary.tsx`
326. **UI Consistency**: Hardcoded color found: #666666 - `src/components/wallet/HistoryModal.tsx`
327. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/wallet/HistoryModal.tsx`
328. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
329. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
330. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wallet/HistoryModal.tsx`
331. **UI Consistency**: Hardcoded color found: #0a0a0a - `src/components/wallet/HistoryModal.tsx`
332. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/HistoryModal.tsx`
333. **UI Consistency**: Hardcoded color found: #666666 - `src/components/wallet/HistoryModal.tsx`
334. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/HistoryModal.tsx`
335. **UI Consistency**: Hardcoded color found: #666666 - `src/components/wallet/HistoryModal.tsx`
336. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/HistoryModal.tsx`
337. **UI Consistency**: Hardcoded color found: #666666 - `src/components/wallet/HistoryModal.tsx`
338. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
339. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
340. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
341. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
342. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
343. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/ReceiveBitcoinForm.tsx`
344. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/wallet/RewardDistributionModal.tsx`
345. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
346. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
347. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
348. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
349. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
350. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
351. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
352. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/SendBitcoinForm.tsx`
353. **UI Consistency**: Hardcoded color found: #999999 - `src/components/wallet/SendModal.tsx`
354. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletActivityList.tsx`
355. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletActivityList.tsx`
356. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletActivityList.tsx`
357. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletActivityList.tsx`
358. **UI Consistency**: Hardcoded color found: #ff6b6b - `src/components/wallet/WalletBalanceCard.tsx`
359. **UI Consistency**: Hardcoded color found: #ff6b6b - `src/components/wallet/WalletBalanceCard.tsx`
360. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletBalanceCard.tsx`
361. **UI Consistency**: Hardcoded color found: #fff - `src/components/wallet/WalletBalanceCard.tsx`
362. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wallet/WalletBalanceCard.tsx`
363. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletBalanceCard.tsx`
364. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletBalanceCard.tsx`
365. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletBalanceCard.tsx`
366. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletBalanceCard.tsx`
367. **UI Consistency**: Hardcoded color found: #ff6b6b - `src/components/wallet/WalletConnectionError.tsx`
368. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletConnectionError.tsx`
369. **UI Consistency**: Hardcoded color found: #666 - `src/components/wallet/WalletConnectionError.tsx`
370. **UI Consistency**: Hardcoded color found: #333 - `src/components/wizards/TeamCreationWizard.tsx`
371. **UI Consistency**: Hardcoded color found: #333 - `src/components/wizards/TeamCreationWizard.tsx`
372. **UI Consistency**: Hardcoded color found: #333 - `src/components/wizards/TeamCreationWizard.tsx`
373. **UI Consistency**: Hardcoded color found: #ff9500 - `src/components/wizards/steps/FirstEventStep.tsx`
374. **UI Consistency**: Hardcoded color found: #1a1a1a - `src/components/wizards/steps/FirstEventStep.tsx`
375. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/wizards/steps/QRChallengeDisplayStep.tsx`
376. **UI Consistency**: Hardcoded color found: #000000 - `src/components/wizards/steps/QRChallengeDisplayStep.tsx`
377. **UI Consistency**: Hardcoded color found: #ffffff - `src/components/wizards/steps/QRChallengeDisplayStep.tsx`
378. **UI Consistency**: Hardcoded color found: #000 - `src/components/wizards/steps/SuccessScreen.tsx`
379. **UI Consistency**: Hardcoded color found: #fff - `src/components/wizards/steps/SuccessScreen.tsx`
380. **UI Consistency**: Hardcoded color found: #ff9500 - `src/components/wizards/steps/TeamBasicsStep.tsx`
381. **UI Consistency**: Hardcoded color found: #ff9500 - `src/components/wizards/steps/TeamBasicsStep.tsx`
382. **Error Handling**: AsyncStorage operation without try-catch - `src/App.tsx`
383. **Error Handling**: AsyncStorage operation without try-catch - `src/App.tsx`
384. **Error Handling**: AsyncStorage operation without try-catch - `src/App.tsx`
385. **Error Handling**: AsyncStorage operation without try-catch - `src/App.tsx`
386. **Error Handling**: AsyncStorage operation without try-catch - `src/components/activity/WorkoutSummaryModal.tsx`
387. **Error Handling**: AsyncStorage operation without try-catch - `src/components/competition/CompetitionDistributionPanel.tsx`
388. **Error Handling**: AsyncStorage operation without try-catch - `src/components/nutzap/NutzapLightningButton.tsx`
389. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
390. **Error Handling**: AsyncStorage operation without try-catch - `src/contexts/AuthContext.tsx`
391. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ContactSupportScreen.tsx`
392. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ContactSupportScreen.tsx`
393. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/OnboardingScreen.tsx`
394. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/ProfileScreen.tsx`
395. **Error Handling**: AsyncStorage operation without try-catch - `src/screens/WorkoutHistoryScreen.tsx`
396. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
397. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/ActivityMetricsService.ts`
398. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BackgroundLocationTask.ts`
399. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/BackgroundLocationTask.ts`
400. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
401. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/LocationPermissionService.ts`
402. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SessionRecoveryService.ts`
403. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SessionRecoveryService.ts`
404. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SessionRecoveryService.ts`
405. **Error Handling**: AsyncStorage operation without try-catch - `src/services/activity/SessionRecoveryService.ts`
406. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
407. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
408. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/UnifiedSigningService.ts`
409. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
410. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/amber/AmberNDKSigner.ts`
411. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
412. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
413. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
414. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/amberAuthProvider.ts`
415. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
416. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
417. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
418. **Error Handling**: AsyncStorage operation without try-catch - `src/services/auth/providers/nostrAuthProvider.ts`
419. **Error Handling**: AsyncStorage operation without try-catch - `src/services/cache/OnboardingCacheService.ts`
420. **Error Handling**: AsyncStorage operation without try-catch - `src/services/cache/OnboardingCacheService.ts`
421. **Error Handling**: AsyncStorage operation without try-catch - `src/services/challenge/QRChallengeService.ts`
422. **Error Handling**: AsyncStorage operation without try-catch - `src/services/chat/ChatService.ts`
423. **Error Handling**: AsyncStorage operation without try-catch - `src/services/chat/ChatService.ts`
424. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/ChallengeService.ts`
425. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
426. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
427. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
428. **Error Handling**: AsyncStorage operation without try-catch - `src/services/competition/leagueDataBridge.ts`
429. **Error Handling**: AsyncStorage operation without try-catch - `src/services/database/workoutDatabase.ts`
430. **Error Handling**: AsyncStorage operation without try-catch - `src/services/event/QREventService.ts`
431. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
432. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/LocalWorkoutStorageService.ts`
433. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
434. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
435. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutService.ts`
436. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/nostrWorkoutSyncService.ts`
437. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/optimizedWorkoutMergeService.ts`
438. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
439. **Error Handling**: AsyncStorage operation without try-catch - `src/services/fitness/workoutMergeService.ts`
440. **Error Handling**: AsyncStorage operation without try-catch - `src/services/integrations/NostrCompetitionContextService.ts`
441. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nostr/NostrTeamCreationService.ts`
442. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
443. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
444. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
445. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
446. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
447. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletCore.ts`
448. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletSync.ts`
449. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/WalletSync.ts`
450. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
451. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
452. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
453. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
454. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
455. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
456. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
457. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
458. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
459. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
460. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
461. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
462. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
463. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
464. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
465. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
466. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
467. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
468. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
469. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
470. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
471. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
472. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
473. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
474. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
475. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
476. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
477. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
478. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
479. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
480. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
481. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
482. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
483. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
484. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
485. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
486. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
487. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
488. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
489. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
490. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
491. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
492. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.old.ts`
493. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.ts`
494. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/nutzapService.ts`
495. **Error Handling**: AsyncStorage operation without try-catch - `src/services/nutzap/rewardService.ts`
496. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
497. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
498. **Error Handling**: AsyncStorage operation without try-catch - `src/services/season/Season1Service.ts`
499. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
500. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
501. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
502. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
503. **Error Handling**: AsyncStorage operation without try-catch - `src/services/team/teamMembershipService.ts`
504. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
505. **Error Handling**: AsyncStorage operation without try-catch - `src/services/user/profileService.ts`
506. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
507. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
508. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
509. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
510. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
511. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
512. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebug.ts`
513. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
514. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
515. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
516. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/authDebugHelper.ts`
517. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/cache.ts`
518. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/captainCache.ts`
519. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
520. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostr.ts`
521. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
522. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
523. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
524. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
525. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
526. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
527. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
528. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
529. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
530. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
531. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
532. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
533. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
534. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
535. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
536. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
537. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
538. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
539. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
540. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
541. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
542. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
543. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/nostrAuth.ts`
544. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
545. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
546. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
547. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
548. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/notificationCache.ts`
549. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/testCaptainFlow.ts`
550. **Error Handling**: AsyncStorage operation without try-catch - `src/utils/walletRecovery.ts`
551. **User Experience**: List without empty state message - `src/screens/ContactSupportScreen.tsx`
552. **User Experience**: List without empty state message - `src/screens/EnhancedTeamScreen.tsx`
553. **User Experience**: List without empty state message - `src/screens/EventsScreen.tsx`
554. **User Experience**: List without empty state message - `src/screens/HelpSupportScreen.tsx`
555. **User Experience**: List without empty state message - `src/screens/PrivacyPolicyScreen.tsx`
556. **User Experience**: List without empty state message - `src/screens/ProfileEditScreen.tsx`
557. **User Experience**: List without empty state message - `src/screens/ProfileScreen.tsx`
558. **User Experience**: List without empty state message - `src/screens/TeamScreen.tsx`
559. **User Experience**: List without empty state message - `src/screens/WalletScreen.tsx`
560. **User Experience**: List without empty state message - `src/screens/activity/ActivityTrackerScreen.tsx`
561. **User Experience**: List without empty state message - `src/screens/activity/ManualWorkoutScreen.tsx`

</details>

## 🟢 Low Priority Issues

<details>
<summary>Click to expand (2944 issues)</summary>

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
31. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
32. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
33. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
34. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
35. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
36. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
37. **Production Readiness**: Console.log statement found - `src/App_backup.tsx`
38. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
39. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
40. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
41. **Production Readiness**: Console.log statement found - `src/components/activity/WorkoutSummaryModal.tsx`
42. **Production Readiness**: Console.log statement found - `src/components/auth/AppleSignInButton.tsx`
43. **Production Readiness**: Console.log statement found - `src/components/auth/GoogleSignInButton.tsx`
44. **Production Readiness**: Console.log statement found - `src/components/captain/EventJoinRequestsSection.tsx`
45. **Production Readiness**: Console.log statement found - `src/components/captain/EventParticipantManagementSection.tsx`
46. **Production Readiness**: Console.log statement found - `src/components/captain/EventParticipantManagementSection.tsx`
47. **Production Readiness**: Console.log statement found - `src/components/competition/AutoEntryPrompt.tsx`
48. **Production Readiness**: Console.log statement found - `src/components/competition/AutoEntryPrompt.tsx`
49. **Production Readiness**: Console.log statement found - `src/components/competition/AutoEntryPrompt.tsx`
50. **Production Readiness**: Console.log statement found - `src/components/competition/AutoEntryPrompt.tsx`
51. **Production Readiness**: Console.log statement found - `src/components/competition/CompetitionDistributionPanel.tsx`
52. **Production Readiness**: Console.log statement found - `src/components/competition/EventCreationModal.tsx`
53. **Production Readiness**: Console.log statement found - `src/components/competition/LeagueCreationModal.tsx`
54. **Production Readiness**: Console.log statement found - `src/components/competition/LiveLeaderboard.tsx`
55. **Production Readiness**: Console.log statement found - `src/components/competition/LiveLeaderboard.tsx`
56. **Production Readiness**: Console.log statement found - `src/components/fitness/HealthKitPermissionCard.tsx`
57. **Production Readiness**: Console.log statement found - `src/components/fitness/HealthKitPermissionCard.tsx`
58. **Production Readiness**: Console.log statement found - `src/components/fitness/HealthKitPermissionCard.tsx`
59. **Production Readiness**: Console.log statement found - `src/components/nutzap/EnhancedZapModal.tsx`
60. **Production Readiness**: Console.log statement found - `src/components/nutzap/NutzapLightningButton.tsx`
61. **Production Readiness**: Console.log statement found - `src/components/onboarding/PermissionRequestStep.tsx`
62. **Production Readiness**: Console.log statement found - `src/components/profile/CompactTeamCard.tsx`
63. **Production Readiness**: Console.log statement found - `src/components/profile/CompactWallet.tsx`
64. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
65. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
66. **Production Readiness**: Console.log statement found - `src/components/profile/NotificationModal.tsx`
67. **Production Readiness**: Console.log statement found - `src/components/profile/ProfileHeader.tsx`
68. **Production Readiness**: Console.log statement found - `src/components/profile/TeamManagementSection.tsx`
69. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
70. **Production Readiness**: Console.log statement found - `src/components/profile/shared/SyncDropdown.tsx`
71. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
72. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
73. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
74. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
75. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AllWorkoutsTab.tsx`
76. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
77. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
78. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
79. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
80. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
81. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
82. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
83. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/AppleHealthTab.tsx`
84. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/NostrWorkoutsTab.tsx`
85. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/NostrWorkoutsTab.tsx`
86. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/NostrWorkoutsTab.tsx`
87. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
88. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
89. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PrivateWorkoutsTab.tsx`
90. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
91. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
92. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
93. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
94. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
95. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
96. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
97. **Production Readiness**: Console.log statement found - `src/components/profile/tabs/PublicWorkoutsTab.tsx`
98. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
99. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
100. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
101. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
102. **Production Readiness**: Console.log statement found - `src/components/team/AboutPrizeSection.tsx`
103. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
104. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
105. **Production Readiness**: Console.log statement found - `src/components/team/EventsCard.tsx`
106. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestCard.tsx`
107. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestCard.tsx`
108. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestsSection.tsx`
109. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestsSection.tsx`
110. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestsSection.tsx`
111. **Production Readiness**: Console.log statement found - `src/components/team/JoinRequestsSection.tsx`
112. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
113. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
114. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
115. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
116. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
117. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
118. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
119. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
120. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
121. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
122. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
123. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
124. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
125. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
126. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
127. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
128. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
129. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
130. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
131. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
132. **Production Readiness**: Console.log statement found - `src/components/team/LeagueRankingsSection.tsx`
133. **Production Readiness**: Console.log statement found - `src/components/team/NostrMemberManager.tsx`
134. **Production Readiness**: Console.log statement found - `src/components/team/NostrMemberManager.tsx`
135. **Production Readiness**: Console.log statement found - `src/components/team/NostrMemberManager.tsx`
136. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
137. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
138. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
139. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
140. **Production Readiness**: Console.log statement found - `src/components/team/TeamCard.tsx`
141. **Production Readiness**: Console.log statement found - `src/components/team/TeamChatSection.tsx`
142. **Production Readiness**: Console.log statement found - `src/components/team/TeamChatSection.tsx`
143. **Production Readiness**: Console.log statement found - `src/components/team/TeamChatSection.tsx`
144. **Production Readiness**: Console.log statement found - `src/components/team/TeamChatSection.tsx`
145. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
146. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
147. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
148. **Production Readiness**: Console.log statement found - `src/components/team/TeamHeader.tsx`
149. **Production Readiness**: Console.log statement found - `src/components/team/TeamMembersSection.tsx`
150. **Production Readiness**: Console.log statement found - `src/components/team/TeamMembersSection.tsx`
151. **Production Readiness**: Console.log statement found - `src/components/team/TeamMembersSection.tsx`
152. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
153. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
154. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
155. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
156. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
157. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
158. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
159. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
160. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
161. **Production Readiness**: Console.log statement found - `src/components/testing/AuthFlowTestScreen.tsx`
162. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
163. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
164. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
165. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
166. **Production Readiness**: Console.log statement found - `src/components/ui/SplashScreen.tsx`
167. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
168. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
169. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
170. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
171. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
172. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
173. **Production Readiness**: Console.log statement found - `src/components/wizards/EventCreationWizard.tsx`
174. **Production Readiness**: Console.log statement found - `src/components/wizards/GlobalChallengeWizard.tsx`
175. **Production Readiness**: Console.log statement found - `src/components/wizards/LeagueCreationWizard.tsx`
176. **Production Readiness**: Console.log statement found - `src/components/wizards/LeagueCreationWizard.tsx`
177. **Production Readiness**: Console.log statement found - `src/components/wizards/LeagueCreationWizard.tsx`
178. **Production Readiness**: Console.log statement found - `src/components/wizards/LeagueCreationWizard.tsx`
179. **Production Readiness**: Console.log statement found - `src/components/wizards/OpenChallengeWizard.tsx`
180. **Production Readiness**: Console.log statement found - `src/components/wizards/QuickChallengeWizard.tsx`
181. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
182. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
183. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
184. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
185. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
186. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
187. **Production Readiness**: Console.log statement found - `src/components/wizards/steps/ReviewLaunchStep.tsx`
188. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
189. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
190. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
191. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
192. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
193. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
194. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
195. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
196. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
197. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
198. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
199. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
200. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
201. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
202. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
203. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
204. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
205. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
206. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
207. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
208. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
209. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
210. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
211. **Production Readiness**: Console.log statement found - `src/contexts/AuthContext.tsx`
212. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
213. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
214. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
215. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
216. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
217. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
218. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
219. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
220. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
221. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
222. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
223. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
224. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
225. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
226. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
227. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
228. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
229. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
230. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
231. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
232. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
233. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
234. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
235. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
236. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
237. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
238. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
239. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
240. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
241. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
242. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
243. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
244. **Production Readiness**: Console.log statement found - `src/contexts/NavigationDataContext.tsx`
245. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
246. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
247. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
248. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
249. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
250. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
251. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
252. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
253. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
254. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
255. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
256. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
257. **Production Readiness**: Console.log statement found - `src/hooks/useAutoEventEntry.ts`
258. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
259. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
260. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
261. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
262. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
263. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
264. **Production Readiness**: Console.log statement found - `src/hooks/useCaptainDetection.ts`
265. **Production Readiness**: Console.log statement found - `src/hooks/useChallengeCreation.ts`
266. **Production Readiness**: Console.log statement found - `src/hooks/useChallengeCreation.ts`
267. **Production Readiness**: Console.log statement found - `src/hooks/useChallengeCreation.ts`
268. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
269. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
270. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
271. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
272. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
273. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
274. **Production Readiness**: Console.log statement found - `src/hooks/useLeagueRankings.ts`
275. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
276. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
277. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
278. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
279. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
280. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
281. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
282. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
283. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
284. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
285. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
286. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
287. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
288. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
289. **Production Readiness**: Console.log statement found - `src/hooks/useNavigationData.ts`
290. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
291. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
292. **Production Readiness**: Console.log statement found - `src/hooks/useNutzap.ts`
293. **Production Readiness**: Console.log statement found - `src/hooks/useTeamWallet.ts`
294. **Production Readiness**: Console.log statement found - `src/hooks/useTeamWallet.ts`
295. **Production Readiness**: Console.log statement found - `src/hooks/useTeamWallet.ts`
296. **Production Readiness**: Console.log statement found - `src/hooks/useTeamWallet.ts`
297. **Production Readiness**: Console.log statement found - `src/hooks/useWalletBalance.ts`
298. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
299. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
300. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
301. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
302. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
303. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
304. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
305. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
306. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
307. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
308. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
309. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
310. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
311. **Production Readiness**: Console.log statement found - `src/navigation/AppNavigator.tsx`
312. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
313. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
314. **Production Readiness**: Console.log statement found - `src/navigation/BottomTabNavigator.tsx`
315. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
316. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
317. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
318. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
319. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
320. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
321. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
322. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
323. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
324. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
325. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
326. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
327. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
328. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
329. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
330. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
331. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
332. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
333. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
334. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
335. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
336. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
337. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
338. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
339. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
340. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
341. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
342. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
343. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
344. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
345. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
346. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
347. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
348. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
349. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
350. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
351. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
352. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
353. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
354. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
355. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
356. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
357. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
358. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
359. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
360. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
361. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
362. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
363. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
364. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
365. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
366. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
367. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
368. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
369. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
370. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
371. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
372. **Production Readiness**: Console.log statement found - `src/navigation/navigationHandlers.ts`
373. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
374. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
375. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
376. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
377. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
378. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
379. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
380. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
381. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
382. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
383. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
384. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
385. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
386. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
387. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
388. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
389. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
390. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
391. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
392. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
393. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
394. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
395. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
396. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
397. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
398. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
399. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
400. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
401. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
402. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
403. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
404. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
405. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
406. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
407. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
408. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
409. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
410. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
411. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
412. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
413. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
414. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
415. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
416. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
417. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
418. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
419. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
420. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
421. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
422. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
423. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
424. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
425. **Production Readiness**: Console.log statement found - `src/screens/CaptainDashboardScreen.tsx`
426. **Production Readiness**: Console.log statement found - `src/screens/CompetitionsListScreen.tsx`
427. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
428. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
429. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
430. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
431. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
432. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
433. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
434. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
435. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
436. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
437. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
438. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
439. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
440. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
441. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
442. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
443. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
444. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
445. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
446. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
447. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
448. **Production Readiness**: Console.log statement found - `src/screens/EnhancedTeamScreen.tsx`
449. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
450. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
451. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
452. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
453. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
454. **Production Readiness**: Console.log statement found - `src/screens/EnhancedWorkoutHistoryScreen.tsx`
455. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
456. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
457. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
458. **Production Readiness**: Console.log statement found - `src/screens/EventDetailScreen.tsx`
459. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
460. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
461. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
462. **Production Readiness**: Console.log statement found - `src/screens/LeagueDetailScreen.tsx`
463. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
464. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
465. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
466. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
467. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
468. **Production Readiness**: Console.log statement found - `src/screens/LoginScreen.tsx`
469. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
470. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
471. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
472. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
473. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
474. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
475. **Production Readiness**: Console.log statement found - `src/screens/MyTeamsScreen.tsx`
476. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
477. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
478. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
479. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
480. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
481. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
482. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
483. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
484. **Production Readiness**: Console.log statement found - `src/screens/OnboardingScreen.tsx`
485. **Production Readiness**: Console.log statement found - `src/screens/ProfileImportScreen.tsx`
486. **Production Readiness**: Console.log statement found - `src/screens/ProfileImportScreen.tsx`
487. **Production Readiness**: Console.log statement found - `src/screens/ProfileImportScreen.tsx`
488. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
489. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
490. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
491. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
492. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
493. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
494. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
495. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
496. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
497. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
498. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
499. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
500. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
501. **Production Readiness**: Console.log statement found - `src/screens/ProfileScreen.tsx`
502. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
503. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
504. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
505. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
506. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
507. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
508. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
509. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
510. **Production Readiness**: Console.log statement found - `src/screens/SplashInitScreen.tsx`
511. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
512. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
513. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
514. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
515. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
516. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
517. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
518. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
519. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
520. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
521. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
522. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
523. **Production Readiness**: Console.log statement found - `src/screens/TeamDiscoveryScreen.tsx`
524. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
525. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
526. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
527. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
528. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
529. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
530. **Production Readiness**: Console.log statement found - `src/screens/WorkoutHistoryScreen.tsx`
531. **Production Readiness**: Console.log statement found - `src/screens/activity/CyclingTrackerScreen.tsx`
532. **Production Readiness**: Console.log statement found - `src/screens/activity/ManualWorkoutScreen.tsx`
533. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
534. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
535. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
536. **Production Readiness**: Console.log statement found - `src/screens/activity/RunningTrackerScreen.tsx`
537. **Production Readiness**: Console.log statement found - `src/screens/activity/WalkingTrackerScreen.tsx`
538. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
539. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
540. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
541. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
542. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
543. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
544. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
545. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
546. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
547. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
548. **Production Readiness**: Console.log statement found - `src/scripts/testNotifications.ts`
549. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityStateMachine.ts`
550. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityStateMachine.ts`
551. **Production Readiness**: Console.log statement found - `src/services/activity/ActivityStateMachine.ts`
552. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
553. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
554. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
555. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
556. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
557. **Production Readiness**: Console.log statement found - `src/services/activity/BackgroundLocationTask.ts`
558. **Production Readiness**: Console.log statement found - `src/services/activity/BatteryOptimizationService.ts`
559. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
560. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
561. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
562. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
563. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
564. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
565. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
566. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
567. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
568. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
569. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
570. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
571. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
572. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
573. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
574. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
575. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
576. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
577. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
578. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
579. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
580. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
581. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
582. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
583. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
584. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
585. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
586. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
587. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
588. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
589. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
590. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
591. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
592. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
593. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
594. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
595. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
596. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
597. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
598. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
599. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
600. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
601. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
602. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
603. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
604. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
605. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
606. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
607. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
608. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
609. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
610. **Production Readiness**: Console.log statement found - `src/services/activity/EnhancedLocationTrackingService.ts`
611. **Production Readiness**: Console.log statement found - `src/services/activity/KalmanDistanceFilter.ts`
612. **Production Readiness**: Console.log statement found - `src/services/activity/KalmanDistanceFilter.ts`
613. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
614. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
615. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
616. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
617. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
618. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
619. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
620. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
621. **Production Readiness**: Console.log statement found - `src/services/activity/LocationPermissionService.ts`
622. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
623. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
624. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
625. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
626. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
627. **Production Readiness**: Console.log statement found - `src/services/activity/LocationTrackingService.ts`
628. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
629. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
630. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
631. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
632. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
633. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
634. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
635. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
636. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
637. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
638. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
639. **Production Readiness**: Console.log statement found - `src/services/activity/LocationValidator.ts`
640. **Production Readiness**: Console.log statement found - `src/services/activity/SplitTrackingService.ts`
641. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
642. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
643. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
644. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
645. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
646. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
647. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
648. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
649. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
650. **Production Readiness**: Console.log statement found - `src/services/activity/TTSAnnouncementService.ts`
651. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
652. **Production Readiness**: Console.log statement found - `src/services/activity/TTSPreferencesService.ts`
653. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
654. **Production Readiness**: Console.log statement found - `src/services/analytics/workoutAnalyticsService.ts`
655. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
656. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
657. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
658. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
659. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
660. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
661. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
662. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
663. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
664. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
665. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
666. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
667. **Production Readiness**: Console.log statement found - `src/services/auth/DeleteAccountService.ts`
668. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
669. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
670. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
671. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
672. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
673. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
674. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
675. **Production Readiness**: Console.log statement found - `src/services/auth/UnifiedSigningService.ts`
676. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
677. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
678. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
679. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
680. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
681. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
682. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
683. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
684. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
685. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
686. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
687. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
688. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
689. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
690. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
691. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
692. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
693. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
694. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
695. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
696. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
697. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
698. **Production Readiness**: Console.log statement found - `src/services/auth/amber/AmberNDKSigner.ts`
699. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
700. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
701. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
702. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
703. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
704. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
705. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
706. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
707. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
708. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
709. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
710. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
711. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
712. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
713. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
714. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
715. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
716. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
717. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
718. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
719. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
720. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
721. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
722. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
723. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
724. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
725. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
726. **Production Readiness**: Console.log statement found - `src/services/auth/authService.ts`
727. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
728. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
729. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
730. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
731. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
732. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
733. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
734. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
735. **Production Readiness**: Console.log statement found - `src/services/auth/providers/amberAuthProvider.ts`
736. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
737. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
738. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
739. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
740. **Production Readiness**: Console.log statement found - `src/services/auth/providers/appleAuthProvider.ts`
741. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
742. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
743. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
744. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
745. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
746. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
747. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
748. **Production Readiness**: Console.log statement found - `src/services/auth/providers/googleAuthProvider.ts`
749. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
750. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
751. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
752. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
753. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
754. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
755. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
756. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
757. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
758. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
759. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
760. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
761. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
762. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
763. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
764. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
765. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
766. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
767. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
768. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
769. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
770. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
771. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
772. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
773. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
774. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
775. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
776. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
777. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
778. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
779. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
780. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
781. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
782. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
783. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
784. **Production Readiness**: Console.log statement found - `src/services/auth/providers/nostrAuthProvider.ts`
785. **Production Readiness**: Console.log statement found - `src/services/auth/teamWalletPermissions.ts`
786. **Production Readiness**: Console.log statement found - `src/services/auth/teamWalletPermissions.ts`
787. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
788. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
789. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
790. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
791. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
792. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
793. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
794. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
795. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
796. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
797. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
798. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
799. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
800. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
801. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
802. **Production Readiness**: Console.log statement found - `src/services/cache/CacheInvalidator.ts`
803. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
804. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
805. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
806. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
807. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
808. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
809. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
810. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
811. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
812. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
813. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
814. **Production Readiness**: Console.log statement found - `src/services/cache/CompetitionCacheService.ts`
815. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
816. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
817. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
818. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
819. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
820. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
821. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
822. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
823. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
824. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
825. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
826. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
827. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
828. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
829. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
830. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
831. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
832. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
833. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
834. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
835. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
836. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
837. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
838. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
839. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
840. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
841. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
842. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
843. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
844. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
845. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
846. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
847. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
848. **Production Readiness**: Console.log statement found - `src/services/cache/NostrCacheService.ts`
849. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
850. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
851. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
852. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
853. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
854. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
855. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
856. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
857. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
858. **Production Readiness**: Console.log statement found - `src/services/cache/OnboardingCacheService.ts`
859. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
860. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
861. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
862. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
863. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
864. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
865. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
866. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
867. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
868. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
869. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
870. **Production Readiness**: Console.log statement found - `src/services/cache/TeamCacheService.ts`
871. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
872. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
873. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
874. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
875. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
876. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
877. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
878. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
879. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
880. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
881. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
882. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
883. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
884. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
885. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
886. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
887. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
888. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
889. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
890. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
891. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
892. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
893. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedCacheService.ts`
894. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
895. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
896. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
897. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
898. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
899. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
900. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
901. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
902. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
903. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
904. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
905. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
906. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
907. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
908. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
909. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
910. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
911. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
912. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
913. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
914. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
915. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
916. **Production Readiness**: Console.log statement found - `src/services/cache/UnifiedNostrCache.ts`
917. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
918. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
919. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
920. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
921. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
922. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
923. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
924. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
925. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
926. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
927. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
928. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
929. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
930. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
931. **Production Readiness**: Console.log statement found - `src/services/cache/WorkoutCacheService.ts`
932. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
933. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
934. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
935. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
936. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
937. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
938. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
939. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
940. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
941. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
942. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
943. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
944. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
945. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
946. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
947. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
948. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
949. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
950. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
951. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
952. **Production Readiness**: Console.log statement found - `src/services/challenge/ChallengeRequestService.ts`
953. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
954. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
955. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
956. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
957. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
958. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
959. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
960. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
961. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
962. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeParser.ts`
963. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeService.ts`
964. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeService.ts`
965. **Production Readiness**: Console.log statement found - `src/services/challenge/QRChallengeService.ts`
966. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
967. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
968. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
969. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
970. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
971. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
972. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
973. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
974. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
975. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
976. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
977. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
978. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
979. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
980. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
981. **Production Readiness**: Console.log statement found - `src/services/chat/ChatService.ts`
982. **Production Readiness**: Console.log statement found - `src/services/competition/ChallengeService.ts`
983. **Production Readiness**: Console.log statement found - `src/services/competition/ChallengeService.ts`
984. **Production Readiness**: Console.log statement found - `src/services/competition/ChallengeService.ts`
985. **Production Readiness**: Console.log statement found - `src/services/competition/ChallengeService.ts`
986. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
987. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
988. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
989. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
990. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
991. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
992. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
993. **Production Readiness**: Console.log statement found - `src/services/competition/Competition1301QueryService.ts`
994. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
995. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
996. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
997. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
998. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
999. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1000. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1001. **Production Readiness**: Console.log statement found - `src/services/competition/JoinRequestService.ts`
1002. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1003. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1004. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1005. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1006. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1007. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1008. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1009. **Production Readiness**: Console.log statement found - `src/services/competition/NostrCompetitionDiscoveryService.ts`
1010. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1011. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1012. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1013. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1014. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1015. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1016. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1017. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1018. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1019. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1020. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1021. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1022. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1023. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1024. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1025. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1026. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1027. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1028. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionEngine.ts`
1029. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1030. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1031. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1032. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1033. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1034. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1035. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1036. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1037. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1038. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1039. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1040. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1041. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1042. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1043. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1044. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleCompetitionService.ts`
1045. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1046. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1047. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1048. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1049. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1050. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1051. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1052. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1053. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1054. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1055. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1056. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1057. **Production Readiness**: Console.log statement found - `src/services/competition/SimpleLeaderboardService.ts`
1058. **Production Readiness**: Console.log statement found - `src/services/competition/competitionScoring.ts`
1059. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1060. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1061. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1062. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1063. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1064. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1065. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1066. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1067. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1068. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1069. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1070. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1071. **Production Readiness**: Console.log statement found - `src/services/competition/competitionService.ts`
1072. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1073. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1074. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1075. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1076. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1077. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1078. **Production Readiness**: Console.log statement found - `src/services/competition/eventEligibilityService.ts`
1079. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1080. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1081. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1082. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1083. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1084. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1085. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1086. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1087. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1088. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1089. **Production Readiness**: Console.log statement found - `src/services/competition/leaderboardService.ts`
1090. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1091. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1092. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1093. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1094. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1095. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1096. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1097. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1098. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1099. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1100. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1101. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1102. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1103. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1104. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1105. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1106. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1107. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1108. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1109. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1110. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1111. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1112. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1113. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1114. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1115. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1116. **Production Readiness**: Console.log statement found - `src/services/competition/leagueDataBridge.ts`
1117. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1118. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1119. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1120. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1121. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1122. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1123. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1124. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1125. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1126. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1127. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1128. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1129. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1130. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1131. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1132. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1133. **Production Readiness**: Console.log statement found - `src/services/competition/leagueRankingService.ts`
1134. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1135. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1136. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1137. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1138. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1139. **Production Readiness**: Console.log statement found - `src/services/competition/nostrCompetitionLeaderboardService.ts`
1140. **Production Readiness**: Console.log statement found - `src/services/competitions/competitionWinnersService.ts`
1141. **Production Readiness**: Console.log statement found - `src/services/competitions/competitionWinnersService.ts`
1142. **Production Readiness**: Console.log statement found - `src/services/competitions/competitionWinnersService.ts`
1143. **Production Readiness**: Console.log statement found - `src/services/competitions/competitionWinnersService.ts`
1144. **Production Readiness**: Console.log statement found - `src/services/competitions/competitionWinnersService.ts`
1145. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1146. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1147. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1148. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1149. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1150. **Production Readiness**: Console.log statement found - `src/services/database/workoutDatabase.ts`
1151. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1152. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1153. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1154. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1155. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1156. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1157. **Production Readiness**: Console.log statement found - `src/services/event/EventJoinService.ts`
1158. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1159. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1160. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1161. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1162. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1163. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1164. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1165. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1166. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1167. **Production Readiness**: Console.log statement found - `src/services/event/QREventParser.ts`
1168. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1169. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1170. **Production Readiness**: Console.log statement found - `src/services/event/QREventService.ts`
1171. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1172. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1173. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1174. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1175. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1176. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1177. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1178. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1179. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1180. **Production Readiness**: Console.log statement found - `src/services/events/EventJoinRequestService.ts`
1181. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1182. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1183. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1184. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1185. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1186. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1187. **Production Readiness**: Console.log statement found - `src/services/fitness/LocalWorkoutStorageService.ts`
1188. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1189. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1190. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1191. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1192. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1193. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1194. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1195. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1196. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1197. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1198. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1199. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1200. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1201. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1202. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1203. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1204. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1205. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1206. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1207. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1208. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1209. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1210. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1211. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1212. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1213. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1214. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1215. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1216. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1217. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1218. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1219. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1220. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1221. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1222. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1223. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1224. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1225. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1226. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1227. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1228. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1229. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1230. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1231. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1232. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1233. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1234. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1235. **Production Readiness**: Console.log statement found - `src/services/fitness/NdkWorkoutService.ts`
1236. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1237. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1238. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1239. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1240. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1241. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1242. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1243. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1244. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1245. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1246. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1247. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1248. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1249. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1250. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1251. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1252. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1253. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1254. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1255. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1256. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1257. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1258. **Production Readiness**: Console.log statement found - `src/services/fitness/Nuclear1301Service.ts`
1259. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1260. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1261. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1262. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1263. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1264. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1265. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1266. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1267. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1268. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1269. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1270. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1271. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1272. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1273. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1274. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1275. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1276. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1277. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1278. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1279. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1280. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1281. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1282. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1283. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1284. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1285. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1286. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1287. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1288. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1289. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1290. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1291. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1292. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1293. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1294. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1295. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1296. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1297. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1298. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1299. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1300. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1301. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1302. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1303. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1304. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1305. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1306. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1307. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1308. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1309. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1310. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1311. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1312. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1313. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1314. **Production Readiness**: Console.log statement found - `src/services/fitness/SimpleWorkoutService.ts`
1315. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1316. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1317. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1318. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1319. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutLevelService.ts`
1320. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1321. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1322. **Production Readiness**: Console.log statement found - `src/services/fitness/WorkoutStatusTracker.ts`
1323. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1324. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1325. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1326. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1327. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1328. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1329. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1330. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1331. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1332. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1333. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1334. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1335. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1336. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1337. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1338. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1339. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1340. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1341. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1342. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1343. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1344. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1345. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1346. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1347. **Production Readiness**: Console.log statement found - `src/services/fitness/backgroundSyncService.ts`
1348. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1349. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1350. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1351. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1352. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1353. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1354. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1355. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1356. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1357. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1358. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1359. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1360. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1361. **Production Readiness**: Console.log statement found - `src/services/fitness/fitnessService.ts`
1362. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1363. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1364. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1365. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1366. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1367. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1368. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1369. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1370. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1371. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1372. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1373. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1374. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1375. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1376. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1377. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1378. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1379. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1380. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1381. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1382. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1383. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1384. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1385. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1386. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1387. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1388. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1389. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1390. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1391. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1392. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1393. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1394. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1395. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1396. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1397. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1398. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1399. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1400. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1401. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1402. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1403. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1404. **Production Readiness**: Console.log statement found - `src/services/fitness/healthKitService.ts`
1405. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1406. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1407. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1408. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1409. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1410. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1411. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1412. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1413. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1414. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutService.ts`
1415. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1416. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1417. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1418. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1419. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1420. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1421. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1422. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1423. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1424. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1425. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1426. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1427. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1428. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1429. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1430. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1431. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1432. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1433. **Production Readiness**: Console.log statement found - `src/services/fitness/nostrWorkoutSyncService.ts`
1434. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1435. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1436. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1437. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1438. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1439. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1440. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1441. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1442. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1443. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1444. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1445. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1446. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedNostrWorkoutService.ts`
1447. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1448. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1449. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1450. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1451. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1452. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1453. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1454. **Production Readiness**: Console.log statement found - `src/services/fitness/optimizedWorkoutMergeService.ts`
1455. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1456. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1457. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1458. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1459. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1460. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1461. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1462. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1463. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1464. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1465. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1466. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1467. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1468. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1469. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1470. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1471. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1472. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1473. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1474. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1475. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1476. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1477. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1478. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1479. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1480. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1481. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1482. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1483. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1484. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1485. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1486. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1487. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1488. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1489. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1490. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1491. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1492. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1493. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1494. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1495. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1496. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1497. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1498. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1499. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1500. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1501. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1502. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1503. **Production Readiness**: Console.log statement found - `src/services/fitness/workoutMergeService.ts`
1504. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1505. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1506. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1507. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1508. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1509. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1510. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1511. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1512. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1513. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1514. **Production Readiness**: Console.log statement found - `src/services/initialization/AppInitializationService.ts`
1515. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1516. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1517. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1518. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1519. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1520. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1521. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1522. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1523. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1524. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1525. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1526. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1527. **Production Readiness**: Console.log statement found - `src/services/integrations/NostrCompetitionContextService.ts`
1528. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1529. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1530. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1531. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1532. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1533. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1534. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1535. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrCompetitionBridge.ts`
1536. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1537. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1538. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1539. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1540. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1541. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1542. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1543. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1544. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1545. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1546. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1547. **Production Readiness**: Console.log statement found - `src/services/integrations/nostrRealtimeCompetitionSync.ts`
1548. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1549. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1550. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1551. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1552. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1553. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1554. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1555. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1556. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1557. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1558. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1559. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1560. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1561. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1562. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1563. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1564. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1565. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1566. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1567. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1568. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1569. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1570. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1571. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1572. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1573. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1574. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1575. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1576. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1577. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1578. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1579. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1580. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1581. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1582. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1583. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1584. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1585. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1586. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1587. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1588. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1589. **Production Readiness**: Console.log statement found - `src/services/nostr/GlobalNDKService.ts`
1590. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1591. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1592. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1593. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1594. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1595. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1596. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1597. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1598. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1599. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1600. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1601. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1602. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1603. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1604. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1605. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1606. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1607. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1608. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1609. **Production Readiness**: Console.log statement found - `src/services/nostr/HttpNostrQueryService.ts`
1610. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1611. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1612. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1613. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1614. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1615. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1616. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1617. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1618. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1619. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1620. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1621. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1622. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1623. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1624. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1625. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1626. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1627. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1628. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1629. **Production Readiness**: Console.log statement found - `src/services/nostr/HybridNostrQueryService.ts`
1630. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1631. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1632. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1633. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1634. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1635. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1636. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1637. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrCompetitionService.ts`
1638. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1639. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1640. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1641. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1642. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1643. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1644. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1645. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1646. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1647. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1648. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1649. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1650. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1651. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrErrorRecoveryService.ts`
1652. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1653. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1654. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1655. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1656. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1657. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1658. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1659. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1660. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1661. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1662. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1663. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1664. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1665. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1666. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1667. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1668. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1669. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1670. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1671. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1672. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1673. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1674. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1675. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1676. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1677. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1678. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1679. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1680. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1681. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1682. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1683. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1684. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1685. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1686. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1687. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1688. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1689. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1690. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1691. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1692. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1693. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1694. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1695. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrInitializationService.ts`
1696. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1697. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1698. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1699. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1700. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1701. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1702. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1703. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1704. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1705. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1706. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1707. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1708. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1709. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1710. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1711. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1712. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1713. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1714. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1715. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1716. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1717. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1718. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1719. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1720. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1721. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1722. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1723. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrListService.ts`
1724. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1725. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1726. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1727. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1728. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1729. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1730. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1731. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1732. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1733. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1734. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1735. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1736. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1737. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1738. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1739. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1740. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1741. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1742. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1743. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1744. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1745. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1746. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1747. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrMobileConnectionManager.ts`
1748. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1749. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1750. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1751. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1752. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1753. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1754. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1755. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1756. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1757. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1758. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1759. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1760. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1761. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1762. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1763. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1764. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1765. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1766. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1767. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1768. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1769. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1770. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1771. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1772. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1773. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1774. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1775. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1776. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrPrefetchService.ts`
1777. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
1778. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
1779. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
1780. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
1781. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfilePublisher.ts`
1782. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1783. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1784. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1785. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1786. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1787. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1788. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1789. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1790. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1791. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1792. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1793. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1794. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1795. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProfileService.ts`
1796. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1797. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1798. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1799. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1800. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1801. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1802. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1803. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1804. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1805. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1806. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1807. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrProtocolHandler.ts`
1808. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1809. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1810. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1811. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1812. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1813. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1814. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1815. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1816. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1817. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1818. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1819. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1820. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1821. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1822. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1823. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1824. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1825. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1826. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1827. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1828. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1829. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrRelayManager.ts`
1830. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1831. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1832. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1833. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1834. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1835. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1836. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1837. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1838. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamCreationService.ts`
1839. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1840. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1841. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1842. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1843. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1844. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1845. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1846. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1847. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1848. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1849. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1850. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1851. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1852. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1853. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1854. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1855. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1856. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1857. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1858. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1859. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1860. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1861. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1862. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1863. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1864. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1865. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1866. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1867. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1868. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1869. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1870. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1871. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1872. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1873. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1874. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1875. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1876. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1877. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1878. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1879. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1880. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1881. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1882. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1883. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1884. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1885. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1886. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1887. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1888. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1889. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1890. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1891. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1892. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1893. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1894. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1895. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1896. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1897. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1898. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1899. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1900. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1901. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1902. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1903. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1904. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1905. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1906. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.backup.ts`
1907. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
1908. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
1909. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
1910. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
1911. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrTeamService.ts`
1912. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1913. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1914. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1915. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1916. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1917. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1918. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1919. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1920. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1921. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1922. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1923. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1924. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1925. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1926. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1927. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1928. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1929. **Production Readiness**: Console.log statement found - `src/services/nostr/NostrWebSocketConnection.ts`
1930. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1931. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1932. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1933. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1934. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1935. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1936. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1937. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1938. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1939. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1940. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1941. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1942. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1943. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1944. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1945. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1946. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1947. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1948. **Production Readiness**: Console.log statement found - `src/services/nostr/OptimizedWebSocketManager.ts`
1949. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1950. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1951. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1952. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1953. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1954. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1955. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1956. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1957. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1958. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1959. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1960. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1961. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1962. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1963. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1964. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1965. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1966. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1967. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1968. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1969. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1970. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1971. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1972. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1973. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1974. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1975. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1976. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1977. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1978. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1979. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1980. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1981. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1982. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1983. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1984. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1985. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1986. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1987. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1988. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1989. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1990. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1991. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1992. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1993. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1994. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1995. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1996. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1997. **Production Readiness**: Console.log statement found - `src/services/nostr/SimpleNostrService.ts`
1998. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
1999. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2000. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2001. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2002. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2003. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2004. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2005. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2006. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2007. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2008. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2009. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2010. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2011. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2012. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2013. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2014. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2015. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2016. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2017. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2018. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2019. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2020. **Production Readiness**: Console.log statement found - `src/services/nostr/directNostrQueryService.ts`
2021. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutCardGenerator.ts`
2022. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2023. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2024. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2025. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2026. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2027. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2028. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2029. **Production Readiness**: Console.log statement found - `src/services/nostr/workoutPublishingService.ts`
2030. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2031. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2032. **Production Readiness**: Console.log statement found - `src/services/notificationDemoService.ts`
2033. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2034. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2035. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2036. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2037. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2038. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2039. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2040. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2041. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2042. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2043. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2044. **Production Readiness**: Console.log statement found - `src/services/notifications/ChallengeNotificationHandler.ts`
2045. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2046. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2047. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2048. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2049. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2050. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2051. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2052. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2053. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2054. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2055. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2056. **Production Readiness**: Console.log statement found - `src/services/notifications/EventJoinNotificationHandler.ts`
2057. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2058. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2059. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2060. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2061. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2062. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2063. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2064. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2065. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2066. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2067. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2068. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2069. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2070. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2071. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2072. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2073. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2074. **Production Readiness**: Console.log statement found - `src/services/notifications/ExpoNotificationProvider.ts`
2075. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2076. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2077. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2078. **Production Readiness**: Console.log statement found - `src/services/notifications/LocalNotificationTrigger.ts`
2079. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2080. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2081. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2082. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2083. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2084. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2085. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2086. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2087. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2088. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2089. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2090. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2091. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2092. **Production Readiness**: Console.log statement found - `src/services/notifications/NostrNotificationEventHandler.ts`
2093. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationPreferencesService.ts`
2094. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2095. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2096. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2097. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2098. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2099. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2100. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2101. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2102. **Production Readiness**: Console.log statement found - `src/services/notifications/NotificationService.ts`
2103. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
2104. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
2105. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
2106. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamContextService.ts`
2107. **Production Readiness**: Console.log statement found - `src/services/notifications/TeamNotificationFormatter.ts`
2108. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2109. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2110. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2111. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2112. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2113. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2114. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2115. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2116. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2117. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2118. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2119. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2120. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2121. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2122. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2123. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2124. **Production Readiness**: Console.log statement found - `src/services/notifications/UnifiedNotificationStore.ts`
2125. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2126. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2127. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2128. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2129. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2130. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2131. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2132. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2133. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2134. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2135. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2136. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2137. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2138. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2139. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2140. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2141. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2142. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2143. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2144. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2145. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2146. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2147. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2148. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2149. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletCore.ts`
2150. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2151. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2152. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2153. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2154. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2155. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2156. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2157. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2158. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2159. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2160. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2161. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2162. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2163. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2164. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2165. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2166. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2167. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2168. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2169. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2170. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2171. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2172. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2173. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2174. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2175. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2176. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2177. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2178. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2179. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2180. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2181. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2182. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2183. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2184. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2185. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2186. **Production Readiness**: Console.log statement found - `src/services/nutzap/WalletSync.ts`
2187. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2188. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2189. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2190. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2191. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2192. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2193. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2194. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2195. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2196. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2197. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2198. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2199. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2200. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2201. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2202. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2203. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2204. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2205. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2206. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2207. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2208. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2209. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2210. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2211. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2212. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2213. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2214. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2215. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2216. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2217. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2218. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2219. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2220. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2221. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2222. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2223. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2224. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2225. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2226. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2227. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2228. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2229. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2230. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2231. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2232. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2233. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2234. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2235. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2236. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2237. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2238. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2239. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2240. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2241. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2242. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2243. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2244. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2245. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2246. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2247. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2248. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2249. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2250. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2251. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2252. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2253. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2254. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2255. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2256. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2257. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2258. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2259. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2260. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2261. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2262. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2263. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2264. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2265. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2266. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2267. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2268. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2269. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2270. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2271. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2272. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2273. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2274. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2275. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2276. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2277. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2278. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2279. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2280. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2281. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2282. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2283. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2284. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2285. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2286. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2287. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2288. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2289. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2290. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2291. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2292. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2293. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2294. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2295. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2296. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2297. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2298. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2299. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2300. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2301. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2302. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2303. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2304. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2305. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2306. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2307. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2308. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2309. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2310. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2311. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2312. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2313. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2314. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2315. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2316. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2317. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2318. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.old.ts`
2319. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2320. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2321. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2322. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2323. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2324. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2325. **Production Readiness**: Console.log statement found - `src/services/nutzap/nutzapService.ts`
2326. **Production Readiness**: Console.log statement found - `src/services/nutzap/rewardService.ts`
2327. **Production Readiness**: Console.log statement found - `src/services/nutzap/rewardService.ts`
2328. **Production Readiness**: Console.log statement found - `src/services/nutzap/rewardService.ts`
2329. **Production Readiness**: Console.log statement found - `src/services/nutzap/testPhase1.ts`
2330. **Production Readiness**: Console.log statement found - `src/services/nutzap/testPhase2.ts`
2331. **Production Readiness**: Console.log statement found - `src/services/nutzap/testPhase2.ts`
2332. **Production Readiness**: Console.log statement found - `src/services/nutzap/testPhase3.ts`
2333. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2334. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2335. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2336. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2337. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2338. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2339. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2340. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2341. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2342. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2343. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2344. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2345. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2346. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2347. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2348. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2349. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2350. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2351. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2352. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2353. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2354. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2355. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2356. **Production Readiness**: Console.log statement found - `src/services/preload/NostrPreloadService.ts`
2357. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2358. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2359. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2360. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2361. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2362. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2363. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2364. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2365. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2366. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2367. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2368. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2369. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2370. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2371. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2372. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2373. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2374. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2375. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2376. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2377. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2378. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2379. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2380. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2381. **Production Readiness**: Console.log statement found - `src/services/season/Season1Service.ts`
2382. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2383. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2384. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2385. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2386. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2387. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2388. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2389. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2390. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2391. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2392. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2393. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2394. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2395. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2396. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2397. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2398. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2399. **Production Readiness**: Console.log statement found - `src/services/team/NdkTeamService.ts`
2400. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2401. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2402. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2403. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2404. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2405. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2406. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2407. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2408. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2409. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2410. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2411. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2412. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2413. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2414. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2415. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2416. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2417. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2418. **Production Readiness**: Console.log statement found - `src/services/team/TeamJoinRequestService.ts`
2419. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2420. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2421. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2422. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2423. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2424. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2425. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2426. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2427. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2428. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2429. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2430. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2431. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2432. **Production Readiness**: Console.log statement found - `src/services/team/TeamMemberCache.ts`
2433. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
2434. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
2435. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
2436. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
2437. **Production Readiness**: Console.log statement found - `src/services/team/captainDetectionService.ts`
2438. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2439. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2440. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2441. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2442. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2443. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2444. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2445. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2446. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2447. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2448. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2449. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2450. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2451. **Production Readiness**: Console.log statement found - `src/services/team/teamMembershipService.ts`
2452. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2453. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2454. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2455. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2456. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2457. **Production Readiness**: Console.log statement found - `src/services/user/UserDiscoveryService.ts`
2458. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2459. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2460. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2461. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2462. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2463. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2464. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2465. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2466. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2467. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2468. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2469. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2470. **Production Readiness**: Console.log statement found - `src/services/user/directNostrProfileService.ts`
2471. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2472. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2473. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2474. **Production Readiness**: Console.log statement found - `src/services/user/profileService.ts`
2475. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2476. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2477. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2478. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2479. **Production Readiness**: Console.log statement found - `src/store/teamStore.ts`
2480. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2481. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2482. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2483. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2484. **Production Readiness**: Console.log statement found - `src/store/userStore.ts`
2485. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
2486. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
2487. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
2488. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
2489. **Production Readiness**: Console.log statement found - `src/store/walletStore.ts`
2490. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
2491. **Production Readiness**: Console.log statement found - `src/utils/analytics.ts`
2492. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2493. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2494. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2495. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2496. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2497. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2498. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2499. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2500. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2501. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2502. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2503. **Production Readiness**: Console.log statement found - `src/utils/authDebug.ts`
2504. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2505. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2506. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2507. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2508. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2509. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2510. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2511. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2512. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2513. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2514. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2515. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2516. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2517. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2518. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2519. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2520. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2521. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2522. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2523. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2524. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2525. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2526. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2527. **Production Readiness**: Console.log statement found - `src/utils/authDebugHelper.ts`
2528. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
2529. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
2530. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
2531. **Production Readiness**: Console.log statement found - `src/utils/captainCache.ts`
2532. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2533. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2534. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2535. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2536. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2537. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2538. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2539. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2540. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2541. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2542. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2543. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2544. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2545. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2546. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2547. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2548. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2549. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2550. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2551. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2552. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2553. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2554. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2555. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2556. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2557. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2558. **Production Readiness**: Console.log statement found - `src/utils/competitionIntegrationTests.ts`
2559. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2560. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2561. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2562. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2563. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2564. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2565. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2566. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2567. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2568. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2569. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2570. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2571. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2572. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2573. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2574. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2575. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2576. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2577. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2578. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2579. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2580. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2581. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2582. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2583. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2584. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2585. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2586. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2587. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2588. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2589. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2590. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2591. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2592. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2593. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2594. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2595. **Production Readiness**: Console.log statement found - `src/utils/competitionSimulator.ts`
2596. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
2597. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
2598. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
2599. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
2600. **Production Readiness**: Console.log statement found - `src/utils/fetchDedup.ts`
2601. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
2602. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
2603. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
2604. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
2605. **Production Readiness**: Console.log statement found - `src/utils/joinRequestPublisher.ts`
2606. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2607. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2608. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2609. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2610. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2611. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2612. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2613. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2614. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2615. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2616. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2617. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2618. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2619. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2620. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2621. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2622. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2623. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2624. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2625. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2626. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2627. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2628. **Production Readiness**: Console.log statement found - `src/utils/leaderboardTestScripts.ts`
2629. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2630. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2631. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2632. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2633. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2634. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2635. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2636. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2637. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2638. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2639. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2640. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2641. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2642. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2643. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2644. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2645. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2646. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2647. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2648. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2649. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2650. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2651. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2652. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2653. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2654. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2655. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2656. **Production Readiness**: Console.log statement found - `src/utils/memberManagementTests.ts`
2657. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
2658. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
2659. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
2660. **Production Readiness**: Console.log statement found - `src/utils/ndkConversion.ts`
2661. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2662. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2663. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2664. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2665. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2666. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2667. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2668. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2669. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2670. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2671. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2672. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2673. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2674. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2675. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2676. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2677. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2678. **Production Readiness**: Console.log statement found - `src/utils/nostr.ts`
2679. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2680. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2681. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2682. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2683. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2684. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2685. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2686. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2687. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2688. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2689. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2690. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2691. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2692. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2693. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2694. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2695. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2696. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2697. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2698. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2699. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2700. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2701. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2702. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2703. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2704. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2705. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2706. **Production Readiness**: Console.log statement found - `src/utils/nostrAuth.ts`
2707. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
2708. **Production Readiness**: Console.log statement found - `src/utils/nostrEncoding.ts`
2709. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2710. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2711. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2712. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2713. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2714. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2715. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2716. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2717. **Production Readiness**: Console.log statement found - `src/utils/nostrWorkoutParser.ts`
2718. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
2719. **Production Readiness**: Console.log statement found - `src/utils/notificationCache.ts`
2720. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2721. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2722. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2723. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2724. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2725. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2726. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2727. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2728. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2729. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2730. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2731. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2732. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2733. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2734. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2735. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2736. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2737. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2738. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2739. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2740. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2741. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2742. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2743. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2744. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2745. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2746. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2747. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2748. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2749. **Production Readiness**: Console.log statement found - `src/utils/notificationTestUtils.ts`
2750. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2751. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2752. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2753. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2754. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2755. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2756. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2757. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2758. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2759. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2760. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2761. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2762. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2763. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2764. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2765. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2766. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2767. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2768. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2769. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2770. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2771. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2772. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2773. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2774. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2775. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2776. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2777. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2778. **Production Readiness**: Console.log statement found - `src/utils/runAllTests.ts`
2779. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
2780. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
2781. **Production Readiness**: Console.log statement found - `src/utils/storage.ts`
2782. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2783. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2784. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2785. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2786. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2787. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2788. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2789. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2790. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2791. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2792. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2793. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2794. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2795. **Production Readiness**: Console.log statement found - `src/utils/testAuthFlow.ts`
2796. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2797. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2798. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2799. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2800. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2801. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2802. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2803. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2804. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2805. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2806. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2807. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2808. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2809. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2810. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2811. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2812. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2813. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2814. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2815. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2816. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2817. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2818. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2819. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2820. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2821. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2822. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2823. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2824. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2825. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2826. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2827. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2828. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2829. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2830. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2831. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2832. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2833. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2834. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2835. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2836. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2837. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2838. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2839. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2840. **Production Readiness**: Console.log statement found - `src/utils/testCaptainFlow.ts`
2841. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2842. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2843. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2844. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2845. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2846. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2847. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2848. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2849. **Production Readiness**: Console.log statement found - `src/utils/testCompetitions.ts`
2850. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2851. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2852. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2853. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2854. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2855. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2856. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2857. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2858. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2859. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2860. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2861. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2862. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2863. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2864. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2865. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2866. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2867. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2868. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2869. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2870. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2871. **Production Readiness**: Console.log statement found - `src/utils/testIntegration.ts`
2872. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2873. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2874. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2875. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2876. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2877. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2878. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2879. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2880. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2881. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2882. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2883. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2884. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2885. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2886. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2887. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2888. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2889. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2890. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2891. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2892. **Production Readiness**: Console.log statement found - `src/utils/testKind1Post.ts`
2893. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
2894. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
2895. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
2896. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
2897. **Production Readiness**: Console.log statement found - `src/utils/walletRecovery.ts`
2898. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`
2899. **Production Readiness**: Console.log statement found - `src/utils/webSocketPolyfill.ts`
2900. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2901. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2902. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2903. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2904. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2905. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2906. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2907. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2908. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2909. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2910. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2911. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2912. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2913. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2914. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2915. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2916. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2917. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2918. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2919. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2920. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2921. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2922. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2923. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2924. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2925. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2926. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2927. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2928. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2929. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2930. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2931. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2932. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2933. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2934. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2935. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2936. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2937. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2938. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2939. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2940. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2941. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2942. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2943. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`
2944. **Production Readiness**: Console.log statement found - `src/utils/workoutQueryPerformanceTests.ts`

</details>

