/**
 * RewardDestinationPicker - Full-screen modal for selecting reward destination
 *
 * Allows users to choose where their 50-sat workout rewards go:
 * - YOU: Keep rewards (sent to user's Lightning address)
 * - SERVICES: PPQ.AI (AI credits)
 * - CHARITIES: ALS Network, HRF
 * - PROJECTS: Bitcoin circular economies worldwide
 *
 * Saves selection to @runstr:selected_team_id for backward compatibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  getCharitiesByCategory,
  SELF_TEAM_ID,
  isPPQTeam,
  isSelfTeam,
  Charity,
} from '../../constants/charities';
import { RewardLightningAddressService } from '../../services/rewards/RewardLightningAddressService';
import { NWCStorageService } from '../../services/wallet/NWCStorageService';
import { LightningAddressSetupModal } from '../wallet/LightningAddressSetupModal';
import { WalletConfigModal } from '../wallet/WalletConfigModal';
import { QRScannerModal } from '../qr/QRScannerModal';
import { NWCQRConfirmationModal } from '../wallet/NWCQRConfirmationModal';
import type { QRData } from '../../services/qr/QRCodeService';
import { useAuth } from '../../contexts/AuthContext';
import { PPQAccountService } from '../../services/ai/PPQAccountService';
import { PPQAccountSetupModal } from '../ai/PPQAccountSetupModal';
import { PPQCreditTopupModal } from '../ai/PPQCreditTopupModal';

const SELECTED_TEAM_KEY = '@runstr:selected_team_id';
const REWARD_LIGHTNING_ADDRESS_KEY = '@runstr:reward_lightning_address';

interface RewardDestinationPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDestinationId: string | null;
  onSelectDestination: (destinationId: string) => void;
}

export const RewardDestinationPicker: React.FC<RewardDestinationPickerProps> = ({
  visible,
  onClose,
  selectedDestinationId,
  onSelectDestination,
}) => {
  const { currentUser } = useAuth();
  const [userLightningAddress, setUserLightningAddress] = useState<string | null>(null);
  const [showLightningSetupModal, setShowLightningSetupModal] = useState(false);
  const [pendingSelfSelection, setPendingSelfSelection] = useState(false);

  // PPQ.AI top-up state
  const [showPPQSetupModal, setShowPPQSetupModal] = useState(false);
  const [showPPQTopupModal, setShowPPQTopupModal] = useState(false);

  // NWC wallet state
  const [hasNWCWallet, setHasNWCWallet] = useState(false);
  const [showWalletChoiceModal, setShowWalletChoiceModal] = useState(false);
  const [showWalletConfigModal, setShowWalletConfigModal] = useState(false);
  const [showQRScannerModal, setShowQRScannerModal] = useState(false);
  const [showNWCQRConfirmModal, setShowNWCQRConfirmModal] = useState(false);
  const [scannedNWCString, setScannedNWCString] = useState('');

  // Load user data on mount
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const [address, nwcAvailable] = await Promise.all([
        AsyncStorage.getItem(REWARD_LIGHTNING_ADDRESS_KEY),
        NWCStorageService.hasNWC(),
      ]);
      setUserLightningAddress(address);
      setHasNWCWallet(nwcAvailable);
    } catch (error) {
      console.error('[RewardDestinationPicker] Failed to load user data:', error);
    }
  };

  const handleSelect = useCallback(
    async (destinationId: string) => {
      try {
        // Self selection always shows wallet choice modal so user can set up or change
        if (isSelfTeam(destinationId)) {
          setPendingSelfSelection(true);
          setShowWalletChoiceModal(true);
          return;
        }

        await AsyncStorage.setItem(SELECTED_TEAM_KEY, destinationId);
        onSelectDestination(destinationId);
      } catch (error) {
        console.error('[RewardDestinationPicker] Failed to save selection:', error);
        Alert.alert('Error', 'Failed to save your selection. Please try again.');
      }
    },
    [onSelectDestination]
  );

  // Handle Lightning address setup success - auto-select Self
  const handleLightningSetupSuccess = useCallback(
    async (address: string) => {
      setShowLightningSetupModal(false);
      setUserLightningAddress(address);
      if (pendingSelfSelection) {
        try {
          await AsyncStorage.setItem(SELECTED_TEAM_KEY, SELF_TEAM_ID);
          onSelectDestination(SELF_TEAM_ID);
          setPendingSelfSelection(false);
          console.log('[RewardDestinationPicker] Self selected after Lightning setup');
        } catch (error) {
          console.error('[RewardDestinationPicker] Failed to save Self selection:', error);
        }
      }
    },
    [pendingSelfSelection, onSelectDestination]
  );

  const handleLightningSetupClose = useCallback(() => {
    setShowLightningSetupModal(false);
    setPendingSelfSelection(false);
  }, []);

  // NWC wallet choice handlers
  const handleWalletChoiceLightning = () => {
    setShowWalletChoiceModal(false);
    setTimeout(() => setShowLightningSetupModal(true), 50);
  };

  const handleWalletChoiceNWCScan = () => {
    setShowWalletChoiceModal(false);
    setTimeout(() => setShowQRScannerModal(true), 50);
  };

  const handleWalletChoiceNWCPaste = () => {
    setShowWalletChoiceModal(false);
    setTimeout(() => setShowWalletConfigModal(true), 50);
  };

  const handleNWCQRScanned = (data: QRData) => {
    if (data.type === 'nwc') {
      setScannedNWCString(data.connectionString);
      setTimeout(() => setShowNWCQRConfirmModal(true), 50);
    }
  };

  const handleNWCConnectSuccess = useCallback(async () => {
    setHasNWCWallet(true);
    setShowWalletConfigModal(false);
    setShowNWCQRConfirmModal(false);
    if (pendingSelfSelection) {
      try {
        await AsyncStorage.setItem(SELECTED_TEAM_KEY, SELF_TEAM_ID);
        onSelectDestination(SELF_TEAM_ID);
        setPendingSelfSelection(false);
        console.log('[RewardDestinationPicker] Self selected after NWC setup');
      } catch (error) {
        console.error('[RewardDestinationPicker] Failed to save Self selection:', error);
      }
    }
  }, [pendingSelfSelection, onSelectDestination]);

  // PPQ.AI sparkle tap - open top-up if account exists, otherwise setup
  const handlePPQSparklePress = useCallback(async () => {
    const hasAccount = await PPQAccountService.hasAccount();
    if (hasAccount) {
      setShowPPQTopupModal(true);
    } else {
      setShowPPQSetupModal(true);
    }
  }, []);

  const handlePPQSetupSuccess = useCallback(() => {
    setShowPPQSetupModal(false);
    setShowPPQTopupModal(true);
  }, []);

  const handleZap = useCallback((charity: Charity) => {
    if (!charity.lightningAddress) return;
    Alert.alert(
      `Zap ${charity.displayName}`,
      `Send sats to ${charity.lightningAddress} using your Lightning wallet (Cash App, Strike, Alby, Zeus).`,
      [{ text: 'OK' }]
    );
  }, []);

  // Get categorized charities
  const services = getCharitiesByCategory('service');
  const charities = getCharitiesByCategory('charity');
  const projects = getCharitiesByCategory('project');

  // PPQ.AI is the only service
  const ppqService = services.find((s) => s.isPPQ);

  const isSelected = (id: string) => selectedDestinationId === id;

  const renderDestinationCard = (
    charity: Charity,
    showZap: boolean = true
  ) => {
    const selected = isSelected(charity.id);
    return (
      <TouchableOpacity
        key={charity.id}
        style={[styles.destinationCard, selected && styles.destinationCardSelected]}
        onPress={() => handleSelect(charity.id)}
        activeOpacity={0.7}
      >
        {/* Avatar / Image */}
        <View style={styles.avatarContainer}>
          {charity.image ? (
            <Image source={charity.image} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="globe-outline" size={24} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationName} numberOfLines={1}>
            {charity.name}
          </Text>
          <Text style={styles.destinationDescription} numberOfLines={2}>
            {charity.description}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {showZap && charity.lightningAddress && (
            <TouchableOpacity
              style={styles.zapButton}
              onPress={() => handleZap(charity)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="flash-outline" size={18} color={theme.colors.orangeDeep} />
            </TouchableOpacity>
          )}
          {selected && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={theme.colors.orangeDeep}
              style={styles.checkIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Reward Destination</Text>
            <Text style={styles.headerSubtitle}>
              Choose where your 50-sat workout rewards go
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* YOU Section */}
          <Text style={styles.sectionLabel}>YOU</Text>
          <TouchableOpacity
            style={[
              styles.destinationCard,
              isSelected(SELF_TEAM_ID) && styles.destinationCardSelected,
            ]}
            onPress={() => handleSelect(SELF_TEAM_ID)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {currentUser?.picture ? (
                <Image source={{ uri: currentUser.picture }} style={styles.avatarImage} />
              ) : (
                <View style={styles.selfAvatarFallback}>
                  <Ionicons name="person-outline" size={24} color={theme.colors.orangeDeep} />
                </View>
              )}
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>
                {currentUser?.displayName || currentUser?.name || 'You'}
              </Text>
              {userLightningAddress ? (
                <Text style={styles.destinationDescription} numberOfLines={1}>
                  {userLightningAddress}
                </Text>
              ) : hasNWCWallet ? (
                <Text style={[styles.destinationDescription, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  NWC Wallet Connected
                </Text>
              ) : (
                <Text style={styles.ctaText}>Set up Lightning address or connect wallet</Text>
              )}
            </View>
            <View style={styles.actionsContainer}>
              {isSelected(SELF_TEAM_ID) && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={theme.colors.orangeDeep}
                  style={styles.checkIcon}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* SERVICES Section - PPQ.AI only */}
          <Text style={styles.sectionLabel}>SERVICES</Text>
          {ppqService && (
            <TouchableOpacity
              key={ppqService.id}
              style={[styles.destinationCard, isSelected(ppqService.id) && styles.destinationCardSelected]}
              onPress={() => handleSelect(ppqService.id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {ppqService.image ? (
                  <Image source={ppqService.image} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="globe-outline" size={24} color={theme.colors.textMuted} />
                  </View>
                )}
              </View>
              <View style={styles.destinationInfo}>
                <Text style={styles.destinationName}>{ppqService.name}</Text>
                <Text style={styles.destinationDescription}>{ppqService.description}</Text>
              </View>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.zapButton}
                  onPress={handlePPQSparklePress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="sparkles" size={18} color={theme.colors.orangeDeep} />
                </TouchableOpacity>
                {isSelected(ppqService.id) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={theme.colors.orangeDeep}
                    style={styles.checkIcon}
                  />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* CHARITIES Section */}
          <Text style={styles.sectionLabel}>CHARITIES</Text>
          {charities.map((charity) => renderDestinationCard(charity))}

          {/* PROJECTS Section */}
          <Text style={styles.sectionLabel}>PROJECTS</Text>
          {projects.map((project) => renderDestinationCard(project))}

          {/* Bottom padding for scroll */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      {/* Lightning Address Setup Modal - shown when Self selected without address */}
      <LightningAddressSetupModal
        visible={showLightningSetupModal}
        onClose={handleLightningSetupClose}
        onSuccess={handleLightningSetupSuccess}
      />

      {/* Wallet Choice Modal - shown when Self selected without any payment method */}
      <Modal
        visible={showWalletChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowWalletChoiceModal(false); setPendingSelfSelection(false); }}
      >
        <View style={styles.walletChoiceOverlay}>
          <View style={styles.walletChoiceContainer}>
            <Text style={styles.walletChoiceTitle}>Receive Rewards</Text>
            <Text style={styles.walletChoiceSubtitle}>
              Choose how you want to receive your workout rewards
            </Text>
            <TouchableOpacity
              style={styles.walletChoicePrimaryButton}
              onPress={handleWalletChoiceLightning}
            >
              <Ionicons name="flash" size={18} color={theme.colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.walletChoicePrimaryText}>Lightning Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.walletChoiceSecondaryButton}
              onPress={handleWalletChoiceNWCScan}
            >
              <Ionicons name="qr-code" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.walletChoiceSecondaryText}>Scan NWC QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.walletChoiceTertiaryButton}
              onPress={handleWalletChoiceNWCPaste}
            >
              <Ionicons name="clipboard" size={18} color={theme.colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.walletChoiceTertiaryText}>Paste NWC String</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.walletChoiceCancelButton}
              onPress={() => { setShowWalletChoiceModal(false); setPendingSelfSelection(false); }}
            >
              <Text style={styles.walletChoiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NWC Wallet Config Modal (paste) */}
      <WalletConfigModal
        visible={showWalletConfigModal}
        onClose={() => { setShowWalletConfigModal(false); setPendingSelfSelection(false); }}
        onSuccess={handleNWCConnectSuccess}
        allowSkip={false}
      />

      {/* NWC QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScannerModal}
        onClose={() => { setShowQRScannerModal(false); setPendingSelfSelection(false); }}
        onScanned={handleNWCQRScanned}
      />

      {/* NWC QR Confirmation Modal */}
      <NWCQRConfirmationModal
        visible={showNWCQRConfirmModal}
        onClose={() => { setShowNWCQRConfirmModal(false); setPendingSelfSelection(false); }}
        connectionString={scannedNWCString}
        onSuccess={handleNWCConnectSuccess}
      />

      {/* PPQ.AI Account Setup Modal */}
      <PPQAccountSetupModal
        visible={showPPQSetupModal}
        onClose={() => setShowPPQSetupModal(false)}
        onSuccess={handlePPQSetupSuccess}
      />

      {/* PPQ.AI Credit Top-up Modal */}
      <PPQCreditTopupModal
        visible={showPPQTopupModal}
        onClose={() => setShowPPQTopupModal(false)}
        onSuccess={() => setShowPPQTopupModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },

  headerTitleContainer: {
    flex: 1,
    marginRight: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#CC7A33',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },

  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  destinationCardSelected: {
    borderColor: theme.colors.orangeDeep,
    backgroundColor: 'rgba(255, 123, 28, 0.06)',
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },

  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selfAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 123, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  destinationInfo: {
    flex: 1,
    marginRight: 8,
  },

  destinationName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  destinationDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  ctaText: {
    fontSize: 13,
    color: theme.colors.orangeDeep,
    fontWeight: theme.typography.weights.medium,
  },

  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  zapButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkIcon: {
    marginLeft: 2,
  },

  bottomPadding: {
    height: 40,
  },

  // Wallet choice modal styles
  walletChoiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  walletChoiceContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  walletChoiceTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  walletChoiceSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  walletChoicePrimaryButton: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  walletChoicePrimaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  walletChoiceSecondaryButton: {
    flexDirection: 'row' as const,
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  walletChoiceSecondaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  walletChoiceTertiaryButton: {
    flexDirection: 'row' as const,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  walletChoiceTertiaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  walletChoiceCancelButton: {
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  walletChoiceCancelText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
