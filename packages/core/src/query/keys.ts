/**
 * Centralised TanStack Query keys. Co-locating them prevents cache-key drift
 * between the web admin and the native app, and makes invalidation explicit.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    all: () => ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  ops: {
    dashboard: () => ['ops', 'dashboard'] as const,
  },
  coupons: {
    admin: () => ['coupons', 'admin'] as const,
  },
} as const;
