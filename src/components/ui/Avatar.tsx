/**
 * Avatar Component - Exact match to HTML mockup avatar styling
 * Used for: leaderboard-avatar, profile-avatar, etc.
 *
 * Fallback chain: bundled image → URL image → orange ostrich
 * Includes timeout-based fallback for images that fail silently
 */

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';

// Orange ostrich fallback avatar (app icon)
const FALLBACK_AVATAR = require('../../../assets/images/icon.png');

// Timeout for image loading (ms) - if image doesn't load within this time, show fallback
const IMAGE_LOAD_TIMEOUT = 5000;

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  imageSource?: number; // Bundled image from require() - takes priority over imageUrl
  style?: any;
  showIcon?: boolean; // Legacy prop, not used but kept for compatibility
}

export const Avatar: React.FC<AvatarProps> = React.memo(({
  size = theme.layout.avatarSize, // Default to 36px (leaderboard size)
  imageUrl,
  imageSource,
  style,
}) => {
  // Track if bundled image failed to load (e.g., progressive JPEG on iOS)
  const [bundledImageFailed, setBundledImageFailed] = useState(false);
  // Track if URL image failed to load (network error, 404, etc.)
  const [urlImageFailed, setUrlImageFailed] = useState(false);
  // Track if images have successfully loaded
  const [bundledImageLoaded, setBundledImageLoaded] = useState(false);
  const [urlImageLoaded, setUrlImageLoaded] = useState(false);

  // Refs for timeout cleanup
  const bundledTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout fallback for bundled images that fail silently
  useEffect(() => {
    if (imageSource && !bundledImageFailed && !bundledImageLoaded) {
      bundledTimeoutRef.current = setTimeout(() => {
        if (!bundledImageLoaded) {
          console.warn('[Avatar] Bundled image timeout, falling back');
          setBundledImageFailed(true);
        }
      }, IMAGE_LOAD_TIMEOUT);
    }

    return () => {
      if (bundledTimeoutRef.current) {
        clearTimeout(bundledTimeoutRef.current);
      }
    };
  }, [imageSource, bundledImageFailed, bundledImageLoaded]);

  // Timeout fallback for URL images that fail silently
  useEffect(() => {
    if (imageUrl && !urlImageFailed && !urlImageLoaded && (bundledImageFailed || !imageSource)) {
      urlTimeoutRef.current = setTimeout(() => {
        if (!urlImageLoaded) {
          console.warn('[Avatar] URL image timeout, falling back');
          setUrlImageFailed(true);
        }
      }, IMAGE_LOAD_TIMEOUT);
    }

    return () => {
      if (urlTimeoutRef.current) {
        clearTimeout(urlTimeoutRef.current);
      }
    };
  }, [imageUrl, urlImageFailed, urlImageLoaded, bundledImageFailed, imageSource]);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  // Priority 1: Bundled image (instant, no network) - with error fallback
  // If bundled image fails (e.g., progressive JPEG), fall through to URL or fallback
  if (imageSource && !bundledImageFailed) {
    return (
      <Image
        source={imageSource}
        style={[styles.avatar, avatarStyle, style]}
        resizeMode="cover"
        fadeDuration={0}
        onLoad={() => {
          setBundledImageLoaded(true);
          if (bundledTimeoutRef.current) {
            clearTimeout(bundledTimeoutRef.current);
          }
        }}
        onError={() => {
          console.warn('[Avatar] Bundled image failed to load, falling back');
          setBundledImageFailed(true);
        }}
      />
    );
  }

  // Priority 2: URL image (requires network fetch) - with error fallback
  if (imageUrl && !urlImageFailed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, avatarStyle, style]}
        resizeMode="cover"
        fadeDuration={0}
        onLoad={() => {
          setUrlImageLoaded(true);
          if (urlTimeoutRef.current) {
            clearTimeout(urlTimeoutRef.current);
          }
        }}
        onError={() => {
          console.warn('[Avatar] URL image failed to load, falling back');
          setUrlImageFailed(true);
        }}
      />
    );
  }

  // Fallback to orange ostrich (RUNSTR app icon)
  return (
    <Image
      source={FALLBACK_AVATAR}
      style={[styles.avatar, avatarStyle, style]}
      resizeMode="cover"
      fadeDuration={0}
    />
  );
});

const styles = StyleSheet.create({
  // CSS: border-radius: 18px;
  avatar: {
    // No background color needed - images fill the entire circle
  },
});
