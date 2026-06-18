import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuthStore, type Permission } from '@bd-cabs/core';
import { useCan } from './useCan';

/**
 * Route-level guard. Enforces, in order:
 *   1. authentication (→ /login),
 *   2. an optional specific permission (→ /unauthorized).
 *
 * Login is open to all roles; pages that should be restricted declare a
 * `permission`, which the per-role RBAC matrix resolves. Waits for store
 * hydration first to avoid a redirect flash on reload.
 */
export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: Permission;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  const hasPermission = useCan(permission ?? ('__none__' as Permission));
  const permissionOk = permission ? hasPermission : true;

  if (!hydrated) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '60vh' }}
      >
        <Spinner animation="border" variant="success" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!permissionOk) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
