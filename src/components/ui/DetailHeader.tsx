/**
 * DetailHeader Component - Shared header for detail screens
 * Matches HTML mockup: header with back button, title, and share button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface DetailHeaderProps {
  title: string;
  onBack: () => void;
  onShare: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  onBack,
  onShare,
}) => {
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* Header Title */}
      <Text style={styles.headerTitle}>{title}</Text>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
        <Text style={styles.shareBtnText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container - exact CSS: display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #1a1a1a;
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  // Back button - exact CSS: background: transparent; border: none; color: #fff; font-size: 16px; cursor: pointer; padding: 4px;
  backBtn: {
    backgroundColor: 'transparent',
    padding: 4,
  },
  backBtnText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  // Header title - exact CSS: font-size: 16px; font-weight: 600; color: #ccc;
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // Share button - exact CSS: background: transparent; border: 1px solid #333; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;
  shareBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.small,
  },
  shareBtnText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
});
