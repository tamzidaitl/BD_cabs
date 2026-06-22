import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { LocateFixed } from 'lucide-react';
import {
  ApiError,
  RideStatus,
  useDriverProfile,
  useNearbyRequests,
  useRideAction,
  useServices,
  useSetAvailability,
  useUpdateDriverLocation,
} from '@bd-cabs/core';
import {
  DHAKA_PLACES,
  describePoint,
  formatBDT,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatTimeAgo,
  placeAt,
} from '@/lib/appNav';
import { Avatar } from '@/components/Avatar';
import { DHAKA_CENTER, RideMap, RideMapMarker } from '@/components/RideMap';
import { rideStatusVariant } from '../customer/rideStatus';

const ACTIVE = [RideStatus.Accepted, RideStatus.DriverArrived, RideStatus.InProgress] as string[];

/**
 * Driver command centre: go online/offline, push your location, see nearby
 * requests and accept them, then run the trip through arrived → start → complete.
 */
export default function DrivePage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const profile = useDriverProfile();
  const setAvailability = useSetAvailability();
  const updateLocation = useUpdateDriverLocation();
  const action = useRideAction();

  const online = !!profile.data?.isOnline;
  const approved = profile.data?.verificationStatus === 'approved';

  const nearby = useNearbyRequests(online && approved);

  // Derive the driver's current active trip from their recent trips.
  const trips = useQuery({
    queryKey: ['drivers', 'trips', { page: 1, pageSize: 20 }],
    queryFn: () => endpoints.drivers.trips({ page: 1, pageSize: 20 }),
  });
  const activeRide = trips.data?.items.find((r) => ACTIVE.includes(r.status));

  const [locIdx, setLocIdx] = useState(0);
  const [otp, setOtp] = useState('');
  // The request currently being accepted, so we can show feedback on that row.
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  // A point chosen on the map / via geolocation, not yet pushed to the server.
  const [pending, setPending] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  function pushLocation(lat: number, lng: number) {
    updateLocation.mutate({ lat, lng }, {
      onSuccess: () => { setPending(null); void profile.refetch(); void nearby.refetch(); },
    });
  }

  function useMyLocation() {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPending({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: describePoint(pos.coords.latitude, pos.coords.longitude) }),
      () => setGeoError('Could not get your location. Tap the map instead.'),
    );
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: ['drivers', 'trips'] });
    void qc.invalidateQueries({ queryKey: ['rides', 'nearby-requests'] });
  }

  function acceptRide(id: string) {
    setAcceptingId(id);
    action.mutate(
      { id, action: 'accept' },
      {
        onSuccess: refresh,
        // Whether it succeeds (now my active trip) or fails (e.g. another driver
        // grabbed it first), refresh the feed so the request disappears.
        onSettled: () => {
          setAcceptingId(null);
          void qc.invalidateQueries({ queryKey: ['rides', 'nearby-requests'] });
        },
      },
    );
  }

  // Friendly message for a failed accept (the API surfaces stable codes/messages).
  const acceptError =
    action.isError && !activeRide
      ? action.error instanceof ApiError
        ? action.error.message
        : 'Could not accept this ride. Please try again.'
      : null;

  const current = profile.data?.currentLat != null && profile.data.currentLng != null
    ? { lat: profile.data.currentLat, lng: profile.data.currentLng }
    : null;
  const driverPos = pending ?? current;

  const markers = useMemo<RideMapMarker[]>(() => {
    const list: RideMapMarker[] = [];
    if (driverPos) list.push({ kind: 'driver', lat: driverPos.lat, lng: driverPos.lng, label: pending ? 'New location (tap Set to confirm)' : 'You are here' });
    for (const r of nearby.data ?? []) {
      list.push({ kind: 'pickup', lat: r.pickup.lat, lng: r.pickup.lng, label: `${r.customer?.fullName ?? 'Customer'} · ${r.pickup.address ?? ''}` });
    }
    return list;
  }, [driverPos?.lat, driverPos?.lng, pending, nearby.data]);

  if (profile.isLoading) {
    return <div className="text-center py-5"><Spinner animation="border" variant="success" /></div>;
  }

  // Not onboarded yet.
  if (profile.isError && profile.error instanceof ApiError && profile.error.status === 404) {
    return (
      <Alert variant="info">
        Finish onboarding to start driving.{' '}
        <Link to="/app/documents" className="alert-link">Submit your details &amp; documents</Link>.
      </Alert>
    );
  }

  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h5 mb-1">{online ? 'You’re online' : 'You’re offline'}</h1>
                <div className="text-muted small">
                  {profile.data?.rating ? `★ ${profile.data.rating.toFixed(1)}` : 'No rating yet'} ·{' '}
                  <Badge bg={approved ? 'success' : 'warning'} text={approved ? undefined : 'dark'}>
                    {profile.data?.verificationStatus}
                  </Badge>
                </div>
              </div>
              <Form.Check
                type="switch"
                id="availability"
                checked={online}
                disabled={!approved || setAvailability.isPending}
                onChange={(e) => setAvailability.mutate(e.target.checked)}
                label=""
              />
            </div>
            {!approved && (
              <Alert variant="warning" className="mt-3 mb-0 small">
                Your account must be verified before you can go online.
              </Alert>
            )}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Your location</h2>
            <RideMap
              markers={markers}
              onPick={(lat, lng) => setPending({ lat, lng, label: describePoint(lat, lng) })}
              autoFit={false}
              center={driverPos ? [driverPos.lat, driverPos.lng] : DHAKA_CENTER}
              zoom={13}
              height={260}
            />
            <p className="text-muted small mt-2 mb-2">Tap the map to drop your position, or pick a known spot.</p>
            <div className="d-flex gap-2">
              <Form.Select
                value={locIdx}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setLocIdx(i);
                  const p = placeAt(i);
                  setPending({ lat: p.lat, lng: p.lng, label: p.name });
                }}
              >
                {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </Form.Select>
              <Button variant="outline-secondary" className="d-flex align-items-center gap-1 flex-shrink-0" onClick={useMyLocation}>
                <LocateFixed size={16} /> GPS
              </Button>
              <Button
                variant="success"
                className="flex-shrink-0"
                disabled={updateLocation.isPending || !(pending ?? current)}
                onClick={() => {
                  const p = pending ?? current;
                  if (p) pushLocation(p.lat, p.lng);
                }}
              >
                {updateLocation.isPending ? 'Updating…' : 'Set'}
              </Button>
            </div>
            {geoError && <Alert variant="warning" className="mt-2 mb-0 py-2 small">{geoError}</Alert>}
            {pending ? (
              <div className="text-muted small mt-2">Selected: {pending.label} — tap <strong>Set</strong> to go live here.</div>
            ) : current ? (
              <div className="text-muted small mt-2">Live at {current.lat.toFixed(4)}, {current.lng.toFixed(4)}</div>
            ) : null}
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={7}>
        {/* Active trip */}
        {activeRide && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 text-uppercase text-muted mb-0">Active trip</h2>
                <Badge bg={rideStatusVariant(activeRide.status)}>{activeRide.status}</Badge>
              </div>
              <div className="mb-2">
                {activeRide.pickup.address} → {activeRide.destination.address}
              </div>
              <div className="text-muted small mb-3">
                {formatDistance(activeRide.distanceMeters)} · {formatDuration(activeRide.durationSeconds)} · {formatBDT(activeRide.fareEstimateMinor)}
              </div>

              {action.isError && (
                <Alert variant="danger" className="py-2">
                  {action.error instanceof ApiError ? action.error.message : 'Action failed.'}
                </Alert>
              )}

              {activeRide.status === RideStatus.Accepted && (
                <Button variant="success" onClick={() => action.mutate({ id: activeRide.id, action: 'arrived' }, { onSuccess: refresh })}>
                  Mark arrived at pickup
                </Button>
              )}
              {activeRide.status === RideStatus.DriverArrived && (
                <>
                  <div className="text-muted small mb-2">Ask the rider for their start code to begin the trip.</div>
                  <div className="d-flex gap-2 align-items-center">
                    <Form.Control style={{ maxWidth: 140 }} placeholder="Start OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <Button variant="success" disabled={!otp.trim()} onClick={() => action.mutate({ id: activeRide.id, action: 'start', otp: otp.trim() }, { onSuccess: () => { setOtp(''); refresh(); } })}>
                      Start trip
                    </Button>
                  </div>
                </>
              )}
              {activeRide.status === RideStatus.InProgress && (
                <Button variant="success" onClick={() => action.mutate({ id: activeRide.id, action: 'complete' }, { onSuccess: refresh })}>
                  Complete trip
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Nearby requests */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 text-uppercase text-muted mb-0">Nearby requests</h2>
              {nearby.isFetching && <Spinner animation="border" size="sm" variant="success" />}
            </div>
            {acceptError && (
              <Alert variant="danger" className="py-2 small">
                {acceptError}
              </Alert>
            )}
            {!online && <p className="text-muted mb-0">Go online to receive ride requests.</p>}
            {online && nearby.data && nearby.data.length === 0 && <p className="text-muted mb-0">No requests right now. Hang tight…</p>}
            {online && nearby.data?.map((r) => (
              <div key={r.id} className="d-flex justify-content-between align-items-start border-bottom py-3 gap-3">
                <div className="d-flex gap-3">
                  <Avatar user={r.customer} size={44} />
                  <div>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <span className="fw-semibold">{r.customer?.fullName ?? 'Customer'}</span>
                      <span className="text-muted small">posted {formatTimeAgo(r.requestedAt)}</span>
                    </div>
                    <div className="fw-medium">{r.pickup.address} → {r.destination.address}</div>
                    <div className="text-muted small">
                      {r.vehicleTypeId} · {formatDistance(r.distanceMeters)} · {formatDuration(r.durationSeconds)} ·{' '}
                      {formatBDT(r.fareEstimateMinor)} · {r.paymentMethod}
                    </div>
                    <div className="mt-1">
                      <Badge bg={r.scheduledFor ? 'info' : 'success-subtle'} text={r.scheduledFor ? undefined : 'success'}>
                        {r.scheduledFor ? `Pickup ${formatDateTime(r.scheduledFor)}` : 'Pickup now'}
                      </Badge>
                    </div>
                    {r.notes && (
                      <div className="text-muted small fst-italic mt-1">“{r.notes}”</div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  disabled={!!activeRide || action.isPending}
                  onClick={() => acceptRide(r.id)}
                >
                  {acceptingId === r.id ? 'Accepting…' : 'Accept'}
                </Button>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
