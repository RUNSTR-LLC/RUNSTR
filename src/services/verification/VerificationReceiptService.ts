// src/services/verification/VerificationReceiptService.ts

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import {
  type VerificationReceipt,
  type SetVerificationData,
  VERIFICATION_CONSTANTS,
} from '../../types/verification';

export class VerificationReceiptService {
  static generate(
    sets: SetVerificationData[],
    exerciseType: string,
    restDurationMs: number = 60000
  ): VerificationReceipt | null {
    if (sets.length === 0) return null;

    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const totalFrames = sets.reduce((sum, s) => sum + s.totalFrames, 0);
    const totalDetected = sets.reduce((sum, s) => sum + s.detectedFrames, 0);
    const overallConfidence = totalFrames > 0 ? totalDetected / totalFrames : 0;

    if (overallConfidence < VERIFICATION_CONSTANTS.MIN_CONFIDENCE) {
      return null;
    }

    const allTimestamps: number[] = [];
    let offsetMs = 0;
    for (const set of sets) {
      for (const ts of set.repTimestamps) {
        allTimestamps.push(ts + offsetMs);
      }
      const setDuration = set.repTimestamps.length > 0
        ? set.repTimestamps[set.repTimestamps.length - 1]
        : 0;
      offsetMs += setDuration + restDurationMs;
    }

    const deviceModel = Device.modelName
      ?? `${Platform.OS} ${Platform.Version}`;

    return {
      verified: true,
      method: 'camera_pose',
      algorithmVersion: VERIFICATION_CONSTANTS.ALGORITHM_VERSION,
      reps: totalReps,
      confidence: Math.round(overallConfidence * 100) / 100,
      repTimestamps: allTimestamps,
      exerciseType,
      deviceModel,
    };
  }

  static isSetVerified(setData: SetVerificationData): boolean {
    const confidence = setData.totalFrames > 0
      ? setData.detectedFrames / setData.totalFrames
      : 0;
    return confidence >= VERIFICATION_CONSTANTS.MIN_CONFIDENCE;
  }
}
