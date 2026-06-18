import { Link, useLocation } from 'react-router-dom';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { useAuthStore } from '@bd-cabs/core';
import { UserMenu } from '@/components/UserMenu';
import { PUBLIC_NAV } from './site';

/**
 * Public marketing navbar. Collapses to a toggle on small screens and
 * highlights the active route. The account area is dynamic: signed-in users see
 * their profile avatar + dropdown; guests see Sign up / Admin Sign in.
 */
export function PublicNavbar() {
  const pathname = useLocation().pathname;
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);

  return (
    <Navbar expand="lg" bg="white" className="shadow-sm sticky-top" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-semibold">
          🚕 BD Cabs
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="public-nav" />
        <Navbar.Collapse id="public-nav">
          <Nav className="ms-auto align-items-lg-center gap-lg-1">
            {PUBLIC_NAV.map((item) => (
              <Nav.Link key={item.href} as={Link} to={item.href} active={pathname === item.href}>
                {item.label}
              </Nav.Link>
            ))}

            {/* Auth area — wait for hydration to avoid a guest→user flash on reload. */}
            {hydrated &&
              (session ? (
                <div className="ms-lg-2 mt-2 mt-lg-0">
                  <UserMenu />
                </div>
              ) : (
                <>
                  <Button
                    as={Link as any}
                    to="/signup"
                    variant="success"
                    size="sm"
                    className="ms-lg-2"
                  >
                    Sign up
                  </Button>
                  <Button as={Link as any} to="/login" variant="outline-secondary" size="sm">
                    Sign in
                  </Button>
                </>
              ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
