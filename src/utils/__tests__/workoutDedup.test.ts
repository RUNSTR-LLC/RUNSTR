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

  it('rejects when existing item has undefined duration (data loss bug)', () => {
    const local = { ...base, nostrEventId: undefined, duration: undefined as any };
    const candidate = { ...base, nostrEventId: undefined, startTime: '2026-09-18T10:00:30.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(false);
  });

  it('rejects when candidate has NaN duration', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, nostrEventId: undefined, duration: NaN };
    expect(isDuplicateWorkout([local], candidate)).toBe(false);
  });

  it('rejects when either side has zero duration (parse failure sentinel)', () => {
    const local = { ...base, nostrEventId: undefined, duration: 0 };
    const candidate = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], candidate)).toBe(false);
  });

  it('does not short-circuit on event id mismatch if ids differ', () => {
    const local = { ...base, nostrEventId: 'abc123' };
    const candidate = { ...base, nostrEventId: 'xyz789', type: 'running', startTime: base.startTime, duration: base.duration };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });

  it('normalizes type case and whitespace for matching', () => {
    const local = { ...base, nostrEventId: undefined, type: 'Running' };
    const candidate = { ...base, nostrEventId: undefined, type: ' running ', startTime: base.startTime, duration: base.duration };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });

  it('iterates over multi-element existing array and matches the correct one', () => {
    const existing = [
      { nostrEventId: 'other1', type: 'cycling', startTime: '2026-09-18T08:00:00.000Z', duration: 900 },
      { nostrEventId: 'other2', type: 'walking', startTime: '2026-09-18T09:00:00.000Z', duration: 1200 },
      { nostrEventId: undefined, type: 'running', startTime: '2026-09-18T10:00:00.000Z', duration: 1800 },
      { nostrEventId: 'other3', type: 'hiking', startTime: '2026-09-18T11:00:00.000Z', duration: 2400 },
    ];
    const candidate = { nostrEventId: undefined, type: 'running', startTime: '2026-09-18T10:00:30.000Z', duration: 1805 };
    expect(isDuplicateWorkout(existing, candidate)).toBe(true);
  });

  it('matches at exactly 60000ms time boundary', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, nostrEventId: undefined, startTime: '2026-09-18T10:01:00.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });

  it('matches at exactly 5 second duration boundary', () => {
    const local = { ...base, nostrEventId: undefined, duration: 1800 };
    const candidate = { ...base, nostrEventId: undefined, duration: 1805 };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });
});
