import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Spinner } from 'react-bootstrap';
import { useServices } from '@bd-cabs/core';
import { formatBDT, formatDistance } from '@/lib/appNav';
import { rideStatusVariant } from '../customer/rideStatus';

/** A driver's trip history. */
export default function TripsPage() {
  const { endpoints } = useServices();
  const trips = useQuery({
    queryKey: ['drivers', 'trips', { page: 1, pageSize: 50 }],
    queryFn: () => endpoints.drivers.trips({ page: 1, pageSize: 50 }),
  });

  return (
    <>
      <h1 className="h4 mb-3">Trips</h1>
      {trips.isLoading && <div className="text-center py-5"><Spinner animation="border" variant="success" /></div>}
      {trips.data && trips.data.items.length === 0 && (
        <Card className="border-0 shadow-sm"><Card.Body className="text-center text-muted py-5">No trips yet.</Card.Body></Card>
      )}
      {trips.data && trips.data.items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <div className="list-group list-group-flush">
            {trips.data.items.map((r) => (
              <div key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-medium">{r.pickup.address} → {r.destination.address}</div>
                  <div className="text-muted small">{new Date(r.requestedAt).toLocaleString()} · {formatDistance(r.distanceMeters)}</div>
                </div>
                <div className="text-end">
                  <Badge bg={rideStatusVariant(r.status)}>{r.status}</Badge>
                  <div className="small text-muted mt-1">{formatBDT(r.finalFareMinor ?? r.fareEstimateMinor)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
