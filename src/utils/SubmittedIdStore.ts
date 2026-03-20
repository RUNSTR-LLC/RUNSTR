import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubmittedIdStoreConfig {
  storageKey: string;
  maxIds?: number;
}

const DEFAULT_MAX_IDS = 500;

export class SubmittedIdStore {
  private readonly storageKey: string;
  private readonly maxIds: number;

  constructor(config: SubmittedIdStoreConfig) {
    this.storageKey = config.storageKey;
    this.maxIds = config.maxIds ?? DEFAULT_MAX_IDS;
  }

  async get(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  async save(ids: Set<string>): Promise<void> {
    const trimmed = Array.from(ids).slice(-this.maxIds);
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(trimmed));
  }
}
