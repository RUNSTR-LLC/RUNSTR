# Feature Request: Captain Notification Publishing for Competition Announcements

## Problem Statement

Currently, RUNSTR team captains can consume and display notifications (kinds 1101, 1102, 1103) but cannot publish them to communicate with their team members. This creates a significant gap in team communication and engagement, forcing captains to rely on external platforms to announce competitions, share results, and send reminders.

### Current State
- ✅ **Notification Consumption**: `NostrNotificationEventHandler` processes incoming competition events
- ✅ **Rich Display**: Team-branded notifications with proper formatting and actions
- ✅ **User Preferences**: Granular notification settings respected
- ❌ **Publishing Capability**: No way for captains to create and send notifications
- ❌ **Competition Integration**: No automatic announcements when competitions are created

### Impact
- Reduced team engagement due to poor communication
- Captains must use external tools to announce team events
- Missed opportunities for timely competition reminders
- Inconsistent team communication across the platform

## Feature Requirements

### Core Functionality
1. **Captain Notification Publishing Service**
   - Publish kind 1101 (competition announcements)
   - Publish kind 1102 (competition results)
   - Publish kind 1103 (starting soon reminders)
   - Multi-relay broadcasting for reliability

2. **Captain Dashboard Integration**
   - "Send Announcement" button in QuickActionsSection
   - Notification composer modal with templates
   - Member selector (all members vs. active participants)
   - Competition selector for relevant announcements

3. **Competition Wizard Integration**
   - Optional auto-announcement when competitions are created
   - Scheduled reminder options (1 hour before, etc.)
   - Auto-results publishing when competitions complete

4. **Notification Management**
   - History of sent notifications
   - Edit/resend capability for announcements
   - Analytics on notification engagement

## User Stories

### As a Team Captain
- I want to announce new competitions to my team members so they know about upcoming events
- I want to send automatic reminders before competitions start so members don't forget to participate
- I want to share competition results with winners and prizes so the team celebrates achievements
- I want to compose custom messages with team-specific information so communication feels personal
- I want to schedule notifications in advance so I don't have to manually send them

### As a Team Member
- I want to receive timely notifications about team competitions so I can plan to participate
- I want to see rich, branded notifications that match my team's identity so the experience feels cohesive
- I want to control which types of notifications I receive so I'm not overwhelmed
- I want to see notification history so I can catch up on missed announcements

## Technical Implementation

### 1. NotificationPublishingService
```typescript
// Location: src/services/notifications/NotificationPublishingService.ts
class NotificationPublishingService {
  async publishCompetitionAnnouncement(params: CompetitionAnnouncementParams): Promise<boolean>
  async publishCompetitionResults(params: CompetitionResultsParams): Promise<boolean>
  async publishStartingSoonReminder(params: StartingSoonParams): Promise<boolean>
  async scheduleNotification(params: ScheduledNotificationParams): Promise<string>
}
```

### 2. Captain Dashboard UI Components
- Add notification controls to existing `QuickActionsSection`
- Create `NotificationComposerModal` component
- Add notification history section
- Integrate with existing `EventCreationWizard` and `LeagueCreationWizard`

### 3. Nostr Event Structure
Follow existing patterns in `NostrNotificationEventHandler.ts`:

**Kind 1101 (Announcement)**:
```javascript
{
  kind: 1101,
  content: "New weekly running challenge starts Monday!",
  tags: [
    ['competition_id', 'comp_123'],
    ['start_time', '1704067200'],
    ['prize', '1000'],
    ['event_type', 'challenge'],
    ['p', 'member_pubkey_1'],
    ['p', 'member_pubkey_2']
  ]
}
```

### 4. Integration Points
- **Captain Authentication**: Use existing `getAuthenticationData()` system
- **Team Members**: Query via `TeamMemberCache` and `NostrListService`
- **Competition Data**: Pull from `CompetitionService` and wizards
- **Relay Publishing**: Leverage existing `NostrRelayManager`

## Acceptance Criteria

### Minimum Viable Product (MVP)
- [ ] Captain can manually send announcements to team members
- [ ] Notifications appear in members' notification feeds
- [ ] Basic message composer with team member selection
- [ ] Integration with at least one competition type (Events or Leagues)

### Full Feature Set
- [ ] All three notification types supported (1101, 1102, 1103)
- [ ] Auto-announcements from competition wizards
- [ ] Scheduled/recurring notifications
- [ ] Notification templates and message composer
- [ ] Notification history and management
- [ ] Analytics and engagement tracking

### Quality Requirements
- [ ] TypeScript compilation without errors
- [ ] Follows existing code patterns and architecture
- [ ] Proper error handling and user feedback
- [ ] Respects user notification preferences
- [ ] Multi-relay publishing for reliability

## Priority & Impact

### Priority: **HIGH**
- Essential for team engagement and communication
- Blocks effective team management workflows
- Required for competitive team dynamics

### Impact Areas
1. **Team Engagement**: Significant improvement in member participation
2. **Captain Experience**: Streamlined team management workflow
3. **Platform Completeness**: Closes major communication gap
4. **User Retention**: Better team communication leads to higher engagement

## Implementation Phases

### Phase 1: Core Publishing (1-2 days)
- Create `NotificationPublishingService`
- Add basic captain dashboard controls
- Implement kind 1101 (announcement) publishing

### Phase 2: Competition Integration (1-2 days)
- Integrate with Event/League creation wizards
- Add auto-announcement options
- Implement scheduled notifications

### Phase 3: Advanced Features (2-3 days)
- Add notification history and management
- Create message templates system
- Implement results publishing (kind 1102)
- Add engagement analytics

### Phase 4: Polish & Testing (1 day)
- User experience improvements
- Comprehensive testing
- Documentation updates

## Related Files & Services

### Existing Infrastructure
- `src/services/notifications/NostrNotificationEventHandler.ts` - Consumption patterns
- `src/screens/CaptainDashboardScreen.tsx` - UI integration point
- `src/components/wizards/EventCreationWizard.tsx` - Auto-announcement integration
- `src/services/nostr/NostrRelayManager.ts` - Publishing infrastructure
- `src/services/team/TeamMemberCache.ts` - Member targeting

### New Files Needed
- `src/services/notifications/NotificationPublishingService.ts`
- `src/components/captain/NotificationComposerModal.tsx`
- `src/components/captain/NotificationHistorySection.tsx`
- `src/types/captainNotifications.ts`

## Dependencies
- Existing NDK integration for event signing
- Current authentication system
- Team membership via kind 30000 lists
- Multi-relay infrastructure

---

**Labels**: `feature-request`, `captain-dashboard`, `notifications`, `high-priority`, `team-communication`

**Assignee**: Team Lead / Senior Developer

**Milestone**: Q1 2025 - Team Communication Features