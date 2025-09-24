/**
 * Join Request Publisher - Handles signing and publishing join requests to Nostr
 * Bridges the gap between prepared events and actual Nostr publishing
 */

import { TeamMembershipService } from '../services/team/teamMembershipService';
import { NostrProtocolHandler } from '../services/nostr/NostrProtocolHandler';
import { NostrRelayManager } from '../services/nostr/NostrRelayManager';
import { getNsecFromStorage, nsecToPrivateKey } from './nostr';

interface PublishJoinRequestResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Publishes a team join request to Nostr
 * Creates a kind 1104 event that captains can see in their dashboard
 */
export async function publishJoinRequest(
  teamId: string,
  teamName: string,
  captainPubkey: string,
  userPubkey: string,
  message?: string
): Promise<PublishJoinRequestResult> {
  try {
    console.log(`📤 Publishing join request for team: ${teamName}`);

    // 1. Prepare the join request event (unsigned)
    const membershipService = TeamMembershipService.getInstance();
    const eventTemplate = membershipService.prepareJoinRequest(
      teamId,
      teamName,
      captainPubkey,
      userPubkey,
      message || 'I would like to join your team'
    );

    // 2. Get user's private key from storage
    const nsec = await getNsecFromStorage();
    if (!nsec) {
      console.error('No nsec found in storage');
      return { success: false, error: 'Authentication required' };
    }

    const privateKey = await nsecToPrivateKey(nsec);

    // 3. Sign the event
    const protocolHandler = new NostrProtocolHandler();
    const signedEvent = await protocolHandler.signEvent(eventTemplate as any, privateKey);

    // 4. Publish to Nostr relays
    const relayManager = new NostrRelayManager();
    const publishResult = await relayManager.publishEvent(signedEvent);

    if (publishResult.successful && publishResult.successful.length > 0) {
      console.log(`✅ Join request published successfully: ${signedEvent.id}`);

      // 5. Update local membership status to "requested"
      await membershipService.updateLocalMembershipStatus(
        userPubkey,
        teamId,
        'requested',
        signedEvent.id
      );

      return {
        success: true,
        eventId: signedEvent.id
      };
    } else {
      console.error('Failed to publish to any relay');
      return {
        success: false,
        error: 'Failed to publish request. Please try again.'
      };
    }
  } catch (error) {
    console.error('Error publishing join request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}