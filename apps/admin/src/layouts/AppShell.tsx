import { forwardRef, Suspense, type ComponentType, type HTMLAttributes } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Container, Dropdown, Nav, Navbar } from 'react-bootstrap';
import * as Icons from 'lucide-react';
import { LogOut, Menu, Settings } from 'lucide-react';
import { useAuthStore, useCurrentUser, useServices } from '@bd-cabs/core';
import { Avatar } from '@/components/Avatar';
import { PageSpinner } from '@/components/PageSpinner';
import type { AppNavItem } from '@/lib/appNav';

// Custom toggle so the avatar itself is the clickable trigger (no default caret).
const AvatarToggle = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className="btn p-1 border-0 bg-transparent d-flex align-items-center rounded-circle"
      aria-label="Account menu"
    >
      {children}
    </button>
  ),
);
AvatarToggle.displayName = 'AvatarToggle';

type IconCmp = ComponentType<{ size?: number; className?: string }>;
const icon = (name: string): IconCmp =>
  (Icons[name as keyof typeof Icons] ?? Icons.Circle) as IconCmp;

/**
 * Shared chrome for the authenticated role portals (customer + driver). A
 * responsive top navbar with role-scoped links and an account menu, plus a
 * Suspense'd content area for the lazy-loaded pages. The route-level RoleRoute
 * guard (not this component) enforces who may enter.
 */
export function AppShell({
  brand,
  home,
  nav,
  navVariant = 'inline',
}: {
  brand: string;
  home: string;
  nav: AppNavItem[];
  /** 'inline' spreads the links across the navbar; 'dropdown' collapses them
   * into a single "Menu" dropdown (used by the customer portal). */
  navVariant?: 'inline' | 'dropdown';
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  const { endpoints } = useServices();
  const { data: user } = useCurrentUser();

  // Label the dropdown toggle with the section the user is currently on.
  const active = nav.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  async function handleLogout() {
    try {
      await endpoints.auth.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar bg="white" expand="lg" className="border-bottom sticky-top">
        <Container fluid="lg">
          <Navbar.Brand as={Link} to={home} className="fw-bold text-success">
            🚕 {brand}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="portal-nav" />
          <Navbar.Collapse id="portal-nav">
            <Nav className="me-auto">
              {navVariant === 'dropdown' ? (
                <Dropdown>
                  <Dropdown.Toggle
                    variant="light"
                    id="portal-menu"
                    className="d-flex align-items-center gap-2"
                  >
                    <Menu size={16} />
                    {active?.label ?? 'Menu'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-sm">
                    {nav.map((item) => {
                      const Icon = icon(item.icon);
                      return (
                        <Dropdown.Item
                          key={item.to}
                          as={NavLink}
                          to={item.to}
                          end={item.end}
                          className="d-flex align-items-center gap-2"
                        >
                          <Icon size={16} />
                          {item.label}
                        </Dropdown.Item>
                      );
                    })}
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                nav.map((item) => {
                  const Icon = icon(item.icon);
                  return (
                    <Nav.Link
                      key={item.to}
                      as={NavLink}
                      to={item.to}
                      end={item.end}
                      className="d-flex align-items-center gap-2"
                    >
                      <Icon size={16} />
                      {item.label}
                    </Nav.Link>
                  );
                })
              )}
            </Nav>

            <Dropdown align="end">
              <Dropdown.Toggle as={AvatarToggle} id="portal-account">
                <Avatar user={user} size={32} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow-sm">
                <Dropdown.Header className="text-truncate" style={{ maxWidth: 220 }}>
                  Signed in as {session?.role}
                </Dropdown.Header>
                <Dropdown.Divider />
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
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 py-3 py-md-4">
        <Container fluid="lg">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </Container>
      </main>
    </div>
  );
}
