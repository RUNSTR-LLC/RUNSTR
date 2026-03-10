import { findNavigatorWithRoute } from '../../src/navigation/findNavigatorWithRoute';

describe('findNavigatorWithRoute', () => {
  it('returns the current navigator when route exists locally', () => {
    const nav = {
      getState: () => ({ routeNames: ['Home', 'WorkoutHistory'] }),
      getParent: () => null,
    };

    expect(findNavigatorWithRoute(nav, 'WorkoutHistory')).toBe(nav);
  });

  it('walks up parent navigators until route is found', () => {
    const parent = {
      getState: () => ({ routeNames: ['MainTabs', 'WorkoutHistory'] }),
      getParent: () => null,
    };

    const child = {
      getState: () => ({ routeNames: ['Profile', 'Settings'] }),
      getParent: () => parent,
    };

    expect(findNavigatorWithRoute(child, 'WorkoutHistory')).toBe(parent);
  });

  it('returns null when route does not exist in navigator chain', () => {
    const root = {
      getState: () => ({ routeNames: ['Home', 'Feed'] }),
      getParent: () => null,
    };

    const child = {
      getState: () => ({ routeNames: ['Profile'] }),
      getParent: () => root,
    };

    expect(findNavigatorWithRoute(child, 'WorkoutHistory')).toBeNull();
  });
});
