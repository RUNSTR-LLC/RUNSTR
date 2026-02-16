/**
 * EventJoinButton - Smart join/commit button for Satlantis events
 *
 * Shows different states based on event configuration and user status:
 * - "Join Event" for free events (no pledge cost)
 * - "Commit X Days & Join" for events with pledge cost
 * - "Donate & Join (X sats)" for legacy donation events
 * - "Joined" if user already clicked join
 * - Disabled for ended events
 *
 * Uses UnifiedEventParticipantService for local-first join tracking:
 * - No Nostr RSVP publishing (faster, more reliable)
 * - Joins stored locally in AsyncStorage
 * - Season II users visible to all, others private
 *
 * Creates a pledge via PledgeService when user joins a paid event.
 * Uses ExternalZapModal pattern for donations - any Lightning wallet can pay.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { UnifiedEventParticipantService } from '../../services/satlantis/UnifiedEventParticipantService';
import { SatlantisEventJoinService } from '../../services/satlantis/SatlantisEventJoinService';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { ProfileService } from '../../services/user/profileService';
import { PledgeService } from '../../services/pledge/PledgeService';
import { WoTService } from '../../services/wot/WoTService';
import { getNpubFromStorage, getHexPubkeyFromStorage } from '../../utils/nostr';
import { nip19 } from 'nostr-tools';
import type { SatlantisEvent } from '../../types/satlantis';

interface EventJoinButtonProps {
  event: SatlantisEvent;
  onJoinSuccess?: () => void;
  onError?: (error: string) => void;
}

type ButtonState =
  | 'loading'
  | 'join_free'
  | 'join_pledge' // Events with pledge cost - commits daily rewards
  | 'join_donation' // Legacy donation events
  | 'joined'
  | 'ended'
  | 'rank_required' // Legacy: User doesn't meet minimum WoT rank requirement
  | 'error';

export const EventJoinButton: React.FC<EventJoinButtonProps> = ({
  event,
  onJoinSuccess,
  onError,
}) => {
  const [state, setState] = useState<ButtonState>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  const [optimisticJoined, setOptimisticJoined] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [creatorLightningAddress, setCreatorLightningAddress] = useState<string>('');
  const [requiredRankTier, setRequiredRankTier] = useState<string>('');

  // Check initial state
  useEffect(() => {
    checkJoinStatus();
    resolveCreatorLightningAddress();
  }, [event.id]);

  // Resolve creator's lightning address for donations
  const resolveCreatorLightningAddress = useCallback(async () => {
    try {
      const profile = await ProfileService.getUserProfile(event.pubkey);
      if (profile?.lud16) {
        setCreatorLightningAddress(profile.lud16);
        console.log('[EventJoinButton] Creator lightning address:', profile.lud16);
      }
    } catch (error) {
      console.warn('[EventJoinButton] Could not resolve creator lightning address:', error);
    }
  }, [event.pubkey]);

  const checkJoinStatus = useCallback(async () => {
    try {
      // Note: Impact Level system has been removed. Events with minimumImpactLevel
      // requirements are now accessible to all users.

      // Legacy: Check if event has rank requirement (for old events)
      if (event.minimumRank && event.minimumRank > 0) {
        const hexPubkey = await getHexPubkeyFromStorage();

        if (hexPubkey) {
          const wotService = WoTService.getInstance();
          let score = await wotService.getCachedScore(hexPubkey);

          // If no cached score, try to fetch it
          if (score === null) {
            try {
              score = await wotService.fetchAndCacheScore(hexPubkey);
            } catch {
              score = 0;
            }
          }

          // Check if user meets minimum rank
          if (score === null || score < event.minimumRank) {
            setRequiredRankTier(event.minimumRankTier || 'Required');
            setState('rank_required');
            return;
          }
        } else {
          // Not logged in - can't check rank
          setRequiredRankTier(event.minimumRankTier || 'Required');
          setState('rank_required');
          return;
        }
      }

      // Check if event has ended
      const now = Math.floor(Date.now() / 1000);
      if (now > event.endTime) {
        setState('ended');
        return;
      }

      // Check if user already joined (using unified local storage)
      const hexPubkey = await getHexPubkeyFromStorage();
      if (hexPubkey) {
        const hasJoined = await UnifiedEventParticipantService.hasJoined(event.id, hexPubkey);
        if (hasJoined) {
          setState('joined');
          setOptimisticJoined(false);
          return;
        }
      }

      // Check if event has pledge/commitment cost (new system)
      if (event.pledgeCost && event.pledgeCost > 0) {
        setState('join_pledge');
        return;
      }

      // Determine join type based on event configuration (legacy system)
      const requirements = SatlantisEventJoinService.getJoinRequirements(event);
      if (!requirements.canJoin) {
        setState('ended');
      } else if (requirements.hasDonation) {
        setState('join_donation');
      } else {
        setState('join_free');
      }
    } catch (error) {
      console.error('[EventJoinButton] Error checking status:', error);
      setState('error');
    }
  }, [event]);

  // Handle direct join (free events or after donation)
  // Uses UnifiedEventParticipantService for local-first storage (no RSVP publishing)
  const handleJoinEvent = useCallback(async (donationMade?: boolean) => {
    setIsProcessing(true);
    setOptimisticJoined(true);

    try {
      // Get user's hex pubkey
      const hexPubkey = await getHexPubkeyFromStorage();
      if (!hexPubkey) {
        setOptimisticJoined(false);
        onError?.('Not logged in');
        return;
      }

      // Join via unified service (local storage only, no RSVP)
      await UnifiedEventParticipantService.joinEvent(event.id, hexPubkey);
      console.log('[EventJoinButton] Joined event via UnifiedEventParticipantService');

      // Also save joined event context for workout tagging (legacy compatibility)
      await SatlantisEventJoinService.saveJoinedEvent(event);

      setState('joined');
      onJoinSuccess?.();
    } catch (error) {
      console.error('[EventJoinButton] Join error:', error);
      setOptimisticJoined(false);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [event, onJoinSuccess, onError]);

  // Handle pledge-based join (events with pledge cost)
  const handlePledgeJoin = useCallback(async () => {
    setIsProcessing(true);
    setOptimisticJoined(true);

    try {
      // Get user's pubkey
      const storedNpub = await getNpubFromStorage();
      if (!storedNpub) {
        setOptimisticJoined(false);
        onError?.('Not logged in');
        return;
      }

      // Convert npub to hex pubkey
      let userPubkey: string;
      try {
        const decoded = nip19.decode(storedNpub);
        userPubkey = decoded.data as string;
      } catch {
        setOptimisticJoined(false);
        onError?.('Invalid user credentials');
        return;
      }

      // Check if user can create a pledge
      const eligibility = await PledgeService.canCreatePledge(userPubkey);
      if (!eligibility.allowed) {
        setOptimisticJoined(false);
        Alert.alert(
          'Cannot Join Event',
          eligibility.message || 'You have an active commitment. Complete it first.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Join the event first using unified service (local storage, no RSVP)
      await UnifiedEventParticipantService.joinEvent(event.id, userPubkey);
      console.log('[EventJoinButton] Joined event via UnifiedEventParticipantService');

      // Save joined event context for workout tagging (legacy compatibility)
      await SatlantisEventJoinService.saveJoinedEvent(event);

      // Determine destination address
      const destinationAddress =
        event.pledgeDestination === 'charity'
          ? event.pledgeCharityAddress
          : event.captainLightningAddress || creatorLightningAddress;

      const destinationName =
        event.pledgeDestination === 'charity'
          ? event.pledgeCharityName || 'Charity'
          : event.creatorProfile?.name || 'Event Creator';

      if (!destinationAddress) {
        console.warn('[EventJoinButton] No destination address for pledge - joined without pledge');
        setState('joined');
        onJoinSuccess?.();
        return;
      }

      // Create the pledge
      const pledge = await PledgeService.createPledge({
        eventId: event.id,
        eventName: event.title,
        totalWorkouts: event.pledgeCost!,
        destination: {
          type: event.pledgeDestination || 'captain',
          lightningAddress: destinationAddress,
          name: destinationName,
        },
        userPubkey,
      });

      if (pledge) {
        console.log('[EventJoinButton] Pledge created:', pledge.id);
        setState('joined');
        onJoinSuccess?.();
      } else {
        // Pledge creation failed but join succeeded - still mark as joined
        console.warn('[EventJoinButton] Pledge creation failed, but join succeeded');
        setState('joined');
        onJoinSuccess?.();
      }
    } catch (error) {
      setOptimisticJoined(false);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [event, creatorLightningAddress, onJoinSuccess, onError]);

  const handlePress = useCallback(async () => {
    if (isProcessing) return;

    if (state === 'join_free') {
      await handleJoinEvent();
    } else if (state === 'join_pledge') {
      await handlePledgeJoin();
    } else if (state === 'join_donation') {
      // Show donation modal
      if (creatorLightningAddress) {
        setShowDonationModal(true);
      } else {
        // No lightning address - just join without donation
        console.log('[EventJoinButton] No creator lightning address, joining without donation');
        await handleJoinEvent(false);
      }
    }
  }, [state, isProcessing, creatorLightningAddress, handleJoinEvent, handlePledgeJoin]);

  // Handle donation success - join event after donation
  const handleDonationSuccess = useCallback(async () => {
    setShowDonationModal(false);
    await handleJoinEvent(true);
  }, [handleJoinEvent]);

  // Handle donation modal close - ask if they want to join without donating
  const handleDonationClose = useCallback(() => {
    setShowDonationModal(false);
  }, []);

  // Handle "Join Without Donating" option
  const handleJoinWithoutDonation = useCallback(async () => {
    setShowDonationModal(false);
    await handleJoinEvent(false);
  }, [handleJoinEvent]);

  // Use optimistic state for display
  const isJoined = state === 'joined' || optimisticJoined;

  // Get suggested donation amount
  const donationAmount = event.suggestedDonationSats || event.entryFeeSats || 0;

  // Render based on state
  const renderContent = () => {
    if (state === 'loading' || (isProcessing && !optimisticJoined)) {
      return <ActivityIndicator size="small" color={theme.colors.background} />;
    }

    if (isJoined) {
      return (
        <View style={styles.joinedContent}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={theme.colors.success}
          />
          <Text style={styles.joinedText}>
            {optimisticJoined && state !== 'joined' ? 'Joining...' : 'Joined'}
          </Text>
        </View>
      );
    }

    switch (state) {
      case 'ended':
        return <Text style={styles.endedText}>Event Ended</Text>;

      case 'rank_required':
        return (
          <Text style={styles.rankRequiredText}>
            Minimum {requiredRankTier} rank required
          </Text>
        );

      case 'join_free':
        return <Text style={styles.buttonText}>Join Event</Text>;

      case 'join_pledge': {
        // Show pledge commitment button
        const pledgeDays = event.pledgeCost || 1;
        return (
          <View style={styles.donationContent}>
            <Ionicons name="fitness" size={18} color={theme.colors.background} />
            <Text style={styles.buttonText}>
              {`Commit ${pledgeDays} Day${pledgeDays > 1 ? 's' : ''} & Join`}
            </Text>
          </View>
        );
      }

      case 'join_donation':
        return (
          <View style={styles.donationContent}>
            <Ionicons name="flash" size={18} color={theme.colors.background} />
            <Text style={styles.buttonText}>
              {donationAmount > 0
                ? `Donate & Join (${donationAmount.toLocaleString()} sats)`
                : 'Donate & Join'}
            </Text>
          </View>
        );

      case 'error':
        return <Text style={styles.errorText}>Error</Text>;

      default:
        return <Text style={styles.buttonText}>Join</Text>;
    }
  };

  const isDisabled =
    state === 'loading' ||
    isJoined ||
    state === 'ended' ||
    state === 'rank_required' ||
    state === 'error' ||
    isProcessing;

  const buttonStyle = [
    styles.button,
    isJoined && styles.buttonJoined,
    state === 'ended' && styles.buttonEnded,
    state === 'rank_required' && styles.buttonRankRequired,
    state === 'join_pledge' && styles.buttonPledge,
    state === 'join_donation' && styles.buttonDonation,
    isDisabled && !isJoined && state !== 'rank_required' && styles.buttonDisabled,
  ];

  return (
    <>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {renderContent()}
      </TouchableOpacity>

      {/* Donation Modal - Uses ExternalZapModal pattern */}
      {showDonationModal && creatorLightningAddress && (
        <ExternalZapModal
          visible={showDonationModal}
          recipientNpub={creatorLightningAddress}
          recipientName={event.creatorProfile?.name || 'Event Creator'}
          amount={donationAmount > 0 ? donationAmount : undefined}
          memo={`Support: ${event.title}`}
          onClose={handleDonationClose}
          onSuccess={handleDonationSuccess}
        />
      )}

      {/* Join Without Donating Option - shown when modal is closed */}
      {state === 'join_donation' && !showDonationModal && !isJoined && (
        <TouchableOpacity
          style={styles.skipDonationButton}
          onPress={handleJoinWithoutDonation}
          disabled={isProcessing}
        >
          <Text style={styles.skipDonationText}>
            Join without donating
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

// Export refresh function type for parent components
export type EventJoinButtonRef = {
  refreshStatus: () => void;
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPledge: {
    backgroundColor: theme.colors.accent, // Orange for pledge/commitment
  },
  buttonDonation: {
    backgroundColor: theme.colors.orangeBright,
  },
  buttonJoined: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  buttonEnded: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonRankRequired: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  joinedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinedText: {
    color: theme.colors.success,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  endedText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  rankRequiredText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  donationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipDonationButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipDonationText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default EventJoinButton;
