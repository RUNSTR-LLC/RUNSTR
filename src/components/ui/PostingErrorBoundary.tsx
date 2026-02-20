/**
 * PostingErrorBoundary - Error boundary for workout posting flows
 *
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the entire app.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PostingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PostingErrorBoundary] Caught error:', error);
    console.error('[PostingErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleClose = () => {
    // Reset error state before closing
    this.setState({ hasError: false, error: null });
    this.props.onClose?.();
  };

  handleRetry = () => {
    // Reset error state to allow retry
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>
              {this.props.fallbackTitle || 'Something went wrong'}
            </Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage ||
                'There was an error processing your request. Please try again.'}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {this.props.onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={this.handleClose}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  content: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PostingErrorBoundary;
