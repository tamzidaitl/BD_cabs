import { forwardRef, type HTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useAuthStore, useCurrentUser, useServices } from '@bd-cabs/core';
import { Avatar } from './Avatar';

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
 * user's identity, a Dashboard shortcut, and sign-out. Fetches /auth/me via the
 * shared hook to get the name + photo.
 */
export function UserMenu() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  const { endpoints } = useServices();
  const { data: user } = useCurrentUser();

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
        <Dropdown.Item as={Link} to="/dashboard">
          <LayoutDashboard size={16} className="me-2" />
          Dashboard
        </Dropdown.Item>
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
