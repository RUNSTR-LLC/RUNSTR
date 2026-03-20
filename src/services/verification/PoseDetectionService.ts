// src/services/verification/PoseDetectionService.ts

import type { PoseLandmark } from '../../types/verification';

let poseDetectionAvailable = false;

export async function checkPoseDetectionAvailability(): Promise<boolean> {
  try {
    const mediapipe = require('react-native-mediapipe');
    poseDetectionAvailable = !!mediapipe;
    return poseDetectionAvailable;
  } catch {
    console.warn('[PoseDetection] MediaPipe not available on this device');
    poseDetectionAvailable = false;
    return false;
  }
}

export function isPoseDetectionAvailable(): boolean {
  return poseDetectionAvailable;
}

export function convertLandmarks(rawLandmarks: any[]): PoseLandmark[] {
  return rawLandmarks.map((l: any) => ({
    x: l.x ?? 0,
    y: l.y ?? 0,
    z: l.z ?? 0,
    visibility: l.visibility ?? l.presence ?? 0,
  }));
}
