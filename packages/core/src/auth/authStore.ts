import { create } from 'zustand';
import type { AuthSession, AuthTokens, User } from '../models/entities';
import type { Role } from '../models/enums';
import type { KeyValueStorage } from '../api/storage';
import { memoryStorage } from '../api/storage';

const SESSION_KEY = 'bdcabs.session';

interface AuthState {
  session: AuthSession | null;
  user: User | null;
  /** False until the persisted session has been loaded (avoids redirect flicker). */
  hydrated: boolean;

  // derived
  role: () => Role | null;
  isAuthenticated: () => boolean;

  // actions
  setSession: (session: AuthSession) => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
}

/**
 * Zustand was chosen over Redux Toolkit precisely because this exact store runs
 * unchanged in React Native — no Provider, no web-only middleware. Persistence
 * is done through the injected `KeyValueStorage` seam rather than zustand's web
 * `persist` middleware, so the same code persists to localStorage on web and to
 * AsyncStorage/SecureStore on native.
 */
let storage: KeyValueStorage = memoryStorage();

/** Host app calls this once at startup to wire real persistence. */
export function configureAuthStorage(impl: KeyValueStorage): void {
  storage = impl;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  hydrated: false,

  role: () => get().session?.role ?? null,
  isAuthenticated: () => Boolean(get().session?.tokens.accessToken),

  setSession: (session) => {
    set({ session });
    void storage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  setUser: (user) => set({ user }),

  setTokens: (tokens) => {
    const current = get().session;
    if (!current) return;
    const next: AuthSession = { ...current, tokens };
    set({ session: next });
    void storage.setItem(SESSION_KEY, JSON.stringify(next));
  },

  clear: () => {
    set({ session: null, user: null });
    void storage.removeItem(SESSION_KEY);
  },

  hydrate: async () => {
    try {
      const raw = await storage.getItem(SESSION_KEY);
      if (raw) set({ session: JSON.parse(raw) as AuthSession });
    } catch {
      // corrupt payload — start logged out
    } finally {
      set({ hydrated: true });
    }
  },
}));
