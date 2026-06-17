'use client';

import { useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Permission, useUsers } from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

/**
 * Users list — guarded by USERS_READ. Demonstrates the shared `useUsers` query
 * hook (defined in @bd-cabs/core) driving a responsive Bootstrap table.
 */
function UsersInner() {
  const [q, setQ] = useState('');
  const { data, isLoading, isError } = useUsers({ page: 1, pageSize: 20, q: q || undefined });

  return (
    <>
      <h1 className="h4 mb-3">Users</h1>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Form.Control
            type="search"
            placeholder="Search by name, email or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-3"
            style={{ maxWidth: 360 }}
          />

          {isLoading && <Spinner animation="border" variant="success" size="sm" />}
          {isError && <div className="text-danger">Failed to load users.</div>}

          {data && (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="d-none d-md-table-cell">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
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
                        <Badge bg={u.status === 'active' ? 'success' : 'secondary'}>{u.status}</Badge>
                      </td>
                      <td className="d-none d-md-table-cell">{u.phone}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
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
