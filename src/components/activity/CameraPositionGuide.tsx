// src/components/activity/CameraPositionGuide.tsx

import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { RepCountingService } from '../../services/verification/RepCountingService';
import { convertLandmarks } from '../../services/verification/PoseDetectionService';
import type { SetVerificationData } from '../../types/verification';

// Conditional imports for camera and pose detection
let VisionCamera: any = null;
let useCameraDevice: any = null;
let useFrameProcessor: any = null;

try {
  const vc = require('react-native-vision-camera');
  VisionCamera = vc.Camera;
  useCameraDevice = vc.useCameraDevice;
  useFrameProcessor = vc.useFrameProcessor;
} catch {
  // Camera not available
}

let usePoseDetection: any = null;
try {
  const mp = require('react-native-mediapipe');
  usePoseDetection = mp.usePoseDetection ?? mp.usePoseLandmarker ?? mp.usePoseEstimation;
} catch {
  // MediaPipe not available
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

  // Get camera device — prefer back camera for full-body view
  const device = useCameraDevice?.('back');

  // Handle landmarks from frame processor
  const handleLandmarks = useCallback((rawLandmarks: any[] | null) => {
    if (!rawLandmarks || rawLandmarks.length === 0) {
      // Start nudge timer if landmarks lost during active tracking
      if (mode === 'active' && !landmarkLostTimerRef.current) {
        landmarkLostTimerRef.current = setTimeout(() => {
          setShowNudge(true);
          // Auto-hide nudge after 3 seconds
          setTimeout(() => setShowNudge(false), 3000);
        }, 2000);
      }
      if (landmarksVisible) {
        setLandmarksVisible(false);
        onLandmarksDetected?.(false);
      }
      return;
    }

    // Clear nudge timer — landmarks found
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
    if (mode === 'active') {
      const landmarks = convertLandmarks(rawLandmarks);
      const result = repCounterRef.current.processLandmarks(landmarks);

      if (result.repCount > lastRepCountRef.current) {
        lastRepCountRef.current = result.repCount;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRepCounted?.(result.repCount);
      }
    }
  }, [mode, landmarksVisible, onRepCounted, onLandmarksDetected]);

  // Build frame processor using react-native-mediapipe
  const poseDetector = usePoseDetection?.({
    modelPath: 'pose_landmarker_lite',
    delegate: 'GPU',
    numPoses: 1,
  });

  const frameProcessor = useFrameProcessor?.((frame: any) => {
    'worklet';
    if (poseDetector?.detect) {
      const result = poseDetector.detect(frame);
      if (result?.landmarks && result.landmarks.length > 0) {
        const { runOnJS } = require('react-native-vision-camera');
        runOnJS(handleLandmarks)(result.landmarks[0]);
      } else {
        const { runOnJS } = require('react-native-vision-camera');
        runOnJS(handleLandmarks)(null);
      }
    }
  }, [poseDetector, handleLandmarks]);

  // Fallback if camera or MediaPipe unavailable
  if (!VisionCamera || !device || !usePoseDetection) {
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
      {/* Camera preview */}
      <View style={styles.cameraWrapper}>
        <VisionCamera
          device={device}
          isActive={true}
          style={styles.camera}
          frameProcessor={frameProcessor}
          fps={15}
          pixelFormat="yuv"
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
    color: theme.colors.accent, // #FF7B1C deep orange
    fontSize: 14,
    fontWeight: '500',
  },
  statusSearching: {
    color: theme.colors.textMuted, // #CC7A33 muted orange
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
