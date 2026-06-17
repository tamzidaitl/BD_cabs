import type { Role } from '../models/enums';
import { ALL_PERMISSIONS, type Permission } from './permissions';
import { ROLE_PERMISSIONS } from './roleMatrix';

/**
 * Core authorization check — pure, synchronous, framework-agnostic.
 * Both the web `<Can>` component and any RN equivalent call into this.
 */
export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  return granted.includes(ALL_PERMISSIONS) || granted.includes(permission);
}

/** True if the role has ALL of the given permissions. */
export function canAll(role: Role | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

/** True if the role has ANY of the given permissions. */
export function canAny(role: Role | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Flatten a role into its concrete permission list (expanding the wildcard). */
export function permissionsForRole(role: Role): readonly (Permission | typeof ALL_PERMISSIONS)[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
