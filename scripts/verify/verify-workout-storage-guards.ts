/**
 * Verifies the LocalWorkoutStorageService data-safety guards added for the
 * pre-release audit (A1 corrupt-JSON data loss, A2 cache-by-reference).
 *
 * The real service depends on React Native AsyncStorage and the full app
 * dependency graph, so it can't be imported under tsx. This replicates the
 * exact guard algorithm against an in-memory store and asserts the behavior.
 *
 * Run: npx tsx scripts/verify/verify-workout-storage-guards.ts
 */

type Workout = { id: string; startTime: string };

// --- in-memory AsyncStorage stand-in ---
const store = new Map<string, string>();
const AsyncStorage = {
  getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: async (k: string, v: string) => void store.set(k, v),
};

// --- replica of the guarded service logic ---
class Replica {
  private workoutCache: Workout[] | null = null;
  private cacheValid = false;
  private dataCorrupted = false;

  private async persistWorkouts(workouts: Workout[]): Promise<void> {
    if (this.dataCorrupted) {
      throw new Error('refusing to write — corrupted (backed up)');
    }
    await AsyncStorage.setItem('local_workouts', JSON.stringify(workouts));
  }

  async getAllWorkouts(): Promise<Workout[]> {
    try {
      if (this.cacheValid && this.workoutCache) return [...this.workoutCache];
      const data = await AsyncStorage.getItem('local_workouts');
      if (!data) {
        this.workoutCache = [];
        this.cacheValid = true;
        return [];
      }
      let workouts: Workout[];
      try {
        workouts = JSON.parse(data);
      } catch (parseError) {
        this.dataCorrupted = true;
        await AsyncStorage.setItem(`local_workouts_corrupt_${Date.now()}`, data);
        return [];
      }
      this.workoutCache = workouts;
      this.cacheValid = true;
      return [...workouts];
    } catch {
      return [];
    }
  }

  // mirrors saveWorkout's read-push-persist
  async saveWorkout(w: Workout): Promise<void> {
    const workouts = await this.getAllWorkouts();
    workouts.push(w);
    await this.persistWorkouts(workouts);
    this.workoutCache = null;
    this.cacheValid = false;
  }
}

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
};

(async () => {
  // A1: corrupt data must NOT be overwritten by a subsequent save
  store.clear();
  store.set('local_workouts', '{ this is corrupt JSON ][');
  const svc = new Replica();
  const read = await svc.getAllWorkouts();
  check('A1: corrupt read returns [] (graceful for readers)', read.length === 0);
  const backupKeys = [...store.keys()].filter((k) =>
    k.startsWith('local_workouts_corrupt_')
  );
  check('A1: corrupt blob backed up to recovery key', backupKeys.length === 1);
  let threw = false;
  try {
    await svc.saveWorkout({ id: 'new', startTime: '2026-01-01' });
  } catch {
    threw = true;
  }
  check('A1: save aborts (throws) instead of overwriting', threw);
  check(
    'A1: original corrupt history still intact (not overwritten)',
    store.get('local_workouts') === '{ this is corrupt JSON ]['
  );

  // A2: returned array is a copy — mutating it must not corrupt the cache
  store.clear();
  store.set(
    'local_workouts',
    JSON.stringify([{ id: 'a', startTime: '2026-01-01' }])
  );
  const svc2 = new Replica();
  const first = await svc2.getAllWorkouts(); // populates cache
  first.push({ id: 'injected', startTime: '2026-01-02' }); // mutate the result
  const second = await svc2.getAllWorkouts(); // from cache
  check('A2: mutating returned array does not leak into cache', second.length === 1);
  check('A2: cache copy is a distinct array reference', first !== second);

  console.log(failures === 0 ? '\nAll guard checks passed.' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
