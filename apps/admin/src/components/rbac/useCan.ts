'use client';

import { can, canAny, useAuthStore, type Permission } from '@bd-cabs/core';

/**
 * Reactive permission hooks. They read the current role from the shared auth
 * store and delegate to the pure `can()` engine in core, so web authorization
 * decisions are identical to whatever the RN app will compute.
 */
export function useCan(permission: Permission): boolean {
  const role = useAuthStore((s) => s.session?.role ?? null);
  return can(role, permission);
}

export function useCanAny(permissions: Permission[]): boolean {
  const role = useAuthStore((s) => s.session?.role ?? null);
  return canAny(role, permissions);
}
