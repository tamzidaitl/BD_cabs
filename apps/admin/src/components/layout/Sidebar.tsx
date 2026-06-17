'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Nav, Offcanvas } from 'react-bootstrap';
import { ADMIN_NAV, can, useAuthStore, type NavItem } from '@bd-cabs/core';
import * as Icons from 'lucide-react';
import type { ComponentType } from 'react';

const GROUP_ORDER: NavItem['group'][] = ['Overview', 'Operations', 'Finance', 'Configuration'];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.session?.role ?? null);

  // Show only items the current role is permitted to see — nav is RBAC-driven.
  const visible = ADMIN_NAV.filter((item) => !item.permission || can(role, item.permission));

  return (
    <Nav className="flex-column gap-1 px-2">
      {GROUP_ORDER.map((group) => {
        const items = visible.filter((i) => i.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-2">
            <div className="nav-group-label px-2 mt-3 mb-1">{group}</div>
            {items.map((item) => {
              const Icon = (Icons[item.icon as keyof typeof Icons] ??
                Icons.Circle) as ComponentType<{ size?: number; className?: string }>;
              const active = pathname === item.href;
              return (
                <Nav.Link
                  key={item.href}
                  as={Link}
                  href={item.href}
                  className={`d-flex align-items-center gap-2 px-2 py-2 ${active ? 'active' : ''}`}
                  onClick={onNavigate}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Nav.Link>
              );
            })}
          </div>
        );
      })}
    </Nav>
  );
}

/**
 * Responsive sidebar: a fixed column on lg+ screens, and an Offcanvas drawer on
 * small screens (toggled from the Topbar). Same NavLinks render in both.
 */
export function Sidebar({ show, onHide }: { show: boolean; onHide: () => void }) {
  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="app-sidebar d-none d-lg-flex flex-column flex-shrink-0 py-3">
        <div className="px-3 mb-2 fs-5 fw-semibold text-white">🚕 BD Cabs</div>
        <NavLinks />
      </aside>

      {/* Mobile/tablet: slide-in drawer */}
      <Offcanvas show={show} onHide={onHide} responsive="lg" className="app-sidebar">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="text-white">🚕 BD Cabs</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="px-0">
          <NavLinks onNavigate={onHide} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
