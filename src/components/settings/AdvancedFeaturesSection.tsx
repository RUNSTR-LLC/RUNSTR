/**
 * AdvancedFeaturesSection - Advanced features accordion for SettingsScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { ThemedSwitch } from '../ui/ThemedSwitch';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { useTranslation } from 'react-i18next';

interface AdvancedFeaturesSectionProps {
  wotScore: number | null;
  musicPlayerHeaderEnabled: boolean;
  onMusicPlayerHeaderToggle: (enabled: boolean) => void;
  hasNWCWallet: boolean;
  onDisconnectWallet: () => void;
  onShowWalletConfigModal: () => void;
  onShowQRScannerModal: () => void;
}

export const AdvancedFeaturesSection: React.FC<AdvancedFeaturesSectionProps> = ({
  wotScore,
  musicPlayerHeaderEnabled,
  onMusicPlayerHeaderToggle,
  hasNWCWallet,
  onDisconnectWallet,
  onShowWalletConfigModal,
  onShowQRScannerModal,
}) => {
  const { t } = useTranslation('settings');

  return (
    <View style={styles.section}>
      <SettingsAccordion title={t('advancedFeatures')} defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          {/* Wavlake Music - Only visible to WoT users */}
          {wotScore !== null && wotScore > 0 && (
            <SettingItem
              title="Wavlake"
              subtitle="Show music player in Profile header"
              rightElement={
                <ThemedSwitch
                  value={musicPlayerHeaderEnabled}
                  onValueChange={onMusicPlayerHeaderToggle}
                />
              }
            />
          )}

          {/* Connected Wallet Subsection */}
          <View style={styles.voiceSubsection}>
            <Text style={styles.subsectionTitle}>Connected Wallet</Text>
            {hasNWCWallet ? (
              <>
                <View style={styles.rewardSettingRow}>
                  <View style={styles.rewardSettingInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.statusConnected }} />
                      <Text style={styles.rewardSettingTitle}>NWC Wallet Connected</Text>
                    </View>
                    <Text style={styles.rewardSettingSubtitle}>
                      Your wallet is connected for in-app payments
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.error,
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                  onPress={onDisconnectWallet}
                >
                  <Text style={{ fontSize: 14, color: theme.colors.error, fontWeight: '600' }}>
                    Disconnect Wallet
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.rewardSettingRow}>
                  <View style={styles.rewardSettingInfo}>
                    <Text style={styles.rewardSettingTitle}>No wallet connected</Text>
                    <Text style={styles.rewardSettingSubtitle}>
                      Connect a wallet to enable in-app payments
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: theme.colors.text,
                      alignItems: 'center',
                    }}
                    onPress={onShowWalletConfigModal}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.background }}>
                      Paste NWC
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.text,
                      alignItems: 'center',
                    }}
                    onPress={onShowQRScannerModal}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.accent }}>
                      Scan QR
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

        </Card>
      </SettingsAccordion>
    </View>
  );
};
