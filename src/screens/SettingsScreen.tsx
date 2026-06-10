/**
 * SettingsScreen - Consolidated settings for Account, Teams, and Notifications
 * Accessed from Profile screen settings button
 *
 * Rewards are handled server-side via trigger_auto_reward() + push notifications.
 */

import React from 'react';
import {
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { theme } from '../styles/theme';
import { CustomAlert } from '../components/ui/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { AntiCheatRequestModal } from '../components/settings/AntiCheatRequestModal';
import { ExportDataModal } from '../components/backup/ExportDataModal';
import { ImportDataModal } from '../components/backup/ImportDataModal';
import { WalletConfigModal } from '../components/wallet/WalletConfigModal';
import { NWCQRConfirmationModal } from '../components/wallet/NWCQRConfirmationModal';
import { QRScannerModal } from '../components/qr/QRScannerModal';
import { settingsStyles as styles } from './settingsStyles';
import { useSettingsState } from './useSettingsState';

// Section components
import { LanguageSection } from '../components/settings/LanguageSection';
import { FitnessTrackingSection } from '../components/settings/FitnessTrackingSection';
import { WorkoutDataSection } from '../components/settings/WorkoutDataSection';
import { DataBackupSection } from '../components/settings/DataBackupSection';
import { PasswordSection } from '../components/settings/PasswordSection';
import { WalletSection } from '../components/settings/WalletSection';
import { SupportLegalSection } from '../components/settings/SupportLegalSection';
import { AccountActionsSection } from '../components/settings/AccountActionsSection';

interface SettingsScreenProps {
  onHelp?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onSignOut?: () => void | Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onHelp,
  onContactSupport,
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
            defaultActivity={state.defaultActivity}
            showDefaultActivityPicker={state.showDefaultActivityPicker}
            onSetShowDefaultActivityPicker={state.setShowDefaultActivityPicker}
            onDefaultActivityChange={state.handleDefaultActivityChange}
            privateModeEnabled={state.privateModeEnabled}
            onPrivateModeToggle={state.handlePrivateModeToggle}
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

          <WorkoutDataSection
            onAllWorkoutsPress={state.handleAllWorkoutsPress}
          />

          <DataBackupSection
            autoBackupEnabled={state.autoBackupEnabled}
            lastBackupTime={state.lastBackupTime}
            onAutoBackupToggle={state.handleAutoBackupToggle}
            onShowExportModal={() => state.setShowExportModal(true)}
            onShowImportModal={() => state.setShowImportModal(true)}
          />

          <WalletSection
            onRewardsPress={state.handleRewardsPress}
            hasNWCWallet={state.hasNWCWallet}
            onDisconnectWallet={state.handleDisconnectWallet}
            onShowWalletConfigModal={() => state.setShowWalletConfigModal(true)}
            onShowQRScannerModal={() => state.setShowQRScannerModal(true)}
          />

          <PasswordSection
            userNsec={state.userNsec}
            onBackupPassword={state.handleBackupPassword}
            onCopyNpub={state.handleCopyNpub}
          />

          <LanguageSection
            currentLanguage={state.currentLanguage}
            onLanguageChange={state.handleLanguageChange}
          />

          <SupportLegalSection
            onHelp={onHelp}
            onContactSupport={onContactSupport}
            onPrivacyPolicy={onPrivacyPolicy}
            onShowAntiCheatModal={() => state.setShowAntiCheatModal(true)}
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
      <AntiCheatRequestModal
        visible={state.showAntiCheatModal}
        onClose={() => state.setShowAntiCheatModal(false)}
      />
      <ExportDataModal
        visible={state.showExportModal}
        onClose={() => state.setShowExportModal(false)}
      />
      <ImportDataModal
        visible={state.showImportModal}
        onClose={() => state.setShowImportModal(false)}
      />
      <WalletConfigModal
        visible={state.showWalletConfigModal}
        onClose={() => state.setShowWalletConfigModal(false)}
        onSuccess={state.handleNWCConnectSuccess}
        allowSkip={false}
      />
      <QRScannerModal
        visible={state.showQRScannerModal}
        onClose={() => state.setShowQRScannerModal(false)}
        onScanned={state.handleNWCQRScanned}
      />
      <NWCQRConfirmationModal
        visible={state.showNWCQRConfirmModal}
        onClose={() => state.setShowNWCQRConfirmModal(false)}
        connectionString={state.scannedNWCString}
        onSuccess={state.handleNWCConnectSuccess}
      />
    </SafeAreaView>
  );
};
