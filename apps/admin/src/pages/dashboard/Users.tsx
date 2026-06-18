'use client';

import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { CheckCircle, Trash2, XCircle } from 'lucide-react';
import {
  ApiError,
  Permission,
  Role,
  useAuthStore,
  useDeleteUser,
  useSetUserStatus,
  useUsers,
} from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { useCan } from '@/components/rbac/useCan';

/** End-user roles a Support Admin may view (mirrors the API's visibility rule). */
const SUPPORT_VISIBLE_ROLES: Role[] = [Role.Customer, Role.Driver, Role.FleetOwner, Role.Corporate];

/**
 * Users list — guarded by USERS_READ. Supports searching, filtering by role, and
 * per-row actions: Support Admin can activate accounts; Super Admin can also
 * deactivate (suspend) and delete. The table header stays fixed while the body
 * scrolls.
 */
function UsersInner() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');

  const viewerRole = useAuthStore((s) => s.session?.role ?? null);
  // Role filter choices, scoped to what the viewer is allowed to see. SuperAdmin
  // accounts are never listed; Support Admins only see end-user roles.
  const roleOptions = useMemo<Role[]>(
    () =>
      viewerRole === Role.SupportAdmin
        ? SUPPORT_VISIBLE_ROLES
        : Object.values(Role).filter((r) => r !== Role.Guest && r !== Role.SuperAdmin),
    [viewerRole],
  );

  const { data, isLoading, isError } = useUsers({
    page: 1,
    pageSize: 50,
    q: q || undefined,
    role: role || undefined,
  });

  const setStatus = useSetUserStatus();
  const deleteUser = useDeleteUser();

  const canActivate = useCan(Permission.USERS_ACTIVATE);
  const canDeactivate = useCan(Permission.USERS_MANAGE_STATUS);
  const canDelete = useCan(Permission.USERS_DELETE);
  const showActions = canActivate || canDeactivate || canDelete;

  const [actionError, setActionError] = useState<string | null>(null);
  // Track the row a mutation is running on so we can disable just its buttons.
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const activate = (id: string) => run(id, () => setStatus.mutateAsync({ id, status: 'active' }));
  const deactivate = (id: string) =>
    run(id, () => setStatus.mutateAsync({ id, status: 'suspended' }));
  const remove = (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    void run(id, () => deleteUser.mutateAsync(id));
  };

  const stickyTh: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: 'var(--bs-card-bg, #fff)',
  };

  return (
    <>
      <h1 className="h4 mb-3">Users</h1>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Form.Control
              type="search"
              placeholder="Search by name, email or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <Form.Select
              aria-label="Filter by role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="">All roles</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Form.Select>
          </div>

          {actionError && (
            <Alert variant="danger" dismissible onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

          {isLoading && <Spinner animation="border" variant="success" size="sm" />}
          {isError && <div className="text-danger">Failed to load users.</div>}

          {data && (
            <div className="table-responsive" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={stickyTh}>Name</th>
                    <th style={stickyTh}>Role</th>
                    <th style={stickyTh}>Status</th>
                    <th style={stickyTh} className="d-none d-md-table-cell">
                      Phone
                    </th>
                    {showActions && (
                      <th style={stickyTh} className="text-end">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const busy = busyId === u.id;
                    const isActive = u.status === 'active';
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="fw-medium">{u.fullName}</div>
                          <div className="text-muted small">{u.email}</div>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {u.role}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={isActive ? 'success' : 'secondary'}>{u.status}</Badge>
                        </td>
                        <td className="d-none d-md-table-cell">{u.phone}</td>
                        {showActions && (
                          <td className="text-end text-nowrap">
                            {canActivate && !isActive && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                className="me-2"
                                disabled={busy}
                                onClick={() => activate(u.id)}
                              >
                                <CheckCircle size={14} className="me-1" />
                                Activate
                              </Button>
                            )}
                            {canDeactivate && isActive && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                className="me-2"
                                disabled={busy}
                                onClick={() => deactivate(u.id)}
                              >
                                <XCircle size={14} className="me-1" />
                                Deactivate
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                disabled={busy}
                                onClick={() => remove(u.id, u.fullName)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={showActions ? 5 : 4} className="text-center text-muted py-4">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute permission={Permission.USERS_READ}>
      <UsersInner />
    </ProtectedRoute>
  );
}
