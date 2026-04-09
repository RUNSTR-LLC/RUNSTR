// src/services/verification/RepCountingService.ts

import {
  type PoseLandmark,
  type RepState,
  type RepCountResult,
  type SetVerificationData,
  POSE_LANDMARKS,
  REP_THRESHOLDS,
  VERIFICATION_CONSTANTS,
} from '../../types/verification';

/**
 * RepCountingService - Pure state machine for counting exercise reps
 * from pose landmark data. No camera or React Native dependencies.
 *
 * Usage:
 *   const counter = new RepCountingService();
 *   // For each frame:
 *   const result = counter.processLandmarks(landmarks);
 *   // After set:
 *   const data = counter.getSetData();
 *   counter.reset();
 */
export class RepCountingService {
  private state: RepState = 'UP';
  private repCount = 0;
  private repTimestamps: number[] = [];
  private setStartTime = 0;
  private totalFrames = 0;
  private detectedFrames = 0;

  /**
   * Calculate angle between three points (in degrees).
   * Points: a (shoulder), b (elbow/vertex), c (wrist)
   * Returns the angle at point b formed by vectors b->a and b->c.
   */
  static calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180 / Math.PI));
    if (angle > 180) {
      angle = 360 - angle;
    }
    return angle;
  }

  /**
   * Check if the key landmarks (shoulder, elbow, wrist) are reliably detected.
   * Returns true if all three have visibility above the threshold.
   */
  static areLandmarksReliable(
    shoulder: PoseLandmark,
    elbow: PoseLandmark,
    wrist: PoseLandmark
  ): boolean {
    const threshold = VERIFICATION_CONSTANTS.MIN_LANDMARK_VISIBILITY;
    return (
      shoulder.visibility >= threshold &&
      elbow.visibility >= threshold &&
      wrist.visibility >= threshold
    );
  }

  /**
   * Extract the best arm landmarks from a full pose.
   * Picks the arm with higher average visibility.
   * landmarks array follows MediaPipe BlazePose 33-landmark ordering.
   */
  static getBestArmLandmarks(landmarks: PoseLandmark[]): {
    shoulder: PoseLandmark;
    elbow: PoseLandmark;
    wrist: PoseLandmark;
  } | null {
    if (landmarks.length < 17) return null;

    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];

    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    const leftVisibility = (leftShoulder.visibility + leftElbow.visibility + leftWrist.visibility) / 3;
    const rightVisibility = (rightShoulder.visibility + rightElbow.visibility + rightWrist.visibility) / 3;

    if (leftVisibility >= rightVisibility) {
      return { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist };
    }
    return { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist };
  }

  /**
   * Process a single frame's landmarks and return current rep state.
   * Call this for every frame from the camera.
   */
  processLandmarks(landmarks: PoseLandmark[]): RepCountResult {
    if (this.setStartTime === 0) {
      this.setStartTime = Date.now();
    }

    this.totalFrames++;

    const arm = RepCountingService.getBestArmLandmarks(landmarks);
    if (!arm) {
      return {
        repCount: this.repCount,
        state: this.state,
        elbowAngle: 0,
        landmarksDetected: false,
      };
    }

    const reliable = RepCountingService.areLandmarksReliable(arm.shoulder, arm.elbow, arm.wrist);
    if (!reliable) {
      return {
        repCount: this.repCount,
        state: this.state,
        elbowAngle: 0,
        landmarksDetected: false,
      };
    }

    this.detectedFrames++;
    const angle = RepCountingService.calculateAngle(arm.shoulder, arm.elbow, arm.wrist);

    // State machine transitions
    if (this.state === 'UP' && angle < REP_THRESHOLDS.DOWN_ANGLE) {
      this.state = 'DOWN';
    } else if (this.state === 'DOWN' && angle > REP_THRESHOLDS.UP_ANGLE) {
      this.state = 'UP';
      this.repCount++;
      this.repTimestamps.push(Date.now() - this.setStartTime);
    }

    return {
      repCount: this.repCount,
      state: this.state,
      elbowAngle: angle,
      landmarksDetected: true,
    };
  }

  /**
   * Get verification data for the completed set.
   */
  getSetData(): SetVerificationData {
    const confidence = this.totalFrames > 0
      ? this.detectedFrames / this.totalFrames
      : 0;

    return {
      reps: this.repCount,
      confidence,
      repTimestamps: [...this.repTimestamps],
      totalFrames: this.totalFrames,
      detectedFrames: this.detectedFrames,
    };
  }

  /**
   * Reset for a new set. Call between sets.
   */
  reset(): void {
    this.state = 'UP';
    this.repCount = 0;
    this.repTimestamps = [];
    this.setStartTime = 0;
    this.totalFrames = 0;
    this.detectedFrames = 0;
  }

  /** Current rep count */
  getReps(): number {
    return this.repCount;
  }

  /** Frame detection rate so far */
  getConfidence(): number {
    return this.totalFrames > 0 ? this.detectedFrames / this.totalFrames : 0;
  }
}
