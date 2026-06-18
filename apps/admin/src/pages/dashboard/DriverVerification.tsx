import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { CheckCircle, XCircle } from 'lucide-react';
import { ApiError, Permission, queryKeys, useServices, type User } from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

/**
 * Driver verification queue — guarded by DRIVER_VERIFICATION_REVIEW (Support Admin
 * + Super Admin). Lists drivers awaiting KYC review; approving activates the
 * account so the driver can go online, rejecting leaves it pending.
 */
function DriverVerificationInner() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const pending = useQuery({
    queryKey: queryKeys.ops.pendingDrivers(),
    queryFn: () => endpoints.ops.pendingDrivers({ pageSize: 50 }),
  });

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      endpoints.ops.verifyDriver(id, status),
    onMutate: ({ id }) => { setError(null); setBusyId(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ops.pendingDrivers() }),
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Action failed.'),
    onSettled: () => setBusyId(null),
  });

  return (
    <>
      <h1 className="h4 mb-3">Driver verification</h1>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body>
          {pending.isLoading && <Spinner animation="border" variant="success" size="sm" />}
          {pending.isError && <div className="text-danger">Failed to load the verification queue.</div>}
          {pending.data && (
            <Table hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="d-none d-md-table-cell">Phone</th>
                  <th>Status</th>
                  <th className="text-end">Decision</th>
                </tr>
              </thead>
              <tbody>
                {pending.data.items.map((u: User) => {
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="fw-medium">{u.fullName}</div>
                        <div className="text-muted small">{u.email}</div>
                      </td>
                      <td className="d-none d-md-table-cell">{u.phone}</td>
                      <td><Badge bg="secondary">{u.status}</Badge></td>
                      <td className="text-end text-nowrap">
                        <Button size="sm" variant="outline-success" className="me-2" disabled={busy}
                          onClick={() => decide.mutate({ id: u.id, status: 'approved' })}>
                          <CheckCircle size={14} className="me-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline-danger" disabled={busy}
                          onClick={() => decide.mutate({ id: u.id, status: 'rejected' })}>
                          <XCircle size={14} className="me-1" /> Reject
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {pending.data.items.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No drivers awaiting verification. 🎉</td></tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default function DriverVerificationPage() {
  return (
    <ProtectedRoute permission={Permission.DRIVER_VERIFICATION_REVIEW}>
      <DriverVerificationInner />
    </ProtectedRoute>
  );
}
