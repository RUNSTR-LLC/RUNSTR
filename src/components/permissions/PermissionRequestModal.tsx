/**
 * PermissionRequestModal - Non-dismissible modal for requesting permissions
 * Shows over main app when required permissions are missing
 * Handles new users, returning users, and reinstalled app scenarios
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { appPermissionService } from '../../services/initialization/AppPermissionService';

interface PermissionRequestModalProps {
  visible?: boolean;
  onComplete: () => void;
}

type PermissionState = 'pending' | 'requesting' | 'granted' | 'error';

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  visible = true,
  onComplete,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [locationState, setLocationState] =
    useState<PermissionState>('pending');
  const [batteryState, setBatteryState] = useState<PermissionState>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check which permissions are already granted on mount
  useEffect(() => {
    checkExistingPermissions();
  }, []);

  // Re-check permissions when app returns to foreground (after Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        console.log('[PermissionRequestModal] App returned to foreground, re-checking permissions...');
        checkExistingPermissions();
      }
    });
    return () => subscription?.remove();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      const status = await appPermissionService.checkAllPermissions();

      setLocationState(status.location ? 'granted' : 'pending');
      setBatteryState(status.batteryOptimization ? 'granted' : 'pending');

      // If all granted, close modal automatically
      if (status.allGranted) {
        onComplete();
      }
    } catch (error) {
      console.error('Error checking existing permissions:', error);
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    setErrorMessage('');

    try {
      console.log('[PermissionRequestModal] Starting permission request...');

      // Request all permissions
      const success = await appPermissionService.requestAllPermissions();

      if (success) {
        // Update states based on final status
        const finalStatus = await appPermissionService.checkAllPermissions();

        setLocationState(finalStatus.location ? 'granted' : 'error');
        setBatteryState(finalStatus.batteryOptimization ? 'granted' : 'error');

        if (finalStatus.allGranted) {
          console.log('[PermissionRequestModal] ✅ All permissions granted');
          // Call onComplete immediately - iOS timing will be handled in App.tsx
          onComplete();
        } else {
          setErrorMessage(
            'Some permissions were not granted. Background tracking may be limited.'
          );
        }
      } else {
        setErrorMessage(
          'Failed to get required permissions. Please enable permissions in Settings and restart the app.'
        );
        setLocationState('error');
        setBatteryState('error');
      }
    } catch (error) {
      console.error(
        '[PermissionRequestModal] Error requesting permissions:',
        error
      );
      setErrorMessage(
        'An error occurred. Please try again or enable permissions in Settings.'
      );
      setLocationState('error');
      setBatteryState('error');
    } finally {
      setIsRequesting(false);
    }
  };

  const getStateIcon = (state: PermissionState) => {
    switch (state) {
      case 'granted':
        return (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={theme.colors.orangeBright}
          />
        );
      case 'error':
        return <Ionicons name="close-circle" size={24} color={theme.colors.accent} />;
      case 'requesting':
        return (
          <ActivityIndicator size="small" color={theme.colors.orangeBright} />
        );
      default:
        return (
          <Ionicons
            name="radio-button-off"
            size={24}
            color={theme.colors.textSecondary}
          />
        );
    }
  };

  const allGranted =
    locationState === 'granted' && batteryState === 'granted';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {}} // Prevent dismissal on Android back button
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons
              name="shield-checkmark"
              size={48}
              color={theme.colors.orangeBright}
            />
            <Text style={styles.title}>PERMISSIONS REQUIRED</Text>
            <Text style={styles.subtitle}>
              RUNSTR needs these permissions to track your workouts accurately,
              even when using other apps like music players.
            </Text>
          </View>

          {/* Permission List */}
          <View style={styles.permissionList}>
            {/* Location Permission */}
            <View style={styles.permissionItem}>
              {getStateIcon(locationState)}
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>Location Access</Text>
                <Text style={styles.permissionDescription}>
                  Track distance, pace, and routes during workouts
                </Text>
              </View>
            </View>

            {/* Battery Optimization */}
            {Platform.OS === 'android' && (
              <View style={styles.permissionItem}>
                {getStateIcon(batteryState)}
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>
                    Battery Optimization
                  </Text>
                  <Text style={styles.permissionDescription}>
                    Prevent Android from stopping tracking in background
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color={theme.colors.accent} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            {!allGranted ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isRequesting && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleRequestPermissions}
                  disabled={isRequesting}
                  activeOpacity={0.7}
                >
                  {isRequesting ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.background}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color={theme.colors.background}
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.primaryButtonText}>
                        GRANT PERMISSIONS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Settings Button (if errors) */}
                {errorMessage && Platform.OS === 'android' ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => Linking.openSettings()}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color={theme.colors.text}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.secondaryButtonText}>
                      OPEN SETTINGS
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onComplete}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={theme.colors.background}
                  style={styles.buttonIcon}
                />
                <Text style={styles.primaryButtonText}>CONTINUE</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Ionicons
              name="lock-closed"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.privacyText}>
              Your data stays on your device. We never sell or share your
              information.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionList: {
    gap: 16,
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  permissionText: {
    marginLeft: 16,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.accent,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.orangeBright,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.orangeDeep,
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.background,
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  privacyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
