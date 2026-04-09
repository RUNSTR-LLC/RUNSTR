/**
 * RewardNotificationProvider - Renders RewardEarnedModal at app root
 * Registers with RewardNotificationManager for imperative triggering
 *
 * Wrap your app with this provider to enable reward notifications:
 *   <RewardNotificationProvider>
 *     <App />
 *   </RewardNotificationProvider>
 */

import React, { useEffect, useState, useCallback } from 'react';
import { RewardEarnedModal } from './RewardEarnedModal';
import {
  RewardNotificationManager,
  RewardNotificationState,
} from '../../services/rewards/RewardNotificationManager';

interface RewardNotificationProviderProps {
  children: React.ReactNode;
}

export const RewardNotificationProvider: React.FC<
  RewardNotificationProviderProps
> = ({ children }) => {
  const [notificationState, setNotificationState] =
    useState<RewardNotificationState>({
      visible: false,
      amount: 0,
    });

  // Register callback with manager on mount
  useEffect(() => {
    RewardNotificationManager.register(setNotificationState);

    return () => {
      RewardNotificationManager.unregister();
    };
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    setNotificationState({ visible: false, amount: 0 });
  }, []);

  return (
    <>
      {children}
      <RewardEarnedModal
        visible={notificationState.visible}
        amount={notificationState.amount}
        donationSplit={(notificationState as any).donationSplit}
        pledgeInfo={notificationState.pledgeInfo}
        onClose={handleClose}
      />
    </>
  );
};

export default RewardNotificationProvider;
