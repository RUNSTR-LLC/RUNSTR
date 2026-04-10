/**
 * Navigation Handlers
 * Centralized navigation logic for RUNSTR app
 */

import { DiscoveryTeam } from '../types';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/auth/authService';
import { isTeamMember, isTeamCaptain } from '../utils/teamUtils';
import { CaptainCache } from '../utils/captainCache';
import { CustomAlertManager } from '../components/ui/CustomAlert';

interface RewardDistribution {
  recipientPubkey: string;
  amount: number;
  reason?: string;
}

export interface NavigationHandlers {
  handleTeamJoin: (
    team: DiscoveryTeam,
    navigation: any,
    refreshData?: () => Promise<void>
  ) => Promise<void>;
  handleTeamSelect: (team: DiscoveryTeam) => void;
  handleTeamView: (
    team: DiscoveryTeam,
    navigation: any,
    userNpub?: string
  ) => Promise<void>;
  handleMenuPress: (navigation: any) => void;
  handleLeaveTeam: (
    navigation: any,
    refreshData?: () => Promise<void>
  ) => Promise<void>;
  handleManageWallet: (navigation: any) => void;
  handleAnnouncements: () => void;
  handleAddEvent: (navigation: any) => void;
  handleAddChallenge: (navigation: any) => void;
  handleNavigateToTeam: (teamId: string, navigation: any) => void;
  handleOnboardingComplete: (
    data: {
      selectedTeam?: DiscoveryTeam;
      selectedRole?: 'member' | 'captain';
      authenticated?: boolean;
    },
    navigation: any
  ) => void;
  handleOnboardingSkip: (navigation: any) => void;
  // Captain Dashboard Handlers
  handleSettings: () => void;
  handleEditMember: (memberId: string) => void;
  handleKickMember: (memberId: string) => void;
  handleEditLeague: () => void;
  handleDistributeRewards: (distributions: RewardDistribution[]) => void;
  handleViewWalletHistory: () => void;
  handleViewAllActivity: () => void;
  // Profile Screen Handlers
  handleEditProfile: () => void;
  handleProfileSend: () => void;
  handleProfileReceive: () => void;
  handleWalletSend: () => void;
  handleWalletReceive: () => void;
  handleWalletHistory: () => void;
  handleSyncSourcePress: (provider: string) => void;
  handleHelp: (navigation?: any) => void;
  handleContactSupport: (navigation?: any) => void;
  handlePrivacyPolicy: (navigation?: any) => void;
  handleSignOut: (navigation: any) => void;
}

export const createNavigationHandlers = (): NavigationHandlers => {
  return {
    handleTeamJoin: async (
      team: DiscoveryTeam,
      navigation: any,
      refreshData?: () => Promise<void>
    ) => {
      if (refreshData) {
        await refreshData();
      }
    },

    handleTeamSelect: (team: DiscoveryTeam) => {
      CustomAlertManager.alert(
        team.name,
        `${team.description}\n\nMembers: ${
          team.memberCount
        }\nPrize Pool: ${team.prizePool.toLocaleString()} rewards`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join Team', onPress: () => {} },
        ]
      );
    },

    handleTeamView: async (
      team: DiscoveryTeam,
      navigation: any,
      _userNpub?: string
    ) => {
      navigation.navigate('ClubPage', {
        clubId: team.id,
        clubName: team.name,
      });
    },

    handleMenuPress: (_navigation: any) => {
      // Handled by the dropdown menu in TeamHeader
    },

    handleLeaveTeam: async (
      navigation: any,
      _refreshData?: () => Promise<void>
    ) => {
      try {
        CustomAlertManager.alert(
          'Leave Team',
          'Team leaving functionality is being optimized. This feature will be available in the next update.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Social');
              },
            },
          ]
        );
      } catch (error) {
        console.error('Error in handleLeaveTeam:', error);
        CustomAlertManager.alert(
          'Error',
          'Unable to process team leave request'
        );
      }
    },

    handleManageWallet: (navigation: any) => {
      navigation.navigate('Profile');
    },

    handleAnnouncements: () => {
      CustomAlertManager.alert('Announcements', 'No new announcements');
    },

    handleAddEvent: (_navigation: any) => {
      CustomAlertManager.alert(
        'Create Event',
        'Event creation is being refined. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    handleAddChallenge: (_navigation: any) => {
      CustomAlertManager.alert(
        'Create Challenge',
        'Challenge creation is being optimized. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    handleNavigateToTeam: (teamId: string, navigation: any) => {
      navigation.navigate('Social', { teamId, refresh: true });
    },

    handleOnboardingComplete: (
      data: {
        selectedTeam?: DiscoveryTeam;
        selectedRole?: 'member' | 'captain';
        authenticated?: boolean;
      },
      navigation: any
    ) => {
      navigation.navigate('Profile');
    },

    handleOnboardingSkip: (navigation: any) => {
      CustomAlertManager.alert(
        'Welcome to RUNSTR!',
        'You can join a team anytime from your profile.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Social') }]
      );
    },

    handleSettings: () => {
      CustomAlertManager.alert(
        'Team Settings',
        'Team settings are being enhanced. Basic team management is available through the team screen.',
        [{ text: 'OK' }]
      );
    },

    handleEditMember: (_memberId: string) => {
      CustomAlertManager.alert('Edit Member', 'Member management coming soon!');
    },

    handleKickMember: (memberId: string) => {
      CustomAlertManager.alert(
        'Remove Member',
        'Are you sure you want to remove this member from the team?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {},
          },
        ]
      );
    },

    handleEditLeague: () => {
      CustomAlertManager.alert(
        'Edit League',
        'League settings management coming soon!'
      );
    },

    handleDistributeRewards: (distributions: RewardDistribution[]) => {
      CustomAlertManager.alert(
        'Distribute Rewards',
        `Processing ${distributions.length} reward distribution${
          distributions.length !== 1 ? 's' : ''
        }...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Process',
            onPress: () => {
              CustomAlertManager.alert(
                'Success',
                'Reward distributions processed successfully!'
              );
            },
          },
        ]
      );
    },

    handleViewWalletHistory: () => {
      // Transaction history is integrated in the wallet modals
    },

    handleViewAllActivity: () => {
      CustomAlertManager.alert(
        'Activity Feed',
        'Full activity feed view coming soon!'
      );
    },

    handleEditProfile: () => {
      CustomAlertManager.alert(
        'Edit Profile',
        'Profile editing functionality coming soon!'
      );
    },

    handleProfileSend: () => {
      CustomAlertManager.alert(
        'Send',
        'Enter recipient address.'
      );
    },

    handleProfileReceive: () => {
      CustomAlertManager.alert(
        'Receive',
        'Share your address with others to receive payments.'
      );
    },

    handleWalletSend: () => {
      CustomAlertManager.alert(
        'Send NutZap',
        'Select a team member to send rewards to.',
        [{ text: 'OK' }]
      );
    },

    handleWalletReceive: () => {
      CustomAlertManager.alert(
        'Receive NutZap',
        'Share your Nostr npub to receive NutZaps.\n\nYour wallet auto-claims incoming payments.',
        [{ text: 'OK' }]
      );
    },

    handleWalletHistory: () => {
      // Transaction history is handled in the modal
    },

    handleSyncSourcePress: (provider: string) => {
      if (provider === 'nostr') {
        CustomAlertManager.alert(
          'Nostr Workout Sync',
          'Your Nostr workout sync is active! Workouts from your connected relays are automatically synced.',
          [{ text: 'OK' }]
        );
      } else if (provider === 'strava' || provider === 'googlefit') {
        CustomAlertManager.alert(
          `${provider} Sync`,
          `${provider} sync is not available yet. Use Nostr 1301 workout notes instead.`,
          [{ text: 'OK' }]
        );
      } else {
        CustomAlertManager.alert(
          `${provider} Settings`,
          `Manage your ${provider} sync settings.`
        );
      }
    },

    handleHelp: (navigation?: any) => {
      if (navigation) {
        navigation.navigate('HelpSupport');
      } else {
        CustomAlertManager.alert(
          'Help & Support',
          'Visit runstr.app/help for documentation and tutorials.'
        );
      }
    },

    handleContactSupport: (navigation?: any) => {
      if (navigation) {
        navigation.navigate('ContactSupport');
      } else {
        CustomAlertManager.alert(
          'Contact Support',
          'Reach out to support@runstr.app for assistance.'
        );
      }
    },

    handlePrivacyPolicy: (navigation?: any) => {
      if (navigation) {
        navigation.navigate('PrivacyPolicy');
      } else {
        CustomAlertManager.alert(
          'Privacy Policy',
          'View our privacy policy at runstr.app/privacy'
        );
      }
    },

    handleSignOut: (navigation: any) => {
      CustomAlertManager.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await AuthService.signOut();
                if (navigation.getParent()) {
                  navigation.getParent().reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }
              } catch (error) {
                console.error('Error during sign out:', error);
                CustomAlertManager.alert(
                  'Error',
                  'Failed to sign out. Please try again.'
                );
              }
            },
          },
        ]
      );
    },
  };
};
