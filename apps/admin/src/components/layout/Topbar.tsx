'use client';

import { useRouter } from 'next/navigation';
import { Button, Dropdown, Navbar } from 'react-bootstrap';
import { Menu, UserCircle } from 'lucide-react';
import { useAuthStore, useServices } from '@bd-cabs/core';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  const { endpoints } = useServices();

  async function handleLogout() {
    try {
      await endpoints.auth.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      clear();
      router.replace('/login');
    }
  }

  return (
    <Navbar
      bg="white"
      className="border-bottom px-3 sticky-top"
      style={{ height: 'var(--topbar-height)' }}
    >
      <Button
        variant="light"
        className="d-lg-none me-2"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </Button>

      <div className="ms-auto">
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" id="user-menu" className="d-flex align-items-center gap-2">
            <UserCircle size={20} />
            <span className="d-none d-sm-inline">{session?.role}</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header className="text-truncate" style={{ maxWidth: 220 }}>
              {session?.userId}
            </Dropdown.Header>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout}>Sign out</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </Navbar>
  );
}
