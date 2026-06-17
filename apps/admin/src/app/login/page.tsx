'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { STAFF_ROLES, useAuthStore, useLogin } from '@bd-cabs/core';

/**
 * Staff login. On success we verify the returned role is a staff role before
 * letting them in — the admin panel is staff-only even though the same
 * /auth/login endpoint serves customers and drivers (who use the RN app).
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const clear = useAuthStore((s) => s.clear);
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.get('error') === 'not-staff' ? 'That account cannot access the admin panel.' : null,
  );

  // Already signed in as staff → skip the form.
  useEffect(() => {
    if (hydrated && session && STAFF_ROLES.includes(session.role)) {
      router.replace('/');
    }
  }, [hydrated, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ emailOrPhone, password });
      if (!STAFF_ROLES.includes(result.role)) {
        clear();
        setError('That account cannot access the admin panel.');
        return;
      }
      router.replace('/');
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
            <div className="fs-3">🚕 BD Cabs</div>
            <div className="text-muted">Admin Console</div>
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
        </Card.Body>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Spinner animation="border" variant="success" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
