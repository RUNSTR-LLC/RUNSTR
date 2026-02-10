/**
 * ExportDataModal - Export encrypted data to Nostr relays
 *
 * Shows backup preview with relay selection.
 * Uses NIP-44 encryption for privacy.
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  BackupService,
  DEFAULT_BACKUP_RELAYS,
  type BackupStats,
} from '../../services/backup/BackupService';
import Toast from 'react-native-toast-message';

interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  visible,
  onClose,
}) => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [selectedRelays, setSelectedRelays] = useState<Set<string>>(
    new Set(DEFAULT_BACKUP_RELAYS)
  );
  const [customRelay, setCustomRelay] = useState('');
  const [showCustomRelayInput, setShowCustomRelayInput] = useState(false);

  // Load stats on mount
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const backupService = BackupService.getInstance();
      const [backupStats, lastBackupTime] = await Promise.all([
        backupService.getBackupStats(),
        backupService.getLastBackupTime(),
      ]);
      setStats(backupStats);
      setLastBackup(lastBackupTime);
    } catch (error) {
      console.error('[ExportDataModal] Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible, loadStats]);

  // Toggle relay selection
  const toggleRelay = (relayUrl: string) => {
    const newSelected = new Set(selectedRelays);
    if (newSelected.has(relayUrl)) {
      newSelected.delete(relayUrl);
    } else {
      newSelected.add(relayUrl);
    }
    setSelectedRelays(newSelected);
  };

  // Add custom relay
  const addCustomRelay = () => {
    const url = customRelay.trim();
    if (!url.startsWith('wss://')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid URL',
        text2: 'Relay URL must start with wss://',
        position: 'top',
      });
      return;
    }

    const newSelected = new Set(selectedRelays);
    newSelected.add(url);
    setSelectedRelays(newSelected);
    setCustomRelay('');
    setShowCustomRelayInput(false);
  };

  // Export data
  const handleExport = async () => {
    if (selectedRelays.size === 0) {
      setExportError('Please select at least one relay');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const backupService = BackupService.getInstance();
      const result = await backupService.exportToNostr(Array.from(selectedRelays));

      if (result.success) {
        const msg = `Backup saved to ${result.relaysPublished.length} relay${result.relaysPublished.length !== 1 ? 's' : ''}`;
        setExportSuccess(msg);
        // Also fire toast (visible after modal closes)
        Toast.show({
          type: 'success',
          text1: 'Backup saved',
          text2: msg,
          position: 'top',
          visibilityTime: 3000,
        });
        // Close modal after brief delay so user sees success
        setTimeout(() => onClose(), 1500);
      } else {
        const errorMsg = result.error || 'Could not save backup';
        setExportError(errorMsg);
        Toast.show({
          type: 'error',
          text1: 'Export failed',
          text2: errorMsg,
          position: 'top',
        });
      }
    } catch (error) {
      console.error('[ExportDataModal] Export error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setExportError(errorMsg);
      Toast.show({
        type: 'error',
        text1: 'Export failed',
        text2: errorMsg,
        position: 'top',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get all relays (default + custom)
  const allRelays = Array.from(
    new Set([...DEFAULT_BACKUP_RELAYS, ...Array.from(selectedRelays)])
  );

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
          <Text style={styles.headerTitle}>Export Data</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.orangeBright} />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Data Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data to backup</Text>
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Ionicons name="fitness-outline" size={18} color={theme.colors.orangeBright} />
                  <Text style={styles.statText}>
                    {stats?.workoutCount || 0} workouts
                  </Text>
                </View>
                {(stats?.habitCount || 0) > 0 && (
                  <View style={styles.statRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.orangeBright} />
                    <Text style={styles.statText}>
                      {stats?.habitCount} habits (with streaks)
                    </Text>
                  </View>
                )}
                {(stats?.journalCount || 0) > 0 && (
                  <View style={styles.statRow}>
                    <Ionicons name="journal-outline" size={18} color={theme.colors.orangeBright} />
                    <Text style={styles.statText}>
                      {stats?.journalCount} journal entries
                    </Text>
                  </View>
                )}
                {stats?.dateRange.oldest && stats?.dateRange.newest && (
                  <View style={styles.dateRangeRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateRangeText}>
                      {formatDate(stats.dateRange.oldest)} - {formatDate(stats.dateRange.newest)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Relay Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Save to relays</Text>
              <View style={styles.relaysCard}>
                {allRelays.map((relay) => (
                  <TouchableOpacity
                    key={relay}
                    style={styles.relayRow}
                    onPress={() => toggleRelay(relay)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selectedRelays.has(relay) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selectedRelays.has(relay) ? theme.colors.orangeBright : '#666'}
                    />
                    <Text style={styles.relayUrl}>{relay}</Text>
                  </TouchableOpacity>
                ))}

                {/* Add Custom Relay */}
                {showCustomRelayInput ? (
                  <View style={styles.customRelayInput}>
                    <TextInput
                      style={styles.relayInput}
                      value={customRelay}
                      onChangeText={setCustomRelay}
                      placeholder="wss://relay.example.com"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="done"
                      onSubmitEditing={addCustomRelay}
                    />
                    <TouchableOpacity
                      style={styles.addRelayButton}
                      onPress={addCustomRelay}
                    >
                      <Ionicons name="add-circle" size={24} color={theme.colors.orangeBright} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addCustomRow}
                    onPress={() => setShowCustomRelayInput(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-outline" size={20} color={theme.colors.orangeBright} />
                    <Text style={styles.addCustomText}>Add custom relay...</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="lock-closed" size={16} color={theme.colors.orangeBright} />
              <Text style={styles.securityText}>
                Encrypted with your key{'\n'}
                Only you can read this backup
              </Text>
            </View>

            {/* Last Backup */}
            {lastBackup && (
              <Text style={styles.lastBackupText}>
                Last backup: {formatDate(lastBackup)}
              </Text>
            )}

            {/* Export Button */}
            <TouchableOpacity
              style={[
                styles.exportButton,
                (isExporting || selectedRelays.size === 0) && styles.exportButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={isExporting || selectedRelays.size === 0}
              activeOpacity={0.8}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#000" />
                  <Text style={styles.exportButtonText}>Export Now</Text>
                </>
              )}
            </TouchableOpacity>

            {/* In-modal error display (toast renders behind pageSheet modal) */}
            {exportError && (
              <View style={styles.inlineMessage}>
                <Ionicons name="alert-circle" size={16} color="#ff4444" />
                <Text style={styles.inlineErrorText}>{exportError}</Text>
              </View>
            )}

            {/* In-modal success display */}
            {exportSuccess && (
              <View style={styles.inlineMessage}>
                <Ionicons name="checkmark-circle" size={16} color="#FF9D42" />
                <Text style={styles.inlineSuccessText}>{exportSuccess}</Text>
              </View>
            )}
          </ScrollView>
        )}
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

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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

  // Stats Card
  statsCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  statText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#888',
  },

  // Relays Card
  relaysCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 12,
  },
  relayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  relayUrl: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  addCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addCustomText: {
    fontSize: 14,
    color: theme.colors.orangeBright,
  },
  customRelayInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  relayInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  addRelayButton: {
    padding: 4,
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.orangeBright,
    lineHeight: 18,
  },

  // Last Backup
  lastBackupText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },

  // Export Button
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 12,
    paddingVertical: 16,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },

  // Inline messages (visible inside modal)
  inlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#ff4444',
    lineHeight: 18,
  },
  inlineSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9D42',
    lineHeight: 18,
  },
});

export default ExportDataModal;
