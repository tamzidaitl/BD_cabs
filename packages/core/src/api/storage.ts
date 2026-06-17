/**
 * Storage is the one true platform seam. The core never imports localStorage or
 * AsyncStorage directly — the host app injects an implementation:
 *   - Next.js admin  -> localStorage-backed adapter (see apps/admin/src/lib)
 *   - React Native   -> @react-native-async-storage / expo-secure-store adapter
 *
 * Async signatures keep both platforms compatible (AsyncStorage is async).
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** No-op storage used on the server / before a real adapter is injected. */
export const memoryStorage = (): KeyValueStorage => {
  const map = new Map<string, string>();
  return {
    async getItem(k) {
      return map.get(k) ?? null;
    },
    async setItem(k, v) {
      map.set(k, v);
    },
    async removeItem(k) {
      map.delete(k);
    },
  };
};
