import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { PageSpinner } from '@/components/PageSpinner';

/**
 * Layout for every authenticated admin screen. ProtectedRoute enforces
 * auth + staff-only here; individual pages add their own `permission` guard.
 */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="d-flex">
        <Sidebar show={sidebarOpen} onHide={() => setSidebarOpen(false)} />
        {/* app-content-offset reserves space for the fixed sidebar on lg+ */}
        <div
          className="app-content app-content-offset flex-grow-1 d-flex flex-column"
          style={{ minWidth: 0 }}
        >
          <Topbar onToggleSidebar={() => setSidebarOpen(true)} />
          <main className="p-3 p-md-4 flex-grow-1">
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
