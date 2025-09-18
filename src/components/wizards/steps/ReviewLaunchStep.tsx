/**
 * ReviewLaunchStep - Final review and team launch for team creation wizard
 * Displays summary, review sections, and handles team launch process
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { TeamCreationStepProps, User } from '../../../types';
import NostrTeamCreationService from '../../../services/nostr/NostrTeamCreationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';

interface ReviewLaunchStepProps extends TeamCreationStepProps {
  currentUser: User; // Authenticated user with real Nostr identity
  onEditStep?: (
    step: 'team_basics' | 'league_settings' | 'first_event' | 'wallet_setup'
  ) => void;
  onLaunchComplete?: (teamCode: string, teamId?: string) => void;
  onNavigateToTeam?: (teamId: string) => void; // Direct navigation callback
}

export const ReviewLaunchStep: React.FC<ReviewLaunchStepProps> = ({
  data,
  currentUser,
  onDataChange,
  onEditStep,
  onLaunchComplete,
  onNavigateToTeam,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [createdTeamId, setCreatedTeamId] = useState<string>('');

  // Generate team invite code
  const generateTeamCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RUN-2024-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Handle team launch - Pure Nostr team creation with NDK
  const handleLaunchTeam = async () => {
    setIsLaunching(true);

    try {
      console.log(
        'ReviewLaunchStep: Starting pure Nostr team creation with NDK'
      );
      console.log('User npub:', currentUser.npub);
      console.log('User name:', currentUser.name);

      // Get user's private key from secure storage
      const nsec = await AsyncStorage.getItem('userNsec');
      if (!nsec) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to create a team'
        );
        return;
      }

      // Decode nsec to get private key
      let privateKey: string;
      try {
        const decoded = nip19.decode(nsec);
        if (decoded.type === 'nsec') {
          privateKey = decoded.data as string;
        } else {
          throw new Error('Invalid nsec format');
        }
      } catch (e) {
        console.error('Failed to decode nsec:', e);
        Alert.alert('Error', 'Invalid authentication data. Please log in again.');
        return;
      }

      // Decode npub to get hex pubkey
      let captainHexPubkey = currentUser.npub;
      try {
        const decoded = nip19.decode(currentUser.npub);
        if (decoded.type === 'npub') {
          captainHexPubkey = decoded.data as string;
        }
      } catch (e) {
        // Might already be hex, use as-is
        console.log('Using npub as-is, might already be hex');
      }

      // Create team using pure Nostr with NDK (kind 33404 + kind 30000)
      const result = await NostrTeamCreationService.createTeam(
        {
          name: data.teamName,
          about: data.teamAbout,
          captainNpub: currentUser.npub,
          captainHexPubkey,
          activityType: 'Running', // Default to running
          isPublic: true,
        },
        privateKey
      );

      if (result.success && result.teamId) {
        const code = generateTeamCode();
        setTeamCode(code);
        setCreatedTeamId(result.teamId); // Store teamId for navigation
        setShowSuccess(true);

        console.log(
          'ReviewLaunchStep: Team created successfully with kind 30000 list:',
          result.teamId
        );

        if (onLaunchComplete) {
          onLaunchComplete(code, result.teamId); // Pass both code and teamId
        }
      } else {
        console.error('ReviewLaunchStep: Team creation failed:', result.error);
        Alert.alert(
          'Team Creation Failed',
          result.error || 'Unknown error occurred'
        );
      }
    } catch (error) {
      console.error(
        'ReviewLaunchStep: Unexpected error during team creation:',
        error
      );
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setIsLaunching(false);
    }
  };

  // Handle going to team dashboard - REAL NAVIGATION
  const handleGoToDashboard = () => {
    if (createdTeamId && onNavigateToTeam) {
      console.log(
        'ReviewLaunchStep: Navigating to team dashboard:',
        createdTeamId
      );
      onNavigateToTeam(createdTeamId);
    } else {
      console.error(
        'ReviewLaunchStep: Cannot navigate - missing teamId or navigation callback'
      );
      Alert.alert('Navigation Error', 'Unable to navigate to team dashboard');
    }
  };

  // Format data for display
  const formatCompetitionType = (type?: string): string => {
    if (!type) return 'Not set';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatDuration = (duration?: string): string => {
    if (!duration) return 'Not set';
    return duration.charAt(0).toUpperCase() + duration.slice(1);
  };

  const formatPayoutStructure = (structure?: string): string => {
    if (!structure) return 'Not set';
    return structure.replace(/(\d+)/, 'Top $1');
  };

  const formatPrizePool = (amount?: number): string => {
    if (!amount) return 'Not set';
    return `${amount.toLocaleString()} sats`;
  };

  const formatEventDate = (dateStr?: string): string => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (showSuccess) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>🎉</Text>
          </View>

          <Text style={styles.successTitle}>Team Launched!</Text>
          <Text style={styles.successDescription}>
            Congratulations! Your team is now live and ready for members. Share
            your team code or invite link to get started.
          </Text>

          <View style={styles.teamCodeContainer}>
            <Text style={styles.codeLabel}>Team Invite Code</Text>
            <Text style={styles.codeValue}>{teamCode}</Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleGoToDashboard}
          >
            <Text style={styles.continueButtonText}>Go to Team Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ready to launch?</Text>
        <Text style={styles.subtitle}>
          Review your team settings and launch your team to start accepting
          members and running competitions.
        </Text>
      </View>

      {/* Team Summary Card */}
      <View style={styles.teamSummary}>
        <Text style={styles.teamName}>{data.teamName || 'My Team'}</Text>
        <Text style={styles.teamDescription}>
          {data.teamAbout
            ? data.teamAbout.length > 120
              ? data.teamAbout.substring(0, 120) + '...'
              : data.teamAbout
            : 'No description provided'}
        </Text>
        <View style={styles.teamStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {data.prizePool ? data.prizePool.toLocaleString() : '0'}
            </Text>
            <Text style={styles.statLabel}>Sats Prize Pool</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCompetitionType(data.competitionType)}
            </Text>
            <Text style={styles.statLabel}>Competition Type</Text>
          </View>
        </View>
      </View>

      {/* Review Sections */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Team Details</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditStep?.('team_basics')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewContent}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Team Name</Text>
            <Text style={styles.reviewValue}>{data.teamName || 'Not set'}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValue}>
              {data.teamAbout
                ? data.teamAbout.length > 50
                  ? data.teamAbout.substring(0, 50) + '...'
                  : data.teamAbout
                : 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>League Settings</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditStep?.('league_settings')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewContent}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Competition</Text>
            <Text style={styles.reviewValue}>
              {formatCompetitionType(data.competitionType)}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Duration</Text>
            <Text style={styles.reviewValue}>
              {formatDuration(data.duration)}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Payouts</Text>
            <Text style={styles.reviewValue}>
              {formatPayoutStructure(data.payoutStructure)}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Prize Pool</Text>
            <Text style={styles.reviewValue}>
              {formatPrizePool(data.prizePool)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>First Event</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditStep?.('first_event')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewContent}>
          {data.eventName ? (
            <>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Event Name</Text>
                <Text style={styles.reviewValue}>{data.eventName}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Type</Text>
                <Text style={styles.reviewValue}>
                  {formatCompetitionType(data.eventType)}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Date & Time</Text>
                <Text style={styles.reviewValue}>
                  {formatEventDate(data.eventStartDate)} at{' '}
                  {data.eventStartTime || '09:00'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Prize</Text>
                <Text style={styles.reviewValue}>
                  {data.eventPrizeAmount
                    ? `${data.eventPrizeAmount.toLocaleString()} sats`
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Repeats</Text>
                <Text style={styles.reviewValue}>
                  {data.eventRepeatWeekly ? 'Weekly' : 'One-time'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.reviewDescription}>No event configured</Text>
          )}
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Wallet Setup</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditStep?.('wallet_setup')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewContent}>
          {data.walletCreated ? (
            <>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Provider</Text>
                <Text style={styles.reviewValue}>CoinOS</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Lightning Address</Text>
                <Text style={styles.reviewValue}>
                  {data.walletAddress || 'Creating...'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Initial Balance</Text>
                <Text style={styles.reviewValue}>
                  {data.walletBalance
                    ? `${data.walletBalance.toLocaleString()} sats`
                    : '0 sats'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Status</Text>
                <Text style={styles.reviewValue}>Connected</Text>
              </View>
            </>
          ) : (
            <Text style={styles.reviewDescription}>Wallet not configured</Text>
          )}
        </View>
      </View>

      {/* Launch Button */}
      <TouchableOpacity
        style={[styles.launchButton, isLaunching && styles.launchButtonLoading]}
        onPress={handleLaunchTeam}
        disabled={isLaunching}
      >
        <Text
          style={[
            styles.launchButtonText,
            isLaunching && styles.launchButtonTextLoading,
          ]}
        >
          {isLaunching ? '' : '🚀 Launch Your Team'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.launchNote}>
        Once launched, your team will be discoverable by other users and you can
        start inviting members.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 34,
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },

  // Team Summary Card
  teamSummary: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },

  teamName: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  teamDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },

  teamStats: {
    flexDirection: 'row',
    gap: 16,
  },

  statItem: {
    alignItems: 'center',
    gap: 4,
  },

  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Review Sections
  reviewSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  reviewTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  reviewContent: {
    gap: 8,
  },

  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  reviewLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
    minWidth: 100,
  },

  reviewValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
    textAlign: 'right',
  },

  reviewDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },

  // Launch Button
  launchButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },

  launchButtonLoading: {
    backgroundColor: theme.colors.text,
  },

  launchButtonText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  launchButtonTextLoading: {
    opacity: 0,
  },

  launchNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 24,
  },

  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  successIcon: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.text,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  successIconText: {
    fontSize: 48,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  successDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  teamCodeContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    alignSelf: 'stretch',
  },

  codeLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  codeValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    fontFamily: 'monospace',
    color: theme.colors.text,
  },

  continueButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    alignSelf: 'stretch',
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});
