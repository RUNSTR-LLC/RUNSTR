/**
 * TeamsScreen - Bitcoin circular economy teams (formerly charities)
 * Users can select ONE team at a time to support with their workouts
 * Selections are stored in AsyncStorage and added to kind 1301/kind 1 posts
 * Features Lightning zap buttons for donations (tap = QR modal, long-press = quick NWC zap)
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { CHARITIES, Charity, isPPQTeam, isCoinOSTeam } from '../constants/charities';
import { ExternalZapModal } from '../components/nutzap/ExternalZapModal';
import { useNWCZap } from '../hooks/useNWCZap';
import { NWCWalletService } from '../services/wallet/NWCWalletService';
import { getInvoiceFromLightningAddress } from '../utils/lnurl';
import { PPQAccountSetupModal } from '../components/ai/PPQAccountSetupModal';
import { PPQCreditTopupModal } from '../components/ai/PPQCreditTopupModal';
import { PPQAccountService } from '../services/ai/PPQAccountService';
import { CoinOSAccountSetupModal } from '../components/wallet/CoinOSAccountSetupModal';
import { CoinOSWalletModal } from '../components/wallet/CoinOSWalletModal';
import { CoinOSAccountService } from '../services/wallet/CoinOSAccountService';

// Storage key - charities are now stored as "teams"
const SELECTED_TEAM_KEY = '@runstr:selected_team_id';
const DEFAULT_TEAM_ID = 'als-foundation'; // ALS Network - honoring Hal Finney

interface TeamCardProps {
  charity: Charity;
  isSelected: boolean;
  onSelect: () => void;
  onZapPress: () => void;
  onZapLongPress: () => void;
  isZapping: boolean;
  hideZapButton?: boolean; // For PPQ.AI / CoinOS teams (no static lightning address)
  onTopUp?: () => void; // For PPQ.AI sparkle badge tap
  onWallet?: () => void; // For CoinOS wallet badge tap
}

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
const TeamCardComponent: React.FC<TeamCardProps> = ({
  charity,
  isSelected,
  onSelect,
  onZapPress,
  onZapLongPress,
  isZapping,
  hideZapButton,
  onTopUp,
  onWallet,
}) => {
  const { t } = useTranslation('charities');
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleZapPress = () => {
    animatePress();
    onZapPress();
  };

  const handleZapLongPress = () => {
    animatePress();
    onZapLongPress();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {charity.image ? (
        <Image source={charity.image} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="people" size={24} color={theme.colors.textMuted} />
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {charity.name}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {t(`descriptions.${charity.id}`, { defaultValue: charity.description })}
        </Text>
      </View>

      {/* Zap Button - Hidden for PPQ.AI team */}
      {!hideZapButton && (
        <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
          <TouchableOpacity
            onPress={handleZapPress}
            onLongPress={handleZapLongPress}
            style={[
              styles.zapButton,
              isZapping && styles.zappingButton,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            delayLongPress={500}
            disabled={isZapping}
          >
            <Ionicons
              name="flash-outline"
              size={16}
              color={theme.colors.orangeBright}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
      {/* AI Badge for PPQ.AI team - tappable for credit top-up */}
      {hideZapButton && charity.isPPQ && (
        <TouchableOpacity
          style={styles.aiTeamBadge}
          onPress={onTopUp}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={14} color="#FF9D42" />
        </TouchableOpacity>
      )}
      {/* Wallet Badge for CoinOS team - tappable for wallet */}
      {hideZapButton && charity.isCoinOS && (
        <TouchableOpacity
          style={styles.aiTeamBadge}
          onPress={onWallet}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={14} color="#FF9D42" />
        </TouchableOpacity>
      )}

      {/* Selection Checkmark */}
      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={theme.colors.success}
          style={styles.checkmark}
        />
      )}
    </TouchableOpacity>
  );
};

const TeamCard = React.memo(TeamCardComponent);

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
const TeamsScreenComponent: React.FC = () => {
  const { t } = useTranslation('teams');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Zap modal state
  const [showZapModal, setShowZapModal] = useState(false);
  const [zapTargetCharity, setZapTargetCharity] = useState<Charity | null>(null);
  const [zappingCharityId, setZappingCharityId] = useState<string | null>(null);
  const [defaultZapAmount, setDefaultZapAmount] = useState(21);

  // PPQ.AI modal state
  const [showPPQSetupModal, setShowPPQSetupModal] = useState(false);
  const [showPPQTopupModal, setShowPPQTopupModal] = useState(false);
  const [pendingPPQSelection, setPendingPPQSelection] = useState(false);

  // CoinOS modal state
  const [showCoinOSSetupModal, setShowCoinOSSetupModal] = useState(false);
  const [showCoinOSWalletModal, setShowCoinOSWalletModal] = useState(false);
  const [pendingCoinOSSelection, setPendingCoinOSSelection] = useState(false);

  // NWC hook for wallet operations
  const { hasWallet, refreshBalance } = useNWCZap();

  // Reload selected team whenever screen gains focus
  // (e.g., after selecting team on Einundzwanzig screen)
  useFocusEffect(
    useCallback(() => {
      const loadState = async () => {
        try {
          const [teamId, storedZapAmount] = await Promise.all([
            AsyncStorage.getItem(SELECTED_TEAM_KEY),
            AsyncStorage.getItem('@runstr:default_zap_amount'),
          ]);

          // Use default team (ALS Network) if none selected
          if (teamId) {
            setSelectedTeamId(teamId);
          } else {
            // Auto-select default team and save it
            setSelectedTeamId(DEFAULT_TEAM_ID);
            await AsyncStorage.setItem(SELECTED_TEAM_KEY, DEFAULT_TEAM_ID);
          }
          if (storedZapAmount) setDefaultZapAmount(parseInt(storedZapAmount, 10) || 21);
        } catch (error) {
          console.error('[TeamsScreen] Error loading state:', error);
        }
      };
      loadState();
    }, [])
  );

  const handleSelectTeam = useCallback(async (charityId: string) => {
    try {
      // Special handling for PPQ.AI team
      if (isPPQTeam(charityId)) {
        const hasAccount = await PPQAccountService.hasAccount();
        if (!hasAccount) {
          setPendingPPQSelection(true);
          setShowPPQSetupModal(true);
          return;
        }
        console.log('[TeamsScreen] PPQ.AI team selected (account exists)');
      }

      // Special handling for CoinOS team
      if (isCoinOSTeam(charityId)) {
        const hasAccount = await CoinOSAccountService.hasAccount();
        if (!hasAccount) {
          setPendingCoinOSSelection(true);
          setShowCoinOSSetupModal(true);
          return;
        }
        console.log('[TeamsScreen] CoinOS team selected (account exists)');
      }

      // Select the team (no toggle - always keeps a team selected)
      await AsyncStorage.setItem(SELECTED_TEAM_KEY, charityId);
      setSelectedTeamId(charityId);
      console.log('[TeamsScreen] Selected team:', charityId);
    } catch (error) {
      console.error('[TeamsScreen] Error saving team selection:', error);
    }
  }, []);

  // Handle PPQ setup completion
  const handlePPQSetupSuccess = useCallback(async () => {
    setShowPPQSetupModal(false);
    if (pendingPPQSelection) {
      // Now complete the PPQ team selection
      await AsyncStorage.setItem(SELECTED_TEAM_KEY, 'ppq-ai');
      setSelectedTeamId('ppq-ai');
      setPendingPPQSelection(false);
      Toast.show({
        type: 'reward',
        text1: 'PPQ.AI Team Joined',
        text2: 'Your workout rewards will earn AI credits',
        position: 'top',
        visibilityTime: 3000,
      });
      console.log('[TeamsScreen] PPQ.AI team selected after setup');
    }
  }, [pendingPPQSelection]);

  const handlePPQSetupClose = useCallback(() => {
    setShowPPQSetupModal(false);
    setPendingPPQSelection(false);
  }, []);

  // Handle sparkle badge tap - open top-up if account exists, otherwise setup
  const handlePPQSparklePress = useCallback(async () => {
    const hasAccount = await PPQAccountService.hasAccount();
    if (hasAccount) {
      setShowPPQTopupModal(true);
    } else {
      setShowPPQSetupModal(true);
    }
  }, []);

  const handlePPQTopupSuccess = useCallback(() => {
    Toast.show({
      type: 'success',
      text1: 'Credits Added!',
      text2: 'AI credits have been topped up.',
      position: 'top',
      visibilityTime: 3000,
    });
    setShowPPQTopupModal(false);
  }, []);

  // Handle CoinOS setup completion
  const handleCoinOSSetupSuccess = useCallback(async () => {
    setShowCoinOSSetupModal(false);
    if (pendingCoinOSSelection) {
      await AsyncStorage.setItem(SELECTED_TEAM_KEY, 'coinos');
      setSelectedTeamId('coinos');
      setPendingCoinOSSelection(false);
      Toast.show({
        type: 'reward',
        text1: 'Bitcoin Wallet Connected',
        text2: 'Your workout rewards will go to your wallet',
        position: 'top',
        visibilityTime: 3000,
      });
      console.log('[TeamsScreen] CoinOS team selected after setup');
    }
  }, [pendingCoinOSSelection]);

  const handleCoinOSSetupClose = useCallback(() => {
    setShowCoinOSSetupModal(false);
    setPendingCoinOSSelection(false);
  }, []);

  // Handle CoinOS wallet badge tap - open wallet if account exists, otherwise setup
  const handleCoinOSWalletPress = useCallback(async () => {
    const hasAccount = await CoinOSAccountService.hasAccount();
    if (hasAccount) {
      setShowCoinOSWalletModal(true);
    } else {
      setShowCoinOSSetupModal(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const teamId = await AsyncStorage.getItem(SELECTED_TEAM_KEY);
      if (teamId) setSelectedTeamId(teamId);
    } catch (error) {
      console.error('[TeamsScreen] Error refreshing:', error);
    }
    setIsRefreshing(false);
  }, []);

  // Single tap - open ExternalZapModal (handles invoice creation and verification)
  const handleZapPress = (charity: Charity) => {
    // Skip for special teams (no static lightning address)
    if (isPPQTeam(charity.id) || isCoinOSTeam(charity.id) || !charity.lightningAddress) {
      return;
    }
    console.log(`[TeamsScreen] Opening zap modal for ${charity.name}`);
    setZapTargetCharity(charity);
    setShowZapModal(true);
  };

  // Long press - quick NWC zap
  const handleZapLongPress = async (charity: Charity) => {
    // Skip for special teams (no static lightning address)
    if (isPPQTeam(charity.id) || isCoinOSTeam(charity.id) || !charity.lightningAddress) {
      return;
    }

    if (!hasWallet) {
      Toast.show({
        type: 'error',
        text1: t('noWalletConnected'),
        text2: t('noWalletDescription'),
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    // Get FRESH balance directly from service (useNWCZap hook balance can be stale)
    const freshBalance = await NWCWalletService.getBalance();
    if (freshBalance.error || freshBalance.balance < defaultZapAmount) {
      Toast.show({
        type: 'error',
        text1: t('insufficientBalance'),
        text2: t('insufficientBalanceDescription', { amount: defaultZapAmount, balance: freshBalance.balance }),
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setZappingCharityId(charity.id);
    try {
      console.log(`[TeamsScreen] Quick NWC zap to ${charity.name} with ${defaultZapAmount} sats`);

      const { invoice } = await getInvoiceFromLightningAddress(
        charity.lightningAddress,
        defaultZapAmount,
        `Donation to ${charity.name}`
      );

      if (!invoice) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('failedToGetInvoice'),
          position: 'top',
          visibilityTime: 4000,
        });
        return;
      }

      const paymentResult = await NWCWalletService.sendPayment(invoice);

      if (paymentResult.success) {
        await refreshBalance();
        Toast.show({
          type: 'reward',
          text1: t('zapped'),
          text2: t('donated', { amount: defaultZapAmount, name: charity.name }),
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: paymentResult.error || t('failedToProcessDonation'),
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('[TeamsScreen] Quick zap error:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failedToProcessDonationExternal'),
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setZappingCharityId(null);
    }
  };

  // Handle verified payment confirmation (called when payment detected)
  const handleZapSuccess = async () => {
    if (zapTargetCharity) {
      Toast.show({
        type: 'reward',
        text1: t('thankYou'),
        text2: t('donationVerified', { name: zapTargetCharity.name }),
        position: 'top',
        visibilityTime: 3000,
      });
      await refreshBalance();
    }
    setShowZapModal(false);
    setZapTargetCharity(null);
  };

  // Find selected team object (memoized to avoid repeated linear scans)
  const selectedTeam = useMemo(
    () => (selectedTeamId ? CHARITIES.find((c) => c.id === selectedTeamId) : null),
    [selectedTeamId]
  );

  // Sort teams alphabetically by name once (CHARITIES is static)
  const sortedCharities = useMemo(
    () => [...CHARITIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  return (
    <TexturedBackground>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.orangeBright}
          />
        }
      >
        {/* Your Selected Team */}
        {selectedTeam && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('yourTeam')}</Text>
            <TeamCard
              charity={selectedTeam}
              isSelected={true}
              onSelect={() => handleSelectTeam(selectedTeam.id)}
              onZapPress={() => handleZapPress(selectedTeam)}
              onZapLongPress={() => handleZapLongPress(selectedTeam)}
              isZapping={zappingCharityId === selectedTeam.id}
              hideZapButton={isPPQTeam(selectedTeam.id) || isCoinOSTeam(selectedTeam.id)}
              onTopUp={isPPQTeam(selectedTeam.id) ? handlePPQSparklePress : undefined}
              onWallet={isCoinOSTeam(selectedTeam.id) ? handleCoinOSWalletPress : undefined}
            />
          </View>
        )}

        {/* All Teams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('allTeams')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('selectTeamSubtitle')}
          </Text>
          {sortedCharities.map((charity) => (
            <TeamCard
              key={charity.id}
              charity={charity}
              isSelected={selectedTeamId === charity.id}
              onSelect={() => handleSelectTeam(charity.id)}
              onZapPress={() => handleZapPress(charity)}
              onZapLongPress={() => handleZapLongPress(charity)}
              isZapping={zappingCharityId === charity.id}
              hideZapButton={isPPQTeam(charity.id) || isCoinOSTeam(charity.id)}
              onTopUp={isPPQTeam(charity.id) ? handlePPQSparklePress : undefined}
              onWallet={isCoinOSTeam(charity.id) ? handleCoinOSWalletPress : undefined}
            />
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* External Zap Modal with charity donation verification */}
      {zapTargetCharity && zapTargetCharity.lightningAddress && (
        <ExternalZapModal
          visible={showZapModal}
          recipientNpub={zapTargetCharity.lightningAddress}
          recipientName={zapTargetCharity.name}
          memo={`Donation to ${zapTargetCharity.name}`}
          onClose={() => {
            setShowZapModal(false);
            setZapTargetCharity(null);
          }}
          onSuccess={handleZapSuccess}
          isCharityDonation={true}
          charityId={zapTargetCharity.id}
          charityLightningAddress={zapTargetCharity.lightningAddress}
        />
      )}

      {/* PPQ.AI Account Setup Modal */}
      <PPQAccountSetupModal
        visible={showPPQSetupModal}
        onClose={handlePPQSetupClose}
        onSuccess={handlePPQSetupSuccess}
      />

      {/* PPQ.AI Credit Top-up Modal */}
      <PPQCreditTopupModal
        visible={showPPQTopupModal}
        onClose={() => setShowPPQTopupModal(false)}
        onSuccess={handlePPQTopupSuccess}
      />

      {/* CoinOS Account Setup Modal */}
      <CoinOSAccountSetupModal
        visible={showCoinOSSetupModal}
        onClose={handleCoinOSSetupClose}
        onSuccess={handleCoinOSSetupSuccess}
      />

      {/* CoinOS Wallet Modal */}
      <CoinOSWalletModal
        visible={showCoinOSWalletModal}
        onClose={() => setShowCoinOSWalletModal(false)}
      />
    </TexturedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  cardImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 2,
  },
  cardDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  zapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  zappingButton: {
    opacity: 0.7,
  },
  checkmark: {
    marginLeft: 8,
  },
  aiTeamBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

// ✅ PERFORMANCE: React.memo prevents re-renders when props haven't changed
export const TeamsScreen = React.memo(TeamsScreenComponent);
export default TeamsScreen;
