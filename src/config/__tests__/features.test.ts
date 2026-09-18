import { FEATURES } from '../features';

const PHASE_1_FLAGS = [
  'social',
  'leaderboard',
  'teams',
  'level',
  'earnings',
  'activitySelector',
  'stepTracking',
  'cloudBackupButton',
  'walletSettings',
  'privateMode',
  'shareSheet',
  'journalHabits',
  'nonRunningHistory',
] as const;

describe('Phase 1 simplification flags', () => {
  it('defines every Phase 1 flag', () => {
    for (const flag of PHASE_1_FLAGS) {
      expect(FEATURES).toHaveProperty(flag);
    }
  });

  it('hides every Phase 1 surface', () => {
    for (const flag of PHASE_1_FLAGS) {
      expect(FEATURES[flag]).toBe(false);
    }
  });
});
