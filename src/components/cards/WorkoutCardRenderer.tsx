/**
 * WorkoutCardRenderer - React component wrapper for SVG workout cards
 * Enables capturing SVG as PNG using react-native-view-shot
 * Includes error boundary for Android devices with restricted graphics (e.g., Olauncher)
 */

import React, { forwardRef, Component, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface WorkoutCardRendererProps {
  svgContent: string;
  width: number;
  height: number;
}

// Error boundary to catch SVG rendering crashes on Android
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SvgErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.warn('SVG rendering failed (may be restricted launcher):', error.message);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * WorkoutCardRenderer component
 * Renders SVG content as a React component that can be captured as an image
 *
 * Usage:
 * ```
 * const cardRef = useRef(null);
 *
 * <WorkoutCardRenderer
 *   ref={cardRef}
 *   svgContent={svgString}
 *   width={800}
 *   height={600}
 * />
 *
 * // Capture as image
 * const uri = await captureRef(cardRef, { format: 'png', quality: 0.9 });
 * ```
 */
export const WorkoutCardRenderer = forwardRef<View, WorkoutCardRendererProps>(
  ({ svgContent, width, height }, ref) => {
    const fallbackView = (
      <View style={[styles.fallback, { width, height }]}>
        <Text style={styles.fallbackText}>Workout Card</Text>
        <Text style={styles.fallbackSubtext}>Preview unavailable on this device</Text>
      </View>
    );

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          {
            width,
            height,
          },
        ]}
      >
        <SvgErrorBoundary fallback={fallbackView}>
          <SvgXml xml={svgContent} width={width} height={height} />
        </SvgErrorBoundary>
      </View>
    );
  }
);

WorkoutCardRenderer.displayName = 'WorkoutCardRenderer';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  fallbackText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  fallbackSubtext: {
    color: '#888',
    fontSize: 14,
  },
});
