/**
 * CaptainDashboardScreen - Team Captain Management Dashboard
 * Displays team overview, member management, quick actions, and activity feed
 * Integrates Event and League creation wizards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CHARITIES, getCharityById } from '../constants/charities';
import { validateShopUrl, getShopDisplayName, validateFlashUrl } from '../utils/validation';
import { theme } from '../styles/theme';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { ZappableUserRow } from '../components/ui/ZappableUserRow';
import { QuickActionsSection } from '../components/team/QuickActionsSection';
import { ActivityFeedSection } from '../components/team/ActivityFeedSection';
import { JoinRequestsSection } from '../components/team/JoinRequestsSection';
import { EventCreationWizard } from '../components/wizards/EventCreationWizard';
import { LeagueCreationWizard } from '../components/wizards/LeagueCreationWizard';
import { CompetitionParticipantsSection } from '../components/captain/CompetitionParticipantsSection';
import { CompetitionService } from '../services/competition/competitionService';
import { NostrListService } from '../services/nostr/NostrListService';
import { NostrProtocolHandler } from '../services/nostr/NostrProtocolHandler';
import { NostrRelayManager } from '../services/nostr/NostrRelayManager';
import { TeamMemberCache } from '../services/team/TeamMemberCache';
import { TeamCacheService } from '../services/cache/TeamCacheService';
import { getTeamListDetector } from '../utils/teamListDetector';
import NostrTeamCreationService from '../services/nostr/NostrTeamCreationService';
import { getAuthenticationData, migrateAuthenticationStorage } from '../utils/nostrAuth';
import { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';
import { npubToHex } from '../utils/ndkConversion';

// Type definitions for captain dashboard data
export interface CaptainDashboardData {
  team: {
    id: string;
    name: string;
    memberCount: number;
    activeEvents: number;
    activeChallenges: number;
    prizePool: number;
    shopUrl?: string;
  };
  members: {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    eventCount: number;
    inactiveDays?: number;
  }[];
  recentActivity: {
    id: string;
    type: 'join' | 'complete' | 'win' | 'fund' | 'announce';
    message: string;
    timestamp: string;
  }[];
}

interface CaptainDashboardScreenProps {
  data: CaptainDashboardData;
  captainId: string; // For member management
  teamId: string; // For member management
  userNpub?: string; // User's npub passed from navigation for fallback
  navigation?: any; // Navigation prop for re-authentication flow
  onNavigateToTeam: () => void;
  onNavigateToProfile: () => void;
  onSettingsPress: () => void;
  onKickMember: (memberId: string) => void;
  onViewAllActivity: () => void;
  // Wizard callbacks
  onEventCreated?: (eventData: any) => void;
  onLeagueCreated?: (leagueData: any) => void;
}

export const CaptainDashboardScreen: React.FC<CaptainDashboardScreenProps> = ({
  data,
  captainId,
  teamId,
  userNpub,
  navigation,
  onNavigateToTeam,
  onNavigateToProfile,
  onSettingsPress,
  onKickMember,
  onViewAllActivity,
  onEventCreated,
  onLeagueCreated,
}) => {
  // Wizard modal state
  const [eventWizardVisible, setEventWizardVisible] = useState(false);
  const [leagueWizardVisible, setLeagueWizardVisible] = useState(false);

  // Kind 30000 list state
  const [hasKind30000List, setHasKind30000List] = useState<boolean | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Member management state
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberNpub, setNewMemberNpub] = useState('');

  // Competition state
  const [activeCompetitions, setActiveCompetitions] = useState<any[]>([]);

  // Charity state - Initialize from team data
  const [selectedCharityId, setSelectedCharityId] = useState<string | undefined>(undefined);
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopUrl, setShopUrl] = useState<string>(data.team.shopUrl || '');
  const [shopUrlInput, setShopUrlInput] = useState<string>('');
  const [shopUrlError, setShopUrlError] = useState<string>('');
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [flashUrl, setFlashUrl] = useState<string>('');
  const [flashUrlInput, setFlashUrlInput] = useState<string>('');
  const [flashUrlError, setFlashUrlError] = useState<string>('');
  const [isSavingCharity, setIsSavingCharity] = useState(false);

  // Team editing state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [currentTeamData, setCurrentTeamData] = useState<any>(null);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [editedTeamDescription, setEditedTeamDescription] = useState('');
  const [editedTeamLocation, setEditedTeamLocation] = useState('');
  const [editedActivityTypes, setEditedActivityTypes] = useState('');
  const [editedBannerUrl, setEditedBannerUrl] = useState('');
  const [bannerUrlError, setBannerUrlError] = useState('');
  const [bannerPreviewLoading, setBannerPreviewLoading] = useState(false);

  // Check if team has kind 30000 list on mount and load members
  // Initialize team data on mount
  React.useEffect(() => {
    const initializeTeam = async () => {
      await loadActiveCompetitions();
      // Get the correct captain ID first
      const authData = await getAuthenticationData();
      let captainIdToUse = captainId;
      if (captainId?.startsWith('npub')) {
        const converted = npubToHex(captainId);
        captainIdToUse = converted || authData?.hexPubkey || captainId;
      } else if (!captainId && authData?.hexPubkey) {
        captainIdToUse = authData.hexPubkey;
      }

      // Clear stale cache on mount to ensure fresh data
      const memberCache = TeamMemberCache.getInstance();
      await memberCache.invalidateTeam(teamId, captainIdToUse);

      // Check for list
      await checkForKind30000List();

      // Load current charity from team data if available
      await loadTeamCharity();
    };

    initializeTeam();
  }, [teamId, captainId]);

  const loadActiveCompetitions = async () => {
    try {
      const competitionService = CompetitionService.getInstance();
      const allCompetitions = competitionService.getAllCompetitions();

      // Filter for this team's active competitions
      const teamCompetitions = allCompetitions.filter(comp => {
        const now = Date.now() / 1000;
        return comp.teamId === teamId && comp.endTime > now;
      });

      setActiveCompetitions(teamCompetitions);
    } catch (error) {
      console.error('Error loading competitions:', error);
    }
  };

  // Load members when list status changes to true
  React.useEffect(() => {
    if (hasKind30000List === true) {
      loadTeamMembers();
    }
  }, [hasKind30000List]);

  const checkForKind30000List = async () => {
    try {
      console.log(`🔍 [CaptainDashboard] Checking for kind 30000 list...`);
      console.log(`  Team ID: ${teamId}`);
      console.log(`  Captain ID (received): ${captainId?.slice(0, 20)}... (${captainId?.length} chars)`);
      console.log(`  Captain ID format: ${captainId?.startsWith('npub') ? 'npub' : captainId?.length === 64 ? 'hex' : 'other'}`);

      // Get the authenticated user's data to use as fallback
      const authData = await getAuthenticationData();
      console.log(`  Authenticated user's hex pubkey: ${authData?.hexPubkey?.slice(0, 20)}...`);

      // Determine the correct captain ID to use
      // If we have a hex captain ID, use it. Otherwise, fall back to authenticated user's hex pubkey
      let captainIdToUse = captainId;
      if (captainId?.startsWith('npub')) {
        console.log('  Captain ID is in npub format, converting to hex...');
        const converted = npubToHex(captainId);
        if (converted) {
          captainIdToUse = converted;
          console.log(`  Converted to hex: ${captainIdToUse.slice(0, 20)}...`);
        } else {
          console.log('  Conversion failed, using authenticated user hex pubkey');
          captainIdToUse = authData?.hexPubkey || captainId;
        }
      } else if (!captainId && authData?.hexPubkey) {
        console.log('  No captain ID provided, using authenticated user hex pubkey');
        captainIdToUse = authData.hexPubkey;
      }

      // Ensure we have a valid captain ID
      if (!captainIdToUse) {
        console.error('❌ [CaptainDashboard] No captain ID available');
        setHasKind30000List(false);
        return;
      }

      console.log(`  Final captain ID to use: ${captainIdToUse.slice(0, 20)}... (${captainIdToUse.length === 64 ? 'hex' : 'other'})`);

      const detector = getTeamListDetector();
      const haslist = await detector.hasKind30000List(teamId, captainIdToUse);
      console.log(`  Detector result: ${haslist}`);

      if (!haslist) {
        // Also check if there's a cached list locally
        console.log(`  No list found via detector, checking cache...`);
        const memberCache = TeamMemberCache.getInstance();
        const cachedMembers = await memberCache.getTeamMembers(teamId, captainIdToUse);
        if (cachedMembers && cachedMembers.length > 0) {
          console.log(`  ✅ Found ${cachedMembers.length} cached members for team ${teamId}`);
          setHasKind30000List(true);
          setTeamMembers(cachedMembers);
          return;
        }
        console.log(`  ❌ No cached members found`);
      }

      setHasKind30000List(haslist);
      console.log(`📊 [CaptainDashboard] Final result: Team ${teamId} has kind 30000 list: ${haslist}`);
    } catch (error) {
      console.error('❌ [CaptainDashboard] Error checking for kind 30000 list:', error);
      setHasKind30000List(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      console.log(`👥 [CaptainDashboard] Loading team members...`);
      console.log(`  Team ID: ${teamId}`);
      console.log(`  Captain ID (received): ${captainId?.slice(0, 20)}... (${captainId?.startsWith('npub') ? 'npub' : 'hex'})`);

      // Get the correct captain ID (same logic as checkForKind30000List)
      const authData = await getAuthenticationData();
      let captainIdToUse = captainId;
      if (captainId?.startsWith('npub')) {
        const converted = npubToHex(captainId);
        captainIdToUse = converted || authData?.hexPubkey || captainId;
      } else if (!captainId && authData?.hexPubkey) {
        captainIdToUse = authData.hexPubkey;
      }

      console.log(`  Using captain ID: ${captainIdToUse?.slice(0, 20)}... (${captainIdToUse?.length === 64 ? 'hex' : 'other'})`);

      setIsLoadingMembers(true);
      const memberCache = TeamMemberCache.getInstance();
      const members = await memberCache.getTeamMembers(teamId, captainIdToUse);

      console.log(`  ✅ Loaded ${members.length} members for team ${teamId}`);
      if (members.length > 0) {
        console.log(`  First member: ${members[0].slice(0, 20)}... (${members[0].startsWith('npub') ? 'npub' : 'hex'})`);
      }

      setTeamMembers(members);
    } catch (error) {
      console.error('❌ [CaptainDashboard] Error loading team members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Wizard handlers
  const handleShowEventWizard = async () => {
    // Check if team has kind 30000 list before allowing competition creation
    if (hasKind30000List === false) {
      Alert.alert(
        'Setup Required',
        'Create a team member list before starting competitions',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for existing active events
    try {
      const { NostrCompetitionService } = await import('../services/nostr/NostrCompetitionService');
      const activeCompetitions = await NostrCompetitionService.checkActiveCompetitions(teamId);
      if (activeCompetitions.activeEvents > 0) {
        Alert.alert(
          'Active Event Exists',
          `Your team already has an active event: "${activeCompetitions.activeEventDetails?.name}"\n\nScheduled for ${activeCompetitions.activeEventDetails?.eventDate}.\n\nOnly one event can be active at a time.`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Failed to check active competitions:', error);
    }

    setEventWizardVisible(true);
  };

  const handleShowLeagueWizard = async () => {
    // Check if team has kind 30000 list before allowing competition creation
    if (hasKind30000List === false) {
      Alert.alert(
        'Setup Required',
        'Create a team member list before starting competitions',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for existing active leagues
    try {
      const { NostrCompetitionService } = await import('../services/nostr/NostrCompetitionService');
      const activeCompetitions = await NostrCompetitionService.checkActiveCompetitions(teamId);
      if (activeCompetitions.activeLeagues > 0) {
        Alert.alert(
          'Active League Exists',
          `Your team already has an active league: "${activeCompetitions.activeLeagueDetails?.name}"\n\nEnds on ${activeCompetitions.activeLeagueDetails?.endDate}.\n\nOnly one league can be active at a time.`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Failed to check active competitions:', error);
    }

    setLeagueWizardVisible(true);
  };

  const handleEventCreated = (eventData: any) => {
    setEventWizardVisible(false);
    onEventCreated?.(eventData);
  };

  const handleLeagueCreated = (leagueData: any) => {
    setLeagueWizardVisible(false);
    onLeagueCreated?.(leagueData);
  };

  // Load team's current data including charity selection
  const loadTeamCharity = async () => {
    try {
      // Get team data from Nostr
      const { getNostrTeamService } = await import('../services/nostr/NostrTeamService');
      const teamService = getNostrTeamService();
      const teams = await teamService.discoverFitnessTeams();
      const currentTeam = teams.find(t => t.id === teamId);

      if (currentTeam) {
        // Debug logging to trace banner data
        console.log('📦 Loaded team data:', {
          id: currentTeam.id,
          name: currentTeam.name,
          bannerFromTeam: currentTeam.bannerImage,
          hasNostrEvent: !!currentTeam.nostrEvent,
          tags: currentTeam.nostrEvent?.tags?.filter((tag: any) => tag[0] === 'banner' || tag[0] === 'image')
        });

        // Store full team data for editing
        setCurrentTeamData(currentTeam);

        // Set charity if exists
        if (currentTeam.charityId) {
          console.log('📖 Loaded team charity:', currentTeam.charityId);
          setSelectedCharityId(currentTeam.charityId);
        }

        // Set shop URL if exists
        if (currentTeam.shopUrl) {
          console.log('🛍️ Loaded team shop URL:', currentTeam.shopUrl);
          setShopUrl(currentTeam.shopUrl);
        }

        // Set Flash URL if exists
        if (currentTeam.flashUrl) {
          console.log('⚡ Loaded team Flash URL:', currentTeam.flashUrl);
          setFlashUrl(currentTeam.flashUrl);
        }

        // Extract banner URL with fallback to Nostr event tags
        let bannerUrl = currentTeam.bannerImage;
        if (!bannerUrl && currentTeam.nostrEvent?.tags) {
          const bannerTag = currentTeam.nostrEvent.tags.find((tag: any) => tag[0] === 'banner' || tag[0] === 'image');
          bannerUrl = bannerTag?.[1] || '';
          console.log('🖼️ Banner extracted from tags:', bannerUrl);
        }

        // Pre-populate edit form fields
        setEditedTeamName(currentTeam.name || '');
        setEditedTeamDescription(currentTeam.description || '');
        setEditedTeamLocation(currentTeam.location || '');
        setEditedActivityTypes(currentTeam.tags?.join(', ') || '');
        setEditedBannerUrl(bannerUrl || '');

        console.log('🖼️ Banner URL set to:', bannerUrl || 'none');
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  // Update team information (name, description, location, activity types)
  const updateTeamInformation = async () => {
    try {
      setIsSavingTeam(true);

      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required to update team');
        return;
      }

      // Get global NDK instance
      const g = globalThis as any;
      const ndk = g.__RUNSTR_NDK_INSTANCE__;

      if (!ndk) {
        Alert.alert('Error', 'Unable to connect to Nostr network');
        return;
      }

      // Create signer
      const signer = new NDKPrivateKeySigner(authData.nsec);

      // Create updated team event
      const teamEvent = new NDKEvent(ndk);
      teamEvent.kind = 33404;

      // Build tags with updated team information
      const tags: string[][] = [
        ['d', teamId],
        ['name', editedTeamName.trim()],
        ['about', editedTeamName.trim()], // Using name for about tag as per existing pattern
        ['captain', authData.hexPubkey],
      ];

      // Add location if provided
      if (editedTeamLocation.trim()) {
        tags.push(['location', editedTeamLocation.trim()]);
      }

      // Parse and add activity type tags
      if (editedActivityTypes.trim()) {
        const activities = editedActivityTypes.split(',').map(a => a.trim()).filter(a => a);
        activities.forEach((activity) => {
          tags.push(['t', activity.toLowerCase()]);
        });
      }

      // Always add base tags
      tags.push(['t', 'team']);
      tags.push(['t', 'fitness']);
      tags.push(['t', 'runstr']);

      // Preserve charity if exists
      if (currentTeamData?.charityId || selectedCharityId) {
        const charity = selectedCharityId || currentTeamData?.charityId;
        if (charity && charity !== 'none') {
          tags.push(['charity', charity]);
        }
      }

      // Preserve shop URL if exists
      if (currentTeamData?.shopUrl || shopUrl) {
        const shop = shopUrl || currentTeamData?.shopUrl;
        if (shop) {
          tags.push(['shop', shop]);
        }
      }

      // Preserve Flash URL if exists
      if (currentTeamData?.flashUrl || flashUrl) {
        const flash = flashUrl || currentTeamData?.flashUrl;
        if (flash) {
          tags.push(['flash', flash]);
        }
      }

      // Add banner URL if provided
      if (editedBannerUrl.trim()) {
        tags.push(['banner', editedBannerUrl.trim()]);
      } else if (currentTeamData?.bannerImage) {
        // Preserve existing banner if not edited
        tags.push(['banner', currentTeamData.bannerImage]);
      }

      // Preserve member tags
      if (currentTeamData?.nostrEvent?.tags) {
        const memberTags = currentTeamData.nostrEvent.tags.filter(
          (tag: string[]) => tag[0] === 'member'
        );
        memberTags.forEach((tag: string[]) => tags.push(tag));
      }

      teamEvent.tags = tags;

      // Use the edited description for content
      teamEvent.content = editedTeamDescription.trim();

      teamEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign and publish
      await teamEvent.sign(signer);
      const publishResult = await teamEvent.publish();

      if (publishResult) {
        setShowEditTeamModal(false);

        // Clear cache after a delay to allow relay propagation
        setTimeout(async () => {
          console.log('🔄 Clearing cache after 3-second relay propagation delay...');
          const teamCache = TeamCacheService.getInstance();
          await teamCache.clearCache();

          // Reload team data with fresh cache
          await loadTeamCharity();
          console.log('✅ Team data reloaded with fresh cache');
        }, 3000);

        Alert.alert(
          'Success',
          'Team information updated successfully!',
          [
            {
              text: 'View Team',
              onPress: async () => {
                // Reload team data
                await loadTeamCharity();

                // Navigate to the team page with updated data
                if (currentTeamData && navigation) {
                  // Ensure we have the latest banner URL
                  const updatedBannerUrl = editedBannerUrl.trim();
                  console.log('🎯 Navigating with banner URL:', updatedBannerUrl || 'none');

                  navigation.navigate('EnhancedTeamScreen', {
                    team: {
                      ...currentTeamData,
                      name: editedTeamName.trim(),
                      description: editedTeamDescription.trim(),
                      location: editedTeamLocation.trim(),
                      bannerImage: updatedBannerUrl,
                      // Include nostrEvent for fallback banner extraction
                      nostrEvent: currentTeamData.nostrEvent,
                    },
                    userIsMember: true,
                    userIsCaptain: true,
                    currentUserNpub: userNpub,
                  });
                }
              }
            }
          ]
        );

        // Also reload team data in background
        setTimeout(() => {
          loadTeamCharity();
        }, 2000);
      } else {
        throw new Error('Failed to publish update');
      }

    } catch (error) {
      console.error('Error updating team information:', error);
      Alert.alert('Error', 'Failed to update team information. Please try again.');
    } finally {
      setIsSavingTeam(false);
    }
  };

  // Save charity selection to team's Nostr event
  const saveCharitySelection = async () => {
    try {
      setIsSavingCharity(true);

      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required to update team');
        return;
      }

      // Get global NDK instance
      const g = globalThis as any;
      const ndk = g.__RUNSTR_NDK_INSTANCE__;

      if (!ndk) {
        Alert.alert('Error', 'Unable to connect to Nostr network');
        return;
      }

      // Create signer
      const signer = new NDKPrivateKeySigner(authData.nsec);

      // Create updated team event
      const teamEvent = new NDKEvent(ndk);
      teamEvent.kind = 33404;

      // Build tags preserving existing team data
      const tags: string[][] = [
        ['d', teamId],
        ['name', currentTeamData?.name || data.team.name],
        ['about', currentTeamData?.name || data.team.name],
        ['captain', authData.hexPubkey],
      ];

      // Preserve location if exists
      if (currentTeamData?.location) {
        tags.push(['location', currentTeamData.location]);
      }

      // Preserve activity tags (filter out base tags to avoid duplication)
      const baseTags = ['team', 'fitness', 'runstr'];
      if (currentTeamData?.tags && currentTeamData.tags.length > 0) {
        const activityTags = currentTeamData.tags.filter((tag: string) =>
          !baseTags.includes(tag.toLowerCase())
        );
        activityTags.forEach((tag: string) => {
          tags.push(['t', tag.toLowerCase()]);
        });
      }

      // Always add base tags (only once)
      tags.push(['t', 'team']);
      tags.push(['t', 'fitness']);
      tags.push(['t', 'runstr']);

      // Add/update charity tag
      if (selectedCharityId && selectedCharityId !== 'none') {
        tags.push(['charity', selectedCharityId]);
      }

      // Add/update shop URL tag
      if (shopUrl) {
        tags.push(['shop', shopUrl]);
      }

      // Add/update Flash URL tag
      if (flashUrl) {
        tags.push(['flash', flashUrl]);
      }

      // Preserve member tags
      if (currentTeamData?.nostrEvent?.tags) {
        const memberTags = currentTeamData.nostrEvent.tags.filter(
          (tag: string[]) => tag[0] === 'member'
        );
        memberTags.forEach((tag: string[]) => tags.push(tag));
      }

      teamEvent.tags = tags;

      // Use actual team description from current team data, NEVER JSON
      teamEvent.content = currentTeamData?.description || '';

      teamEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign and publish
      await teamEvent.sign(signer);
      const publishResult = await teamEvent.publish();

      if (publishResult) {
        setShowCharityModal(false);

        // Clear cache after a delay to allow relay propagation
        setTimeout(async () => {
          console.log('🔄 Clearing cache after 3-second relay propagation delay...');
          const teamCache = TeamCacheService.getInstance();
          await teamCache.clearCache();

          // Reload team data with fresh cache
          await loadTeamCharity();
          console.log('✅ Team data reloaded with fresh cache');
        }, 3000);

        Alert.alert('Success', 'Team charity updated successfully! It may take a moment to appear.');

        // Reload team data after a delay
        setTimeout(() => {
          loadTeamCharity();
        }, 2000);
      } else {
        throw new Error('Failed to publish update');
      }

    } catch (error) {
      console.error('Error saving charity selection:', error);
      Alert.alert('Error', 'Failed to update team charity. Please try again.');
    } finally {
      setIsSavingCharity(false);
    }
  };

  // Save shop URL to team's Nostr event
  const handleUpdateTeamShopUrl = async (newShopUrl: string) => {
    try {
      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required to update team');
        return;
      }

      // Get global NDK instance
      const g = globalThis as any;
      const ndk = g.__RUNSTR_NDK_INSTANCE__;

      if (!ndk) {
        Alert.alert('Error', 'Unable to connect to Nostr network');
        return;
      }

      // Create signer
      const signer = new NDKPrivateKeySigner(authData.nsec);

      // Create updated team event
      const teamEvent = new NDKEvent(ndk);
      teamEvent.kind = 33404;

      // Build tags preserving existing team data
      const tags: string[][] = [
        ['d', teamId],
        ['name', currentTeamData?.name || data.team.name],
        ['about', currentTeamData?.description || data.team.name],
        ['captain', authData.hexPubkey],
      ];

      // Preserve existing tags
      if (currentTeamData?.location) {
        tags.push(['location', currentTeamData.location]);
      }

      // Preserve activity tags (filter out base tags to avoid duplication)
      const baseTagsShop = ['team', 'fitness', 'runstr'];
      if (currentTeamData?.tags && currentTeamData.tags.length > 0) {
        const activityTags = currentTeamData.tags.filter((tag: string) =>
          !baseTagsShop.includes(tag.toLowerCase())
        );
        activityTags.forEach((tag: string) => {
          tags.push(['t', tag.toLowerCase()]);
        });
      }

      // Always add base tags (only once)
      tags.push(['t', 'team']);
      tags.push(['t', 'fitness']);
      tags.push(['t', 'runstr']);

      // Add charity if exists
      if (selectedCharityId && selectedCharityId !== 'none') {
        tags.push(['charity', selectedCharityId]);
      }

      // Add shop URL if provided
      if (newShopUrl) {
        tags.push(['shop', newShopUrl]);
      }

      // Preserve member tags
      if (currentTeamData?.nostrEvent?.tags) {
        const memberTags = currentTeamData.nostrEvent.tags.filter(
          (tag: string[]) => tag[0] === 'member'
        );
        memberTags.forEach((tag: string[]) => tags.push(tag));
      }

      teamEvent.tags = tags;
      await teamEvent.sign(signer);
      await teamEvent.publish();

      console.log('✅ Team shop URL updated successfully');
    } catch (error) {
      console.error('Error updating team shop URL:', error);
      Alert.alert('Error', 'Failed to update team shop URL');
    }
  };

  // Save Flash URL to team's Nostr event
  const handleUpdateTeamFlashUrl = async (newFlashUrl: string) => {
    try {
      // Get auth data for signing
      const authData = await getAuthenticationData();
      if (!authData?.nsec) {
        Alert.alert('Error', 'Authentication required to update team');
        return;
      }

      // Get global NDK instance
      const g = globalThis as any;
      const ndk = g.__RUNSTR_NDK_INSTANCE__;

      if (!ndk) {
        Alert.alert('Error', 'Unable to connect to Nostr network');
        return;
      }

      // Create signer
      const signer = new NDKPrivateKeySigner(authData.nsec);

      // Create updated team event
      const teamEvent = new NDKEvent(ndk);
      teamEvent.kind = 33404;

      // Build tags preserving existing team data
      const tags: string[][] = [
        ['d', teamId],
        ['name', currentTeamData?.name || data.team.name],
        ['about', currentTeamData?.description || data.team.name],
        ['captain', authData.hexPubkey],
      ];

      // Preserve existing tags
      if (currentTeamData?.location) {
        tags.push(['location', currentTeamData.location]);
      }

      // Preserve activity tags (filter out base tags to avoid duplication)
      const baseTagsFlash = ['team', 'fitness', 'runstr'];
      if (currentTeamData?.tags && currentTeamData.tags.length > 0) {
        const activityTags = currentTeamData.tags.filter((tag: string) =>
          !baseTagsFlash.includes(tag.toLowerCase())
        );
        activityTags.forEach((tag: string) => {
          tags.push(['t', tag.toLowerCase()]);
        });
      }

      // Always add base tags (only once)
      tags.push(['t', 'team']);
      tags.push(['t', 'fitness']);
      tags.push(['t', 'runstr']);

      // Add charity if exists
      if (selectedCharityId && selectedCharityId !== 'none') {
        tags.push(['charity', selectedCharityId]);
      }

      // Add shop URL if exists
      if (shopUrl) {
        tags.push(['shop', shopUrl]);
      }

      // Add Flash URL if provided
      if (newFlashUrl) {
        tags.push(['flash', newFlashUrl]);
      }

      // Preserve member tags
      if (currentTeamData?.nostrEvent?.tags) {
        const memberTags = currentTeamData.nostrEvent.tags.filter(
          (tag: string[]) => tag[0] === 'member'
        );
        memberTags.forEach((tag: string[]) => tags.push(tag));
      }

      teamEvent.tags = tags;
      teamEvent.content = currentTeamData?.description || '';
      await teamEvent.sign(signer);
      await teamEvent.publish();

      console.log('✅ Team Flash URL updated successfully');
    } catch (error) {
      console.error('Error updating team Flash URL:', error);
      Alert.alert('Error', 'Failed to update team Flash URL');
    }
  };

  const handleCloseEventWizard = () => {
    setEventWizardVisible(false);
  };

  const handleCloseLeagueWizard = () => {
    setLeagueWizardVisible(false);
  };

  // Handle creating kind 30000 list for existing team
  const handleCreateMemberList = async () => {
    setIsCreatingList(true);

    try {
      console.log('[Captain] Starting member list creation...');

      // Get the correct captain ID first
      const authData = await getAuthenticationData();
      let captainIdToUse = captainId;
      if (captainId?.startsWith('npub')) {
        const converted = npubToHex(captainId);
        captainIdToUse = converted || authData?.hexPubkey || captainId;
      } else if (!captainId && authData?.hexPubkey) {
        captainIdToUse = authData.hexPubkey;
      }

      console.log('[Captain] Using captain ID:', captainIdToUse?.slice(0, 20) + '...');

      // Clear any stale cache first
      const memberCache = TeamMemberCache.getInstance();
      await memberCache.invalidateTeam(teamId, captainIdToUse);

      // Debug authentication storage first
      const { debugAuthStorage, recoverAuthentication } = await import('../utils/authDebug');
      await debugAuthStorage();

      // Get authentication data using the new unified system (reuse authData from above)
      if (!authData) {
        authData = await getAuthenticationData();
      }

      // If retrieval failed, try recovery and migration
      if (!authData) {
        console.log('[Captain] Auth not found, attempting recovery...');
        const recovered = await recoverAuthentication();

        if (recovered.nsec && recovered.npub) {
          // Re-store the recovered authentication properly
          const { storeAuthenticationData } = await import('../utils/nostrAuth');
          const stored = await storeAuthenticationData(recovered.nsec, recovered.npub);

          if (stored) {
            console.log('[Captain] Recovery successful, retrying auth retrieval...');
            authData = await getAuthenticationData();
          }
        } else if (userNpub || captainId) {
          console.log('[Captain] Recovery failed, attempting migration...');

          // Determine the userId for migration
          const userId = captainId?.startsWith('npub') ? captainId : userNpub || captainId;

          // Try to migrate with available data
          const migrated = await migrateAuthenticationStorage(
            userNpub || captainId,
            userId
          );

          if (migrated) {
            console.log('[Captain] Migration successful, retrying auth retrieval...');
            authData = await getAuthenticationData();
          }
        }
      }

      if (!authData) {
        console.error('[Captain] Authentication retrieval failed completely');

        // Provide helpful error with recovery options
        Alert.alert(
          'Authentication Required',
          'Your authentication data could not be retrieved. This can happen if you logged in on a different device or if your session expired.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Re-authenticate',
              onPress: () => {
                // Navigate to login
                if (navigation) {
                  navigation.navigate('Login');
                } else {
                  onNavigateToProfile(); // Fallback to profile if no navigation
                }
              },
            },
          ]
        );

        setIsCreatingList(false);
        return;
      }

      console.log('[Captain] ✅ Authentication retrieved successfully');
      console.log('[Captain] Using user npub:', authData.npub.slice(0, 20) + '...');
      console.log('[Captain] Using user hex pubkey:', authData.hexPubkey.slice(0, 20) + '...');

      // Check if user is actually the captain
      if (authData.hexPubkey !== captainId) {
        console.error('[Captain] User is not the captain of this team!');
        console.error(`  User hex: ${authData.hexPubkey}`);
        console.error(`  Captain hex: ${captainId}`);
        Alert.alert('Error', 'You are not the captain of this team');
        setIsCreatingList(false);
        return;
      }

      console.log('[Captain] User confirmed as captain, proceeding with list creation...');

      // Convert nsec to hex private key
      const signer = new NDKPrivateKeySigner(authData.nsec);
      const privateKeyHex = signer.privateKey; // Access as property

      if (!privateKeyHex) {
        throw new Error('Failed to extract private key from nsec');
      }

      // Create kind 30000 list for this team
      // Use the user's hex pubkey (which should match captain ID)
      const result = await NostrTeamCreationService.createMemberListForExistingTeam(
        teamId,
        data.team.name,
        authData.hexPubkey, // Use the user's hex pubkey for the list author
        privateKeyHex // Pass hex private key
      );

      if (result.success) {
        setHasKind30000List(true);
        // Reload members after creating the list
        await loadTeamMembers();
        Alert.alert(
          'Success',
          'Team member list created! You can now run competitions and manage members.'
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create member list');
      }
    } catch (error) {
      console.error('Error creating member list:', error);
      Alert.alert('Error', 'Failed to create member list. Please try again.');
    } finally {
      setIsCreatingList(false);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (memberPubkey: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current member list
              const listService = NostrListService.getInstance();
              const memberListDTag = `${teamId}-members`;
              const currentList = await listService.getList(captainId, memberListDTag);

              if (!currentList) {
                throw new Error('Team member list not found');
              }

              // Prepare the updated list event
              const eventTemplate = listService.prepareRemoveMember(
                captainId,
                memberListDTag,
                memberPubkey,
                currentList
              );

              if (!eventTemplate) {
                console.log('Member not in list');
                return;
              }

              // Get captain's authentication using the unified system
              const authData = await getAuthenticationData();

              if (!authData) {
                console.error('[Captain] No authentication data for member removal');
                throw new Error('Captain credentials not found. Please log in again.');
              }

              console.log('[Captain] Using nsec directly for member removal');

              // Convert nsec to hex private key for signing
              const signer = new NDKPrivateKeySigner(authData.nsec);
              const privateKeyHex = signer.privateKey; // Access as property, not method

              if (!privateKeyHex) {
                throw new Error('Failed to extract private key');
              }

              // Sign and publish the updated list
              const protocolHandler = new NostrProtocolHandler();
              const relayManager = new NostrRelayManager();

              const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKeyHex);
              const publishResult = await relayManager.publishEvent(signedEvent);

              if (publishResult.successful && publishResult.successful.length > 0) {
                console.log(`✅ Removed member from team list: ${memberPubkey}`);

                // Update cache
                const listId = `${captainId}:${memberListDTag}`;
                const updatedMembers = currentList.members.filter(m => m !== memberPubkey);
                listService.updateCachedList(listId, updatedMembers);

                // Update local state
                setTeamMembers(prevMembers => prevMembers.filter(m => m !== memberPubkey));

                // Invalidate team member cache to force refresh
                const memberCache = TeamMemberCache.getInstance();
                memberCache.invalidateTeam(teamId, captainId);

                Alert.alert('Success', 'Member has been removed from the team');
              } else {
                throw new Error('Failed to publish updated member list');
              }
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Add member to team
  const handleAddMember = async () => {
    if (!newMemberNpub.trim()) {
      Alert.alert('Error', 'Please enter a member npub or hex pubkey');
      return;
    }

    try {
      // Get authentication data
      const authData = await getAuthenticationData();
      if (!authData) {
        Alert.alert('Authentication Required', 'Please re-authenticate to add members.');
        return;
      }

      // Get current members
      const listService = NostrListService.getInstance();
      const memberListDTag = `${teamId}-members`;
      const currentList = await listService.getList(captainId, memberListDTag);

      if (!currentList) {
        Alert.alert('Error', 'Member list not found. Please create a member list first.');
        return;
      }

      // Check if member already exists
      if (currentList.members.includes(newMemberNpub)) {
        Alert.alert('Info', 'This member is already part of the team');
        return;
      }

      // Prepare event template to add member
      const eventTemplate = listService.prepareAddMember(
        captainId,
        memberListDTag,
        newMemberNpub,
        currentList
      );

      if (!eventTemplate) {
        Alert.alert('Info', 'Failed to prepare member addition');
        return;
      }

      // Convert nsec to hex private key for signing
      const signer = new NDKPrivateKeySigner(authData.nsec);
      const privateKeyHex = signer.privateKey; // Access as property, not method

      if (!privateKeyHex) {
        throw new Error('Failed to extract private key');
      }

      // Sign and publish the updated list
      const protocolHandler = new NostrProtocolHandler();
      const relayManager = new NostrRelayManager();

      const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKeyHex);
      const publishResult = await relayManager.publishEvent(signedEvent);

      if (publishResult.successful && publishResult.successful.length > 0) {
        // Update local state
        setTeamMembers([...teamMembers, newMemberNpub]);
        setNewMemberNpub('');
        setShowAddMemberModal(false);

        // Invalidate cache
        const memberCache = TeamMemberCache.getInstance();
        memberCache.invalidateTeam(teamId, captainId);

        Alert.alert('Success', 'Member added to the team successfully');
      } else {
        throw new Error('Failed to publish member list update');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      Alert.alert('Error', 'Failed to add member. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}

      {/* Show banner if team doesn't have kind 30000 list */}
      {/* Only show setup banner when truly no list AND no cached members */}
      {hasKind30000List === false && teamMembers.length === 0 && (
        <View style={styles.listWarningBanner}>
          <Text style={styles.listWarningTitle}>⚠️ Team Setup Required</Text>
          <Text style={styles.listWarningText}>
            Your team needs a member list to run competitions
          </Text>
          <TouchableOpacity
            style={[styles.createListButton, ...(isCreatingList ? [styles.createListButtonDisabled] : [])]}
            onPress={handleCreateMemberList}
            disabled={isCreatingList}
          >
            <Text style={styles.createListButtonText}>
              {isCreatingList ? 'Creating...' : 'Create Member List'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onNavigateToTeam}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.captainBadge}>
            <Text style={styles.captainBadgeText}>CAPTAIN</Text>
          </View>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Team Management Section */}
        <View style={styles.managementSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            {/* Show Add Member button if list exists OR if members are loaded */}
            {(hasKind30000List === true || teamMembers.length > 0) && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => setShowAddMemberModal(true)}
              >
                <Text style={styles.addMemberButtonText}>+ Add Member</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingMembers ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading members...</Text>
              </View>
            ) : teamMembers.length > 0 ? (
              teamMembers.map((memberPubkey, index) => (
                <View key={memberPubkey} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <ZappableUserRow
                      npub={memberPubkey}
                      fallbackName={index === 0 ? 'Captain' : `Member ${index}`}
                      additionalContent={
                        <Text style={styles.memberStatus}>
                          {index === 0 ? 'Captain' : 'Member'}
                        </Text>
                      }
                      showQuickZap={false}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <View style={styles.memberActions}>
                    {index !== 0 && ( // Don't allow removing the captain
                      <TouchableOpacity
                        style={styles.miniBtn}
                        onPress={() => handleRemoveMember(memberPubkey)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.miniBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : data.members && data.members.length > 0 ? (
              // Fallback to data.members if teamMembers not loaded
              data.members.slice(0, 4).map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberStatus}>
                        {member.status === 'active'
                          ? `Active • ${member.eventCount} events`
                          : `Inactive • ${member.inactiveDays} days`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.miniBtn}
                      onPress={() => handleRemoveMember(member.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.miniBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No team members yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Team Charity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Charity</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setShowCharityModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>
                {selectedCharityId ? 'Change' : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            {selectedCharityId ? (
              <View style={styles.charityInfo}>
                <Text style={styles.charityName}>
                  {getCharityById(selectedCharityId)?.name}
                </Text>
                <Text style={styles.charityDescription}>
                  {getCharityById(selectedCharityId)?.description}
                </Text>
                <Text style={styles.charityAddress}>
                  Lightning: {getCharityById(selectedCharityId)?.lightningAddress}
                </Text>
              </View>
            ) : (
              <Text style={styles.noCharityText}>
                No charity selected. Tap "Select" to choose a charity for your team to support.
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <QuickActionsSection
          onCreateEvent={handleShowEventWizard}
          onCreateLeague={handleShowLeagueWizard}
          onEditTeam={() => setShowEditTeamModal(true)}
          onManageFlash={() => setShowFlashModal(true)}
        />

        {/* Join Requests */}
        <JoinRequestsSection
          teamId={data.team.id}
          captainPubkey={captainId}
          onMemberApproved={(requesterPubkey) => {
            // Handle member approval - could refresh member list
            console.log('Member approved:', requesterPubkey);
          }}
        />

        {/* Competition Participants Management */}
        {activeCompetitions.filter(comp => comp.requireApproval).map(competition => (
          <CompetitionParticipantsSection
            key={competition.id}
            competitionId={competition.id}
            competitionName={competition.name}
            requireApproval={competition.requireApproval}
            onParticipantUpdate={loadActiveCompetitions}
          />
        ))}

        {/* Recent Activity */}
        <ActivityFeedSection
          activities={data.recentActivity}
          onViewAllActivity={onViewAllActivity}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeScreen="team"
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Team Edit Modal */}
      <Modal
        visible={showEditTeamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Team Information</Text>

            <Text style={styles.inputLabel}>Team Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter team name"
              placeholderTextColor={theme.colors.secondary}
              value={editedTeamName}
              onChangeText={setEditedTeamName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textAreaInput]}
              placeholder="Enter team description"
              placeholderTextColor={theme.colors.secondary}
              value={editedTeamDescription}
              onChangeText={setEditedTeamDescription}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Location (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., San Francisco, CA"
              placeholderTextColor={theme.colors.secondary}
              value={editedTeamLocation}
              onChangeText={setEditedTeamLocation}
            />

            <Text style={styles.inputLabel}>Activity Types (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., running, cycling, swimming"
              placeholderTextColor={theme.colors.secondary}
              value={editedActivityTypes}
              onChangeText={setEditedActivityTypes}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Separate multiple activities with commas</Text>

            <Text style={styles.inputLabel}>Banner Image URL (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://example.com/team-banner.jpg"
              placeholderTextColor={theme.colors.secondary}
              value={editedBannerUrl}
              onChangeText={(text) => {
                setEditedBannerUrl(text);
                setBannerUrlError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {bannerUrlError ? (
              <Text style={styles.errorText}>{bannerUrlError}</Text>
            ) : editedBannerUrl ? (
              <Text style={styles.helperText}>Enter image URL (JPEG, PNG, WebP)</Text>
            ) : null}

            {/* Banner Image Preview */}
            {editedBannerUrl && !bannerUrlError && (
              <View style={styles.imagePreviewContainer}>
                {bannerPreviewLoading && (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                )}
                <Image
                  source={{ uri: editedBannerUrl }}
                  style={styles.imagePreview}
                  onLoadStart={() => setBannerPreviewLoading(true)}
                  onLoadEnd={() => setBannerPreviewLoading(false)}
                  onError={() => {
                    setBannerPreviewLoading(false);
                    setBannerUrlError('Unable to load image from URL');
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditTeamModal(false);
                  // Reset to original values
                  if (currentTeamData) {
                    setEditedTeamName(currentTeamData.name || '');
                    setEditedTeamDescription(currentTeamData.description || '');
                    setEditedTeamLocation(currentTeamData.location || '');
                    setEditedActivityTypes(currentTeamData.tags?.join(', ') || '');
                    setEditedBannerUrl(currentTeamData.bannerImage || '');
                    setBannerUrlError('');
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  await updateTeamInformation();
                }}
                disabled={isSavingTeam || !editedTeamName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {isSavingTeam ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Charity Selection Modal */}
      <Modal
        visible={showCharityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCharityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Team Charity</Text>
            <Text style={styles.modalDescription}>
              Choose a charity that your team will support. Members can zap the charity directly from your team page.
            </Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCharityId || 'none'}
                onValueChange={(value) => setSelectedCharityId(value === 'none' ? undefined : value)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="No charity selected" value="none" />
                {CHARITIES.map(charity => (
                  <Picker.Item
                    key={charity.id}
                    label={charity.name}
                    value={charity.id}
                  />
                ))}
              </Picker>
            </View>

            {selectedCharityId && (
              <Text style={styles.selectedCharityDescription}>
                {getCharityById(selectedCharityId)?.description}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCharityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  await saveCharitySelection();
                }}
                disabled={isSavingCharity}
              >
                <Text style={styles.saveButtonText}>{isSavingCharity ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flash Subscription Modal */}
      <Modal
        visible={showFlashModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFlashModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Flash Subscription URL</Text>
            <Text style={styles.modalDescription}>
              Add a Flash subscription URL to enable recurring Bitcoin payments from your supporters.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                flashUrlError && styles.modalInputError
              ]}
              placeholder="https://app.paywithflash.com/subscription-page?flashId=1872"
              placeholderTextColor={theme.colors.secondary}
              value={flashUrlInput}
              onChangeText={(text) => {
                setFlashUrlInput(text);
                if (text && !validateFlashUrl(text)) {
                  setFlashUrlError('Please enter a valid Flash subscription URL');
                } else {
                  setFlashUrlError('');
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {flashUrlError && (
              <Text style={styles.modalErrorText}>{flashUrlError}</Text>
            )}
            <Text style={styles.modalHelpText}>
              Get your Flash subscription URL from app.paywithflash.com
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFlashModal(false);
                  setFlashUrlInput(flashUrl || '');
                  setFlashUrlError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {flashUrl && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalBtnDanger]}
                  onPress={async () => {
                    await handleUpdateTeamFlashUrl('');
                    setFlashUrl('');
                    setFlashUrlInput('');
                    setShowFlashModal(false);
                    Alert.alert('Success', 'Flash subscription URL removed');
                  }}
                >
                  <Text style={styles.saveButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!flashUrlInput || flashUrlError) && styles.modalBtnDisabled
                ]}
                onPress={async () => {
                  if (flashUrlInput && !flashUrlError) {
                    await handleUpdateTeamFlashUrl(flashUrlInput);
                    setFlashUrl(flashUrlInput);
                    setShowFlashModal(false);
                    Alert.alert('Success', 'Flash subscription URL saved');
                  }
                }}
                disabled={!flashUrlInput || !!flashUrlError}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wizard Modals */}
      <EventCreationWizard
        visible={eventWizardVisible}
        teamId={data.team.id}
        captainPubkey={captainId}
        onClose={handleCloseEventWizard}
        onEventCreated={handleEventCreated}
      />

      <LeagueCreationWizard
        visible={leagueWizardVisible}
        teamId={data.team.id}
        captainPubkey={captainId}
        onClose={handleCloseLeagueWizard}
        onLeagueCreated={handleLeagueCreated}
      />

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            <Text style={styles.modalDescription}>
              Enter the npub or hex pubkey of the member to add
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="npub1... or hex pubkey"
              placeholderTextColor={theme.colors.secondary}
              value={newMemberNpub}
              onChangeText={setNewMemberNpub}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowAddMemberModal(false);
                  setNewMemberNpub('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddMember}
              >
                <Text style={styles.modalButtonText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header styles - exact match to mockup
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  backButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  captainBadge: {
    backgroundColor: theme.colors.text,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  captainBadgeText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.5,
    color: theme.colors.text,
  },


  // Content styles
  content: {
    flex: 1,
    padding: 16,
  },

  // Stats overview - exact match to mockup
  statsOverview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Management section styles
  managementSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  actionBtn: {
    backgroundColor: theme.colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  actionBtnIcon: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  actionBtnText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  // Members list styles
  membersList: {
    maxHeight: 120,
  },

  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  memberAvatar: {
    width: 28,
    height: 28,
    backgroundColor: theme.colors.gray,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  memberDetails: {
    flex: 1,
  },

  memberName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  memberStatus: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },

  miniBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  miniBtnText: {
    fontSize: 9,
    color: theme.colors.text,
  },

  emptyState: {
    padding: 20,
    alignItems: 'center',
  },

  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },

  // Kind 30000 List Warning Banner
  listWarningBanner: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  listWarningTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  listWarningText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },

  createListButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  createListButtonDisabled: {
    opacity: 0.5,
  },

  createListButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  // Add member button
  addMemberButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  addMemberButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accentText,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  modalDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 20,
  },

  modalInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },

  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },

  helperText: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: -12,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: -12,
    marginBottom: 16,
  },

  imagePreviewContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  imagePreview: {
    width: '100%',
    height: 120,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalButtonPrimary: {
    backgroundColor: theme.colors.accent,
  },

  modalButtonSecondary: {
    backgroundColor: theme.colors.border,
  },

  modalButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Charity styles
  charityInfo: {
    padding: 12,
  },

  charityName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  charityDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },

  charityAddress: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontFamily: 'monospace',
  },

  noCharityText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    padding: 12,
    fontStyle: 'italic',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  shopUrl: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  shopDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 20,
  },
  noShopText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    padding: 12,
    fontStyle: 'italic',
  },
  modalInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 12,
  },
  modalInputError: {
    borderColor: theme.colors.error,
  },
  modalErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
  modalHelpText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 8,
    lineHeight: 18,
  },
  modalBtnDanger: {
    backgroundColor: theme.colors.error,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },

  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  editBtnText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },

  // Picker styles for charity modal
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },

  picker: {
    height: 150,
    color: theme.colors.text,
  },

  pickerItem: {
    fontSize: 16,
    color: theme.colors.text,
  },

  selectedCharityDescription: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cancelButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },

  saveButton: {
    backgroundColor: theme.colors.accent,
  },

  saveButtonText: {
    color: theme.colors.accentText,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },

  // Component styles removed - now handled by individual components
});
