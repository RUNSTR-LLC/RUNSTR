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

        if (npub) {
          setUserNpub(npub);
        }
        if (hexPubkey) {
          setUserHexPubkey(hexPubkey);
        }
      } catch (error) {
        console.error(
          '[MyTeamsScreen] ❌ Error loading user identifiers:',
          error
        );
      }
    };

    loadUserIdentifiers();
  }, []);

  // Android: Force refresh teams data on mount
  useEffect(() => {
    const initializeTeamsData = async () => {
      // Force refresh to ensure latest data
      if (!profileData?.teams || profileData.teams.length === 0) {
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
    // Detect if user is captain of this team
    // Compare hex pubkey (team.captainId is always hex format)
    const isCaptain = team.captainId === userHexPubkey;

    // Navigate to EnhancedTeamScreen with team data and captain status
    navigation.navigate('EnhancedTeamScreen', {
      team,
      userIsMember: true,
      currentUserNpub: userNpub,
      userIsCaptain: isCaptain, // Pass captain status for captain dashboard access
    });

  };

  const handleClose = () => {
    navigation.goBack();
  };

  const teams = profileData?.teams || [];
  const primaryTeamId = profileData?.primaryTeamId;

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

      {/* Content - Teams Only */}
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
            <Ionicons
              name="people-outline"
              size={64}
              color={theme.colors.accent}
            />
            <Text style={styles.emptyStateTitle}>Join a Team</Text>
            <Text style={styles.emptyStateDescription}>
              Join a team to participate in competitions and see Events
            </Text>
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
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textMuted}
                />
                <Text style={styles.refreshingText}>
                  Checking for new teams...
                </Text>
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

  // Tab styles
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },

  activeTab: {
    backgroundColor: theme.colors.cardBackground + '20',
  },

  tabText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  activeTabText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: theme.colors.text,
    borderRadius: 2,
  },
});
