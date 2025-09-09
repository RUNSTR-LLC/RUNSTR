/**
 * NostrConnectionStatus - Shows real-time Nostr relay connection status
 * Displays connection indicators with color-coded status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { nostrRelayManager } from '../../services/nostr/NostrRelayManager';

interface NostrConnectionStatusProps {
  showDetails?: boolean;
  onPress?: () => void;
  style?: any;
}

export const NostrConnectionStatus: React.FC<NostrConnectionStatusProps> = ({
  showDetails = false,
  onPress,
  style,
}) => {
  const [connectionStatus, setConnectionStatus] = useState({
    total: 0,
    connected: 0,
    connecting: 0,
    disconnected: 0,
    error: 0,
  });

  const [relayDetails, setRelayDetails] = useState<any[]>([]);

  useEffect(() => {
    // Update connection status
    const updateStatus = () => {
      const status = nostrRelayManager.getConnectionStatus();
      setConnectionStatus(status);

      if (showDetails) {
        const connections = nostrRelayManager.getAllConnections();
        setRelayDetails(connections);
      }
    };

    // Initial update
    updateStatus();

    // Subscribe to status changes
    const unsubscribe = nostrRelayManager.onStatusChange(updateStatus);

    return unsubscribe;
  }, [showDetails]);

  const getStatusColor = () => {
    const { connected, total, error } = connectionStatus;

    if (connected === 0) return theme.colors.textMuted; // No connections
    if (error > 0) return '#ff6b6b'; // Has errors
    if (connected === total) return '#51cf66'; // All connected
    return '#ffd43b'; // Partial connection
  };

  const getStatusText = () => {
    const { connected, total, connecting } = connectionStatus;

    if (connecting > 0) return 'Connecting...';
    if (connected === 0) return 'Disconnected';
    if (connected === total) return 'Connected';
    return `${connected}/${total} Connected`;
  };

  const getStatusIcon = () => {
    const { connected, total, connecting, error } = connectionStatus;

    if (connecting > 0) return '⏳';
    if (error > 0) return '⚠️';
    if (connected === 0) return '🔴';
    if (connected === total) return '🟢';
    return '🟡';
  };

  const renderCompactView = () => (
    <View style={[styles.compactContainer, style]}>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.compactText}>
        {connectionStatus.connected}/{connectionStatus.total}
      </Text>
    </View>
  );

  const renderDetailedView = () => (
    <View style={[styles.detailedContainer, style]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{getStatusIcon()}</Text>
        <Text style={styles.headerText}>Nostr Relays</Text>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {relayDetails.length > 0 && (
        <View style={styles.relayList}>
          {relayDetails.map((relay) => (
            <View key={relay.url} style={styles.relayItem}>
              <View style={styles.relayInfo}>
                <Text style={styles.relayUrl}>
                  {relay.url.replace('wss://', '').replace('ws://', '')}
                </Text>
                <Text
                  style={[
                    styles.relayStatus,
                    { color: getRelayStatusColor(relay.status) },
                  ]}
                >
                  {relay.status}
                </Text>
              </View>
              <View
                style={[
                  styles.relayDot,
                  { backgroundColor: getRelayStatusColor(relay.status) },
                ]}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const getRelayStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#51cf66';
      case 'connecting':
        return '#ffd43b';
      case 'error':
        return '#ff6b6b';
      case 'disconnected':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const content = showDetails ? renderDetailedView() : renderCompactView();

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  compactText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },

  detailedContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  headerIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  headerText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },

  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },

  relayList: {
    gap: 6,
  },

  relayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  relayInfo: {
    flex: 1,
  },

  relayUrl: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },

  relayStatus: {
    fontSize: 10,
    textTransform: 'capitalize',
    marginTop: 1,
  },

  relayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
