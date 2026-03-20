// src/types/verification.ts

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number; // 0-1 confidence that landmark is visible
}

export type RepState = 'UP' | 'DOWN';

export interface RepCountResult {
  repCount: number;
  state: RepState;
  elbowAngle: number;
  landmarksDetected: boolean;
}

export interface SetVerificationData {
  reps: number;
  confidence: number; // 0-1 frame detection rate
  repTimestamps: number[]; // ms offsets from set start
  totalFrames: number;
  detectedFrames: number;
}

export interface VerificationReceipt {
  verified: true;
  method: 'camera_pose';
  algorithmVersion: number;
  reps: number;
  confidence: number;
  repTimestamps: number[];
  exerciseType: string;
  deviceModel: string;
}

// MediaPipe BlazePose landmark indices we care about
// See: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const;

// Rep counting thresholds (degrees)
export const REP_THRESHOLDS = {
  UP_ANGLE: 150,   // Elbow angle above this = arms extended (up position)
  DOWN_ANGLE: 100,  // Elbow angle below this = chest down (down position)
} as const;

// Verification constants
export const VERIFICATION_CONSTANTS = {
  ALGORITHM_VERSION: 1,
  MIN_CONFIDENCE: 0.7,        // 70% of frames must have reliable detection
  MIN_LANDMARK_VISIBILITY: 0.5, // Per-landmark visibility threshold
  TARGET_FPS: 15,
} as const;
