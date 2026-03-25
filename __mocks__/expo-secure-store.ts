type SecureValue = string | null;

const store = new Map<string, string>();

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  store.set(key, value);
};

export const getItemAsync = async (key: string): Promise<SecureValue> => {
  return store.has(key) ? (store.get(key) as string) : null;
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  store.delete(key);
};

export const isAvailableAsync = async (): Promise<boolean> => true;

export const canUseBiometricAuthentication = async (): Promise<boolean> => false;

export default {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  canUseBiometricAuthentication,
};
