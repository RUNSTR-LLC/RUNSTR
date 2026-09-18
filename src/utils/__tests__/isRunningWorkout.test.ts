import { isRunningWorkout } from '../isRunningWorkout';

describe('isRunningWorkout', () => {
  it('accepts the canonical running type', () => {
    expect(isRunningWorkout({ type: 'running' })).toBe(true);
  });

  it('accepts the short form and mixed case', () => {
    expect(isRunningWorkout({ type: 'run' })).toBe(true);
    expect(isRunningWorkout({ type: 'Running' })).toBe(true);
    expect(isRunningWorkout({ type: 'RUN' })).toBe(true);
  });

  it('rejects other cardio types', () => {
    expect(isRunningWorkout({ type: 'walking' })).toBe(false);
    expect(isRunningWorkout({ type: 'cycling' })).toBe(false);
    expect(isRunningWorkout({ type: 'hiking' })).toBe(false);
  });

  it('does not treat a treadmill walk as a run via substring match', () => {
    expect(isRunningWorkout({ type: 'walking_treadmill' })).toBe(false);
  });

  it('rejects missing or empty types rather than guessing', () => {
    expect(isRunningWorkout({})).toBe(false);
    expect(isRunningWorkout({ type: null })).toBe(false);
    expect(isRunningWorkout({ type: '' })).toBe(false);
  });
});
