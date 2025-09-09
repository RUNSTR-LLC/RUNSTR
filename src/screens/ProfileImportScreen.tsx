/**
 * ProfileImportScreen - Auto-imports user profile from Nostr
 * Shows fetched profile data with loading states and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  nostrProfileService,
  NostrProfile,
} from '../services/nostr/NostrProfileService';
import { nostrRelayManager } from '../services/nostr/NostrRelayManager';

interface ProfileImportScreenProps {
  npub: string;
  onContinue: (profile: NostrProfile) => void;
  onSkip: () => void;
  onRetry?: () => void;
}

type ImportState = 'loading' | 'success' | 'error' | 'no-profile';

export const ProfileImportScreen: React.FC<ProfileImportScreenProps> = ({
  npub,
  onContinue,
  onSkip,
  onRetry,
}) => {
  const [importState, setImportState] = useState<ImportState>('loading');
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [relayStatus, setRelayStatus] = useState({ connected: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Monitor relay connections
    const unsubscribe = nostrRelayManager.onStatusChange(() => {
      const status = nostrRelayManager.getConnectionStatus();
      setRelayStatus({ connected: status.connected, total: status.total });
    });

    // Initial status check
    const status = nostrRelayManager.getConnectionStatus();
    setRelayStatus({ connected: status.connected, total: status.total });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (npub) {
      importProfile();
    }
  }, [npub, retryCount]);

  const importProfile = async () => {
    try {
      setImportState('loading');
      setErrorMessage('');

      console.log('🔍 Starting profile import for:', npub);

      // Wait a moment for relay connections if needed
      if (relayStatus.connected === 0 && relayStatus.total > 0) {
        console.log('⏳ Waiting for relay connections...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const importedProfile = await nostrProfileService.getProfile(npub);

      if (importedProfile) {
        setProfile(importedProfile);
        setImportState('success');
        console.log('✅ Profile imported successfully');
      } else {
        setImportState('no-profile');
        setErrorMessage(
          'No profile found on Nostr relays. You can continue with a basic profile.'
        );
      }
    } catch (error) {
      console.error('❌ Profile import error:', error);
      setImportState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to import profile'
      );
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleContinue = () => {
    if (profile) {
      onContinue(profile);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Import?',
      'You can set up your profile manually later in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: onSkip },
      ]
    );
  };

  const renderLoadingState = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator
        size="large"
        color={theme.colors.text}
        style={styles.spinner}
      />
      <Text style={styles.loadingTitle}>Importing Profile</Text>
      <Text style={styles.loadingSubtitle}>
        Fetching your profile from Nostr relays...
      </Text>
      <View style={styles.relayStatus}>
        <Text style={styles.relayStatusText}>
          Relays: {relayStatus.connected}/{relayStatus.total} connected
        </Text>
      </View>
    </View>
  );

  const renderSuccessState = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Imported!</Text>
        <Text style={styles.subtitle}>
          Found your Nostr profile. Review and continue.
        </Text>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar
            name={profile?.display_name || profile?.name || 'User'}
            imageUrl={profile?.picture}
            size={80}
            style={styles.profileAvatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.display_name || profile?.name || 'Anonymous'}
            </Text>
            <Text style={styles.profileNpub}>{npub.slice(0, 20)}...</Text>
          </View>
        </View>

        {profile?.about && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.sectionValue}>{profile.about}</Text>
          </View>
        )}

        {profile?.lud16 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Lightning Address</Text>
            <Text style={styles.sectionValue}>⚡ {profile.lud16}</Text>
            <Text style={styles.sectionNote}>
              Bitcoin rewards will be sent to this address
            </Text>
          </View>
        )}

        {profile?.nip05 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>NIP-05 Verified</Text>
            <Text style={styles.sectionValue}>✅ {profile.nip05}</Text>
          </View>
        )}

        {profile?.website && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Website</Text>
            <Text style={styles.sectionValue}>{profile.website}</Text>
          </View>
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          title="Continue with Profile"
          onPress={handleContinue}
          variant="primary"
          style={styles.continueButton}
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Start Fresh Instead</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderNoProfileState = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>👤</Text>
      </View>
      <Text style={styles.title}>No Profile Found</Text>
      <Text style={styles.subtitle}>
        We couldn't find a profile for this Nostr account. You can continue and
        set up your profile manually.
      </Text>
      <View style={styles.actions}>
        <Button
          title="Try Again"
          onPress={handleRetry}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Continue Anyway"
          onPress={onSkip}
          variant="primary"
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={styles.title}>Import Failed</Text>
      <Text style={styles.subtitle}>{errorMessage}</Text>
      <View style={styles.relayStatus}>
        <Text style={styles.relayStatusText}>
          Relays: {relayStatus.connected}/{relayStatus.total} connected
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          title="Retry Import"
          onPress={handleRetry}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Skip for Now"
          onPress={handleSkip}
          variant="primary"
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {importState === 'loading' && renderLoadingState()}
      {importState === 'success' && renderSuccessState()}
      {importState === 'no-profile' && renderNoProfileState()}
      {importState === 'error' && renderErrorState()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  header: {
    padding: 20,
    alignItems: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  loadingSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },

  spinner: {
    marginBottom: 20,
  },

  relayStatus: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  relayStatusText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  profileCard: {
    margin: 20,
    padding: 20,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  profileAvatar: {
    marginRight: 16,
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  profileNpub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },

  profileSection: {
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  sectionValue: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 20,
  },

  sectionNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },

  iconContainer: {
    marginBottom: 20,
  },

  icon: {
    fontSize: 48,
  },

  actions: {
    padding: 20,
    gap: 12,
  },

  continueButton: {
    marginBottom: 8,
  },

  actionButton: {
    marginBottom: 8,
  },

  skipButton: {
    padding: 12,
    alignItems: 'center',
  },

  skipButtonText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
});
