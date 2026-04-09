/**
 * SponsorBanner
 *
 * A subtle "powered by" banner displaying the active reward sponsor.
 * Sits below the Rewards Pool balance card. Tapping opens the sponsor website.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SponsorService, RewardSponsor } from '../../services/backend/SponsorService';

// Local fallback image (used when logoUrl is null)
const ALS_LOGO = require('../../../assets/images/running-bitcoin/avatar.jpg');

export const SponsorBanner: React.FC = () => {
  const [sponsor, setSponsor] = useState<RewardSponsor | null>(null);

  useEffect(() => {
    SponsorService.getActiveSponsor().then(setSponsor);
  }, []);

  // Render nothing while loading
  if (!sponsor) {
    return null;
  }

  const handlePress = () => {
    if (sponsor.websiteUrl) {
      Linking.openURL(sponsor.websiteUrl);
    }
  };

  const logoSource = sponsor.logoUrl
    ? { uri: sponsor.logoUrl }
    : ALS_LOGO;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.6}
      disabled={!sponsor.websiteUrl}
    >
      <Image source={logoSource} style={styles.logo} />
      <Text style={styles.displayText}>
        {sponsor.displayText}{' '}
        <Text style={styles.sponsorName}>{sponsor.name}</Text>
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },

  logo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  displayText: {
    fontSize: 13,
    color: '#666',
  },

  sponsorName: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
});

export default SponsorBanner;
