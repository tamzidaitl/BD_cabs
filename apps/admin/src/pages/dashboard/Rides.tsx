import { useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { AlertTriangle, ArrowRight, Car as CarIcon, ShieldAlert } from 'lucide-react';
import { Permission, RideStatus, useOpsRides } from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { formatBDT, formatDateTime, formatDistance } from '@/lib/appNav';
import { rideStatusVariant } from '../customer/rideStatus';

const stickyTh: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: 'var(--bs-card-bg, #fff)',
};

/**
 * Ops rides console — guarded by OPS_RIDES_VIEW (Support Admin / Super Admin).
 * Shows, per trip: which customer is riding with which driver, the pickup →
 * destination, the assigned car, and any problems flagged on the ride (SOS,
 * cancellation, no driver, unverified car). Auto-refreshes via the hook.
 */
function RidesInner() {
  const [status, setStatus] = useState('');

  const { data, isLoading, isError } = useOpsRides({
    status: status || undefined,
    page: 1,
    pageSize: 50,
  });

  return (
    <>
      <h1 className="h4 mb-3">Rides</h1>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <Form.Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ maxWidth: 240 }}
            >
              <option value="">All statuses</option>
              {Object.values(RideStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
            {data && (
              <span className="text-muted small ms-auto">
                {data.totalCount} ride{data.totalCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {isLoading && <Spinner animation="border" variant="success" size="sm" />}
          {isError && <div className="text-danger">Failed to load rides.</div>}

          {data && (
            <div className="table-responsive" style={{ maxHeight: '64vh', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={stickyTh}>Customer &amp; Driver</th>
                    <th style={stickyTh}>Route</th>
                    <th style={stickyTh}>Car</th>
                    <th style={stickyTh}>Status</th>
                    <th style={stickyTh}>Problems</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => {
                    const car = r.vehicle;
                    const carName = car
                      ? [car.make, car.model].filter(Boolean).join(' ') || car.type
                      : null;
                    return (
                      <tr key={r.id}>
                        {/* Who is riding with whom */}
                        <td style={{ minWidth: 200 }}>
                          <div className="fw-medium">{r.customer.fullName}</div>
                          {r.customer.phone && (
                            <div className="text-muted small">{r.customer.phone}</div>
                          )}
                          <div className="small mt-1">
                            {r.driver ? (
                              <>
                                <span className="text-muted">Driver: </span>
                                <span className="fw-medium">{r.driver.fullName}</span>
                                {r.driver.phone && (
                                  <span className="text-muted"> · {r.driver.phone}</span>
                                )}
                              </>
                            ) : (
                              <Badge bg="warning" text="dark">
                                No driver assigned
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Pickup → destination */}
                        <td style={{ minWidth: 240 }}>
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span>{r.pickup.address ?? 'Pickup'}</span>
                            <ArrowRight size={14} className="text-muted" />
                            <span>{r.destination.address ?? 'Destination'}</span>
                          </div>
                          <div className="text-muted small">
                            {formatDistance(r.distanceMeters)} · {r.vehicleTypeId} ·{' '}
                            {formatDateTime(r.requestedAt)}
                          </div>
                        </td>

                        {/* Which car is being used */}
                        <td style={{ minWidth: 160 }}>
                          {car ? (
                            <>
                              <div className="d-flex align-items-center gap-1 fw-medium">
                                <CarIcon size={14} className="text-muted" />
                                {carName}
                              </div>
                              <div className="text-muted small">
                                {car.plateNumber}
                                {car.color ? ` · ${car.color}` : ''}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td>
                          <Badge bg={rideStatusVariant(r.status)}>{r.status}</Badge>
                          <div className="small text-muted mt-1">
                            {formatBDT(
                              Math.max(
                                0,
                                (r.finalFareMinor ?? r.fareEstimateMinor) - r.discountMinor,
                              ),
                            )}{' '}
                            · {r.paymentMethod}
                          </div>
                        </td>

                        {/* Any problems on this ride? */}
                        <td style={{ minWidth: 180 }}>
                          {r.problems.length === 0 ? (
                            <Badge bg="success" className="fw-normal">
                              No issues
                            </Badge>
                          ) : (
                            <div className="d-flex flex-column gap-1">
                              {r.problems.map((p, i) => {
                                const sos = p.toLowerCase().includes('sos');
                                return (
                                  <span
                                    key={i}
                                    className="d-inline-flex align-items-center gap-1 text-danger small"
                                  >
                                    {sos ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
                                    {p}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No rides found.
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

export default function RidesPage() {
  return (
    <ProtectedRoute permission={Permission.OPS_RIDES_VIEW}>
      <RidesInner />
    </ProtectedRoute>
  );
}
