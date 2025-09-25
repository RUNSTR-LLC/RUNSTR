import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { DropdownMenu } from '../ui/DropdownMenu';

const { width: screenWidth } = Dimensions.get('window');

interface TeamHeaderProps {
  teamName: string;
  bannerImage?: string;
  onMenuPress: () => void;
  onLeaveTeam?: () => void;
  onJoinTeam?: () => void;
  onTeamDiscovery: () => void;
  userIsMember?: boolean;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  teamName,
  bannerImage,
  onMenuPress,
  onLeaveTeam,
  onJoinTeam,
  onTeamDiscovery,
  userIsMember = true,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleMenuPress = () => {
    setShowDropdown(true);
    onMenuPress();
  };

  const menuItems = [
    {
      id: 'team-discovery',
      label: 'Team Discovery',
      onPress: onTeamDiscovery,
    },
    ...(userIsMember && onLeaveTeam
      ? [
          {
            id: 'leave-team',
            label: 'Leave Team',
            onPress: onLeaveTeam,
            destructive: true,
          },
        ]
      : []),
    ...(!userIsMember && onJoinTeam
      ? [
          {
            id: 'join-team',
            label: 'Join Team',
            onPress: onJoinTeam,
          },
        ]
      : []),
  ];

  const headerContent = (
    <>
      <Text style={bannerImage ? styles.teamNameWithBanner : styles.teamName}>
        {teamName}
      </Text>
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={handleMenuPress}
        activeOpacity={0.7}
      >
        <Text style={styles.menuIcon}>⋯</Text>
      </TouchableOpacity>

      <DropdownMenu
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
        items={menuItems}
        anchorPosition={{ top: bannerImage ? 120 : 60, right: 20 }}
      />
    </>
  );

  if (bannerImage) {
    return (
      <ImageBackground
        source={{ uri: bannerImage }}
        style={styles.bannerContainer}
        imageStyle={styles.bannerImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.headerWithBanner}>
            {headerContent}
          </View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.header}>
      {headerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  bannerContainer: {
    width: screenWidth,
    height: 140,
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
  headerWithBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  teamName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
  },
  teamNameWithBanner: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  menuBtn: {
    position: 'absolute',
    right: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    fontSize: 16,
    color: theme.colors.text,
  },
});
