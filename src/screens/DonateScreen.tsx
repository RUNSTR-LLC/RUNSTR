/**
 * DonateScreen - Charity donation flow
 * Allows users to donate to supported charities or RUNSTR
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { CHARITIES, Charity } from '../constants/charities';
import { ExternalZapModal } from '../components/nutzap/ExternalZapModal';

// RUNSTR donation option (add to beginning of list)
const RUNSTR_DONATION: Charity = {
  id: 'runstr',
  name: 'RUNSTR',
  displayName: 'RUNSTR',
  lightningAddress: 'runstr@getalby.com',
  description: 'Support RUNSTR development and community growth',
  website: 'https://runstr.club',
  category: 'project',
};

export const DonateScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [showZapModal, setShowZapModal] = useState(false);

  // Combine RUNSTR with charities list
  const allCharities = [RUNSTR_DONATION, ...CHARITIES];

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSelectCharity = (charity: Charity) => {
    setSelectedCharity(charity);
    setShowZapModal(true);
  };

  const handleZapModalClose = () => {
    setShowZapModal(false);
    setSelectedCharity(null);
  };

  const handleDonationSuccess = () => {
    setShowZapModal(false);
    setSelectedCharity(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DONATE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Ionicons name="heart" size={40} color={theme.colors.orangeBright} />
          <Text style={styles.introTitle}>Support the Community</Text>
          <Text style={styles.introDescription}>
            Send sats directly to RUNSTR or one of our partner charities. 100% of your donation goes to the recipient.
          </Text>
        </View>

        {/* Charity List */}
        <View style={styles.charitySection}>
          <Text style={styles.sectionTitle}>CHOOSE RECIPIENT</Text>

          {allCharities.map((charity) => (
            <TouchableOpacity
              key={charity.id}
              style={[
                styles.charityCard,
                charity.id === 'runstr' && styles.runstrCard,
              ]}
              onPress={() => handleSelectCharity(charity)}
              activeOpacity={0.7}
            >
              <View style={styles.charityContent}>
                <View style={styles.charityIconContainer}>
                  <Ionicons
                    name={charity.id === 'runstr' ? 'flash' : 'heart-outline'}
                    size={24}
                    color={charity.id === 'runstr' ? theme.colors.orangeBright : theme.colors.text}
                  />
                </View>
                <View style={styles.charityInfo}>
                  <Text style={[
                    styles.charityName,
                    charity.id === 'runstr' && styles.runstrName,
                  ]}>
                    {charity.name}
                  </Text>
                  <Text style={styles.charityDescription}>
                    {charity.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Footer */}
        <View style={styles.infoFooter}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            Donations are processed via Lightning Network. You can pay from any Lightning wallet including Cash App, Strike, and self-custodial wallets.
          </Text>
        </View>
      </ScrollView>

      {/* Zap Modal */}
      {selectedCharity && (
        <ExternalZapModal
          visible={showZapModal}
          recipientNpub={selectedCharity.lightningAddress || ''}
          recipientName={selectedCharity.name}
          memo={`Donation to ${selectedCharity.name} via RUNSTR`}
          onClose={handleZapModalClose}
          onSuccess={handleDonationSuccess}
        />
      )}
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

  // Introduction section
  introSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Charity section
  charitySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  charityCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  runstrCard: {
    borderColor: theme.colors.orangeDeep,
    borderWidth: 2,
  },
  charityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  charityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  charityInfo: {
    flex: 1,
    marginRight: 8,
  },
  charityName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  runstrName: {
    color: theme.colors.orangeBright,
  },
  charityDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  // Info footer
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});

export default DonateScreen;
