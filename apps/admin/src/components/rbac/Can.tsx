'use client';

import type { Permission } from '@bd-cabs/core';
import type { ReactNode } from 'react';
import { useCan } from './useCan';

/**
 * Conditionally renders children based on a single permission. Use for
 * hiding/showing buttons, menu entries, table actions — anything inline.
 *
 *   <Can permission={Permission.FINANCE_PAYOUTS_RUN}>
 *     <Button>Run payouts</Button>
 *   </Can>
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useCan(permission);
  return <>{allowed ? children : fallback}</>;
}
