/**
 * settingsStyles - Shared styles for SettingsScreen and its section components
 */

import { StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
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
  headerSpacer: {
    width: 32,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  accordionCard: {
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 12,
  },

  voiceSubsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Unit Toggle
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  unitLabelActive: {
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.bold,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 20,
  },

  // Buttons
  signOutButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  deleteAccountButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  securityIcon: {
    marginLeft: 8,
  },

  // Modal overlay (used by default activity picker)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  // Rewards Subsection
  rewardsSubsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rewardSettingRow: {
    marginBottom: 8,
  },
  rewardSettingInfo: {
    flex: 1,
  },
  rewardSettingTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rewardSettingSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Language
  languageSection: {
    paddingVertical: 8,
  },
  languageSectionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  languageSectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  languageOptionSelected: {
    borderColor: theme.colors.orangeBright,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
  },
  languageOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  languageOptionTextSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },

  // Backup Security Notice
  backupSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 157, 66, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  backupSecurityText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.orangeBright,
    lineHeight: 16,
  },

  // Default Activity
  defaultActivityValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultActivityText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  defaultActivityPickerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  defaultActivityPickerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  defaultActivityPickerSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  defaultActivityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
    gap: 16,
  },
  defaultActivityOptionSelected: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
  },
  defaultActivityOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  defaultActivityOptionTextSelected: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
});
