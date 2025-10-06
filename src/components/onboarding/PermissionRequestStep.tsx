/**
 * PermissionRequestStep Component
 * Bold location permission request matching app's fitness aesthetic
 * Uses orange accent theme and direct, action-oriented language
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationPermissionService } from '../../services/activity/LocationPermissionService';

interface PermissionRequestStepProps {
  onContinue: () => void;
  onSkip: () => void;
}

type PermissionState = 'pending' | 'requesting' | 'granted' | 'denied';

export const PermissionRequestStep: React.FC<PermissionRequestStepProps> = ({
  onContinue,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const [permissionState, setPermissionState] = useState<PermissionState>('pending');
  const [isLoading, setIsLoading] = useState(false);

  // Check if permissions are already granted on mount
  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      const status = await locationPermissionService.checkPermissionStatus();
      if (status.foreground === 'granted') {
        setPermissionState('granted');
      }
    } catch (error) {
      console.error('Error checking existing permissions:', error);
    }
  };

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    setPermissionState('requesting');

    try {
      console.log('📍 Requesting location permissions from onboarding...');

      // Request foreground permission first
      const foregroundGranted = await locationPermissionService.requestForegroundPermission();

      if (foregroundGranted) {
        setPermissionState('granted');

        // On iOS, wait a bit before requesting background to avoid dialog conflicts
        if (Platform.OS === 'ios') {
          setTimeout(async () => {
            // Request background permission (optional)
            await locationPermissionService.requestBackgroundPermission();
          }, 1000);
        } else {
          // On Android, request background immediately
          await locationPermissionService.requestBackgroundPermission();
        }
      } else {
        setPermissionState('denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionState('denied');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (permissionState === 'granted') {
      onContinue();
    } else {
      // If permissions denied, user can still continue (they can grant later)
      onSkip();
    }
  };

  const getIcon = () => {
    switch (permissionState) {
      case 'granted':
        return <Ionicons name="checkmark-circle" size={80} color={theme.colors.orangeBright} />;
      case 'denied':
        return <Ionicons name="location-outline" size={80} color={theme.colors.textSecondary} />;
      default:
        return <Ionicons name="location" size={80} color={theme.colors.orangeBright} />;
    }
  };

  const getTitle = () => {
    switch (permissionState) {
      case 'granted':
        return 'READY TO TRACK';
      case 'denied':
        return 'ENABLE LOCATION';
      default:
        return 'TRACK YOUR WORKOUTS';
    }
  };

  const getSubtitle = () => {
    switch (permissionState) {
      case 'granted':
        return "Your workouts will count toward competitions";
      case 'denied':
        return Platform.OS === 'ios'
          ? "Go to Settings → RUNSTR → Location to enable"
          : "Enable location to track distance and pace";
      default:
        return "Track distance, pace, and compete with your team";
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'REQUESTING...';
    if (permissionState === 'granted') return 'START COMPETING';
    if (permissionState === 'denied') return 'SKIP FOR NOW';
    return 'ENABLE LOCATION';
  };

  const shouldShowSkipButton = permissionState === 'pending' || permissionState === 'requesting';
  const shouldShowSettingsNote = permissionState === 'denied' && Platform.OS === 'ios';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>

      {/* Title */}
      <Text style={styles.title}>{getTitle()}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      {/* Feature Cards - Only show if not granted */}
      {permissionState !== 'granted' && (
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <Ionicons name="navigate" size={24} color={theme.colors.orangeBright} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>PRECISE TRACKING</Text>
              <Text style={styles.featureDescription}>Distance, pace & routes</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="trophy" size={24} color={theme.colors.orangeBright} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>TEAM COMPETITIONS</Text>
              <Text style={styles.featureDescription}>Earn Bitcoin rewards</Text>
            </View>
          </View>
        </View>
      )}

      {/* Success Card */}
      {permissionState === 'granted' && (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={32} color={theme.colors.orangeBright} />
          <Text style={styles.successText}>
            Location enabled. Ready to compete!
          </Text>
        </View>
      )}

      {/* Settings note for iOS denied state */}
      {shouldShowSettingsNote && (
        <View style={styles.settingsCard}>
          <Ionicons name="settings-outline" size={20} color={theme.colors.orangeBright} />
          <Text style={styles.settingsText}>
            Enable in Settings → Privacy → Location → RUNSTR
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Main Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoading && styles.actionButtonLoading,
          ]}
          onPress={permissionState === 'pending' || permissionState === 'requesting'
            ? handleRequestPermissions
            : handleContinue
          }
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <>
              <Ionicons
                name={permissionState === 'granted' ? 'arrow-forward' : 'location'}
                size={20}
                color={theme.colors.background}
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>{getButtonText()}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        {shouldShowSkipButton && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>
              SKIP FOR NOW
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 16,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
  },
  featureTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.orangeBright,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.orangeBright,
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 16,
    flex: 1,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  settingsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
  },
  actionButton: {
    backgroundColor: theme.colors.orangeBright,
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  actionButtonLoading: {
    backgroundColor: theme.colors.orangeDeep,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
