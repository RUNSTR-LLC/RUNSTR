/**
 * ImportDataModal - Restore workout history from Nostr
 *
 * Two-phase restore:
 * 1. Encrypted backup (kind 30078) — decrypts and restores workouts, habits, journal
 * 2. Kind 1301 workout events — fetches public workout notes and saves to local storage
 *
 * Both phases deduplicate automatically.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  RestoreService,
  type DecryptedBackup,
  type ImportResult,
} from '../../services/backup/RestoreService';
import { Nostr1301ImportService } from '../../services/fitness/Nostr1301ImportService';
import { DEFAULT_BACKUP_RELAYS } from '../../services/backup/BackupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

interface ImportDataModalProps {
  visible: boolean;
  onClose: () => void;
}

type ImportState = 'searching' | 'found' | 'not_found' | 'importing' | 'complete' | 'error';

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  visible,
  onClose,
}) => {
  const [state, setState] = useState<ImportState>('searching');
  const [backup, setBackup] = useState<DecryptedBackup | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search for backup on mount
  const searchForBackup = useCallback(async () => {
    setState('searching');
    setBackup(null);
    setImportResult(null);
    setErrorMessage(null);

    try {
      const restoreService = RestoreService.getInstance();
      const result = await restoreService.searchForBackup(DEFAULT_BACKUP_RELAYS);

      if (result.found && result.backup) {
        setBackup(result.backup);
        setState('found');
      } else if (result.error) {
        setErrorMessage(result.error);
        setState('error');
      } else {
        setState('not_found');
      }
    } catch (error) {
      console.error('[ImportDataModal] Search error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Search failed');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      searchForBackup();
    }
  }, [visible, searchForBackup]);

  // Import: encrypted backup + kind 1301 events
  const handleImport = async () => {
    setState('importing');
    try {
      let totalWorkouts = 0;
      let totalSkipped = 0;
      let totalHabits = 0;
      let totalJournal = 0;
      let nostrWorkouts = 0;

      // Phase 1: Encrypted backup (if found)
      if (backup) {
        const restoreService = RestoreService.getInstance();
        const backupResult = await restoreService.importBackup(backup);
        if (backupResult.success) {
          totalWorkouts += backupResult.workoutsImported;
          totalSkipped += backupResult.workoutsSkipped;
          totalHabits += backupResult.habitsImported;
          totalJournal += backupResult.journalImported;
        }
      }

      // Phase 2: Kind 1301 workout events from Nostr relays
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (npub) {
        console.log('[ImportDataModal] Phase 2: Importing kind 1301 events...');
        const importService = Nostr1301ImportService.getInstance();
        const nostrResult = await importService.importUserHistory(npub);
        if (nostrResult.success) {
          nostrWorkouts = nostrResult.totalImported;
          totalWorkouts += nostrResult.totalImported;
        }
      }

      const combinedResult: ImportResult = {
        success: true,
        workoutsImported: totalWorkouts,
        workoutsSkipped: totalSkipped,
        habitsImported: totalHabits,
        habitsSkipped: 0,
        journalImported: totalJournal,
        journalSkipped: 0,
      };
      setImportResult(combinedResult);
      setState('complete');

      const parts: string[] = [];
      if (totalWorkouts > 0) parts.push(`${totalWorkouts} workouts`);
      if (totalHabits > 0) parts.push(`${totalHabits} habits`);
      if (totalJournal > 0) parts.push(`${totalJournal} journal entries`);

      Toast.show({
        type: 'success',
        text1: 'Restore complete',
        text2: parts.length > 0 ? `Imported ${parts.join(', ')}` : 'No new data to import',
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('[ImportDataModal] Import error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Import failed');
      setState('error');
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | Date | null): string => {
    if (!dateStr) return 'Unknown';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render content based on state
  const renderContent = () => {
    switch (state) {
      case 'searching':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.orangeBright} />
            <Text style={styles.statusText}>Searching for data...</Text>
            <Text style={styles.statusSubtext}>
              Checking relays for backups and workout history
            </Text>
          </View>
        );

      case 'not_found':
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="cloud-download-outline" size={48} color={theme.colors.orangeBright} />
            <Text style={styles.statusText}>Restore Workout History</Text>
            <Text style={styles.statusSubtext}>
              No encrypted backup found, but we can still import{'\n'}
              your workout notes from Nostr relays.
            </Text>
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImport}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#000" />
              <Text style={styles.importButtonText}>Import Workouts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryButton, { marginTop: 12 }]}
              onPress={searchForBackup}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.orangeBright} />
              <Text style={styles.retryButtonText}>Search Again</Text>
            </TouchableOpacity>
          </View>
        );

      case 'found':
        return (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Success Banner */}
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.successText}>Backup found</Text>
            </View>

            {/* Backup Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Backup contains</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="fitness-outline" size={18} color={theme.colors.orangeBright} />
                  <Text style={styles.detailText}>
                    {backup?.payload.workouts.length || 0} workouts
                  </Text>
                </View>
                {(backup?.payload.habits?.length || 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.orangeBright} />
                    <Text style={styles.detailText}>
                      {backup?.payload.habits?.length} habits
                    </Text>
                  </View>
                )}
                {(backup?.payload.journal?.length || 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="journal-outline" size={18} color={theme.colors.orangeBright} />
                    <Text style={styles.detailText}>
                      {backup?.payload.journal?.length} journal entries
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Backup Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Backup info</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Exported</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(backup?.metadata.createdAt || null)}
                  </Text>
                </View>
                {backup?.metadata.dateRange.oldest && backup?.metadata.dateRange.newest && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date range</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(backup.metadata.dateRange.oldest)} - {formatDate(backup.metadata.dateRange.newest)}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Version</Text>
                  <Text style={styles.infoValue}>
                    {backup?.payload.appVersion || '1.0'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Deduplication Notice */}
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
              <Text style={styles.noticeText}>
                Duplicates will be skipped automatically
              </Text>
            </View>

            {/* Import Button */}
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImport}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#000" />
              <Text style={styles.importButtonText}>Import Data</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'importing':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.orangeBright} />
            <Text style={styles.statusText}>Restoring workout history...</Text>
            <Text style={styles.statusSubtext}>
              Importing backups and workout notes from Nostr
            </Text>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={styles.statusText}>Restore complete</Text>

            {/* Import Summary */}
            <View style={styles.summaryCard}>
              {importResult && importResult.workoutsImported > 0 && (
                <Text style={styles.summaryText}>
                  {importResult.workoutsImported} workouts imported
                  {importResult.workoutsSkipped > 0 && ` (${importResult.workoutsSkipped} skipped)`}
                </Text>
              )}
              {importResult && importResult.habitsImported > 0 && (
                <Text style={styles.summaryText}>
                  {importResult.habitsImported} habits imported
                  {importResult.habitsSkipped > 0 && ` (${importResult.habitsSkipped} skipped)`}
                </Text>
              )}
              {importResult && importResult.journalImported > 0 && (
                <Text style={styles.summaryText}>
                  {importResult.journalImported} journal entries imported
                  {importResult.journalSkipped > 0 && ` (${importResult.journalSkipped} skipped)`}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        const isLoginError = errorMessage?.toLowerCase().includes('log in') || errorMessage?.toLowerCase().includes('not logged in');
        return (
          <View style={styles.centerContainer}>
            <Ionicons
              name={isLoginError ? 'person-outline' : 'alert-circle-outline'}
              size={48}
              color={isLoginError ? theme.colors.orangeBright : theme.colors.error}
            />
            <Text style={styles.statusText}>
              {isLoginError ? 'Login Required' : 'Something went wrong'}
            </Text>
            <Text style={styles.errorText}>{errorMessage || 'Unknown error'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={searchForBackup}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.orangeBright} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import Data</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  statusText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: 8,
    textAlign: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  successText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.success,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 15,
    color: theme.colors.text,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.text,
  },

  // Notice Card
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
  },

  // Buttons
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 12,
    paddingVertical: 16,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    marginTop: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  doneButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginTop: 16,
    width: '100%',
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 4,
  },
});

export default ImportDataModal;
