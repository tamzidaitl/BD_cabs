import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@bd-cabs/core';
import { AppShell } from '@/layouts/AppShell';
import { portalConfigForRole } from '@/lib/appNav';

/**
 * The shared chrome for the single `/app` portal. Customers, drivers, and fleet
 * owners all enter here; the brand, navigation, and nav style are picked from
 * the signed-in role (see `portalConfigForRole`). Route-level guards decide who
 * may reach each page — this only renders the frame. A role with no portal
 * config (shouldn't happen behind the RoleRoute) is sent to /unauthorized.
 */
export function PortalShell() {
  const role = useAuthStore((s) => s.session?.role);
  const config = portalConfigForRole(role);

  if (!config) return <Navigate to="/unauthorized" replace />;

  return (
    <AppShell
      brand={config.brand}
      home="/app"
      nav={config.nav}
      navVariant={config.navVariant}
    />
  );
}
