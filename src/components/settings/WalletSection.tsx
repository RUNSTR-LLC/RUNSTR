/**
 * WalletSection — Settings entry for wallet configuration.
 * Contains: Rewards destination + NWC wallet connection.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface WalletSectionProps {
  onRewardsPress: () => void;
  hasNWCWallet: boolean;
  onDisconnectWallet: () => void;
  onShowWalletConfigModal: () => void;
  onShowQRScannerModal: () => void;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  onRewardsPress,
  hasNWCWallet,
  onDisconnectWallet,
  onShowWalletConfigModal,
  onShowQRScannerModal,
}) => (
  <View style={styles.section}>
    <SettingsAccordion title="Wallet" defaultExpanded={false}>
      <Card style={styles.accordionCard}>
        <SettingItem
          title="Rewards"
          subtitle="Choose where your rewards go"
          onPress={onRewardsPress}
          rightElement={
            <View style={styles.securityIcon}>
              <Ionicons
                name="flash-outline"
                size={20}
                color={theme.colors.text}
              />
            </View>
          }
        />

        <View style={styles.voiceSubsection}>
          <Text style={styles.subsectionTitle}>Connected Wallet</Text>
          {hasNWCWallet ? (
            <>
              <View style={styles.rewardSettingRow}>
                <View style={styles.rewardSettingInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.statusConnected,
                      }}
                    />
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
                  <Text
                    style={{ fontSize: 14, fontWeight: '600', color: theme.colors.background }}
                  >
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
