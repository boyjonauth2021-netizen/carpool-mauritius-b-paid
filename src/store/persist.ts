import { createSeedState, rollSeedRides } from "./seed";
import { STATE_VERSION, type AppState } from "./types";

export const STORAGE_KEY = "carpool-mauritius-b-v1";

export async function loadState(): Promise<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION && Array.isArray(parsed.users) && Array.isArray(parsed.rides)) {
        const rolled = rollSeedRides(parsed, new Date());
        saveState(rolled);
        return rolled;
      }
    }
  } catch {
    // A damaged demo store is replaced by a fresh seed.
  }
  const seeded = await createSeedState(new Date());
  saveState(seeded);
  return seeded;
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
