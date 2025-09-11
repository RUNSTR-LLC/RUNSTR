/**
 * HealthKit Error Boundary - Graceful error handling for HealthKit components
 * Prevents HealthKit failures from crashing the entire app
 * Provides user-friendly fallback UI and error recovery options
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class HealthKitErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error details for debugging
    console.error('HealthKit Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to log this to a crash reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  getErrorMessage(): string {
    const { error } = this.state;
    const { fallbackMessage } = this.props;

    if (fallbackMessage) {
      return fallbackMessage;
    }

    if (error?.message.includes('timeout')) {
      return 'Apple Health sync is taking too long. Please check your connection and try again.';
    }

    if (error?.message.includes('permission')) {
      return 'Apple Health permissions are required. Please enable them in Settings.';
    }

    if (error?.message.includes('HealthKit')) {
      return 'Apple Health is temporarily unavailable. Please try again later.';
    }

    return 'Apple Health sync encountered an issue. Please try again.';
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <AntDesign
                  name="exclamationcircle"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>Apple Health</Text>
                <Text style={styles.status}>Temporarily unavailable</Text>
              </View>
            </View>

            <Text style={styles.description}>
              {this.getErrorMessage()}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              activeOpacity={0.7}
            >
              <AntDesign
                name="reload1"
                size={14}
                color={theme.colors.primary}
                style={styles.retryIcon}
              />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
              </View>
            )}
          </View>
        </Card>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonHover,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
});

export default HealthKitErrorBoundary;