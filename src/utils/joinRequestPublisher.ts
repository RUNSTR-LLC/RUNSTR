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
 * Publishes a team join request to Nostr with automatic retry logic
 * Creates a kind 1104 event that captains can see in their dashboard
 * Retries up to 3 times with exponential backoff on failure
 */
export async function publishJoinRequest(
  teamId: string,
  teamName: string,
  captainPubkey: string,
  userPubkey: string,
  message?: string,
  maxRetries: number = 3
): Promise<PublishJoinRequestResult> {
  let lastError: string = '';

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Publishing join request for team: ${teamName} (attempt ${attempt}/${maxRetries})`);

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
        console.log(`✅ Join request published successfully on attempt ${attempt}: ${signedEvent.id}`);

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
        lastError = 'Failed to publish to any relay';
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${lastError}`);

        // Don't retry if this was the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Attempt ${attempt}/${maxRetries} error:`, lastError);

      // Don't retry on authentication errors
      if (lastError.includes('Authentication required') || lastError.includes('nsec')) {
        return { success: false, error: lastError };
      }

      // Retry on other errors with backoff
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  console.error(`💥 All ${maxRetries} publish attempts failed`);
  return {
    success: false,
    error: lastError || 'Failed to publish request after multiple attempts'
  };
}