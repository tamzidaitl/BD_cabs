import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, useApplyCoupon, useRequestRide, useServices } from '@bd-cabs/core';
import {
  DHAKA_PLACES,
  VEHICLE_TYPES,
  formatBDT,
  formatDistance,
  formatDuration,
  placeAt,
} from '@/lib/appNav';

/**
 * Customer home — book a ride. Pick origin/destination from known Dhaka spots,
 * choose a vehicle class, see a live fare estimate + nearby drivers, optionally
 * apply a coupon, then request instantly or schedule for later.
 */
export default function BookPage() {
  const navigate = useNavigate();
  const { endpoints } = useServices();
  const requestRide = useRequestRide();
  const applyCoupon = useApplyCoupon();

  const [pickupIdx, setPickupIdx] = useState(0);
  const [destIdx, setDestIdx] = useState(1);
  const [vehicleType, setVehicleType] = useState<string>('Car');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [couponCode, setCouponCode] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [created, setCreated] = useState<{ id: string; otp?: string } | null>(null);

  const pickup = placeAt(pickupIdx);
  const dest = placeAt(destIdx);
  const sameSpot = pickupIdx === destIdx;

  const estimate = useMutation({
    mutationFn: () =>
      endpoints.rides.estimate({
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.name },
        destination: { lat: dest.lat, lng: dest.lng, address: dest.name },
        vehicleTypeId: vehicleType,
      }),
  });

  const nearby = useQuery({
    queryKey: ['nearby-vehicles', pickup.lat, pickup.lng, vehicleType],
    queryFn: () =>
      endpoints.rides.nearbyVehicles({ lat: pickup.lat, lng: pickup.lng, vehicleType }),
    staleTime: 15_000,
  });

  const fare = estimate.data?.fareEstimateMinor ?? 0;
  const discount = applyCoupon.data?.discountMinor ?? 0;
  const payable = Math.max(0, fare - discount);

  const couponError = useMemo(() => {
    if (!applyCoupon.error) return null;
    return applyCoupon.error instanceof ApiError ? applyCoupon.error.message : 'Coupon could not be applied.';
  }, [applyCoupon.error]);

  async function handleRequest() {
    setCreated(null);
    const res = await requestRide.mutateAsync({
      pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.name },
      destination: { lat: dest.lat, lng: dest.lng, address: dest.name },
      vehicleTypeId: vehicleType,
      paymentMethod,
      couponCode: applyCoupon.data ? couponCode.trim() : undefined,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    });
    setCreated({ id: res.ride.id, otp: res.startOtp });
  }

  const requestError =
    requestRide.error instanceof ApiError ? requestRide.error.message : requestRide.error ? 'Could not request the ride.' : null;

  return (
    <Row className="g-4">
      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h4 mb-1">Book a ride</h1>
            <p className="text-muted">Where are you headed?</p>

            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="pickup">
                  <Form.Label>Pickup</Form.Label>
                  <Form.Select value={pickupIdx} onChange={(e) => setPickupIdx(Number(e.target.value))}>
                    {DHAKA_PLACES.map((p, i) => (
                      <option key={p.name} value={i}>{p.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="dest">
                  <Form.Label>Destination</Form.Label>
                  <Form.Select value={destIdx} onChange={(e) => setDestIdx(Number(e.target.value))}>
                    {DHAKA_PLACES.map((p, i) => (
                      <option key={p.name} value={i}>{p.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="vehicleType">
                  <Form.Label>Vehicle</Form.Label>
                  <Form.Select value={vehicleType} onChange={(e) => { setVehicleType(e.target.value); applyCoupon.reset(); estimate.reset(); }}>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="payment">
                  <Form.Label>Payment</Form.Label>
                  <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {['Cash', 'Wallet', 'Card', 'bKash', 'Nagad'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="schedule">
                  <Form.Label>Schedule for later <span className="text-muted">(optional)</span></Form.Label>
                  <Form.Control type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
                </Form.Group>
              </Col>
            </Row>

            {sameSpot && <Alert variant="warning" className="mt-3 mb-0">Pickup and destination are the same.</Alert>}

            <div className="d-flex gap-2 mt-3">
              <Button variant="outline-success" disabled={sameSpot || estimate.isPending} onClick={() => estimate.mutate()}>
                {estimate.isPending ? 'Estimating…' : 'Get estimate'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted">Fare estimate</h2>
            {!estimate.data && <p className="text-muted mb-0">Get an estimate to see the fare and request your ride.</p>}
            {estimate.data && (
              <>
                <div className="display-6 fw-semibold">{formatBDT(payable)}</div>
                <div className="text-muted">
                  {formatDistance(estimate.data.distanceMeters)} · {formatDuration(estimate.data.durationSeconds)} · ~{formatDuration(estimate.data.etaSeconds)} away
                </div>
                {discount > 0 && (
                  <div className="small text-success mt-1">
                    Coupon applied: −{formatBDT(discount)} (was {formatBDT(fare)})
                  </div>
                )}

                <Form.Group className="mt-3" controlId="coupon">
                  <Form.Label className="small">Coupon code</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      size="sm"
                      placeholder="e.g. WELCOME20"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={!couponCode.trim() || applyCoupon.isPending}
                      onClick={() => applyCoupon.mutate({ code: couponCode.trim(), fareMinor: fare })}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && <div className="text-danger small mt-1">{couponError}</div>}
                </Form.Group>

                {requestError && <Alert variant="danger" className="mt-3 mb-0">{requestError}</Alert>}

                <Button className="w-100 mt-3" variant="success" disabled={requestRide.isPending} onClick={handleRequest}>
                  {requestRide.isPending ? 'Requesting…' : scheduledFor ? 'Schedule ride' : 'Request ride now'}
                </Button>
              </>
            )}

            {created && (
              <Alert variant="success" className="mt-3 mb-0">
                <div className="fw-semibold">Ride requested!</div>
                {created.otp && (
                  <div className="small">Share start code <Badge bg="dark">{created.otp}</Badge> with your driver.</div>
                )}
                <Button size="sm" variant="success" className="mt-2" onClick={() => navigate(`/app/rides/${created.id}`)}>
                  Track ride
                </Button>
              </Alert>
            )}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 text-uppercase text-muted mb-0">Nearby {vehicleType}s</h2>
              {nearby.isFetching && <Spinner animation="border" size="sm" variant="success" />}
            </div>
            {nearby.data && nearby.data.length === 0 && (
              <p className="text-muted mb-0">No drivers online near {pickup.name} right now.</p>
            )}
            {nearby.data && nearby.data.length > 0 && (
              <ul className="list-unstyled mb-0">
                {nearby.data.map((d) => (
                  <li key={d.driverId} className="d-flex justify-content-between border-bottom py-2 small">
                    <span>{d.vehicleType} · {d.rating ? `★ ${d.rating.toFixed(1)}` : 'New'}</span>
                    <span className="text-muted">{formatDistance(d.distanceMeters)} · {formatDuration(d.etaSeconds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
