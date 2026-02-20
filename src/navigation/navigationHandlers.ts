/**
 * Navigation Handlers
 * Centralized navigation logic for RUNSTR app
 */

import { DiscoveryTeam } from '../types';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/auth/authService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { isTeamMember, isTeamCaptain } from '../utils/teamUtils';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
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
  handleTeamDiscoveryClose: () => void;
  handleMenuPress: (navigation: any) => void;
  handleLeaveTeam: (
    navigation: any,
    refreshData?: () => Promise<void>
  ) => Promise<void>;
  handleManageWallet: (navigation: any) => void;
  handleAnnouncements: () => void;
  handleAddEvent: (navigation: any) => void;
  handleAddChallenge: (navigation: any) => void;
  handleCaptainDashboard: (
    navigation: any,
    teamId?: string,
    teamName?: string
  ) => void;
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
  handleManageSubscription: () => void;
  handleHelp: (navigation?: any) => void;
  handleContactSupport: (navigation?: any) => void;
  handlePrivacyPolicy: (navigation?: any) => void;
  handleSignOut: (navigation: any) => void;
}

export const createNavigationHandlers = (): NavigationHandlers => {
  return {
    // Team Discovery Handlers
    handleTeamJoin: async (
      team: DiscoveryTeam,
      navigation: any,
      refreshData?: () => Promise<void>
    ) => {
      try {
        console.log(
          'NavigationHandlers: User attempting to join team:',
          team.name
        );

        // Use NostrTeamService for pure Nostr joining
        const nostrTeamService = getNostrTeamService();
        const cachedTeams = Array.from(
          nostrTeamService.getDiscoveredTeams().values()
        );
        const nostrTeam = cachedTeams.find((t) => t.id === team.id);

        if (!nostrTeam) {
          CustomAlertManager.alert(
            'Error',
            'Team not found. Please refresh and try again.'
          );
          return;
        }

        const joinResult = await nostrTeamService.joinTeam(nostrTeam);

        if (joinResult.success) {
          console.log(
            'NavigationHandlers: Successfully joined team:',
            team.name
          );

          // Refresh data if callback provided
          if (refreshData) {
            console.log(
              'NavigationHandlers: Refreshing app data after team join...'
            );
            await refreshData();
            console.log('NavigationHandlers: Data refresh complete');
          }

          // Resolve the user's npub for navigation
          let resolvedNpub: string | undefined;
          try {
            const userData = await AuthService.getCurrentUserWithWallet();
            resolvedNpub = userData?.npub;
          } catch {
            const user = useUserStore.getState().user;
            resolvedNpub = user?.npub;
          }

          // Show success message
          CustomAlertManager.alert(
            'Welcome to the Team!',
            `You've successfully joined ${team.name}! Start earning Bitcoin through fitness challenges.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to team dashboard to show the joined team
                  navigation.navigate('EnhancedTeamScreen', {
                    team,
                    userIsMember: true,
                    currentUserNpub: resolvedNpub,
                  });
                },
              },
            ]
          );
        } else {
          console.error(
            'NavigationHandlers: Team join failed:',
            joinResult.error
          );
          CustomAlertManager.alert(
            'Join Failed',
            joinResult.error || 'Unable to join team. Please try again.'
          );
        }
      } catch (error) {
        console.error(
          'NavigationHandlers: Unexpected error joining team:',
          error
        );
        CustomAlertManager.alert(
          'Error',
          'An unexpected error occurred while joining the team'
        );
      }
    },

    handleTeamSelect: (team: DiscoveryTeam) => {
      console.log('User selected team for preview:', team.name);
      // TODO: Show team preview/details modal
      // For now, we'll use an alert as placeholder
      CustomAlertManager.alert(
        team.name,
        `${team.description}\n\nMembers: ${
          team.memberCount
        }\nPrize Pool: ${team.prizePool.toLocaleString()} sats`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join Team', onPress: () => console.log('Join confirmed') },
        ]
      );
    },

    handleTeamView: async (
      team: DiscoveryTeam,
      navigation: any,
      userNpub?: string
    ) => {
      console.log(
        'NavigationHandlers: Navigating to team dashboard:',
        team.name
      );

      // Use passed userNpub (from working discovery page auth) instead of AsyncStorage lookups
      let currentUserNpub: string | undefined = userNpub;

      console.log(
        '🔄 NavigationHandlers: User from passed parameter (same as working discovery):',
        {
          hasNpub: !!currentUserNpub,
          npubSlice: currentUserNpub?.slice(0, 20) + '...' || 'undefined',
        }
      );

      // Only try AsyncStorage fallback if no npub was passed
      if (!currentUserNpub) {
        try {
          const userData = await AuthService.getCurrentUserWithWallet();
          currentUserNpub = userData?.npub;

          console.log('🔧 NavigationHandlers: Fallback to AuthService:', {
            hasUser: !!userData,
            hasNpub: !!currentUserNpub,
            npubSlice: currentUserNpub?.slice(0, 20) + '...' || 'undefined',
          });
        } catch (error) {
          console.error(
            '❌ NavigationHandlers: Failed to get user from AuthService:',
            error
          );
          // Final fallback to store
          const user = useUserStore.getState().user;
          currentUserNpub = user?.npub;
          console.log('🔧 NavigationHandlers: Final fallback to store:', {
            hasUser: !!user,
            hasNpub: !!currentUserNpub,
          });
        }
      }

      // Use the same logic as EnhancedTeamScreen to determine membership
      const calculatedUserIsMember = isTeamMember(currentUserNpub, team);

      // Get captain status from cache (set by TeamCard where it works correctly)
      let userIsCaptain = false;
      if (team.id && currentUserNpub) {
        const cachedStatus = await CaptainCache.getCaptainStatus(team.id);
        if (cachedStatus !== null) {
          userIsCaptain = cachedStatus;
          console.log(
            `✅ NavigationHandlers: Using cached captain status for ${team.name}: ${userIsCaptain}`
          );
        } else {
          // Fallback only if not cached
          userIsCaptain = isTeamCaptain(currentUserNpub, team);
          console.log(
            `⚠️ NavigationHandlers: No cached status, calculated: ${userIsCaptain}`
          );
          // Cache it for next time
          await CaptainCache.setCaptainStatus(team.id, userIsCaptain);
        }
      }

      // Member status includes both regular members and captains
      const userIsMember = calculatedUserIsMember || userIsCaptain;

      console.log('🎖️ NavigationHandlers: Team view navigation:', {
        teamName: team.name,
        userNpub: currentUserNpub?.slice(0, 8) + '...',
        teamCaptainId:
          'captainId' in team ? team.captainId?.slice(0, 8) + '...' : 'N/A',
        userIsCaptain,
        calculatedUserIsMember,
        finalUserIsMember: userIsMember,
      });

      navigation.navigate('EnhancedTeamScreen', {
        team,
        userIsMember,
        currentUserNpub, // Pass the working npub to avoid component-level AsyncStorage corruption
        userIsCaptain, // Pass the correctly calculated captain status
      });
    },

    handleTeamDiscoveryClose: () => {
      console.log('Team discovery closed');
      // TODO: Analytics for abandonment tracking
    },

    // Team Screen Handlers
    handleMenuPress: (navigation: any) => {
      console.log('Menu pressed');
      // This is now handled by the dropdown menu in TeamHeader
    },

    handleLeaveTeam: async (
      navigation: any,
      refreshData?: () => Promise<void>
    ) => {
      try {
        console.log('NavigationHandlers: Leave team pressed');

        // For now, use simple alert until we implement full Nostr team leaving
        CustomAlertManager.alert(
          'Leave Team',
          'Team leaving functionality is being optimized for the Nostr experience. This feature will be available in the next update.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to clubs
                navigation.navigate('Clubs');
              },
            },
          ]
        );
      } catch (error) {
        console.error('NavigationHandlers: Error in handleLeaveTeam:', error);
        CustomAlertManager.alert(
          'Error',
          'Unable to process team leave request'
        );
      }
    },

    handleManageWallet: (navigation: any) => {
      console.log('Manage wallet pressed');
      // Navigate to profile wallet section for now
      navigation.navigate('Profile');
    },

    handleAnnouncements: () => {
      console.log('Announcements pressed');
      CustomAlertManager.alert('Announcements', 'No new announcements');
    },

    handleAddEvent: (navigation: any) => {
      console.log('Add event pressed');
      // For Nostr-only MVP, disable event creation temporarily
      CustomAlertManager.alert(
        'Create Event',
        'Event creation is being refined for the Nostr-only experience. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    handleAddChallenge: (navigation: any) => {
      console.log('Add challenge pressed');
      // For Nostr-only MVP, disable challenge creation temporarily
      CustomAlertManager.alert(
        'Create Challenge',
        'Challenge creation is being optimized for Nostr workflows. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    // Profile Screen Handlers
    handleCaptainDashboard: async (
      navigation: any,
      teamId?: string,
      teamName?: string
    ) => {
      try {
        console.log(
          '🎖️ NavigationHandlers: Captain dashboard access requested'
        );
        console.log('🎖️ NavigationHandlers: Parameters received:', {
          teamId,
          teamName,
          hasNavigation: !!navigation,
        });

        // Get current user from store
        const user = useUserStore.getState().user;
        if (!user) {
          console.error('❌ NavigationHandlers: No user in store');
          CustomAlertManager.alert(
            'Access Denied',
            'Please sign in to access the captain dashboard'
          );
          return;
        }

        console.log(
          '✅ NavigationHandlers: User found:',
          user.npub?.slice(0, 8) + '...'
        );

        // First check cached captain status
        let isCaptain = false;
        let captainTeamId = teamId;
        let captainTeamName = teamName;

        if (teamId) {
          // Check specific team
          const cachedStatus = await CaptainCache.getCaptainStatus(teamId);
          isCaptain = cachedStatus === true;
        } else {
          // Check if captain of any team
          const captainTeams = await CaptainCache.getCaptainTeams();
          if (captainTeams.length > 0) {
            isCaptain = true;
            captainTeamId = captainTeams[0]; // Use first team for now
          }
        }

        // If no cached data, try captain detection service
        if (!isCaptain) {
          const captainService = CaptainDetectionService.getInstance();
          const captainStatus = await captainService.getCaptainStatus(user.id);

          if (
            captainStatus.isCaptain &&
            captainStatus.captainOfTeams.length > 0
          ) {
            isCaptain = true;
            captainTeamId = captainStatus.captainOfTeams[0];
            // Cache for next time
            await CaptainCache.setCaptainStatus(captainTeamId, true);
          }
        }

        if (!isCaptain) {
          console.log(
            '❌ NavigationHandlers: User is not a captain of any team'
          );
          CustomAlertManager.alert(
            'Access Denied',
            'Only team captains can access the dashboard. Create a team to become a captain.'
          );
          return;
        }

        console.log(
          `✅ NavigationHandlers: Captain access granted for team ${captainTeamId}`
        );

        // Navigate to captain dashboard with team information
        console.log(
          '🚀 NavigationHandlers: Attempting navigation with params:',
          {
            teamId: captainTeamId,
            teamName: captainTeamName || 'Team',
            isCaptain: true,
            userNpub: user.npub,
          }
        );

        navigation.navigate('CaptainDashboard', {
          teamId: captainTeamId,
          teamName: captainTeamName || 'Team',
          isCaptain: true,
          userNpub: user.npub, // Pass userNpub for authentication
        });

        console.log('✅ NavigationHandlers: Navigation call completed');
      } catch (error) {
        console.error(
          '❌ NavigationHandlers: Error checking captain dashboard access:',
          error
        );
        CustomAlertManager.alert(
          'Error',
          'Unable to verify captain permissions. Please try again.'
        );
      }
    },

    handleNavigateToTeam: (teamId: string, navigation: any) => {
      console.log('NavigationHandlers: Direct navigation to team:', teamId);
      navigation.navigate('Clubs', { teamId, refresh: true });
    },

    // Onboarding Handlers
    handleOnboardingComplete: (
      data: {
        selectedTeam?: DiscoveryTeam;
        selectedRole?: 'member' | 'captain';
        authenticated?: boolean;
      },
      navigation: any
    ) => {
      console.log('🎯 handleOnboardingComplete called:', {
        hasTeam: !!data.selectedTeam,
        role: data.selectedRole,
        authenticated: data.authenticated,
      });

      // For Phase 2: Simplified flow goes directly to Profile screen
      console.log(
        '🎯 NavigationHandlers: Going to Profile screen after simplified onboarding'
      );
      navigation.navigate('Profile');
      console.log('🎯 NavigationHandlers: Profile navigation command sent');
    },

    handleOnboardingSkip: (navigation: any) => {
      console.log('User skipped onboarding');
      CustomAlertManager.alert(
        'Welcome to RUNSTR!',
        'You can join a team anytime from your profile.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Clubs') }]
      );
    },

    // Captain Dashboard Handlers
    handleSettings: () => {
      console.log('Settings pressed');
      CustomAlertManager.alert(
        'Team Settings',
        'Team settings are being enhanced for the Nostr experience. Basic team management is available through the team screen.',
        [{ text: 'OK' }]
      );
    },

    handleEditMember: (memberId: string) => {
      console.log('Edit member:', memberId);
      CustomAlertManager.alert('Edit Member', 'Member management coming soon!');
    },

    handleKickMember: (memberId: string) => {
      console.log('Kick member:', memberId);
      CustomAlertManager.alert(
        'Remove Member',
        'Are you sure you want to remove this member from the team?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => console.log('Member removed:', memberId),
          },
        ]
      );
    },

    handleEditLeague: () => {
      console.log('Edit league pressed');
      CustomAlertManager.alert(
        'Edit League',
        'League settings management coming soon!'
      );
    },

    handleDistributeRewards: (distributions: RewardDistribution[]) => {
      console.log(
        'Distribute rewards pressed with distributions:',
        distributions.length
      );
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
              // TODO: Implement actual reward distribution logic
              console.log('Processing reward distributions:', distributions);
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
      console.log('View wallet history pressed');
      // Transaction history is now integrated in the wallet modals
      // No navigation needed - wallet modals handle history display
    },

    handleViewAllActivity: () => {
      console.log('View all activity pressed');
      CustomAlertManager.alert(
        'Activity Feed',
        'Full activity feed view coming soon!'
      );
    },

    // Profile Screen Handlers
    handleEditProfile: () => {
      console.log('Edit profile pressed');
      CustomAlertManager.alert(
        'Edit Profile',
        'Profile editing functionality coming soon!'
      );
    },

    handleProfileSend: () => {
      console.log('Profile send pressed');
      CustomAlertManager.alert(
        'Send Bitcoin',
        'Enter recipient address or Lightning invoice.'
      );
    },

    handleProfileReceive: () => {
      console.log('Profile receive pressed');
      CustomAlertManager.alert(
        'Receive Bitcoin',
        'Your Lightning address:\nuser@runstr.app\n\nShare this with others to receive payments.'
      );
    },

    handleWalletSend: () => {
      console.log('Wallet send pressed from PersonalWalletSection');
      CustomAlertManager.alert(
        'Send NutZap',
        'Select a team member to send Bitcoin to via NutZap.',
        [{ text: 'OK' }]
      );
    },

    handleWalletReceive: () => {
      console.log('Wallet receive pressed from PersonalWalletSection');
      CustomAlertManager.alert(
        'Receive NutZap',
        'Share your Nostr npub to receive NutZaps.\n\nYour wallet auto-claims incoming payments.',
        [{ text: 'OK' }]
      );
    },

    handleWalletHistory: () => {
      console.log('Wallet history pressed from PersonalWalletSection');
      // Transaction history is handled in the modal, no navigation needed
      // Could open a history modal here if you want
    },

    handleSyncSourcePress: (provider: string) => {
      console.log('Sync source pressed:', provider);
      if (provider === 'nostr') {
        CustomAlertManager.alert(
          'Nostr Workout Sync',
          'Your Nostr workout sync is active! Workouts from your connected relays are automatically synced.',
          [{ text: 'OK' }]
        );
      } else if (provider === 'strava' || provider === 'googlefit') {
        CustomAlertManager.alert(
          `${provider} Sync`,
          `${provider} sync is not available in the Nostr-only MVP. Use Nostr 1301 workout notes instead.`,
          [{ text: 'OK' }]
        );
      } else {
        CustomAlertManager.alert(
          `${provider} Settings`,
          `Manage your ${provider} sync settings.`
        );
      }
    },

    handleManageSubscription: () => {
      console.log('Manage subscription pressed');
      CustomAlertManager.alert(
        'Subscription',
        'Manage your RUNSTR subscription in your device settings.'
      );
    },

    handleHelp: (navigation?: any) => {
      console.log('Help pressed');
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
      console.log('Contact support pressed');
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
      console.log('Privacy policy pressed');
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
      console.log('Sign out pressed');
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
                // Use AuthService to properly clear all auth state
                await AuthService.signOut();
                console.log('User signed out successfully');

                // Don't manually navigate - the App.tsx will detect auth state change
                // and automatically show the Login screen
                // If we're in a nested navigator, navigate to a root screen first
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
