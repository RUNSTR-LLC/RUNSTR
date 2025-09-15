/**
 * Navigation Handlers
 * Centralized navigation logic for RUNSTR app
 */

import { Alert } from 'react-native';
import { DiscoveryTeam, TeamCreationData } from '../types';
import { RewardDistribution } from '../types/teamWallet';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/auth/authService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { isTeamMember, isTeamCaptain } from '../utils/teamUtils';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { CaptainCache } from '../utils/captainCache';

export interface NavigationHandlers {
  handleTeamJoin: (
    team: DiscoveryTeam,
    navigation: any,
    refreshData?: () => Promise<void>
  ) => Promise<void>;
  handleTeamSelect: (team: DiscoveryTeam) => void;
  handleTeamView: (team: DiscoveryTeam, navigation: any, userNpub?: string) => Promise<void>;
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
  handleCaptainDashboard: (navigation: any) => void;
  handleTeamCreation: (navigation: any) => void;
  handleTeamCreationComplete: (
    teamData: TeamCreationData,
    navigation: any,
    teamId?: string
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
  handleInviteMember: () => void;
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
  handleSyncSourcePress: (provider: string) => void;
  handleManageSubscription: () => void;
  handleHelp: () => void;
  handleContactSupport: () => void;
  handlePrivacyPolicy: () => void;
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

        // Use NostrTeamService for pure Nostr joining (no Supabase)
        const nostrTeamService = getNostrTeamService();
        const cachedTeams = nostrTeamService.getCachedTeams();
        const nostrTeam = cachedTeams.find((t) => t.id === team.id);

        if (!nostrTeam) {
          Alert.alert('Error', 'Team not found. Please refresh and try again.');
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

          // Show success message
          Alert.alert(
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
                    currentUserNpub, // Pass the working npub to avoid component-level AsyncStorage corruption
                  });
                }
              }
            ]
          );
        } else {
          console.error('NavigationHandlers: Team join failed:', joinResult.error);
          Alert.alert(
            'Join Failed',
            joinResult.error || 'Unable to join team. Please try again.'
          );
        }
      } catch (error) {
        console.error(
          'NavigationHandlers: Unexpected error joining team:',
          error
        );
        Alert.alert(
          'Error',
          'An unexpected error occurred while joining the team'
        );
      }
    },

    handleTeamSelect: (team: DiscoveryTeam) => {
      console.log('User selected team for preview:', team.name);
      // TODO: Show team preview/details modal
      // For now, we'll use an alert as placeholder
      Alert.alert(
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

    handleTeamView: async (team: DiscoveryTeam, navigation: any, userNpub?: string) => {
      console.log(
        'NavigationHandlers: Navigating to team dashboard:',
        team.name
      );

      // Use passed userNpub (from working discovery page auth) instead of AsyncStorage lookups
      let currentUserNpub: string | undefined = userNpub;

      console.log('🔄 NavigationHandlers: User from passed parameter (same as working discovery):', {
        hasNpub: !!currentUserNpub,
        npubSlice: currentUserNpub?.slice(0, 20) + '...' || 'undefined',
      });

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
          console.error('❌ NavigationHandlers: Failed to get user from AuthService:', error);
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
          console.log(`✅ NavigationHandlers: Using cached captain status for ${team.name}: ${userIsCaptain}`);
        } else {
          // Fallback only if not cached
          userIsCaptain = isTeamCaptain(currentUserNpub, team);
          console.log(`⚠️ NavigationHandlers: No cached status, calculated: ${userIsCaptain}`);
          // Cache it for next time
          await CaptainCache.setCaptainStatus(team.id, userIsCaptain);
        }
      }

      // Member status includes both regular members and captains
      const userIsMember = calculatedUserIsMember || userIsCaptain;

      console.log('🎖️ NavigationHandlers: Team view navigation:', {
        teamName: team.name,
        userNpub: currentUserNpub?.slice(0, 8) + '...',
        teamCaptainId: 'captainId' in team ? team.captainId?.slice(0, 8) + '...' : 'N/A',
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
        Alert.alert(
          'Leave Team',
          'Team leaving functionality is being optimized for the Nostr experience. This feature will be available in the next update.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to team discovery
                navigation.navigate('Teams');
              }
            }
          ]
        );
      } catch (error) {
        console.error('NavigationHandlers: Error in handleLeaveTeam:', error);
        Alert.alert('Error', 'Unable to process team leave request');
      }
    },

    handleManageWallet: (navigation: any) => {
      console.log('Manage wallet pressed');
      // Navigate to profile wallet section for now
      navigation.navigate('Profile');
    },

    handleAnnouncements: () => {
      console.log('Announcements pressed');
      Alert.alert('Announcements', 'No new announcements');
    },

    handleAddEvent: (navigation: any) => {
      console.log('Add event pressed');
      // For Nostr-only MVP, disable event creation temporarily
      Alert.alert(
        'Create Event',
        'Event creation is being refined for the Nostr-only experience. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    handleAddChallenge: (navigation: any) => {
      console.log('Add challenge pressed');
      // For Nostr-only MVP, disable challenge creation temporarily
      Alert.alert(
        'Create Challenge',
        'Challenge creation is being optimized for Nostr workflows. Available in next update!',
        [{ text: 'OK' }]
      );
    },

    // Profile Screen Handlers
    handleCaptainDashboard: async (navigation: any, teamId?: string, teamName?: string) => {
      try {
        console.log('🎖️ NavigationHandlers: Captain dashboard access requested');

        // Get current user from store
        const user = useUserStore.getState().user;
        if (!user) {
          Alert.alert(
            'Access Denied',
            'Please sign in to access the captain dashboard'
          );
          return;
        }

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

          if (captainStatus.isCaptain && captainStatus.captainOfTeams.length > 0) {
            isCaptain = true;
            captainTeamId = captainStatus.captainOfTeams[0];
            // Cache for next time
            await CaptainCache.setCaptainStatus(captainTeamId, true);
          }
        }

        if (!isCaptain) {
          console.log('❌ NavigationHandlers: User is not a captain of any team');
          Alert.alert(
            'Access Denied',
            'Only team captains can access the dashboard. Create a team to become a captain.'
          );
          return;
        }

        console.log(`✅ NavigationHandlers: Captain access granted for team ${captainTeamId}`);

        // Navigate to captain dashboard with team information
        navigation.navigate('CaptainDashboard', {
          teamId: captainTeamId,
          teamName: captainTeamName || 'Team',
          isCaptain: true,
        });

      } catch (error) {
        console.error('❌ NavigationHandlers: Error checking captain dashboard access:', error);
        Alert.alert(
          'Error',
          'Unable to verify captain permissions. Please try again.'
        );
      }
    },

    handleTeamCreation: (navigation: any) => {
      console.log('Team creation pressed');
      navigation.navigate('TeamCreation');
    },

    handleTeamCreationComplete: async (
      teamData: TeamCreationData,
      navigation: any,
      teamId?: string
    ) => {
      console.log('Team creation completed:', teamData, 'teamId:', teamId);

      try {
        // Create the team on Nostr
        const nostrTeamService = getNostrTeamService();
        const user = useUserStore.getState().user;

        const createResult = await nostrTeamService.createTeam({
          name: teamData.teamName,
          description: teamData.teamAbout,
          activityTypes: ['fitness'], // Default for Phase 2
          isPublic: true, // Default to public teams
          captainId: user?.npub || user?.id,
        });

        if (createResult.success && createResult.teamId) {
          console.log(
            '✅ Nostr team created successfully:',
            createResult.teamId
          );

          // For Phase 2, we'll just navigate and let the team discovery handle the new team
          // In Phase 3, we can properly update the user store
          console.log('Team created with ID:', createResult.teamId);

          // Navigate to Team screen which will now show the user's team
          navigation.navigate('Team');
        } else {
          throw new Error(createResult.error || 'Failed to create team');
        }
      } catch (error) {
        console.error('❌ Failed to create Nostr team:', error);
        Alert.alert(
          'Team Creation Failed',
          `Failed to create team: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          [{ text: 'OK' }]
        );

        // Stay on current screen or go back
        navigation.goBack();
      }
    },

    handleNavigateToTeam: (teamId: string, navigation: any) => {
      console.log('NavigationHandlers: Direct navigation to team:', teamId);
      navigation.navigate('Team', { teamId, refresh: true });
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
      Alert.alert(
        'Welcome to RUNSTR!',
        'You can join a team anytime from your profile.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Team') }]
      );
    },

    // Captain Dashboard Handlers
    handleSettings: () => {
      console.log('Settings pressed');
      Alert.alert(
        'Team Settings',
        'Team settings are being enhanced for the Nostr experience. Basic team management is available through the team screen.',
        [{ text: 'OK' }]
      );
    },

    handleInviteMember: () => {
      console.log('Invite member pressed');
      Alert.alert(
        'Invite Member',
        'Invite functionality coming soon!\n\nFor now, share your team code with friends.'
      );
    },

    handleEditMember: (memberId: string) => {
      console.log('Edit member:', memberId);
      Alert.alert('Edit Member', 'Member management coming soon!');
    },

    handleKickMember: (memberId: string) => {
      console.log('Kick member:', memberId);
      Alert.alert(
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
      Alert.alert('Edit League', 'League settings management coming soon!');
    },

    handleDistributeRewards: (distributions: RewardDistribution[]) => {
      console.log(
        'Distribute rewards pressed with distributions:',
        distributions.length
      );
      Alert.alert(
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
              Alert.alert(
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
      Alert.alert(
        'Wallet History',
        'Full transaction history view coming soon!',
        [{ text: 'OK' }]
      );
    },

    handleViewAllActivity: () => {
      console.log('View all activity pressed');
      Alert.alert('Activity Feed', 'Full activity feed view coming soon!');
    },

    // Profile Screen Handlers
    handleEditProfile: () => {
      console.log('Edit profile pressed');
      Alert.alert('Edit Profile', 'Profile editing functionality coming soon!');
    },

    handleProfileSend: () => {
      console.log('Profile send pressed');
      Alert.alert(
        'Send Bitcoin',
        'Enter recipient address or Lightning invoice.'
      );
    },

    handleProfileReceive: () => {
      console.log('Profile receive pressed');
      Alert.alert(
        'Receive Bitcoin',
        'Your Lightning address:\nuser@runstr.app\n\nShare this with others to receive payments.'
      );
    },

    handleSyncSourcePress: (provider: string) => {
      console.log('Sync source pressed:', provider);
      if (provider === 'nostr') {
        Alert.alert(
          'Nostr Workout Sync',
          'Your Nostr workout sync is active! Workouts from your connected relays are automatically synced.',
          [{ text: 'OK' }]
        );
      } else if (provider === 'strava' || provider === 'googlefit') {
        Alert.alert(
          `${provider} Sync`,
          `${provider} sync is not available in the Nostr-only MVP. Use Nostr 1301 workout notes instead.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          `${provider} Settings`,
          `Manage your ${provider} sync settings.`
        );
      }
    },

    handleManageSubscription: () => {
      console.log('Manage subscription pressed');
      Alert.alert(
        'Subscription',
        'Manage your RUNSTR subscription in your device settings.'
      );
    },

    handleHelp: () => {
      console.log('Help pressed');
      Alert.alert(
        'Help & Support',
        'Visit runstr.app/help for documentation and tutorials.'
      );
    },

    handleContactSupport: () => {
      console.log('Contact support pressed');
      Alert.alert(
        'Contact Support',
        'Reach out to support@runstr.app for assistance.'
      );
    },

    handlePrivacyPolicy: () => {
      console.log('Privacy policy pressed');
      Alert.alert(
        'Privacy Policy',
        'View our privacy policy at runstr.app/privacy'
      );
    },

    handleSignOut: (navigation: any) => {
      console.log('Sign out pressed');
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Access the store directly
              const signOut = useUserStore.getState().signOut;
              await signOut();
              console.log('User signed out successfully');

              // Navigate back to onboarding or login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (error) {
              console.error('Error during sign out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]);
    },
  };
};
