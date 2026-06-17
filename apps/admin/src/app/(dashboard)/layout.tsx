'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

/**
 * Layout for every authenticated admin screen. ProtectedRoute enforces
 * auth + staff-only here; individual pages add their own `permission` guard.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="d-flex">
        <Sidebar show={sidebarOpen} onHide={() => setSidebarOpen(false)} />
        <div className="app-content flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
          <Topbar onToggleSidebar={() => setSidebarOpen(true)} />
          <main className="p-3 p-md-4 flex-grow-1">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
