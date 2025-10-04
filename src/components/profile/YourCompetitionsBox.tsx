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
import { theme } from '../../styles/theme';
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    height: 80, // Further reduced height
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    backgroundColor: '#FF9D42', // Bright orange badge
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  activeCount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.orangeBright, // Bright orange for count
    marginBottom: 4,
  },
  emptyState: {
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
  },
  emptySubtext: {
    fontSize: 11,
    color: '#666',
  },
});