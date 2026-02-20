/**
 * SatlantisDiscoveryScreen - Main discovery feed for Satlantis sports events
 * Browse upcoming and live race events from Satlantis
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSatlantisEvents } from '../../hooks/useSatlantisEvents';
import { SatlantisEventCard } from '../../components/satlantis/SatlantisEventCard';
import { RunstrEventCreationModal } from '../../components/events/RunstrEventCreationModal';
import { FilterChips } from '../../components/ui/FilterChips';
import type { SatlantisEvent, SatlantisSportType } from '../../types/satlantis';

interface SatlantisDiscoveryScreenProps {
  navigation: any;
}

const SPORT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'walking', label: 'Walking' },
];

export const SatlantisDiscoveryScreen: React.FC<SatlantisDiscoveryScreenProps> = ({
  navigation,
}) => {
  const [selectedSport, setSelectedSport] = useState<SatlantisSportType | 'all'>('all');
  const [showCreationModal, setShowCreationModal] = useState(false);

  const filter =
    selectedSport === 'all' ? undefined : { sportTypes: [selectedSport] };

  const { events, isLoading, error, refresh } = useSatlantisEvents(filter);

  const handleEventPress = useCallback(
    (event: SatlantisEvent) => {
      navigation.navigate('SatlantisEventDetail', {
        eventId: event.id,
        eventPubkey: event.pubkey,
      });
    },
    [navigation]
  );

  const handleEventCreated = useCallback(
    (eventId: string) => {
      console.log('[SatlantisDiscovery] Event created:', eventId);
      setShowCreationModal(false);
      // Refresh the list to show the new event
      setTimeout(() => refresh(), 1000);
    },
    [refresh]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerSpacer} />
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreationModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color={theme.colors.background} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <FilterChips
      options={SPORT_FILTERS}
      activeKey={selectedSport}
      onSelect={(key) => setSelectedSport(key as SatlantisSportType | 'all')}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="calendar-outline"
        size={48}
        color={theme.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>No Events Found</Text>
      <Text style={styles.emptySubtitle}>
        {error || 'Check back later for upcoming race events'}
      </Text>
      <Text style={styles.emptyHint}>
        Pull down to refresh
      </Text>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: SatlantisEvent }) => (
      <SatlantisEventCard
        event={item}
        onPress={() => handleEventPress(item)}
        participantCount={item.participantCount}
      />
    ),
    [handleEventPress]
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilters()}

      <FlatList
        data={events}
        keyExtractor={(item) => `${item.pubkey}_${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      />

      {/* Event Creation Modal */}
      <RunstrEventCreationModal
        visible={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onEventCreated={handleEventCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SatlantisDiscoveryScreen;
