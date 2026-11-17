import { FEATURES } from '../features';

describe('feature flags', () => {
  it('keeps the app running-only', () => {
    expect(FEATURES.stepTracking).toBe(false);
    expect(FEATURES.nonRunningHistory).toBe(false);
  });

  it('carries no flags for deleted features', () => {
    expect(Object.keys(FEATURES).sort()).toEqual(['nonRunningHistory', 'stepTracking']);
  });
});
