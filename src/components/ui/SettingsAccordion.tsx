import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SettingsAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  style?: object;
}

export const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  title,
  children,
  defaultExpanded = true,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#FF9D42"
        />
      </TouchableOpacity>

      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    // Spacing is owned by the settings `section` wrapper; avoid double margin.
    marginBottom: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB366',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 12,
  },
});
