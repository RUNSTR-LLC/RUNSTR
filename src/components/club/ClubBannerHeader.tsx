/**
 * ClubBannerHeader - Club page header with optional banner image
 *
 * When club has a banner_url: shows ImageBackground with gradient overlay
 * and semi-transparent pill buttons for readability over images.
 * Falls back to plain header bar when no banner is available.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

interface ClubBannerHeaderProps {
  clubName: string;
  bannerUrl: string | null | undefined;
  onBack: () => void;
  onEllipsis: () => void;
}

export const ClubBannerHeader: React.FC<ClubBannerHeaderProps> = ({
  clubName,
  bannerUrl,
  onBack,
  onEllipsis,
}) => {
  const navButtons = (
    <>
      <TouchableOpacity
        style={bannerUrl ? styles.pillButton : styles.plainButton}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={bannerUrl ? styles.pillButton : styles.plainButton}
        onPress={onEllipsis}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="ellipsis-vertical"
          size={20}
          color={bannerUrl ? theme.colors.text : theme.colors.textMuted}
        />
      </TouchableOpacity>
    </>
  );

  // Banner mode: ImageBackground + gradient overlay
  if (bannerUrl) {
    return (
      <ImageBackground
        source={{ uri: bannerUrl }}
        style={styles.bannerContainer}
        imageStyle={styles.bannerImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.bannerNav}>{navButtons}</View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // Plain mode: standard header bar
  return (
    <View style={styles.plainHeader}>
      {navButtons}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {clubName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Banner mode
  bannerContainer: {
    width: screenWidth,
    height: BANNER_HEIGHT,
    backgroundColor: theme.colors.cardBackground,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bannerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pillButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Plain mode
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  plainButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
});

export default ClubBannerHeader;
