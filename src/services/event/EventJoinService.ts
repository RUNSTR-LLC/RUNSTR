/**
 * Event Join Service
 * Handles paid and free event joining with payment + join request flow
 * Coordinates between wallet payments and Nostr join requests
 */

import { Alert } from 'react-native';
import nutzapService from '../nutzap/nutzapService';
import eventJoinRequestService, { EventJoinRequestData } from '../events/EventJoinRequestService';
import { NostrProtocolHandler } from '../nostr/NostrProtocolHandler';
import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { getAuthenticationData } from '../../utils/nostrAuth';
import type { QREventData } from './QREventService';

export interface EventJoinResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Event Join Service
 * Manages the full flow of joining paid/free events
 */
export class EventJoinService {
  private static instance: EventJoinService;

  private constructor() {}

  public static getInstance(): EventJoinService {
    if (!EventJoinService.instance) {
      EventJoinService.instance = new EventJoinService();
    }
    return EventJoinService.instance;
  }

  /**
   * Join a free event (send join request only)
   */
  public async joinFreeEvent(
    eventData: QREventData
  ): Promise<EventJoinResult> {
    try {
      console.log(`📝 Joining free event: ${eventData.event_name}`);

      // Get user authentication data
      const authData = await getAuthenticationData();
      if (!authData?.nsec || !authData?.hexPubkey) {
        throw new Error('Cannot access user credentials for signing');
      }

      // Prepare join request data
      const requestData: EventJoinRequestData = {
        eventId: eventData.event_id,
        eventName: eventData.event_name,
        teamId: eventData.team_id,
        captainPubkey: eventData.captain_pubkey,
        message: `Request to join: ${eventData.event_name}`,
      };

      // Create event template
      const eventTemplate = eventJoinRequestService.prepareEventJoinRequest(
        requestData,
        authData.hexPubkey
      );

      // Sign and publish event
      const protocolHandler = new NostrProtocolHandler();
      const signedEvent = await protocolHandler.signEvent(eventTemplate as any, authData.nsec);
      const publishResult = await nostrRelayManager.publishEvent(signedEvent);

      if (publishResult.successful.length === 0) {
        throw new Error('Failed to publish join request');
      }

      console.log(`✅ Free event join request sent for: ${eventData.event_name}`);

      Alert.alert(
        'Request Sent!',
        `Your join request has been sent to the captain. You'll be notified when approved.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        message: 'Join request sent successfully',
      };
    } catch (error) {
      console.error('❌ Failed to join free event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      Alert.alert('Join Failed', errorMessage, [{ text: 'OK' }]);

      return {
        success: false,
        message: 'Failed to send join request',
        error: errorMessage,
      };
    }
  }

  /**
   * Join a paid event (send payment + join request)
   */
  public async joinPaidEvent(
    eventData: QREventData
  ): Promise<EventJoinResult> {
    try {
      console.log(`💰 Joining paid event: ${eventData.event_name} (${eventData.entry_fee} sats)`);

      // Get user authentication data
      const authData = await getAuthenticationData();
      if (!authData?.nsec || !authData?.hexPubkey) {
        throw new Error('Cannot access user credentials');
      }

      // Check wallet balance
      const balance = await nutzapService.getBalance();
      if (balance < eventData.entry_fee) {
        throw new Error(
          `Insufficient balance. You have ${balance} sats, need ${eventData.entry_fee} sats`
        );
      }

      // Send payment to captain
      console.log(`💸 Sending ${eventData.entry_fee} sats to captain...`);

      const paymentMemo = `Entry fee for: ${eventData.event_name}`;
      const paymentResult = await nutzapService.sendNutzap(
        eventData.captain_pubkey,
        eventData.entry_fee,
        paymentMemo
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log(`✅ Payment sent successfully`);

      // Send join request with payment confirmation
      const requestData: EventJoinRequestData = {
        eventId: eventData.event_id,
        eventName: eventData.event_name,
        teamId: eventData.team_id,
        captainPubkey: eventData.captain_pubkey,
        message: `Paid ${eventData.entry_fee} sats entry fee for: ${eventData.event_name}`,
      };

      // Create event template
      const eventTemplate = eventJoinRequestService.prepareEventJoinRequest(
        requestData,
        authData.hexPubkey
      );

      // Sign and publish event
      const protocolHandler = new NostrProtocolHandler();
      const signedEvent = await protocolHandler.signEvent(eventTemplate as any, authData.nsec);
      const publishResult = await nostrRelayManager.publishEvent(signedEvent);

      if (publishResult.successful.length === 0) {
        // Payment sent but join request failed - warn user
        console.warn('⚠️ Payment sent but join request failed to publish');
        Alert.alert(
          'Payment Sent',
          `Payment of ${eventData.entry_fee} sats was sent, but join request failed to publish. Please contact the captain.`,
          [{ text: 'OK' }]
        );

        return {
          success: false,
          message: 'Payment sent but join request failed',
          error: 'Failed to publish join request',
        };
      }

      console.log(`✅ Paid event join complete: ${eventData.event_name}`);

      Alert.alert(
        'Payment Sent!',
        `${eventData.entry_fee} sats sent to captain. Your join request is pending approval.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        message: 'Payment and join request sent successfully',
      };
    } catch (error) {
      console.error('❌ Failed to join paid event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      Alert.alert('Join Failed', errorMessage, [{ text: 'OK' }]);

      return {
        success: false,
        message: 'Failed to join paid event',
        error: errorMessage,
      };
    }
  }

  /**
   * Join event (auto-detects paid vs free)
   */
  public async joinEvent(
    eventData: QREventData
  ): Promise<EventJoinResult> {
    if (eventData.entry_fee > 0) {
      return this.joinPaidEvent(eventData);
    } else {
      return this.joinFreeEvent(eventData);
    }
  }
}

// Export singleton instance
export const eventJoinService = EventJoinService.getInstance();
