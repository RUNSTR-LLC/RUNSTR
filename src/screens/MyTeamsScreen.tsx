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
  const { profileData, refresh } = useNavigationData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');

  // Load user npub on mount
  useEffect(() => {
    const loadUserNpub = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          setUserNpub(npub);
        }
      } catch (error) {
        console.error('Error loading user npub:', error);
      }
    };

    loadUserNpub();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleTeamPress = (team: Team) => {
    // Navigate to EnhancedTeamScreen with team data
    navigation.navigate('EnhancedTeamScreen', {
      team,
      userIsMember: true,
      currentUserNpub: userNpub,
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
        {teams.length === 0 ? (
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
});
