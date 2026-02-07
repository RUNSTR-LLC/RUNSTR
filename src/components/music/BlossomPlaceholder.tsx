/**
 * BlossomPlaceholder - Pink flower placeholder for Blossom tracks without artwork
 *
 * Displays a stylized pink cherry blossom (sakura) flower
 * Used consistently across all music player components
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BlossomPlaceholderProps {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

// Size configurations
const SIZES = {
  small: { container: 20, font: 14 },
  medium: { container: 48, font: 28 },
  large: { container: 200, font: 80 },
};

export const BlossomPlaceholder: React.FC<BlossomPlaceholderProps> = React.memo(
  ({ size = 'medium', style }) => {
    const sizeConfig = SIZES[size];

    return (
      <View
        style={[
          styles.container,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
          },
          style,
        ]}
      >
        <Text style={[styles.flower, { fontSize: sizeConfig.font }]}>
          🌸
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 182, 193, 0.15)', // Light pink tint
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.3)', // Pink border
  },
  flower: {
    textAlign: 'center',
  },
});

export default BlossomPlaceholder;
