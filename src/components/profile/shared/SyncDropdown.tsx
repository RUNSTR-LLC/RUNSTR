/**
 * SyncDropdown - Dropdown menu for syncing workouts from various sources
 * Provides manual sync control for Apple Health, Garmin, and Google Fit
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../../styles/theme';
import healthKitService from '../../../services/fitness/healthKitService';

interface SyncDropdownProps {
  userId: string;
  onSyncComplete?: () => void;
}

interface SyncSource {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

const syncSources: SyncSource[] = [
  { id: 'apple', name: 'Apple Health', icon: '', available: true },
  { id: 'garmin', name: 'Garmin Connect', icon: '', available: false },
  { id: 'google', name: 'Google Fit', icon: '', available: false },
];

export const SyncDropdown: React.FC<SyncDropdownProps> = ({
  userId,
  onSyncComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const buttonRef = useRef<View>(null);

  const handleSync = async (source: SyncSource) => {
    if (!source.available) {
      Alert.alert(
        'Coming Soon',
        `${source.name} integration is coming soon!`
      );
      return;
    }

    setSyncing(source.id);
    setIsOpen(false);

    try {
      switch (source.id) {
        case 'apple':
          await syncAppleHealth();
          break;
        case 'garmin':
          // Future implementation
          break;
        case 'google':
          // Future implementation
          break;
      }

      Alert.alert(
        'Sync Complete',
        `Successfully synced workouts from ${source.name}`,
        [{ text: 'OK', onPress: onSyncComplete }]
      );
    } catch (error) {
      console.error(`Failed to sync ${source.name}:`, error);
      Alert.alert(
        'Sync Failed',
        `Failed to sync from ${source.name}. Please try again.`
      );
    } finally {
      setSyncing(null);
    }
  };

  const syncAppleHealth = async () => {
    console.log('🍎 Syncing Apple Health workouts...');

    const status = healthKitService.getStatus();

    if (!status.available) {
      throw new Error('Apple Health is not available on this device');
    }

    if (!status.authorized) {
      // Request permissions
      const result = await healthKitService.requestPermissions();
      if (!result.success) {
        throw new Error('HealthKit permissions denied');
      }
    }

    // Fetch recent workouts
    const workouts = await healthKitService.getRecentWorkouts(userId, 30);
    console.log(`✅ Synced ${workouts?.length || 0} workouts from Apple Health`);

    return workouts;
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.container}>
      {/* Import Workouts Button */}
      <TouchableOpacity
        ref={buttonRef}
        style={styles.importButton}
        onPress={toggleDropdown}
        disabled={syncing !== null}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={theme.colors.background} />
        ) : (
          <Text style={styles.importText}>Import Workouts</Text>
        )}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Import Workouts</Text>
            {syncSources.map((source) => (
              <TouchableOpacity
                key={source.id}
                style={[
                  styles.dropdownItem,
                  !source.available && styles.dropdownItemDisabled,
                ]}
                onPress={() => handleSync(source)}
                disabled={!source.available}
              >
                {/* Icon removed */}
                <Text style={[
                  styles.sourceName,
                  !source.available && styles.sourceNameDisabled,
                ]}>
                  {source.name}
                </Text>
                {!source.available && (
                  <Text style={styles.comingSoon}>Soon</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.orangeDeep, // Deep orange button
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.orangeBurnt, // Burnt orange border
  },
  importText: {
    color: theme.colors.accentText, // Black text on orange
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 16,
  },
  dropdown: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  sourceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sourceName: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  sourceNameDisabled: {
    color: theme.colors.textSecondary,
  },
  comingSoon: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});