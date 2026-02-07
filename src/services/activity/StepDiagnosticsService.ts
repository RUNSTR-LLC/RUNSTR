/**
 * StepDiagnosticsService - Aggregates step counting diagnostic data
 *
 * Gathers status from multiple sources:
 * - NativeStepCounterService (Android sensor)
 * - HealthConnectService (Health Connect SDK)
 * - PrivacyROMDetectionService (ROM-specific guidance)
 *
 * Used by StepCountDiagnostics component to show users why steps
 * might not be working on their device.
 */

import { Platform } from 'react-native';
import { nativeStepCounterService } from './NativeStepCounterService';
import healthConnectService from '../fitness/healthConnectService';
import { privacyROMDetectionService, type ROMType } from '../platform/PrivacyROMDetectionService';

export interface StepDiagnosticStatus {
  // Active source
  activeSource: 'native' | 'health_connect' | 'none';

  // Native Sensor
  nativeSensorRunning: boolean;
  backgroundTrackingEnabled: boolean;

  // Health Connect
  healthConnectSdkAvailable: boolean;
  healthConnectSdkStatus: number; // 1=unavailable, 2=update required, 3=available
  stepsPermissionGranted: boolean;

  // ROM Detection
  romType: ROMType;
  isPrivacyROM: boolean;
  sensorNotes: string | null;

  // Meta
  androidVersion: number;
  isLoading: boolean;
}

const getAndroidVersion = (): number => {
  return Platform.OS === 'android' ? (Platform.Version as number) : 0;
};

class StepDiagnosticsService {
  private static instance: StepDiagnosticsService;

  private constructor() {}

  static getInstance(): StepDiagnosticsService {
    if (!StepDiagnosticsService.instance) {
      StepDiagnosticsService.instance = new StepDiagnosticsService();
    }
    return StepDiagnosticsService.instance;
  }

  /**
   * Gather all diagnostic data from existing services
   * Returns comprehensive status for the StepCountDiagnostics component
   */
  async getDiagnostics(): Promise<StepDiagnosticStatus> {
    // Default values
    const status: StepDiagnosticStatus = {
      activeSource: 'none',
      nativeSensorRunning: false,
      backgroundTrackingEnabled: false,
      healthConnectSdkAvailable: false,
      healthConnectSdkStatus: 1, // unavailable
      stepsPermissionGranted: false,
      romType: 'stock',
      isPrivacyROM: false,
      sensorNotes: null,
      androidVersion: getAndroidVersion(),
      isLoading: false,
    };

    try {
      // 1. Check native step counter status
      status.nativeSensorRunning = nativeStepCounterService.isServiceRunning();
      status.backgroundTrackingEnabled = await nativeStepCounterService.isBackgroundTrackingEnabled();

      // 2. Check Health Connect status
      const debugInfo = await healthConnectService.getDebugInfo();
      status.healthConnectSdkStatus = debugInfo.sdkStatus;
      status.healthConnectSdkAvailable = debugInfo.sdkStatus === 3;
      status.stepsPermissionGranted = debugInfo.permissions.steps;

      // 3. Check ROM type
      const romInfo = await privacyROMDetectionService.detectROM();
      status.romType = romInfo.romType;
      status.isPrivacyROM = romInfo.isPrivacyROM;
      status.sensorNotes = romInfo.sensorNotes;

      // 4. Determine active source
      if (status.nativeSensorRunning && status.backgroundTrackingEnabled) {
        status.activeSource = 'native';
      } else if (status.healthConnectSdkAvailable && status.stepsPermissionGranted) {
        status.activeSource = 'health_connect';
      } else {
        status.activeSource = 'none';
      }

      console.log('[StepDiagnostics] Status gathered:', {
        activeSource: status.activeSource,
        native: status.nativeSensorRunning,
        hc: status.healthConnectSdkAvailable,
        rom: status.romType,
      });

      return status;
    } catch (error) {
      console.error('[StepDiagnostics] Error gathering diagnostics:', error);
      return status;
    }
  }

  /**
   * Quick check if step counting is likely to work
   */
  async isStepCountingConfigured(): Promise<boolean> {
    const status = await this.getDiagnostics();
    return status.activeSource !== 'none';
  }
}

export const stepDiagnosticsService = StepDiagnosticsService.getInstance();
