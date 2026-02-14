/**
 * RewardsScreen - Wallet and earnings dashboard
 * Extracted from SettingsScreen to make wallet features more accessible
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { CustomAlert } from '../components/ui/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NWCStorageService } from '../services/wallet/NWCStorageService';
import { NWCWalletService } from '../services/wallet/NWCWalletService';
import { WalletConfigModal } from '../components/wallet/WalletConfigModal';
import { SendModal } from '../components/wallet/SendModal';
import { ReceiveModal } from '../components/wallet/ReceiveModal';
import { HistoryModal } from '../components/wallet/HistoryModal';
import { QRScannerModal } from '../components/qr/QRScannerModal';
import { NWCQRConfirmationModal } from '../components/wallet/NWCQRConfirmationModal';
import type { QRData } from '../services/qr/QRCodeService';
import { getCharityById, isPPQTeam, isSelfTeam, SELF_TEAM_ID } from '../constants/charities';
import { ExternalZapModal } from '../components/nutzap/ExternalZapModal';
import Toast from 'react-native-toast-message';
import { EarningsHeroCard } from '../components/rewards/EarningsHeroCard';
import { ImpactHeroCard } from '../components/rewards/ImpactHeroCard';
import { TransparencyDashboardModal } from '../components/rewards/TransparencyDashboardModal';
import { RewardDestinationSection } from '../components/rewards/RewardDestinationSection';
import { RewardDestinationPicker } from '../components/rewards/RewardDestinationPicker';
import { PledgeService } from '../services/pledge/PledgeService';
import { ActivePledgeCard } from '../components/pledge/ActivePledgeCard';
import type { Pledge } from '../types/pledge';
import { useTranslation } from 'react-i18next';
import { SupabaseRewardService } from '../services/rewards/SupabaseRewardService';
import { RewardDestinationService } from '../services/rewards/RewardDestinationService';
import { PPQCreditTopupModal } from '../components/ai/PPQCreditTopupModal';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';

// Storage keys for donation settings
// Note: Teams are now charities (rebranded)
const SELECTED_TEAM_KEY = '@runstr:selected_team_id';

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
const RewardsScreenComponent: React.FC = () => {
  const { t } = useTranslation('rewards');

  // NWC Wallet state
  const [hasNWC, setHasNWC] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Rewards pool state
  const [poolBalance, setPoolBalance] = useState<number | null>(null);

  // Transparency dashboard modal
  const [showTransparencyDashboard, setShowTransparencyDashboard] = useState(false);

  const [showWalletConfig, setShowWalletConfig] = useState(false);

  // Wallet modals state
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNWCConfirmation, setShowNWCConfirmation] = useState(false);
  const [scannedNWCString, setScannedNWCString] = useState<string>('');

  // User pubkey for Impact Level
  const [userHexPubkey, setUserHexPubkey] = useState<string>('');

  // Lightning address state for conditional rendering
  const [hasLightningAddress, setHasLightningAddress] = useState(false);


  // Donation settings state (for zap modal)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>('als-foundation');

  // Active pledge state
  const [activePledge, setActivePledge] = useState<Pledge | null>(null);

  // Charity zap modal state (for Teams tab zap functionality)
  const [showZapModal, setShowZapModal] = useState(false);

  // PPQ.AI credit topup modal state
  const [showPPQTopupModal, setShowPPQTopupModal] = useState(false);

  // Reward destination picker modal state
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  // Self team profile state
  const [selfTeamProfile, setSelfTeamProfile] = useState<{ displayName?: string; picture?: string } | null>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<
    Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  >([]);

  // Load rewards pool balance from Supabase
  const loadPoolBalance = async () => {
    try {
      const result = await SupabaseRewardService.getRewardsPoolBalance();
      if (result) {
        setPoolBalance(result.balance);
      }
    } catch (error) {
      console.error('[RewardsScreen] Failed to load pool balance:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load rewards pool',
        text2: 'Pull down to retry',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  // Reload settings whenever screen gains focus (e.g., after selecting charity in TeamsScreen)
  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadPoolBalance();
    }, [])
  );

  const loadSettings = async () => {
    try {
      // Load npub
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (npub) {
        setUserNpub(npub);
      }

      // Check NWC wallet status
      const nwcAvailable = await NWCStorageService.hasNWC();
      setHasNWC(nwcAvailable);

      // Check Lightning address for conditional rendering
      const hasAddress = await RewardDestinationService.hasUserLightningAddress();
      setHasLightningAddress(hasAddress);

      // Load selected team for zap modal
      const teamId = await AsyncStorage.getItem(SELECTED_TEAM_KEY);
      if (teamId !== null) setSelectedTeamId(teamId || 'als-foundation');

      // Load user profile for self team display
      if (isSelfTeam(teamId || '')) {
        const profile = await DirectNostrProfileService.getCurrentUserProfile();
        if (profile) {
          setSelfTeamProfile({
            displayName: profile.displayName || profile.name,
            picture: profile.picture,
          });
        }
      }

      // Load user pubkey and active pledge
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (pubkey) {
        setUserHexPubkey(pubkey);

        // Load active pledge
        const pledge = await PledgeService.getActivePledge(pubkey);
        setActivePledge(pledge);
      }
    } catch (error) {
      console.error('[RewardsScreen] Error loading settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load settings',
        text2: 'Pull down to retry',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadSettings(), loadPoolBalance()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWalletConfigSuccess = async () => {
    // NWC was just saved - set state directly
    setHasNWC(true);
    // Fetch balance immediately (like v1.0.0)
    // Safe now that modal state conflict is fixed via setTimeout deferral
    const result = await NWCWalletService.getBalance();
    if (!result.error) {
      setWalletBalance(result.balance);
    }
  };

  const handleQRScanned = (qrData: QRData) => {
    try {
      if (qrData.type === 'nwc') {
        if (!qrData.connectionString || typeof qrData.connectionString !== 'string') {
          throw new Error('Invalid NWC connection string');
        }
        setScannedNWCString(qrData.connectionString);
        setShowNWCConfirmation(true);
      } else {
        Alert.alert(
          'Wrong QR Code Type',
          'Please scan an NWC wallet connection QR code.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[RewardsScreen] QR scan error:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleNWCConnected = async () => {
    // Just update NWC status - DON'T call loadSettings() which would try to fetch balance
    const nwcAvailable = await NWCStorageService.hasNWC();
    setHasNWC(nwcAvailable);
    setShowNWCConfirmation(false);
    // Balance will be 0 until user taps refresh - this is intentional
  };

  // Get selected team (charity) data for zap modal
  // Self team is dynamic, not in CHARITIES array
  const selectedTeam = isSelfTeam(selectedTeamId || '')
    ? {
        id: SELF_TEAM_ID,
        name: selfTeamProfile?.displayName || 'You',
        displayName: selfTeamProfile?.displayName || 'You',
        description: 'Rewards go to your Lightning address',
        lightningAddress: undefined as string | undefined,
        isSelf: true as const,
        image: undefined,
      }
    : selectedTeamId
      ? getCharityById(selectedTeamId)
      : null;

  // Handle zap to charity - opens ExternalZapModal
  const handleZapCharity = () => {
    if (!selectedTeam) return;
    setShowZapModal(true);
  };

  // Handle successful zap
  const handleZapSuccess = () => {
    if (selectedTeam) {
      Toast.show({
        type: 'success',
        text1: 'Zapped!',
        text2: `Donation to ${selectedTeam.name} verified!`,
        position: 'top',
        visibilityTime: 3000,
      });
    }
    setShowZapModal(false);
  };

  // Handle PPQ.AI credit topup
  const handlePPQTopup = () => {
    setShowPPQTopupModal(true);
  };

  // Handle successful PPQ topup
  const handlePPQTopupSuccess = () => {
    Toast.show({
      type: 'success',
      text1: 'Credits Added!',
      text2: 'AI credits have been topped up.',
      position: 'top',
      visibilityTime: 3000,
    });
    setShowPPQTopupModal(false);
  };

  return (
    <TexturedBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Rewards Pool - Live balance from Supabase */}
        <TouchableOpacity
          style={styles.prizePoolCard}
          onPress={() => setShowTransparencyDashboard(true)}
          activeOpacity={0.7}
        >
          <View style={styles.prizePoolHeader}>
            <Text style={styles.prizePoolLabel}>{t('rewardsPool', { defaultValue: 'Rewards Pool' })}</Text>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.prizePoolAmount}>
            {poolBalance !== null
              ? `${poolBalance.toLocaleString()} sats`
              : t('loading', { defaultValue: '-- sats' })}
          </Text>
        </TouchableOpacity>

        {/* Earnings Hero Card - Only shown when user has Lightning address */}
        {userHexPubkey && hasLightningAddress && (
          <EarningsHeroCard pubkey={userHexPubkey} />
        )}

        {/* Impact Hero Card - Only shown when user does NOT have Lightning address */}
        {userHexPubkey && !hasLightningAddress && (
          <ImpactHeroCard pubkey={userHexPubkey} />
        )}

        {/* Reward Destination - Where workout rewards go */}
        <RewardDestinationSection
          selectedTeamId={selectedTeamId}
          onChangePress={() => setShowDestinationPicker(true)}
          onZapPress={() => {
            if (selectedTeam && isPPQTeam(selectedTeam.id)) {
              handlePPQTopup();
            } else {
              handleZapCharity();
            }
          }}
        />

        {/* How It Works Section */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>{t('howItWorks', { defaultValue: 'HOW IT WORKS' })}</Text>

          <View style={styles.rewardRow}>
            <Ionicons name="fitness-outline" size={20} color="#FF9D42" />
            <View style={styles.rewardTextSection}>
              <Text style={styles.rewardLabel}>{t('dailyWorkout', { defaultValue: '3km+ Cardio' })}</Text>
              <Text style={styles.rewardValue}>50 sats</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <Ionicons name="footsteps-outline" size={20} color="#FF9D42" />
            <View style={styles.rewardTextSection}>
              <Text style={styles.rewardLabel}>{t('tenKSteps', { defaultValue: '10,000 Steps' })}</Text>
              <Text style={styles.rewardValue}>50 sats</Text>
            </View>
          </View>

          <Text style={styles.howItWorksDescription}>
            {hasLightningAddress
              ? t('howItWorksDescriptionWithLN', { defaultValue: 'Run, walk, or cycle 3km+ OR hit 10k steps daily to earn real Bitcoin. Rewards are sent directly to your Lightning address.' })
              : t('howItWorksDescriptionWithoutLN', { defaultValue: "Run, walk, or cycle 3km+ OR hit 10k steps daily to earn rewards for your team's charity." })}
          </Text>
        </View>

        {/* Active Pledge Section (only shown if user has active pledge) */}
        {activePledge && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('activePledge', { defaultValue: 'ACTIVE PLEDGE' })}</Text>
            <ActivePledgeCard pledge={activePledge} />
          </View>
        )}

      </ScrollView>

      {/* Modals */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />

      <WalletConfigModal
        visible={showWalletConfig}
        onClose={() => setShowWalletConfig(false)}
        onSuccess={handleWalletConfigSuccess}
        allowSkip={true}
      />

      <SendModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        currentBalance={walletBalance}
      />

      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        currentBalance={walletBalance}
        userNpub={userNpub}
      />

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* External Zap Modal for charity donations (only for teams with Lightning address, not PPQ.AI) */}
      {selectedTeam && selectedTeam.lightningAddress && !isPPQTeam(selectedTeam.id) && (
        <ExternalZapModal
          visible={showZapModal}
          recipientNpub={selectedTeam.lightningAddress}
          recipientName={selectedTeam.name}
          memo={`Donation to ${selectedTeam.name}`}
          onClose={() => setShowZapModal(false)}
          onSuccess={handleZapSuccess}
          isCharityDonation={true}
          charityId={selectedTeam.id}
          charityLightningAddress={selectedTeam.lightningAddress}
        />
      )}

      {/* PPQ.AI Credit Top-up Modal */}
      <PPQCreditTopupModal
        visible={showPPQTopupModal}
        onClose={() => setShowPPQTopupModal(false)}
        onSuccess={handlePPQTopupSuccess}
      />

      {showQRScanner && (
        <QRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScanned={handleQRScanned}
        />
      )}

      {showNWCConfirmation && (
        <NWCQRConfirmationModal
          visible={showNWCConfirmation}
          onClose={() => setShowNWCConfirmation(false)}
          connectionString={scannedNWCString}
          onSuccess={handleNWCConnected}
        />
      )}

      {/* Rewards Transparency Dashboard Modal */}
      <TransparencyDashboardModal
        visible={showTransparencyDashboard}
        onClose={() => setShowTransparencyDashboard(false)}
        initialPoolBalance={poolBalance}
      />

      {/* Reward Destination Picker Modal */}
      <RewardDestinationPicker
        visible={showDestinationPicker}
        onClose={() => setShowDestinationPicker(false)}
        selectedDestinationId={selectedTeamId}
        onSelectDestination={(destinationId) => {
          setSelectedTeamId(destinationId);
          setShowDestinationPicker(false);
        }}
      />
    </TexturedBackground>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    padding: 16,
  },
  walletCard: {
    padding: 16,
  },

  // Compact balance header
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  headerIconButton: {
    padding: 6,
  },
  refreshButton: {
    padding: 6,
  },

  // Wallet actions
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletActionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  walletActionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },

  // Quick zap amount styles
  zapSettingContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  zapSettingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  zapSettingLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  zapAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  zapAmountButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  zapAmountButtonActive: {
    backgroundColor: theme.colors.orangeBright,
    borderColor: theme.colors.orangeBright,
  },
  zapAmountButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  zapAmountButtonTextActive: {
    color: '#000',
  },

  // Connect wallet styles
  connectWalletContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  connectWalletTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  connectWalletDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  connectWalletButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  connectWalletButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
  },
  connectWalletButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  connectWalletButtonTextSecondary: {
    color: theme.colors.text,
  },

  // Lightning address styles
  lightningAddressDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  lightningAddressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lightningAddressInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  lightningAddressInputError: {
    borderColor: theme.colors.error || '#ff4444',
  },
  lightningAddressSaveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  lightningAddressSaveButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  lightningAddressError: {
    color: theme.colors.error || '#ff4444',
    fontSize: 12,
    marginTop: 6,
  },

  // Prize Pool card styles
  prizePoolCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  prizePoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prizePoolLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  prizePoolAmount: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },

  // Accordion styles
  accordionContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    marginBottom: 12,
  },

  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },

  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  accordionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    letterSpacing: 1,
  },

  accordionContent: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  // How It Works card styles
  howItWorksCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
  },
  howItWorksTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    letterSpacing: 1,
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rewardTextSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardLabel: {
    fontSize: 14,
    color: '#fff',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },
  howItWorksDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    lineHeight: 18,
  },
});

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
export const RewardsScreen = React.memo(RewardsScreenComponent);
export default RewardsScreen;
