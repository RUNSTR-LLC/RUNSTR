/**
 * DebugAuthBanner - Shows current auth state for debugging
 * Only shown in debug builds to help diagnose signing issues
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../styles/theme';
import { UnifiedSigningService, type AuthDebugInfo } from '../../services/auth/UnifiedSigningService';

interface DebugAuthBannerProps {
  onPress?: () => void;
}

export const DebugAuthBanner: React.FC<DebugAuthBannerProps> = ({ onPress }) => {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const info = await UnifiedSigningService.getInstance().getDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      console.error('Failed to load debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !debugInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading debug info...</Text>
      </View>
    );
  }

  const authIcon = debugInfo.authMethod === 'nostr' ? 'K' :
                   debugInfo.authMethod === 'amber' ? 'A' : '?';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>
        {authIcon} Auth: {debugInfo.authMethod} | nsec: {debugInfo.hasNsec ? '✓' : '✗'} | amber_pubkey: {debugInfo.hasAmberPubkey ? '✓' : '✗'}
      </Text>
      <Text style={styles.subText}>
        {debugInfo.deviceInfo.platform} {debugInfo.deviceInfo.osVersion} | v{debugInfo.appVersion}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  subText: {
    color: colors.textDark,
    fontSize: 10,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default DebugAuthBanner;
