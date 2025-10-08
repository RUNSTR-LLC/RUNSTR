/**
 * Mock for expo-intent-launcher
 * Used in Jest tests to avoid importing actual Expo native modules
 */

export enum ResultCode {
  Success = -1,
  Canceled = 0,
  FirstUser = 1
}

export const startActivityAsync = jest.fn();

export default {
  ResultCode,
  startActivityAsync
};
