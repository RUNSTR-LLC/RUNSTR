/**
 * RewardsScreen - Wallet and earnings dashboard
 * Extracted from SettingsScreen to make wallet features more accessible
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { LightningAddressSetupModal } from '../components/wallet/LightningAddressSetupModal';
import { PledgeService } from '../services/pledge/PledgeService';
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


  // Reward destination state — defaults to self post cardio-only simplification
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(SELF_TEAM_ID);

  // Active pledge state
  const [activePledge, setActivePledge] = useState<Pledge | null>(null);

  // Charity zap modal state (for Teams tab zap functionality)
  const [showZapModal, setShowZapModal] = useState(false);

  // PPQ.AI credit topup modal state
  const [showPPQTopupModal, setShowPPQTopupModal] = useState(false);

  // Lightning address setup modal state (sole reward destination flow)
  const [showLightningSetup, setShowLightningSetup] = useState(false);

  const navigation = useNavigation();

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
      if (teamId !== null) setSelectedTeamId(teamId || SELF_TEAM_ID);

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
        setAlertTitle('Wrong QR Code Type');
        setAlertMessage('Please scan an NWC wallet connection QR code.');
        setAlertButtons([{ text: 'OK', onPress: () => setAlertVisible(false) }]);
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('[RewardsScreen] QR scan error:', error);
      setAlertTitle('Error');
      setAlertMessage('Failed to process QR code. Please try again.');
      setAlertButtons([{ text: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
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
        text1: 'Donated!',
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home' as never)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={styles.headerSpacer} />
      </View>
      <OstrichRefreshScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      >
        {/* Reward Destination - Where workout rewards go */}
        <RewardDestinationSection
          selectedTeamId={selectedTeamId}
          onChangePress={() => setShowLightningSetup(true)}
          onPPQTopupPress={handlePPQTopup}
          onZapPress={() => handleZapCharity()}
        />

        {/* Impact / Earnings */}
        {userHexPubkey && hasLightningAddress && (
          <EarningsHeroCard pubkey={userHexPubkey} isPPQ={isPPQTeam(selectedTeamId ?? undefined)} />
        )}
        {userHexPubkey && !hasLightningAddress && (
          <ImpactHeroCard pubkey={userHexPubkey} />
        )}

      </OstrichRefreshScrollView>

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

      {/* Lightning Address Setup — sole reward destination flow */}
      <LightningAddressSetupModal
        visible={showLightningSetup}
        onClose={() => setShowLightningSetup(false)}
        onSuccess={() => setShowLightningSetup(false)}
      />

      </TexturedBackground>
    </SafeAreaView>
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
});

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
export const RewardsScreen = React.memo(RewardsScreenComponent);
export default RewardsScreen;
