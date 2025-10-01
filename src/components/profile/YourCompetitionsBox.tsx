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
    // @ts-ignore - CompetitionsList is in the navigation stack
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
        <Text style={styles.title}>YOUR COMPETITIONS</Text>
        {loading && (
          <ActivityIndicator size="small" color="#999" />
        )}
      </View>

      {!loading && (
        <>
          <Text style={styles.activeCount}>
            {activeCount} Active
          </Text>

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
  title: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyState: {
    paddingVertical: 4,
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