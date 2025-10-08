/**
 * Mock for expo-linking
 * Used in Jest tests to avoid importing actual Expo native modules
 */

export const openURL = jest.fn();
export const canOpenURL = jest.fn();
export const getInitialURL = jest.fn();
export const addEventListener = jest.fn();

export default {
  openURL,
  canOpenURL,
  getInitialURL,
  addEventListener
};
