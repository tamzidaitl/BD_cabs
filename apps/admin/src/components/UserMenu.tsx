import { forwardRef, type ComponentType, type HTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import * as Icons from 'lucide-react';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { STAFF_ROLES, useAuthStore, useCurrentUser, useServices } from '@bd-cabs/core';
import { portalConfigForRole } from '@/lib/appNav';
import { Avatar } from './Avatar';

type IconCmp = ComponentType<{ size?: number; className?: string }>;
const icon = (name: string): IconCmp =>
  (Icons[name as keyof typeof Icons] ?? Icons.Circle) as IconCmp;

// Custom toggle so the avatar itself is the clickable trigger (no default caret).
const AvatarToggle = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className="btn p-0 border-0 bg-transparent d-flex align-items-center"
      aria-label="Account menu"
    >
      {children}
    </button>
  ),
);
AvatarToggle.displayName = 'AvatarToggle';

/**
 * Authenticated account menu: the profile avatar opening a dropdown with the
 * user's identity, navigation, and sign-out. Fetches /auth/me via the shared
 * hook to get the name + photo. Staff see a Dashboard shortcut; portal roles
 * (customer/driver/fleet owner) instead see "My menu" linking to their own
 * pages, since the staff dashboard isn't theirs to reach.
 */
export function UserMenu() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  const { endpoints } = useServices();
  const { data: user } = useCurrentUser();

  const role = session?.role;
  const isStaff = !!role && STAFF_ROLES.includes(role);
  const portal = portalConfigForRole(role);

  async function handleLogout() {
    try {
      await endpoints.auth.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      clear();
      navigate('/');
    }
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle as={AvatarToggle}>
        <Avatar user={user} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="shadow-sm">
        <div className="px-3 py-2">
          <div className="fw-semibold text-truncate" style={{ maxWidth: 220 }}>
            {user?.fullName ?? session?.role}
          </div>
          {user?.email && (
            <div className="text-muted small text-truncate" style={{ maxWidth: 220 }}>
              {user.email}
            </div>
          )}
          <span className="badge text-bg-light mt-1">{session?.role}</span>
        </div>
        <Dropdown.Divider />
        {isStaff ? (
          <Dropdown.Item as={Link} to="/dashboard">
            <LayoutDashboard size={16} className="me-2" />
            Dashboard
          </Dropdown.Item>
        ) : portal ? (
          <>
            <Dropdown.Header>My menu</Dropdown.Header>
            {portal.nav.map((item) => {
              const Icon = icon(item.icon);
              return (
                <Dropdown.Item key={item.to} as={Link} to={item.to}>
                  <Icon size={16} className="me-2" />
                  {item.label}
                </Dropdown.Item>
              );
            })}
            <Dropdown.Divider />
          </>
        ) : null}
        <Dropdown.Item as={Link} to="/account-settings">
          <Settings size={16} className="me-2" />
          Account settings
        </Dropdown.Item>
        <Dropdown.Item onClick={handleLogout}>
          <LogOut size={16} className="me-2" />
          Sign out
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
