/**
 * BlossomServerManager - Modal for managing Blossom servers
 * Allows users to:
 * - View configured servers (default + custom)
 * - Add custom server URLs
 * - Remove custom servers
 * - Test server connections
 * - Sync library from all servers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { BlossomService } from '../../services/music/BlossomService';
import { BlossomAuthService } from '../../services/music/BlossomAuthService';
import { useMusicStore } from '../../store/musicStore';
import type { BlossomServer } from '../../types/blossom';

interface BlossomServerManagerProps {
  visible: boolean;
  onClose: () => void;
  onSync?: () => void;
}

interface ServerStatus {
  url: string;
  status: 'checking' | 'connected' | 'error';
}

export const BlossomServerManager: React.FC<BlossomServerManagerProps> = ({
  visible,
  onClose,
  onSync,
}) => {
  const [servers, setServers] = useState<BlossomServer[]>([]);
  const [serverStatuses, setServerStatuses] = useState<Map<string, ServerStatus>>(new Map());
  const [newServerUrl, setNewServerUrl] = useState('');
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { setBlossomTracks, setBlossomLoading, setBlossomError } = useMusicStore();

  /**
   * Load servers on mount
   */
  useEffect(() => {
    if (visible) {
      loadServers();
    }
  }, [visible]);

  /**
   * Load configured servers
   */
  const loadServers = useCallback(async () => {
    const allServers = await BlossomService.getServers();
    setServers(allServers);

    // Check connection status for each server
    const statuses = new Map<string, ServerStatus>();
    for (const server of allServers) {
      statuses.set(server.url, { url: server.url, status: 'checking' });
    }
    setServerStatuses(statuses);

    // Test connections in parallel
    await Promise.all(
      allServers.map(async (server) => {
        const isConnected = await BlossomService.testConnection(server.url);
        setServerStatuses((prev) => {
          const next = new Map(prev);
          next.set(server.url, {
            url: server.url,
            status: isConnected ? 'connected' : 'error',
          });
          return next;
        });
      })
    );
  }, []);

  /**
   * Add a custom server
   */
  const handleAddServer = useCallback(async () => {
    if (!newServerUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    // Validate URL format
    let url = newServerUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    if (parsedUrl.protocol !== 'https:') {
      Alert.alert(
        'HTTPS Required',
        'For security, custom Blossom servers must use https:// endpoints.'
      );
      return;
    }

    url = parsedUrl.toString().replace(/\/$/, '');

    setIsAddingServer(true);

    try {
      const success = await BlossomService.addServer(url);
      if (success) {
        setNewServerUrl('');
        setShowAddForm(false);
        await loadServers();
      } else {
        Alert.alert(
          'Failed to Add Server',
          'Could not connect to the server or it already exists.'
        );
      }
    } catch (error) {
      console.error('[BlossomServerManager] Error adding server:', error);
      Alert.alert('Error', 'Failed to add server. Please try again.');
    } finally {
      setIsAddingServer(false);
    }
  }, [newServerUrl, loadServers]);

  /**
   * Remove a custom server
   */
  const handleRemoveServer = useCallback(
    async (server: BlossomServer) => {
      if (server.isDefault) {
        Alert.alert('Cannot Remove', 'Default servers cannot be removed.');
        return;
      }

      Alert.alert(
        'Remove Server',
        `Are you sure you want to remove ${server.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await BlossomService.removeServer(server.url);
              await loadServers();
            },
          },
        ]
      );
    },
    [loadServers]
  );

  /**
   * Sync library from all servers
   */
  const handleSyncLibrary = useCallback(async () => {
    const canAuth = await BlossomAuthService.canAuthenticate();
    if (!canAuth) {
      Alert.alert(
        'Authentication Required',
        'Please log in with your Nostr account to sync your Blossom library.'
      );
      return;
    }

    setIsSyncing(true);
    setBlossomLoading(true);

    try {
      const pubkey = await BlossomAuthService.getUserPubkeyHex();
      if (!pubkey) {
        throw new Error('Could not get user pubkey');
      }

      const tracks = await BlossomService.getAllTracks(pubkey);
      setBlossomTracks(tracks);
      await BlossomService.updateLastSyncTime();

      if (onSync) {
        onSync();
      }

      if (tracks.length === 0) {
        Alert.alert(
          'No Audio Found',
          'No audio files were found on your Blossom servers. Upload some music to see it here!'
        );
      } else {
        Alert.alert('Sync Complete', `Found ${tracks.length} audio tracks.`);
      }
    } catch (error) {
      console.error('[BlossomServerManager] Sync error:', error);
      setBlossomError('Failed to sync library. Please try again.');
      Alert.alert('Sync Failed', 'Could not sync your Blossom library.');
    } finally {
      setIsSyncing(false);
      setBlossomLoading(false);
    }
  }, [setBlossomTracks, setBlossomLoading, setBlossomError, onSync]);

  /**
   * Get status icon for a server
   */
  const getStatusIcon = (url: string) => {
    const status = serverStatuses.get(url);
    if (!status || status.status === 'checking') {
      return <ActivityIndicator size="small" color={theme.colors.textMuted} />;
    }
    if (status.status === 'connected') {
      return <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />;
    }
    return <Ionicons name="alert-circle" size={20} color={theme.colors.error} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blossom Servers</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* Description */}
          <Text style={styles.description}>
            Blossom servers store your media files. Add servers where you've uploaded
            audio to play them in RUNSTR.
          </Text>

          {/* Sync Button */}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncLibrary}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Ionicons name="sync" size={20} color={theme.colors.text} />
            )}
            <Text style={styles.syncButtonText}>
              {isSyncing ? 'Syncing...' : 'Sync Library'}
            </Text>
          </TouchableOpacity>

          {/* Server List */}
          <Text style={styles.sectionTitle}>Configured Servers</Text>

          {servers.map((server) => (
            <View key={server.url} style={styles.serverRow}>
              <View style={styles.serverInfo}>
                <Text style={styles.serverName}>{server.name}</Text>
                <Text style={styles.serverUrl} numberOfLines={1}>
                  {server.url}
                </Text>
              </View>
              <View style={styles.serverActions}>
                {getStatusIcon(server.url)}
                {!server.isDefault && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveServer(server)}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Add Server Section */}
          {showAddForm ? (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="https://your-blossom-server.com"
                placeholderTextColor={theme.colors.textMuted}
                value={newServerUrl}
                onChangeText={setNewServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isAddingServer}
              />
              <View style={styles.addFormButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewServerUrl('');
                  }}
                  disabled={isAddingServer}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddServer}
                  disabled={isAddingServer}
                >
                  {isAddingServer ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <Text style={styles.addButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.showAddButton}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
              <Text style={styles.showAddButtonText}>Add Custom Server</Text>
            </TouchableOpacity>
          )}

          {/* Info section */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>
              Audio files you've uploaded to Blossom servers will appear in "My Blossom Library"
              in the music browser.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  syncButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serverInfo: {
    flex: 1,
    marginRight: 12,
  },
  serverName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  serverUrl: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  serverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  addForm: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: 6,
  },
  addButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  showAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  showAddButtonText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    marginTop: 24,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default BlossomServerManager;
