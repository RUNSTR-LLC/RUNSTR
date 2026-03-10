export const findNavigatorWithRoute = (nav: any, routeName: string) => {
  let currentNav = nav;

  while (currentNav) {
    const state = currentNav.getState?.();
    if (state?.routeNames?.includes(routeName)) {
      return currentNav;
    }
    currentNav = currentNav.getParent?.();
  }

  return null;
};
