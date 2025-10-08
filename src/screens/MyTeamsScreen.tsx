/**
 * MyTeamsScreen
 * Shows all teams the user has joined
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { CompactTeamCard } from '../components/profile/CompactTeamCard';
import { useNavigationData } from '../contexts/NavigationDataContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Team } from '../types';

export const MyTeamsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profileData, refresh, isLoadingTeam } = useNavigationData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');
  const [userHexPubkey, setUserHexPubkey] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load user npub and hex pubkey on mount
  useEffect(() => {
    const loadUserIdentifiers = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

        console.log('[MyTeamsScreen] 📱 Loaded npub:', npub ? npub.slice(0, 20) + '...' : 'NONE');
        console.log('[MyTeamsScreen] 📱 Loaded hex:', hexPubkey ? hexPubkey.slice(0, 20) + '...' : 'NONE');

        if (npub) {
          setUserNpub(npub);
        }
        if (hexPubkey) {
          setUserHexPubkey(hexPubkey);
        }
      } catch (error) {
        console.error('[MyTeamsScreen] ❌ Error loading user identifiers:', error);
      }
    };

    loadUserIdentifiers();
  }, []);

  // Android: Force refresh teams data on mount
  useEffect(() => {
    const initializeTeamsData = async () => {
      console.log('[MyTeamsScreen] 📱 Android: Initializing teams data...');
      console.log('[MyTeamsScreen] 📊 Current teams count:', profileData?.teams?.length || 0);

      // Force refresh to ensure latest data
      if (!profileData?.teams || profileData.teams.length === 0) {
        console.log('[MyTeamsScreen] 🔄 No teams found, triggering refresh...');
        await refresh();
      }
    };

    initializeTeamsData();
  }, []); // Only on mount

  // Track when initial load completes
  useEffect(() => {
    if (profileData?.teams) {
      setIsInitialLoad(false);
    }
  }, [profileData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleTeamPress = (team: Team) => {
    console.log('[MyTeamsScreen] 🚀 START handleTeamPress - Team:', team.id);
    console.log('[MyTeamsScreen] 📊 Team object size:', JSON.stringify(team).length, 'bytes');

    // Detect if user is captain of this team
    // FIX: Compare hex pubkey (team.captainId is always hex format)
    const isCaptain = team.captainId === userHexPubkey;

    console.log('[MyTeamsScreen] 🎖️ Captain detection:', {
      teamId: team.id,
      teamCaptainId: team.captainId?.slice(0, 20) + '...',
      userNpub: userNpub?.slice(0, 20) + '...',
      userHexPubkey: userHexPubkey?.slice(0, 20) + '...',
      isCaptain,
    });

    console.log('[MyTeamsScreen] 📍 BEFORE navigation.navigate call');
    console.log('[MyTeamsScreen] 📦 Navigation params size:', JSON.stringify({
      team,
      userIsMember: true,
      currentUserNpub: userNpub,
      userIsCaptain: isCaptain,
    }).length, 'bytes');

    // Navigate to EnhancedTeamScreen with team data and captain status
    navigation.navigate('EnhancedTeamScreen', {
      team,
      userIsMember: true,
      currentUserNpub: userNpub,
      userIsCaptain: isCaptain, // Pass captain status for captain dashboard access
    });

    console.log('[MyTeamsScreen] 📍 AFTER navigation.navigate call - this should not print if frozen');
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const teams = profileData?.teams || [];
  const primaryTeamId = profileData?.primaryTeamId;

  // Debug logging
  useEffect(() => {
    console.log('[MyTeamsScreen] 📊 Render - Teams count:', teams.length);
    console.log('[MyTeamsScreen] 📊 Profile data status:', {
      hasProfileData: !!profileData,
      hasTeams: !!profileData?.teams,
      teamsLength: profileData?.teams?.length || 0,
      isLoading: isLoadingTeam,
    });
  }, [teams, profileData, isLoadingTeam]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Teams</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Show loading state only on initial load */}
        {isInitialLoad && teams.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.text} />
            <Text style={styles.loadingText}>Loading your teams...</Text>
          </View>
        ) : teams.length === 0 ? (
          /* Empty state after loading completes */
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Teams Joined</Text>
            <Text style={styles.emptyStateDescription}>
              Join a team to compete in challenges and earn Bitcoin rewards
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('TeamDiscovery')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Find Teams</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Show teams */
          <View style={styles.teamsList}>
            {teams.map((team) => (
              <CompactTeamCard
                key={team.id}
                team={team}
                isPrimary={team.id === primaryTeamId}
                currentUserNpub={userNpub}
                onPress={handleTeamPress}
              />
            ))}
            {/* Show loading indicator while refreshing teams */}
            {isLoadingTeam && (
              <View style={styles.refreshingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.textMuted} />
                <Text style={styles.refreshingText}>Checking for new teams...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  closeButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  headerSpacer: {
    width: 32, // Same width as close button for centering
  },

  // Content
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  teamsList: {
    gap: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },

  emptyStateDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  // Loading State
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },

  // Refreshing Indicator
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },

  refreshingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
