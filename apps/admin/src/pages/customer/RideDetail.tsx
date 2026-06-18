import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { AlertTriangle, Share2 } from 'lucide-react';
import {
  ApiError,
  RideStatus,
  useCancelRide,
  useCreateReview,
  useRide,
  useRideTrack,
  useServices,
} from '@bd-cabs/core';
import { formatBDT, formatDistance, formatDuration } from '@/lib/appNav';
import { rideStatusVariant } from './rideStatus';

const ACTIVE = [RideStatus.Requested, RideStatus.Accepted, RideStatus.DriverArrived, RideStatus.InProgress] as string[];
const CANCELLABLE = [RideStatus.Requested, RideStatus.Scheduled, RideStatus.Accepted, RideStatus.DriverArrived] as string[];

/**
 * Live ride detail for the customer: status + driver tracking (polls while
 * active), fare breakdown, cancel, pay, rate the driver, and the safety tools
 * (SOS / share trip).
 */
export default function RideDetailPage() {
  const { id = '' } = useParams();
  const { endpoints } = useServices();
  const ride = useRide(id);
  const isActive = !!ride.data && ACTIVE.includes(ride.data.status);
  const track = useRideTrack(id, isActive);
  const cancel = useCancelRide();
  const review = useCreateReview();

  const isCompleted = ride.data?.status === RideStatus.Completed;

  const breakdown = useQuery({
    queryKey: ['fare-breakdown', id],
    queryFn: () => endpoints.rides.fareBreakdown(id),
    enabled: isCompleted,
  });

  const charge = useMutation({ mutationFn: () => endpoints.payments.charge(id, {}) });
  const sos = useMutation({ mutationFn: () => endpoints.safety.sos({ rideId: id }) });
  const share = useMutation({
    mutationFn: (v: { contactName: string; contactPhone: string }) =>
      endpoints.safety.shareTrip({ rideId: id, ...v }),
  });

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  if (ride.isLoading) {
    return <div className="text-center py-5"><Spinner animation="border" variant="success" /></div>;
  }
  if (ride.isError || !ride.data) {
    return <Alert variant="danger">Ride not found. <Link to="/app/rides">Back to my rides</Link>.</Alert>;
  }

  const r = ride.data;
  const payable = Math.max(0, (r.finalFareMinor ?? r.fareEstimateMinor) - r.discountMinor);

  return (
    <Row className="g-4">
      <Col xs={12} className="d-flex align-items-center justify-content-between">
        <h1 className="h4 mb-0">Ride details</h1>
        <Badge bg={rideStatusVariant(r.status)} className="fs-6">{r.status}</Badge>
      </Col>

      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small">From</div>
                <div className="fw-medium">{r.pickup.address ?? 'Pickup'}</div>
              </div>
              <div className="text-end">
                <div className="text-muted small">To</div>
                <div className="fw-medium">{r.destination.address ?? 'Destination'}</div>
              </div>
            </div>
            <hr />
            <div className="d-flex justify-content-between text-muted small">
              <span>{r.vehicleTypeId}</span>
              <span>{formatDistance(r.distanceMeters)} · {formatDuration(r.durationSeconds)}</span>
              <span>{new Date(r.requestedAt).toLocaleString()}</span>
            </div>
          </Card.Body>
        </Card>

        {/* Live tracking */}
        {isActive && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted">Live tracking</h2>
              {r.status === RideStatus.Requested && <p className="mb-0 text-muted">Finding you a driver…</p>}
              {r.status !== RideStatus.Requested && (
                <>
                  {track.data?.driverLat != null ? (
                    <p className="mb-1">
                      Driver at {track.data.driverLat.toFixed(4)}, {track.data.driverLng?.toFixed(4)}
                      {track.data.etaSeconds != null && <> · ETA {formatDuration(track.data.etaSeconds)}</>}
                    </p>
                  ) : (
                    <p className="mb-1 text-muted">Waiting for driver location…</p>
                  )}
                  <div className="small text-muted">Updates every few seconds.</div>
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Fare breakdown (completed) */}
        {isCompleted && breakdown.data && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted mb-3">Fare breakdown</h2>
              <BreakdownRow label="Base fare" value={breakdown.data.baseFareMinor} />
              <BreakdownRow label="Distance" value={breakdown.data.distanceFareMinor} />
              <BreakdownRow label="Time" value={breakdown.data.timeFareMinor} />
              {breakdown.data.discountMinor > 0 && (
                <BreakdownRow label="Coupon discount" value={-breakdown.data.discountMinor} />
              )}
              <div className="d-flex justify-content-between fw-semibold border-top pt-2 mt-2">
                <span>Total</span><span>{formatBDT(breakdown.data.totalMinor)}</span>
              </div>
            </Card.Body>
          </Card>
        )}
      </Col>

      <Col xs={12} lg={5}>
        {/* Pay */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-baseline">
              <h2 className="h6 text-uppercase text-muted mb-0">Payable</h2>
              <div className="h4 mb-0">{formatBDT(payable)}</div>
            </div>
            <div className="text-muted small mb-3">via {r.paymentMethod}</div>
            {(r.status === RideStatus.Completed || r.status === RideStatus.Cancelled) && (
              charge.isSuccess ? (
                <Alert variant="success" className="mb-0">Payment {charge.data?.status?.toLowerCase()} — {formatBDT(charge.data?.amountMinor)}.</Alert>
              ) : (
                <Button variant="success" className="w-100" disabled={charge.isPending} onClick={() => charge.mutate()}>
                  {charge.isPending ? 'Processing…' : 'Pay now'}
                </Button>
              )
            )}
            {r.status === RideStatus.Cancelled && r.cancellationFeeMinor > 0 && (
              <div className="small text-muted mt-2">Includes {formatBDT(r.cancellationFeeMinor)} cancellation fee.</div>
            )}
          </Card.Body>
        </Card>

        {/* Cancel */}
        {CANCELLABLE.includes(r.status) && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted">Need to cancel?</h2>
              <p className="text-muted small">A fee may apply once a driver is on the way.</p>
              <Button variant="outline-danger" className="w-100" disabled={cancel.isPending}
                onClick={() => cancel.mutate({ id, reason: 'Customer cancelled' })}>
                {cancel.isPending ? 'Cancelling…' : 'Cancel ride'}
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* Safety */}
        {isActive && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted">Safety</h2>
              <Button variant="danger" className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                disabled={sos.isPending || sos.isSuccess} onClick={() => sos.mutate()}>
                <AlertTriangle size={18} /> {sos.isSuccess ? 'SOS sent' : 'Trigger SOS'}
              </Button>
              {share.isSuccess ? (
                <Alert variant="success" className="mb-0 small">Trip shared with {contactName}.</Alert>
              ) : (
                <>
                  <Form.Control className="mb-2" size="sm" placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  <Form.Control className="mb-2" size="sm" placeholder="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  <Button variant="outline-secondary" size="sm" className="w-100 d-flex align-items-center justify-content-center gap-2"
                    disabled={!contactName.trim() || !contactPhone.trim() || share.isPending}
                    onClick={() => share.mutate({ contactName: contactName.trim(), contactPhone: contactPhone.trim() })}>
                    <Share2 size={16} /> Share trip
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Rate driver */}
        {isCompleted && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted">Rate your driver</h2>
              {review.isSuccess ? (
                <Alert variant="success" className="mb-0">Thanks for your feedback!</Alert>
              ) : (
                <>
                  <Form.Select className="mb-2" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
                  </Form.Select>
                  <Form.Control as="textarea" rows={2} className="mb-2" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  {review.isError && (
                    <div className="text-danger small mb-2">
                      {review.error instanceof ApiError ? review.error.message : 'Could not submit review.'}
                    </div>
                  )}
                  <Button variant="success" className="w-100" disabled={review.isPending}
                    onClick={() => review.mutate({ rideId: id, rating, comment: comment.trim() || undefined })}>
                    {review.isPending ? 'Submitting…' : 'Submit rating'}
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        )}
      </Col>
    </Row>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="d-flex justify-content-between small py-1">
      <span className="text-muted">{label}</span>
      <span>{formatBDT(value)}</span>
    </div>
  );
}
