/**
 * TexturedBackground - Subtle dark gradient background.
 * Drop-in replacement for SafeAreaView with a dark radial-style gradient.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

interface TexturedBackgroundProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const TexturedBackground: React.FC<TexturedBackgroundProps> = ({
  children,
  edges = ['top'],
}) => {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      <LinearGradient
        colors={['#0d0d0d', '#000000', '#050505', '#000000']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
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
});
