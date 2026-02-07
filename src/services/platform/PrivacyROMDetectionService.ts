/**
 * PrivacyROMDetectionService - Detects privacy-focused Android ROMs
 *
 * Detects GrapheneOS, CalyxOS, LineageOS, and other privacy ROMs to:
 * 1. Log when zeroed sensor data is likely due to Sensors permission
 * 2. Help debug step counting issues on privacy-focused devices
 *
 * GrapheneOS specifically:
 * - Has custom "android.permission.OTHER_SENSORS" permission
 * - Returns zeroed sensor data (not permission errors) when Sensors disabled
 * - Users must manually enable Sensors in Settings → Apps → RUNSTR → Permissions
 */

import { Platform, NativeModules, Linking } from 'react-native';

export type ROMType = 'grapheneos' | 'calyxos' | 'lineageos' | 'divestos' | 'stock';

export interface ROMAwareness {
  romType: ROMType;
  isPrivacyROM: boolean;
  sensorNotes: string | null;
}

class PrivacyROMDetectionService {
  private cachedResult: ROMAwareness | null = null;

  /**
   * Detect the Android ROM type
   * Returns cached result after first detection
   */
  async detectROM(): Promise<ROMAwareness> {
    // Return cached result if available
    if (this.cachedResult) {
      return this.cachedResult;
    }

    // iOS always returns stock (not applicable)
    if (Platform.OS !== 'android') {
      this.cachedResult = {
        romType: 'stock',
        isPrivacyROM: false,
        sensorNotes: null,
      };
      return this.cachedResult;
    }

    try {
      // Access React Native's PlatformConstants for build info
      const { PlatformConstants } = NativeModules;

      // Get build fingerprint and display strings
      const fingerprint = (PlatformConstants?.Fingerprint || '').toLowerCase();
      const display = (PlatformConstants?.Display || '').toLowerCase();
      const brand = (PlatformConstants?.Brand || '').toLowerCase();

      // Also try to get model info
      const model = (PlatformConstants?.Model || '').toLowerCase();

      // Combined string for detection
      const combined = `${fingerprint} ${display} ${brand} ${model}`;

      let romType: ROMType = 'stock';
      let sensorNotes: string | null = null;

      // Detection logic - order matters (most specific first)
      if (combined.includes('grapheneos')) {
        romType = 'grapheneos';
        sensorNotes = 'GrapheneOS: If steps show 0, enable Sensors permission in Settings → Apps → RUNSTR → Permissions → Sensors';
      } else if (combined.includes('calyxos')) {
        romType = 'calyxos';
        sensorNotes = 'CalyxOS: Check Datura Firewall settings to allow sensor access for RUNSTR';
      } else if (combined.includes('divestos')) {
        romType = 'divestos';
        sensorNotes = 'DivestOS detected - may have restricted sensor access';
      } else if (combined.includes('lineage')) {
        romType = 'lineageos';
        sensorNotes = null; // LineageOS uses standard Android permissions
      }

      // Fallback: GrapheneOS uses stock Google fingerprints for anti-fingerprinting,
      // so the string "grapheneos" may not appear in build properties.
      // Check for GrapheneOS-specific apps as a secondary signal.
      if (romType === 'stock') {
        const isGraphene = await this.detectGrapheneOSByPackage();
        if (isGraphene) {
          romType = 'grapheneos';
          sensorNotes = 'GrapheneOS: If steps show 0, enable Sensors permission in Settings → Apps → RUNSTR → Permissions → Sensors';
          console.log('[ROMDetection] GrapheneOS detected via package check (build props used stock fingerprint)');
        }
      }

      this.cachedResult = {
        romType,
        isPrivacyROM: romType !== 'stock',
        sensorNotes,
      };

      // Log detection result
      if (this.cachedResult.isPrivacyROM) {
        console.log(`[ROMDetection] Privacy ROM detected: ${romType}`);
        if (sensorNotes) {
          console.log(`[ROMDetection] Note: ${sensorNotes}`);
        }
      } else {
        console.log('[ROMDetection] Stock Android detected');
      }

      return this.cachedResult;
    } catch (error) {
      console.error('[ROMDetection] Error detecting ROM:', error);

      // Default to stock on error
      this.cachedResult = {
        romType: 'stock',
        isPrivacyROM: false,
        sensorNotes: null,
      };
      return this.cachedResult;
    }
  }

  /**
   * Check if the detected ROM is a privacy-focused ROM
   */
  async isPrivacyROM(): Promise<boolean> {
    const result = await this.detectROM();
    return result.isPrivacyROM;
  }

  /**
   * Get the ROM type directly
   */
  async getROMType(): Promise<ROMType> {
    const result = await this.detectROM();
    return result.romType;
  }

  /**
   * Get sensor-specific notes for the detected ROM
   * Useful for displaying guidance when step tracking fails
   */
  async getSensorNotes(): Promise<string | null> {
    const result = await this.detectROM();
    return result.sensorNotes;
  }

  /**
   * Fallback GrapheneOS detection via known GrapheneOS-specific package URLs.
   * GrapheneOS ships its own camera, PDF viewer, etc. with unique package names.
   * Linking.canOpenURL checks if a package intent can be resolved.
   */
  private async detectGrapheneOSByPackage(): Promise<boolean> {
    // GrapheneOS-specific package schemes to check
    const graphenePackages = [
      'app.grapheneos.camera',
      'app.grapheneos.pdfviewer',
      'app.grapheneos.vanadium',
    ];

    for (const pkg of graphenePackages) {
      try {
        // Android intent URI format: package:<package_name>
        const canOpen = await Linking.canOpenURL(`package:${pkg}`);
        if (canOpen) {
          return true;
        }
      } catch {
        // canOpenURL may throw on some devices, continue checking
      }
    }
    return false;
  }

  /**
   * Clear cached detection result (for testing)
   */
  clearCache(): void {
    this.cachedResult = null;
    console.log('[ROMDetection] Cache cleared');
  }
}

// Export singleton instance
export const privacyROMDetectionService = new PrivacyROMDetectionService();
