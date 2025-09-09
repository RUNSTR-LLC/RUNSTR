import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';
import type { ChallengeRule } from '../../types';

interface RulesSectionProps {
  rules: ChallengeRule[];
  title?: string;
  style?: ViewStyle;
}

export const RulesSection: React.FC<RulesSectionProps> = ({
  rules,
  title = 'Challenge Rules',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rulesList}>
        {rules.map((rule, index) => (
          <RuleItem key={index} text={rule.text} />
        ))}
      </View>
    </View>
  );
};

interface RuleItemProps {
  text: string;
  style?: ViewStyle;
}

export const RuleItem: React.FC<RuleItemProps> = ({ text, style }) => {
  return (
    <View style={[styles.ruleItem, style]}>
      <View style={styles.ruleBullet} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
};

interface CompactRulesProps {
  rules: string[];
  style?: ViewStyle;
}

export const CompactRules: React.FC<CompactRulesProps> = ({ rules, style }) => {
  return (
    <View style={[styles.compactContainer, style]}>
      {rules.map((rule, index) => (
        <RuleItem key={index} text={rule} />
      ))}
    </View>
  );
};

interface RulesListProps {
  rules: ChallengeRule[];
  showBullets?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export const RulesList: React.FC<RulesListProps> = ({
  rules,
  showBullets = true,
  compact = false,
  style,
}) => {
  const containerStyle = compact ? styles.compactContainer : styles.rulesList;

  return (
    <View style={[containerStyle, style]}>
      {rules.map((rule, index) =>
        showBullets ? (
          <RuleItem key={index} text={rule.text} />
        ) : (
          <Text key={index} style={styles.ruleTextOnly}>
            {rule.text}
          </Text>
        )
      )}
    </View>
  );
};

interface EventRulesProps {
  eventType: string;
  distance?: string;
  duration?: string;
  style?: ViewStyle;
}

export const EventRules: React.FC<EventRulesProps> = ({
  eventType,
  distance,
  duration,
  style,
}) => {
  const generateEventRules = (): ChallengeRule[] => {
    const rules: ChallengeRule[] = [];

    if (distance) {
      rules.push({
        id: 'distance-requirement',
        text: `Complete ${distance} of ${eventType.toLowerCase()} activity`,
      });
    }

    if (duration) {
      rules.push({
        id: 'duration-requirement',
        text: `Challenge must be completed within ${duration}`,
      });
    }

    rules.push(
      {
        id: 'app-tracking-required',
        text: 'Activities must be tracked through RUNSTR app',
      },
      {
        id: 'gps-verification-required',
        text: 'GPS verification required for all activities',
      },
      {
        id: 'results-final',
        text: 'Results are final once challenge period ends',
      }
    );

    return rules;
  };

  return (
    <RulesSection
      rules={generateEventRules()}
      title="Event Rules"
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  // Main rules container (matches HTML mockup .rules-section)
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xxxl,
  },

  // Rules title (matches HTML mockup .rules-title)
  title: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },

  // Rules list container
  rulesList: {
    gap: theme.spacing.lg,
  },

  // Individual rule item (matches HTML mockup .rule-item)
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },

  // Remove bottom margin from last item
  // Note: In React Native, we handle this with gap on the parent container

  // Rule bullet (matches HTML mockup .rule-bullet)
  ruleBullet: {
    width: 4,
    height: 4,
    backgroundColor: theme.colors.textMuted,
    borderRadius: 2,
    marginTop: 6, // Align with text baseline
    flexShrink: 0,
  },

  // Rule text (matches HTML mockup rule text styling)
  ruleText: {
    fontSize: theme.typography.eventName,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.eventName * 1.4,
    flex: 1,
  },

  // Text-only rule (no bullets)
  ruleTextOnly: {
    fontSize: theme.typography.eventName,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.eventName * 1.4,
    marginBottom: theme.spacing.lg,
  },

  // Compact rules container (for smaller spaces)
  compactContainer: {
    gap: theme.spacing.md,
  },
});
