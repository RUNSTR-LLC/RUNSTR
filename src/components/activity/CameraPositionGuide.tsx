// src/components/activity/CameraPositionGuide.tsx

import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { RepCountingService } from '../../services/verification/RepCountingService';
import { convertLandmarks } from '../../services/verification/PoseDetectionService';
import type { SetVerificationData, PoseLandmark } from '../../types/verification';

// Conditional imports — these packages require native modules
let VisionCamera: any = null;
let useCameraDeviceHook: any = null;
let usePoseDetectionHook: any = null;
let RunningMode: any = null;
let Delegate: any = null;

try {
  const vc = require('react-native-vision-camera');
  VisionCamera = vc.Camera;
  useCameraDeviceHook = vc.useCameraDevice;
} catch {
  // react-native-vision-camera not available
}

try {
  const mp = require('react-native-mediapipe');
  usePoseDetectionHook = mp.usePoseDetection;
  RunningMode = mp.RunningMode;
  Delegate = mp.Delegate;
} catch {
  // react-native-mediapipe not available
}

export interface CameraPositionGuideRef {
  completeSet: () => SetVerificationData;
}

interface CameraPositionGuideProps {
  mode: 'position' | 'active';
  onRepCounted?: (repCount: number) => void;
  onLandmarksDetected?: (detected: boolean) => void;
}

export const CameraPositionGuide = forwardRef<CameraPositionGuideRef, CameraPositionGuideProps>(({
  mode,
  onRepCounted,
  onLandmarksDetected,
}, ref) => {
  const [landmarksVisible, setLandmarksVisible] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const repCounterRef = useRef(new RepCountingService());
  const lastRepCountRef = useRef(0);
  const landmarkLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Expose completeSet to parent via ref
  useImperativeHandle(ref, () => ({
    completeSet: () => {
      const data = repCounterRef.current.getSetData();
      repCounterRef.current.reset();
      lastRepCountRef.current = 0;
      return data;
    },
  }));

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (landmarkLostTimerRef.current) clearTimeout(landmarkLostTimerRef.current);
    };
  }, []);

  // Handle pose detection results — called by mediapipe's onResults callback
  const handlePoseResults = useCallback((result: any) => {
    // result.results[0].landmarks is Landmark[][] (one array per detected pose)
    const poseResults = result?.results?.[0];
    const poseLandmarks = poseResults?.landmarks?.[0]; // First pose, first set of landmarks

    if (!poseLandmarks || poseLandmarks.length === 0) {
      // No landmarks detected
      if (modeRef.current === 'active' && !landmarkLostTimerRef.current) {
        landmarkLostTimerRef.current = setTimeout(() => {
          setShowNudge(true);
          setTimeout(() => setShowNudge(false), 3000);
        }, 2000);
      }
      if (landmarksVisible) {
        setLandmarksVisible(false);
        onLandmarksDetected?.(false);
      }
      return;
    }

    // Landmarks found — clear nudge
    if (landmarkLostTimerRef.current) {
      clearTimeout(landmarkLostTimerRef.current);
      landmarkLostTimerRef.current = null;
    }
    setShowNudge(false);

    if (!landmarksVisible) {
      setLandmarksVisible(true);
      onLandmarksDetected?.(true);
    }

    // Count reps only in active mode
    if (modeRef.current === 'active') {
      const landmarks: PoseLandmark[] = convertLandmarks(poseLandmarks);
      const countResult = repCounterRef.current.processLandmarks(landmarks);

      if (countResult.repCount > lastRepCountRef.current) {
        lastRepCountRef.current = countResult.repCount;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRepCounted?.(countResult.repCount);
      }
    }
  }, [landmarksVisible, onRepCounted, onLandmarksDetected]);

  const handlePoseError = useCallback((error: any) => {
    console.warn('[CameraPositionGuide] Pose detection error:', error);
  }, []);

  // Get camera device
  const device = useCameraDeviceHook?.('back');

  // Initialize pose detection with correct API:
  // usePoseDetection(callbacks, runningMode, model, options?)
  // Returns MediaPipeSolution with .frameProcessor
  const poseDetection = usePoseDetectionHook?.(
    { onResults: handlePoseResults, onError: handlePoseError },
    RunningMode?.LIVE_STREAM ?? 'LIVE_STREAM',
    'pose_landmarker_lite',
    {
      delegate: Delegate?.GPU ?? 'GPU',
      numPoses: 1,
    }
  );

  // Fallback if camera or MediaPipe unavailable
  if (!VisionCamera || !device || !usePoseDetectionHook || !poseDetection) {
    return (
      <View style={styles.container}>
        <Text style={styles.unavailableText}>
          Camera verification is not available on this device
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera preview with mediapipe's built-in frame processor */}
      <View style={styles.cameraWrapper}>
        <VisionCamera
          device={device}
          isActive={true}
          style={styles.camera}
          frameProcessor={poseDetection.frameProcessor}
          fps={15}
          pixelFormat="yuv"
          onLayout={poseDetection.cameraViewLayoutChangeHandler}
          outputOrientation="device"
          onOutputOrientationChanged={poseDetection.cameraOrientationChangedHandler}
        />
      </View>

      {/* Status indicator */}
      <View style={styles.statusRow}>
        {landmarksVisible ? (
          <Text style={styles.statusDetected}>Arm Detected</Text>
        ) : (
          <Text style={styles.statusSearching}>Position your arm in frame</Text>
        )}
      </View>

      {/* Nudge when landmarks lost during active tracking */}
      {showNudge && (
        <Text style={styles.nudgeText}>Move into frame</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
    marginTop: 12,
  },
  cameraWrapper: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 8,
  },
  camera: {
    flex: 1,
  },
  statusRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusDetected: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  statusSearching: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  nudgeText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 8,
  },
  unavailableText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    padding: 16,
  },
});
