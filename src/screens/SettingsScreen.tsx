/**
 * SettingsScreen - tracking, Nostr publishing, backup, keys, and support.
 * Opened from the Home top bar.
 */

import React from 'react';
import { View, SafeAreaView, KeyboardAvoidingView, TouchableOpacity, Platform } from 'react-native';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { theme } from '../styles/theme';
import { CustomAlert } from '../components/ui/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { ExportDataModal } from '../components/backup/ExportDataModal';
import { ImportDataModal } from '../components/backup/ImportDataModal';
import { settingsStyles as styles } from './settingsStyles';
import { useSettingsState } from './useSettingsState';

// Section components
import { FitnessTrackingSection } from '../components/settings/FitnessTrackingSection';
import { NostrPostingSection } from '../components/settings/NostrPostingSection';
import { DataBackupSection } from '../components/settings/DataBackupSection';
import { PasswordSection } from '../components/settings/PasswordSection';
import { SupportLegalSection } from '../components/settings/SupportLegalSection';
import { AccountActionsSection } from '../components/settings/AccountActionsSection';

interface SettingsScreenProps {
  onHelp?: () => void;
  onPrivacyPolicy?: () => void;
  onSignOut?: () => void | Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onHelp,
  onPrivacyPolicy,
  onSignOut,
}) => {
  const state = useSettingsState(onSignOut);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={state.handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <OstrichRefreshScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshing={state.isRefreshing}
          onRefresh={state.handleRefresh}
        >
          <FitnessTrackingSection
            ttsSettings={state.ttsSettings}
            onTTSSettingChange={state.handleTTSSettingChange}
            isMetric={state.isMetric}
            onSetUnitSystem={state.setUnitSystem}
            healthKitSyncEnabled={state.healthKitSyncEnabled}
            healthKitAuthorized={state.healthKitAuthorized}
            healthKitLastSync={state.healthKitLastSync}
            onHealthKitSyncToggle={state.handleHealthKitSyncToggle}
            healthConnectSyncEnabled={state.healthConnectSyncEnabled}
            healthConnectAvailable={state.healthConnectAvailable}
            healthConnectAuthorized={state.healthConnectAuthorized}
            healthConnectLastSync={state.healthConnectLastSync}
            onHealthConnectSyncToggle={state.handleHealthConnectSyncToggle}
          />

          <NostrPostingSection />

          <DataBackupSection
            autoBackupEnabled={state.autoBackupEnabled}
            lastBackupTime={state.lastBackupTime}
            onAutoBackupToggle={state.handleAutoBackupToggle}
            onShowExportModal={() => state.setShowExportModal(true)}
            onShowImportModal={() => state.setShowImportModal(true)}
          />

          <PasswordSection
            userNsec={state.userNsec}
            onBackupPassword={state.handleBackupPassword}
            hasNpub={!!state.userNpub}
            onCopyNpub={state.handleCopyNpub}
            onCopyAgentPrompt={state.handleCopyAgentPrompt}
          />

          <SupportLegalSection
            onHelp={onHelp}
            onPrivacyPolicy={onPrivacyPolicy}
          />

          <AccountActionsSection
            isDeletingAccount={state.isDeletingAccount}
            onSignOut={state.handleSignOut}
            onDeleteAccount={state.handleDeleteAccount}
          />
        </OstrichRefreshScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <CustomAlert
        visible={state.alert.visible}
        title={state.alert.title}
        message={state.alert.message}
        buttons={state.alert.buttons}
        onClose={state.hideAlert}
      />
      <ExportDataModal
        visible={state.showExportModal}
        onClose={() => state.setShowExportModal(false)}
      />
      <ImportDataModal
        visible={state.showImportModal}
        onClose={() => state.setShowImportModal(false)}
      />
    </SafeAreaView>
  );
};
