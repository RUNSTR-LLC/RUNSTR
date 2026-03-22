// src/hooks/useVerification.ts

import { useState, useRef, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { checkPoseDetectionAvailability } from '../services/verification/PoseDetectionService';
import { VerificationReceiptService } from '../services/verification/VerificationReceiptService';
import type { CameraPositionGuideRef } from '../components/activity/CameraPositionGuide';
import type { SetVerificationData, VerificationReceipt } from '../types/verification';

export function useVerification(exerciseType: string) {
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [landmarksDetected, setLandmarksDetected] = useState(false);
  const [verifiedRepCount, setVerifiedRepCount] = useState(0);
  const [verificationReceipt, setVerificationReceipt] = useState<VerificationReceipt | null>(null);
  const cameraRef = useRef<CameraPositionGuideRef>(null);
  // Use ref for set data list to avoid stale closure in generateReceipt
  const setVerificationDataListRef = useRef<SetVerificationData[]>([]);

  const handleToggleVerification = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setVerificationEnabled(false);
      return;
    }

    // Only pushups supported for now
    if (exerciseType !== 'pushups') {
      Toast.show({ type: 'info', text1: 'Verification only available for pushups' });
      return;
    }

    // Check device support
    const available = await checkPoseDetectionAvailability();
    if (!available) {
      Toast.show({ type: 'info', text1: 'Camera verification not available on this device' });
      return;
    }

    // Request camera permission
    try {
      const { Camera } = require('react-native-vision-camera');
      const permission = await Camera.requestCameraPermission();
      if (permission === 'granted') {
        setVerificationEnabled(true);
      } else {
        Toast.show({ type: 'info', text1: 'Camera access needed for verification' });
      }
    } catch {
      Toast.show({ type: 'info', text1: 'Camera verification not available' });
    }
  }, [exerciseType]);

  const handleRepCounted = useCallback((count: number) => {
    setVerifiedRepCount(count);
  }, []);

  const completeVerifiedSet = useCallback(() => {
    if (cameraRef.current) {
      const data = cameraRef.current.completeSet();
      setVerificationDataListRef.current = [...setVerificationDataListRef.current, data];
      setVerifiedRepCount(0);
      return data.reps;
    }
    return 0;
  }, []);

  const generateReceipt = useCallback((restDurationMs: number) => {
    const dataList = setVerificationDataListRef.current;
    if (dataList.length > 0) {
      const receipt = VerificationReceiptService.generate(
        dataList,
        exerciseType,
        restDurationMs
      );
      setVerificationReceipt(receipt);
      if (!receipt) {
        Toast.show({ type: 'info', text1: 'Not enough clear frames for verification' });
      }
      return receipt;
    }
    return null;
  }, [exerciseType]);

  const resetVerification = useCallback(() => {
    setVerificationEnabled(false);
    setLandmarksDetected(false);
    setVerifiedRepCount(0);
    setVerificationDataListRef.current = [];
    setVerificationReceipt(null);
  }, []);

  return {
    // State
    verificationEnabled,
    landmarksDetected,
    verifiedRepCount,
    verificationReceipt,
    cameraRef,

    // Handlers
    handleToggleVerification,
    handleRepCounted,
    setLandmarksDetected,
    completeVerifiedSet,
    generateReceipt,
    resetVerification,
  };
}
