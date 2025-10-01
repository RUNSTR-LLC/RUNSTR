/**
 * YourCompetitionsBox Component
 * Shows user's active competitions on the Profile screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NostrCompetitionDiscoveryService } from '../../services/competition/NostrCompetitionDiscoveryService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import type { UserCompetition } from '../../types/challenge';

type RootStackParamList = {
  CompetitionsList: undefined;
  // Add other screens as needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const YourCompetitionsBox: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [competitions, setCompetitions] = useState<UserCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        console.log('No user authenticated');
        return;
      }

      const discoveryService = NostrCompetitionDiscoveryService.getInstance();
      const userCompetitions = await discoveryService.getUserCompetitions(userIdentifiers.hexPubkey);

      // Filter for active competitions
      const active = userCompetitions.filter(c =>
        c.status === 'active' || c.status === 'upcoming'
      );

      setCompetitions(userCompetitions);
      setActiveCount(active.length);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    navigation.navigate('CompetitionsList');
  };

  // Get competition type counts
  const getCompetitionBreakdown = () => {
    const breakdown = {
      teams: 0,
      leagues: 0,
      events: 0,
      challenges: 0
    };

    competitions.forEach(comp => {
      if (comp.status !== 'completed') {
        breakdown[`${comp.type}s` as keyof typeof breakdown]++;
      }
    });

    return breakdown;
  };

  const breakdown = getCompetitionBreakdown();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trophy" size={20} color="#ffa500" />
          <Text style={styles.title}>Your Competitions</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#999" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#999" />
        )}
      </View>

      {!loading && (
        <>
          <View style={styles.mainContent}>
            <Text style={styles.activeCount}>
              {activeCount} Active
            </Text>
            {activeCount > 0 && (
              <Text style={styles.subtitle}>
                Tap to view leaderboards
              </Text>
            )}
          </View>

          {activeCount > 0 && (
            <View style={styles.breakdown}>
              {breakdown.teams > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownCount}>{breakdown.teams}</Text>
                  <Text style={styles.breakdownLabel}>Team{breakdown.teams > 1 ? 's' : ''}</Text>
                </View>
              )}
              {breakdown.leagues > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownCount}>{breakdown.leagues}</Text>
                  <Text style={styles.breakdownLabel}>League{breakdown.leagues > 1 ? 's' : ''}</Text>
                </View>
              )}
              {breakdown.events > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownCount}>{breakdown.events}</Text>
                  <Text style={styles.breakdownLabel}>Event{breakdown.events > 1 ? 's' : ''}</Text>
                </View>
              )}
              {breakdown.challenges > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownCount}>{breakdown.challenges}</Text>
                  <Text style={styles.breakdownLabel}>Challenge{breakdown.challenges > 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          )}

          {activeCount === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active competitions</Text>
              <Text style={styles.emptySubtext}>
                Join a team or create a challenge to get started
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mainContent: {
    marginBottom: 12,
  },
  activeCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffa500',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#666',
  },
});