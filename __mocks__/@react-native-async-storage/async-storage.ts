const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach(key => delete store[key]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map(key => [key, store[key] || null]))
  ),
  multiSet: jest.fn((keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => { store[key] = value; });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(key => delete store[key]);
    return Promise.resolve();
  }),
};

export default AsyncStorage;
