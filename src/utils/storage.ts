/**
 * Storage Utils - Safe AsyncStorage wrapper for web/SSR compatibility
 * Handles cases where AsyncStorage is not available (like during static rendering)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Safe storage wrapper that handles web/SSR environments
 */
export class SafeStorage {
  /**
   * Check if storage is available
   */
  private static isStorageAvailable(): boolean {
    try {
      // Check if we're in a browser environment
      if (Platform.OS === 'web') {
        return (
          typeof window !== 'undefined' && window.localStorage !== undefined
        );
      }
      // For native platforms, AsyncStorage should always be available
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely get item from storage
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      if (!this.isStorageAvailable()) {
        console.warn('[SafeStorage] Storage not available, returning null');
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('[SafeStorage] Failed to get item:', error);
      return null;
    }
  }

  /**
   * Safely set item in storage
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (!this.isStorageAvailable()) {
        console.warn('[SafeStorage] Storage not available, skipping setItem');
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[SafeStorage] Failed to set item:', error);
    }
  }

  /**
   * Safely remove item from storage
   */
  static async removeItem(key: string): Promise<void> {
    try {
      if (!this.isStorageAvailable()) {
        console.warn(
          '[SafeStorage] Storage not available, skipping removeItem'
        );
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[SafeStorage] Failed to remove item:', error);
    }
  }

  /**
   * Check if we're in SSR/static rendering mode
   */
  static isSSR(): boolean {
    return Platform.OS === 'web' && typeof window === 'undefined';
  }
}
