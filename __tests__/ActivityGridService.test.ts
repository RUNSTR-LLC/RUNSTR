import { activityGridService } from '../src/services/activity/ActivityGridService';

describe('ActivityGridService helpers', () => {
  it('maps cardio activity keys to grid positions', () => {
    expect(activityGridService.getPositionForActivity('run')).toEqual({ row: 0, column: 0 });
    expect(activityGridService.getPositionForActivity('walk')).toEqual({ row: 0, column: 1 });
    expect(activityGridService.getPositionForActivity('cycle')).toEqual({ row: 0, column: 2 });
    expect(activityGridService.getPositionForActivity('hiking')).toEqual({ row: 0, column: 3 });
  });

  it('returns null for unknown activity keys', () => {
    expect(activityGridService.getPositionForActivity('unknown')).toBeNull();
  });

  it('validates in-bounds positions', () => {
    expect(activityGridService.isPositionValid({ row: 1, column: 2 })).toBe(true);
    expect(activityGridService.isPositionValid({ row: 3, column: 1 })).toBe(true);
  });

  it('invalidates malformed or out-of-bounds positions', () => {
    expect(activityGridService.isPositionValid(null)).toBe(false);
    expect(activityGridService.isPositionValid({ row: -1, column: 0 })).toBe(false);
    expect(activityGridService.isPositionValid({ row: 0, column: 6 })).toBe(false);
    expect(activityGridService.isPositionValid({ row: 0.5, column: 0 })).toBe(false);
    expect(activityGridService.isPositionValid({ row: 0, column: '1' as unknown as number })).toBe(false);
  });
});
