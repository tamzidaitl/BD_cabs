import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuthStore, type Role } from '@bd-cabs/core';

/**
 * Route guard for the role-specific portals (customer / driver). Enforces, in
 * order: store hydration, authentication (→ /login), and role membership
 * (→ /unauthorized). Unlike the permission-based ProtectedRoute used by the
 * staff console, this gates purely on the signed-in user's role.
 */
export function RoleRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const location = useLocation();
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);

  if (!hydrated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="success" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
