import type { KeyValueStorage } from '@bd-cabs/core';

/**
 * Web implementation of the core's KeyValueStorage seam, backed by
 * localStorage. The React Native app will provide an AsyncStorage-backed
 * equivalent — the core never knows the difference.
 *
 * Guards against SSR (no window) by falling back to no-ops.
 */
export const webStorage: KeyValueStorage = {
  async getItem(key) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};
