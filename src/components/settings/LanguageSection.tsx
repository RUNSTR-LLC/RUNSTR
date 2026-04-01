/**
 * LanguageSection - Language picker accordion for SettingsScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { Ionicons } from '@expo/vector-icons';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../i18n';
import { useTranslation } from 'react-i18next';

interface LanguageSectionProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
}

export const LanguageSection: React.FC<LanguageSectionProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const { t } = useTranslation('settings');

  return (
    <View style={styles.section}>
      <SettingsAccordion title={t('language')} defaultExpanded={false}>
        <Card style={styles.accordionCard}>
          <View style={styles.languageSection}>
            <Text style={styles.languageSectionTitle}>{t('languageSelect')}</Text>
            <Text style={styles.languageSectionSubtitle}>{t('languageSelectSubtitle')}</Text>
            <View style={styles.languageOptions}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => onLanguageChange(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      currentLanguage === lang.code && styles.languageOptionTextSelected,
                    ]}
                  >
                    {lang.nativeName}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>
      </SettingsAccordion>
    </View>
  );
};
