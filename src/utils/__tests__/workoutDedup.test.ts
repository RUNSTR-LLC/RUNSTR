import { isDuplicateWorkout, type DedupCandidate } from '../workoutDedup';

const base: DedupCandidate = {
  nostrEventId: 'abc123',
  type: 'running',
  startTime: '2026-09-18T10:00:00.000Z',
  duration: 1800,
};

describe('isDuplicateWorkout', () => {
  it('matches on nostrEventId', () => {
    const candidate = { ...base, startTime: '2020-01-01T00:00:00.000Z' };
    expect(isDuplicateWorkout([base], candidate)).toBe(true);
  });

  it('matches a workout with no event id by time, type and duration', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], base)).toBe(true);
  });

  it('tolerates start times within 60 seconds', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, startTime: '2026-09-18T10:00:45.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });

  it('rejects start times beyond 60 seconds', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, startTime: '2026-09-18T10:02:00.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(false);
  });

  it('tolerates small duration rounding', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], { ...base, duration: 1803 })).toBe(true);
  });

  it('rejects a different duration', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], { ...base, duration: 3600 })).toBe(false);
  });

  it('rejects a different activity type at the same time', () => {
    const local = { ...base, nostrEventId: undefined, type: 'cycling' };
    expect(isDuplicateWorkout([local], base)).toBe(false);
  });

  it('returns false against an empty set', () => {
    expect(isDuplicateWorkout([], base)).toBe(false);
  });

  it('ignores unparseable start times rather than matching everything', () => {
    const local = { ...base, nostrEventId: undefined, startTime: 'not-a-date' };
    expect(isDuplicateWorkout([local], base)).toBe(false);
  });
});
