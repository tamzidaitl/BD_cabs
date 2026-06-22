import { Link } from 'react-router-dom';
import { Badge, Card, Spinner } from 'react-bootstrap';
import { PaymentStatus, RideStatus, useMyRides } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';
import { rideStatusVariant } from './rideStatus';

/** Customer ride history — newest first, each linking to its live detail page. */
export default function RidesPage() {
  const rides = useMyRides({ page: 1, pageSize: 50 });

  return (
    <>
      <h1 className="h4 mb-3">My rides</h1>

      {rides.isLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
        </div>
      )}

      {rides.data && rides.data.items.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            You haven&apos;t taken any rides yet.{' '}
            <Link to="/app" className="text-success text-decoration-none">Book your first ride</Link>.
          </Card.Body>
        </Card>
      )}

      {rides.data && rides.data.items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <div className="list-group list-group-flush">
            {rides.data.items.map((r) => (
              <Link
                key={r.id}
                to={`/app/rides/${r.id}`}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-medium">
                    {r.pickup.address ?? 'Pickup'} → {r.destination.address ?? 'Destination'}
                  </div>
                  <div className="text-muted small">
                    {new Date(r.requestedAt).toLocaleString()} · {r.vehicleTypeId}
                  </div>
                  {r.customerRating != null ? (
                    <div className="small text-warning" aria-label={`You rated this ride ${r.customerRating} out of 5`}>
                      {'★'.repeat(r.customerRating)}
                      <span className="text-muted">{'★'.repeat(5 - r.customerRating)} · Your rating</span>
                    </div>
                  ) : (
                    r.status === RideStatus.Completed && (
                      <div className="small text-success">Rate this ride →</div>
                    )
                  )}
                </div>
                <div className="text-end">
                  <Badge bg={rideStatusVariant(r.status)}>{r.status}</Badge>
                  <div className="small text-muted mt-1">
                    {formatBDT(Math.max(0, (r.finalFareMinor ?? r.fareEstimateMinor) - r.discountMinor))}
                  </div>
                  {r.paymentStatus === PaymentStatus.Paid && (
                    <Badge bg="success-subtle" text="success" className="mt-1">Paid</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
