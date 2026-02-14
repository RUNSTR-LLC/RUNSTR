/**
 * RewardDestinationPicker - Full-screen modal for selecting reward destination
 *
 * Allows users to choose where their 50-sat workout rewards go:
 * - YOU: Keep rewards (sent to user's Lightning address)
 * - SERVICES: PPQ.AI (AI credits), RUNSTR, Lightning News
 * - CHARITIES: ALS Network, HRF, Bitcoin Veterans
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
  CHARITIES,
  getCharitiesByCategory,
  SELF_TEAM_ID,
  PPQ_AI_TEAM_ID,
  isPPQTeam,
  isSelfTeam,
  Charity,
} from '../../constants/charities';

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
  const [userLightningAddress, setUserLightningAddress] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('You');

  // Load user data on mount
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const [address, name] = await Promise.all([
        AsyncStorage.getItem(REWARD_LIGHTNING_ADDRESS_KEY),
        AsyncStorage.getItem('@runstr:user_display_name'),
      ]);
      setUserLightningAddress(address);
      if (name) setUserName(name);
    } catch (error) {
      console.error('[RewardDestinationPicker] Failed to load user data:', error);
    }
  };

  const handleSelect = useCallback(
    async (destinationId: string) => {
      try {
        await AsyncStorage.setItem(SELECTED_TEAM_KEY, destinationId);
        onSelectDestination(destinationId);
      } catch (error) {
        console.error('[RewardDestinationPicker] Failed to save selection:', error);
        Alert.alert('Error', 'Failed to save your selection. Please try again.');
      }
    },
    [onSelectDestination]
  );

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

  // Separate PPQ from other services
  const ppqService = services.find((s) => s.isPPQ);
  const otherServices = services.filter((s) => !s.isPPQ);

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
              <View style={styles.selfAvatarFallback}>
                <Ionicons name="person" size={24} color={theme.colors.orangeDeep} />
              </View>
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>{userName}</Text>
              {userLightningAddress ? (
                <Text style={styles.destinationDescription} numberOfLines={1}>
                  {userLightningAddress}
                </Text>
              ) : (
                <Text style={styles.ctaText}>Set up Lightning address</Text>
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

          {/* SERVICES Section */}
          <Text style={styles.sectionLabel}>SERVICES</Text>
          {ppqService && renderDestinationCard(ppqService, false)}
          {otherServices.map((service) => renderDestinationCard(service))}

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
