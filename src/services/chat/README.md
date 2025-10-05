# Chat Services

NIP-28 team chat implementation for RUNSTR. Provides real-time messaging for team communication with client-side access control.

## Files

**ChatService.ts** (~320 lines) - Main chat service handling NIP-28 channel creation, message publishing, and real-time subscriptions. Uses global NDK instance and existing nostrProfileService for efficiency.

## Key Features

- **NIP-28 Implementation**: Standard public chat channels
- **NDK Integration**: Uses pre-initialized global NDK instance
- **Channel Creation**: Kind 40 events with NDK-generated IDs
- **Message Publishing**: Kind 42 events with team tags
- **Real-time Subscriptions**: WebSocket-based message streaming
- **React 18 Safe**: Proper subscription cleanup for strict mode
- **Pagination Support**: Load older messages on scroll

## Usage

```typescript
import { chatService } from '../services/chat/ChatService';

// Create channel (captain only)
const channel = await chatService.createTeamChannel(
  teamId,
  teamName,
  captainPubkey
);

// Send message
const message = await chatService.sendMessage(
  channelId,
  'Hello team!',
  teamId
);

// Subscribe to messages
const subscription = chatService.subscribeToChannel(
  channelId,
  (message) => console.log('New message:', message),
  () => console.log('Initial load complete')
);

// Cleanup
chatService.unsubscribe(channelId);
```

## Architecture

- **Access Control**: Client-side enforcement using kind 30000 member lists
- **Profile Caching**: Reuses existing nostrProfileService (30-min TTL)
- **Message Storage**: Local caching via AsyncStorage for channel IDs
- **Relay Selection**: Uses NDK's relay pool (no hardcoded relays)

## Important Notes

⚠️ **Public Messages**: NIP-28 channels are PUBLIC on the Nostr network. Messages are visible to anyone with relay access, regardless of client-side access control.

🔐 **Access Control**: Access restrictions are enforced only at the UI level by checking team membership (kind 30000 lists). This is suitable for team chat but not for sensitive communications.

🚀 **Performance**: Subscriptions stay open while chat is visible, close when navigating away to conserve resources.
