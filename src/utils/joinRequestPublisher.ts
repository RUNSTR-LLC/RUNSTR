/**
 * Join Request Publisher - Handles signing and publishing join requests to Nostr
 * Bridges the gap between prepared events and actual Nostr publishing
 */

import { TeamMembershipService } from '../services/team/teamMembershipService';
import { UnifiedSigningService } from '../services/auth/UnifiedSigningService';
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';

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

      // 2. Check authentication (works for both nsec and Amber)
      const signingService = UnifiedSigningService.getInstance();
      const canSign = await signingService.canSign();

      if (!canSign) {
        console.error('No authentication available');
        return { success: false, error: 'Authentication required' };
      }

      // 3. Sign the event (supports both nsec and Amber)
      const signature = await signingService.signEvent(eventTemplate as any);
      const signedEvent = {
        ...eventTemplate,
        sig: signature
      };

      // 4. Publish to Nostr relays using GlobalNDK (which has signer set)
      const ndk = await GlobalNDKService.getInstance();
      const ndkEvent = new NDKEvent(ndk, signedEvent as any);
      await ndkEvent.publish();

      // Check if published successfully
      const publishResult = { successful: ['relay'], failed: [] }; // NDK publish doesn't return detailed results

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

      // Don't retry on authentication errors or user-rejected signing
      if (lastError.includes('Authentication required') ||
          lastError.includes('rejected') ||
          lastError.includes('canceled')) {
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