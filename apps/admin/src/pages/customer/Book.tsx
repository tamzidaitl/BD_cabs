import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, ButtonGroup, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Flag, LocateFixed, MapPin } from 'lucide-react';
import { ApiError, GeoPoint, useApplyCoupon, useCancelRide, useRequestRide, useServices } from '@bd-cabs/core';
import {
  DHAKA_PLACES,
  VEHICLE_TYPES,
  describePoint,
  formatBDT,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '@/lib/appNav';
import { RideMap, RideMapMarker } from '@/components/RideMap';

/** A preset place as a GeoPoint (its name becomes the address). */
function presetGeo(index: number): GeoPoint {
  const p = DHAKA_PLACES[index] ?? DHAKA_PLACES[0]!;
  return { lat: p.lat, lng: p.lng, address: p.name };
}

/**
 * Customer home — book a ride on a live map. Drop pins for pickup/destination
 * (or pick a known spot / use your current location), choose a vehicle class,
 * see a live fare estimate + nearby drivers, optionally apply a coupon, then
 * request instantly or schedule for later.
 */
export default function BookPage() {
  const navigate = useNavigate();
  const { endpoints } = useServices();
  const requestRide = useRequestRide();
  const applyCoupon = useApplyCoupon();
  const cancelRide = useCancelRide();

  const [pickup, setPickup] = useState<GeoPoint>(() => presetGeo(0));
  const [dest, setDest] = useState<GeoPoint>(() => presetGeo(1));
  const [pickupPreset, setPickupPreset] = useState('');
  const [destPreset, setDestPreset] = useState('');
  const [target, setTarget] = useState<'pickup' | 'destination'>('pickup');
  const [vehicleType, setVehicleType] = useState<string>('Car');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [couponCode, setCouponCode] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; otp?: string } | null>(null);

  const sameSpot = pickup.lat === dest.lat && pickup.lng === dest.lng;

  function resetEstimate() {
    estimate.reset();
    applyCoupon.reset();
  }

  /** Move whichever pin is being edited to the clicked/selected coordinate. */
  function setPoint(lat: number, lng: number, address?: string) {
    const gp: GeoPoint = { lat, lng, address: address ?? describePoint(lat, lng) };
    if (target === 'pickup') { setPickup(gp); setPickupPreset(''); }
    else { setDest(gp); setDestPreset(''); }
    resetEstimate();
  }

  function useMyLocation() {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const gp: GeoPoint = { lat: latitude, lng: longitude, address: describePoint(latitude, longitude) };
        setPickup(gp);
        setPickupPreset('');
        setTarget('destination');
        resetEstimate();
      },
      () => setGeoError('Could not get your location. Pick a point on the map instead.'),
    );
  }

  const estimate = useMutation({
    mutationFn: () =>
      endpoints.rides.estimate({ pickup, destination: dest, vehicleTypeId: vehicleType }),
  });

  const nearby = useQuery({
    queryKey: ['nearby-vehicles', pickup.lat, pickup.lng, vehicleType],
    queryFn: () => endpoints.rides.nearbyVehicles({ lat: pickup.lat, lng: pickup.lng, vehicleType }),
    staleTime: 15_000,
  });

  const markers = useMemo<RideMapMarker[]>(() => {
    const list: RideMapMarker[] = [
      { kind: 'pickup', lat: pickup.lat, lng: pickup.lng, label: `Pickup · ${pickup.address ?? ''}` },
      { kind: 'destination', lat: dest.lat, lng: dest.lng, label: `Destination · ${dest.address ?? ''}` },
    ];
    for (const d of nearby.data ?? []) {
      list.push({
        kind: 'vehicle',
        lat: d.lat,
        lng: d.lng,
        label: `${d.vehicleType} · ${formatDistance(d.distanceMeters)} · ${formatDuration(d.etaSeconds)} away`,
      });
    }
    return list;
  }, [pickup, dest, nearby.data]);

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
      pickup,
      destination: dest,
      vehicleTypeId: vehicleType,
      paymentMethod,
      couponCode: applyCoupon.data ? couponCode.trim() : undefined,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    });
    setCreated({ id: res.ride.id, otp: res.startOtp });
  }

  async function handleCancel() {
    if (!created) return;
    await cancelRide.mutateAsync({ id: created.id, reason: 'Customer cancelled' });
    setCreated(null);
    resetEstimate();
  }

  const requestError =
    requestRide.error instanceof ApiError ? requestRide.error.message : requestRide.error ? 'Could not request the ride.' : null;

  return (
    <Row className="g-4">
      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h4 mb-1">Book a ride</h1>
            <p className="text-muted">Tap the map to set your {target === 'pickup' ? 'pickup' : 'destination'}, or pick a known spot below.</p>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <ButtonGroup>
                <Button
                  variant={target === 'pickup' ? 'success' : 'outline-success'}
                  onClick={() => setTarget('pickup')}
                  className="d-flex align-items-center gap-1"
                >
                  <MapPin size={16} /> Pickup
                </Button>
                <Button
                  variant={target === 'destination' ? 'primary' : 'outline-primary'}
                  onClick={() => setTarget('destination')}
                  className="d-flex align-items-center gap-1"
                >
                  <Flag size={16} /> Destination
                </Button>
              </ButtonGroup>
              <Button variant="outline-primary" className="d-flex align-items-center gap-1" onClick={useMyLocation}>
                <LocateFixed size={16} /> Use my location
              </Button>
            </div>

            <RideMap markers={markers} onPick={setPoint} route autoFit={false} height={360} />
            {geoError && <Alert variant="warning" className="mt-2 mb-0 py-2 small">{geoError}</Alert>}

            <Row className="g-2 mt-1">
              <Col xs={12} md={6} className="small text-muted">
                <span className="badge bg-success me-1">A</span> {pickup.address}
              </Col>
              <Col xs={12} md={6} className="small text-muted">
                <span className="badge bg-danger me-1">B</span> {dest.address}
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col xs={12} md={6}>
                <Form.Group controlId="pickupPreset">
                  <Form.Label className="small">Quick pickup</Form.Label>
                  <Form.Select
                    value={pickupPreset}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPickupPreset(v);
                      if (v !== '') { setPickup(presetGeo(Number(v))); resetEstimate(); }
                    }}
                  >
                    <option value="">Choose a known spot…</option>
                    {DHAKA_PLACES.map((p, i) => (
                      <option key={p.name} value={i}>{p.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="destPreset">
                  <Form.Label className="small">Quick destination</Form.Label>
                  <Form.Select
                    value={destPreset}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDestPreset(v);
                      if (v !== '') { setDest(presetGeo(Number(v))); resetEstimate(); }
                    }}
                  >
                    <option value="">Choose a known spot…</option>
                    {DHAKA_PLACES.map((p, i) => (
                      <option key={p.name} value={i}>{p.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="vehicleType">
                  <Form.Label>Vehicle</Form.Label>
                  <Form.Select value={vehicleType} onChange={(e) => { setVehicleType(e.target.value); resetEstimate(); }}>
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

                <div className="mt-3 small">
                  <div className="d-flex align-items-start gap-2">
                    <span className="badge bg-success mt-1">A</span>
                    <div>
                      <div className="text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>Pickup</div>
                      <div>{pickup.address}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-start gap-2 mt-2">
                    <span className="badge bg-danger mt-1">B</span>
                    <div>
                      <div className="text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>Destination</div>
                      <div>{dest.address}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-start gap-2 mt-2">
                    <span className="badge bg-secondary mt-1">⏱</span>
                    <div>
                      <div className="text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>When</div>
                      <div>{scheduledFor ? `Scheduled for ${formatDateTime(new Date(scheduledFor).toISOString())}` : 'As soon as possible'}</div>
                    </div>
                  </div>
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
                      disabled={!!created}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={!!created || !couponCode.trim() || applyCoupon.isPending}
                      onClick={() => applyCoupon.mutate({ code: couponCode.trim(), fareMinor: fare })}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && <div className="text-danger small mt-1">{couponError}</div>}
                </Form.Group>

                {requestError && <Alert variant="danger" className="mt-3 mb-0">{requestError}</Alert>}

                {!created && (
                  <Button className="w-100 mt-3" variant="success" disabled={requestRide.isPending} onClick={handleRequest}>
                    {requestRide.isPending ? 'Requesting…' : scheduledFor ? 'Schedule ride' : 'Request ride now'}
                  </Button>
                )}
              </>
            )}

            {created && (
              <Alert variant="success" className="mt-3 mb-0">
                <div className="fw-semibold">{scheduledFor ? 'Ride scheduled!' : 'Ride requested!'}</div>
                {created.otp && (
                  <div className="small">Share start code <Badge bg="dark">{created.otp}</Badge> with your driver.</div>
                )}
                <div className="d-flex gap-2 mt-2">
                  <Button size="sm" variant="success" onClick={() => navigate(`/app/rides/${created.id}`)}>
                    Track ride
                  </Button>
                  <Button size="sm" variant="outline-danger" disabled={cancelRide.isPending} onClick={handleCancel}>
                    {cancelRide.isPending ? 'Cancelling…' : 'Cancel trip'}
                  </Button>
                </div>
                {cancelRide.error && (
                  <div className="text-danger small mt-2">
                    {cancelRide.error instanceof ApiError ? cancelRide.error.message : 'Could not cancel the trip.'}
                  </div>
                )}
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
              <p className="text-muted mb-0">No drivers online near {pickup.address} right now.</p>
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
