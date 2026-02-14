/**
 * Mock for expo-secure-store
 * Used in tests to simulate secure storage
 */

const storage: Record<string, string> = {};

export async function getItemAsync(key: string): Promise<string | null> {
  return storage[key] ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  storage[key] = value;
}

export async function deleteItemAsync(key: string): Promise<void> {
  delete storage[key];
}

export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

// For clearing between tests
export function __clearStorage(): void {
  Object.keys(storage).forEach(key => delete storage[key]);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  __clearStorage,
};
