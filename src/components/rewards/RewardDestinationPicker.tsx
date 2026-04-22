/**
 * RewardDestinationPicker - Full-screen modal for selecting reward destination
 *
 * Allows users to choose where their workout rewards go:
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
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { PressableScale } from '../ui/PressableScale';
import {
  getCharitiesByCategory,
  SELF_TEAM_ID,
  isSelfTeam,
  Charity,
} from '../../constants/charities';
import { LightningAddressSetupModal } from '../wallet/LightningAddressSetupModal';
import { useAuth } from '../../contexts/AuthContext';
import { PPQAccountService } from '../../services/ai/PPQAccountService';
import { PPQAccountSetupModal } from '../ai/PPQAccountSetupModal';
import { PPQCreditTopupModal } from '../ai/PPQCreditTopupModal';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';

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

  // External zap state
  const [showZapModal, setShowZapModal] = useState(false);
  const [zapTargetCharity, setZapTargetCharity] = useState<Charity | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const address = await AsyncStorage.getItem(REWARD_LIGHTNING_ADDRESS_KEY);
      setUserLightningAddress(address);
    } catch (error) {
      console.error('[RewardDestinationPicker] Failed to load user data:', error);
    }
  };

  const resolveDestinationName = useCallback((destinationId: string): string => {
    const all = [
      ...getCharitiesByCategory('service'),
      ...getCharitiesByCategory('charity'),
      ...getCharitiesByCategory('project'),
    ];
    return all.find((d) => d.id === destinationId)?.name ?? 'your destination';
  }, []);

  const handleSelect = useCallback(
    async (destinationId: string) => {
      try {
        if (isSelfTeam(destinationId)) {
          setPendingSelfSelection(true);
          setShowLightningSetupModal(true);
          return;
        }

        await AsyncStorage.setItem(SELECTED_TEAM_KEY, destinationId);
        onSelectDestination(destinationId);
        Toast.show({
          type: 'success',
          text1: 'Destination Updated',
          text2: `Rewards will go to ${resolveDestinationName(destinationId)}`,
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (error) {
        console.error('[RewardDestinationPicker] Failed to save selection:', error);
        Alert.alert('Error', 'Failed to save your selection. Please try again.');
      }
    },
    [onSelectDestination, resolveDestinationName]
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
          Toast.show({
            type: 'success',
            text1: 'Destination Updated',
            text2: 'Rewards will go to your wallet',
            position: 'top',
            visibilityTime: 2000,
          });
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
    Toast.show({
      type: 'success',
      text1: 'Account Created',
      text2: 'Your PPQ.AI account is ready',
      position: 'top',
      visibilityTime: 2500,
    });
    setShowPPQTopupModal(true);
  }, []);

  const handleZap = useCallback((charity: Charity) => {
    if (!charity.lightningAddress) return;
    setZapTargetCharity(charity);
    setShowZapModal(true);
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
      <PressableScale
        key={charity.id}
        style={[styles.destinationCard, selected && styles.destinationCardSelected]}
        onPress={() => handleSelect(charity.id)}
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
      </PressableScale>
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
              Choose where your rewards go
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
              ) : (
                <Text style={styles.ctaText}>Connect wallet to receive rewards</Text>
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

      {/* Lightning Address Setup Modal */}
      <LightningAddressSetupModal
        visible={showLightningSetupModal}
        onClose={handleLightningSetupClose}
        onSuccess={handleLightningSetupSuccess}
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

      {/* External Zap Modal for charities/projects */}
      <ExternalZapModal
        visible={showZapModal}
        recipientNpub={zapTargetCharity?.lightningAddress || ''}
        recipientName={zapTargetCharity?.displayName || zapTargetCharity?.name || ''}
        onClose={() => { setShowZapModal(false); setZapTargetCharity(null); }}
        onSuccess={() => { setShowZapModal(false); setZapTargetCharity(null); }}
        isCharityDonation={true}
        charityId={zapTargetCharity?.id}
        charityLightningAddress={zapTargetCharity?.lightningAddress}
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
});
