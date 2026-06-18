import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { CheckCircle, FileText, XCircle } from 'lucide-react';
import { ApiError, Permission, queryKeys, useServices, type VehicleVerification } from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { formatBDT } from '@/lib/appNav';

/**
 * Vehicle verification queue — guarded by VEHICLE_VERIFICATION_REVIEW (Support
 * Admin + Super Admin). Each entry shows who posted the vehicle, when, its
 * description, photos, and uploaded documents, so the reviewer can approve or
 * reject with full context.
 */
function VehicleVerificationInner() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const pending = useQuery({
    queryKey: queryKeys.ops.pendingVehicles(),
    queryFn: () => endpoints.ops.pendingVehicles({ pageSize: 50 }),
  });

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      endpoints.ops.verifyVehicle(id, status),
    onMutate: ({ id }) => { setError(null); setBusyId(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ops.pendingVehicles() }),
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Action failed.'),
    onSettled: () => setBusyId(null),
  });

  return (
    <>
      <h1 className="h4 mb-3">Vehicle verification</h1>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {pending.isLoading && <Spinner animation="border" variant="success" size="sm" />}
      {pending.isError && <div className="text-danger">Failed to load the verification queue.</div>}
      {pending.data && pending.data.items.length === 0 && (
        <Card className="shadow-sm border-0"><Card.Body><p className="text-muted mb-0">No vehicles awaiting verification. 🎉</p></Card.Body></Card>
      )}
      {pending.data?.items.map((item) => (
        <VehicleRow
          key={item.vehicle.id}
          item={item}
          busy={busyId === item.vehicle.id}
          onApprove={() => decide.mutate({ id: item.vehicle.id, status: 'approved' })}
          onReject={() => decide.mutate({ id: item.vehicle.id, status: 'rejected' })}
        />
      ))}
    </>
  );
}

function VehicleRow({
  item, busy, onApprove, onReject,
}: { item: VehicleVerification; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const { vehicle, owner, documents } = item;
  return (
    <Card className="shadow-sm border-0 mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div className="h6 mb-1">{vehicle.make ?? vehicle.type} {vehicle.model ?? ''} · {vehicle.plateNumber}</div>
            <div className="text-muted small">
              {vehicle.type}{vehicle.color ? ` · ${vehicle.color}` : ''}{vehicle.year ? ` · ${vehicle.year}` : ''}
              {vehicle.forRent && vehicle.rentalPriceMinor ? ` · ${formatBDT(vehicle.rentalPriceMinor)}/period` : ''}
            </div>
          </div>
          <Badge bg="warning" text="dark">{vehicle.verificationStatus}</Badge>
        </div>

        {/* Who posted it, and when */}
        <div className="bg-light rounded p-2 px-3 mt-3 small">
          <span className="text-muted">Posted by</span>{' '}
          <span className="fw-medium">{owner?.fullName ?? 'Unknown owner'}</span>
          {owner && <span className="text-muted"> · {owner.email} · {owner.phone}</span>}
          <span className="text-muted"> · {new Date(vehicle.createdAt).toLocaleString()}</span>
        </div>

        {/* Description */}
        {vehicle.description && <p className="mt-3 mb-0">{vehicle.description}</p>}

        {/* Photos */}
        {vehicle.photoUrls.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {vehicle.photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={vehicle.plateNumber} className="rounded border" style={{ width: 120, height: 90, objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        )}

        {/* Documents */}
        <div className="mt-3">
          <div className="text-uppercase text-muted small fw-medium mb-1">Documents ({documents.length})</div>
          {documents.length === 0 && <div className="text-muted small">No documents uploaded.</div>}
          {documents.map((d) => {
            const expired = d.expiresAt ? new Date(d.expiresAt).getTime() < Date.now() : false;
            return (
              <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div className="d-flex align-items-center gap-2">
                  <FileText size={16} className="text-muted" />
                  <a href={d.documentUrl} target="_blank" rel="noreferrer" className="text-decoration-none">
                    <span className="fw-medium text-capitalize">{d.type}</span>{d.number ? ` · ${d.number}` : ''}
                  </a>
                  {d.expiresAt && (
                    <span className={`small ${expired ? 'text-danger' : 'text-muted'}`}>
                      {expired ? 'Expired' : 'Expires'} {new Date(d.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Badge bg={d.verificationStatus === 'approved' ? 'success' : d.verificationStatus === 'rejected' ? 'danger' : 'warning'} text={d.verificationStatus === 'pending' ? 'dark' : undefined}>
                  {d.verificationStatus}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="d-flex gap-2 mt-3">
          <Button size="sm" variant="success" disabled={busy} onClick={onApprove}>
            <CheckCircle size={14} className="me-1" /> Approve
          </Button>
          <Button size="sm" variant="outline-danger" disabled={busy} onClick={onReject}>
            <XCircle size={14} className="me-1" /> Reject
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function VehicleVerificationPage() {
  return (
    <ProtectedRoute permission={Permission.VEHICLE_VERIFICATION_REVIEW}>
      <VehicleVerificationInner />
    </ProtectedRoute>
  );
}
