/**
 * Mock for react-native
 * Used in Jest tests to avoid importing actual React Native modules
 */

export const Platform = {
  OS: 'android',
  Version: 31,
  select: (obj: any) => obj.android || obj.default
};

export default {
  Platform
};
