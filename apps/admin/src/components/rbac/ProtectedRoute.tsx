'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from 'react-bootstrap';
import { STAFF_ROLES, useAuthStore, type Permission } from '@bd-cabs/core';
import { useCan } from './useCan';

/**
 * Route-level guard. Wrap a page/segment to enforce:
 *   1. authentication (redirect to /login),
 *   2. staff-only access (non-staff roles bounced),
 *   3. an optional specific permission (else /unauthorized).
 *
 * Waits for store hydration first to avoid a redirect flash on refresh.
 */
export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: Permission;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  const hasPermission = useCan(permission ?? ('__none__' as Permission));
  const permissionOk = permission ? hasPermission : true;

  const isStaff = session ? STAFF_ROLES.includes(session.role) : false;

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      router.replace('/login');
    } else if (!isStaff) {
      // Authenticated but not staff — no admin access at all.
      router.replace('/login?error=not-staff');
    } else if (!permissionOk) {
      router.replace('/unauthorized');
    }
  }, [hydrated, session, isStaff, permissionOk, router]);

  if (!hydrated || !session || !isStaff || !permissionOk) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="success" role="status" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
