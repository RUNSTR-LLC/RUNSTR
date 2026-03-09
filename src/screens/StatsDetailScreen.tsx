/**
 * StatsDetailScreen - Full-page Level + Activity Breakdown view
 * Navigated from profile dashboard grid cards.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { LevelCard } from '../components/profile/LevelCard';
import { ActivityBreakdown } from '../components/profile/ActivityBreakdown';
import { ProfileDataService } from '../services/backend/ProfileDataService';
import type { ProfileLevelData, ActivityBreakdownData } from '../services/backend/ProfileDataService';

const StatsDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const npub: string = route?.params?.npub ?? '';

  const [levelData, setLevelData] = useState<ProfileLevelData | null>(null);
  const [breakdown, setBreakdown] = useState<ActivityBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!npub) return;
    (async () => {
      setIsLoading(true);
      try {
        const [ld, ab] = await Promise.all([
          ProfileDataService.getLevelData(npub),
          ProfileDataService.getActivityBreakdown(npub),
        ]);
        if (isMounted.current) {
          setLevelData(ld);
          setBreakdown(ab);
        }
      } catch (err) {
        console.warn('[StatsDetail] Failed to load:', err);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    })();
  }, [npub]);

  return (
    <TexturedBackground>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <LevelCard levelData={levelData} isLoading={isLoading} />
        </View>

        <View style={styles.section}>
          <ActivityBreakdown breakdown={breakdown} isLoading={isLoading} />
        </View>
      </ScrollView>
    </TexturedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
});

export { StatsDetailScreen };
