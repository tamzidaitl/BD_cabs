import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { useAuthStore, useLogin } from '@bd-cabs/core';
import { homePathForRole } from '@/lib/appNav';

/**
 * Sign-in for everyone. The same /auth/login endpoint serves all roles, so any
 * authenticated user is let through; route- and permission-level guards decide
 * what each role can actually see once inside.
 */
export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Already signed in → skip the form, land on the role's home.
  useEffect(() => {
    if (hydrated && session) {
      navigate(homePathForRole(session.role), { replace: true });
    }
  }, [hydrated, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ emailOrPhone, password });
      navigate(homePathForRole(result.role), { replace: true });
    } catch {
      setError('Invalid credentials. Please try again.');
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center p-3"
      style={{ minHeight: '100vh' }}
    >
      <Card className="shadow-sm border-0 w-100" style={{ maxWidth: 400 }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <Link to="/" className="text-decoration-none text-reset">
              <div className="fs-3">🚕 BD Cabs</div>
            </Link>
            <div className="text-muted">Sign in to your account</div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="emailOrPhone">
              <Form.Label>Email or phone</Form.Label>
              <Form.Control
                type="text"
                autoComplete="username"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="success" className="w-100" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Form>

          <div className="text-center text-muted small mt-4">
            Need a customer, driver, or partner account?{' '}
            <Link to="/signup" className="text-success text-decoration-none">
              Sign up
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
