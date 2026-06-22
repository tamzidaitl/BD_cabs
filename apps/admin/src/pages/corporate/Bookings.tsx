import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  ApiError,
  CorporateBookingStatus,
  RideAllocationMode,
  queryKeys,
  useServices,
  type CorporateBooking,
  type CorporateBookingEstimate,
} from '@bd-cabs/core';
import {
  DHAKA_PLACES,
  VEHICLE_TYPES,
  describePoint,
  formatBDT,
  formatDateTime,
  formatDistance,
  placeAt,
} from '@/lib/appNav';

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const STATUS_VARIANT: Record<string, string> = {
  [CorporateBookingStatus.PendingApproval]: 'warning',
  [CorporateBookingStatus.Approved]: 'success',
  [CorporateBookingStatus.Scheduled]: 'info',
  [CorporateBookingStatus.Completed]: 'secondary',
  [CorporateBookingStatus.Rejected]: 'danger',
  [CorporateBookingStatus.Cancelled]: 'dark',
};

/**
 * Booking console: create a ride for an employee (with a fare estimate and an
 * approval-needed hint), clear the approval queue, act on existing bookings, and
 * manage recurring schedules.
 */
export default function CorporateBookingsPage() {
  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <NewBookingCard />
        <div className="mt-4">
          <RecurringCard />
        </div>
      </Col>
      <Col xs={12} lg={7}>
        <ApprovalQueueCard />
        <div className="mt-4">
          <BookingsListCard />
        </div>
      </Col>
    </Row>
  );
}

// ---- Create a booking ------------------------------------------------------

function NewBookingCard() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const employees = useQuery({
    queryKey: queryKeys.corporate.employees(),
    queryFn: () => endpoints.corporate.employees(),
  });
  const fleets = useQuery({
    queryKey: queryKeys.corporate.fleets(),
    queryFn: () => endpoints.corporate.fleets(),
  });

  const [employeeId, setEmployeeId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>(VEHICLE_TYPES[2]); // Car
  const [pickupIdx, setPickupIdx] = useState(0);
  const [destIdx, setDestIdx] = useState(1);
  const [allocationMode, setAllocationMode] = useState<string>(RideAllocationMode.Auto);
  const [preferredFleetId, setPreferredFleetId] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [estimate, setEstimate] = useState<CorporateBookingEstimate | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.corporate.bookingsAll() });
    void qc.invalidateQueries({ queryKey: queryKeys.corporate.employees() });
  };

  const coords = () => {
    const p = placeAt(pickupIdx);
    const d = placeAt(destIdx);
    return {
      pickupLat: p.lat,
      pickupLng: p.lng,
      pickupAddress: describePoint(p.lat, p.lng),
      destLat: d.lat,
      destLng: d.lng,
      destAddress: describePoint(d.lat, d.lng),
    };
  };

  const fleetRequired = allocationMode === RideAllocationMode.Fleet;
  const formValid = !!employeeId && (!fleetRequired || !!preferredFleetId);

  const estimateM = useMutation({
    mutationFn: () => {
      const c = coords();
      return endpoints.corporate.estimateBooking({
        employeeId,
        vehicleTypeId,
        pickupLat: c.pickupLat,
        pickupLng: c.pickupLng,
        destLat: c.destLat,
        destLng: c.destLng,
      });
    },
    onSuccess: (res) => setEstimate(res),
  });

  const book = useMutation({
    mutationFn: () =>
      endpoints.corporate.createBooking({
        employeeId,
        vehicleTypeId,
        ...coords(),
        allocationMode,
        preferredFleetId: fleetRequired ? preferredFleetId : undefined,
        notes: notes.trim() || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      }),
    onSuccess: () => {
      setNotes('');
      setScheduledFor('');
      setEstimate(null);
      invalidate();
    },
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Book a ride</h1>

        {(estimateM.isError || book.isError) && (
          <Alert variant="danger" className="py-2">
            {errMsg(estimateM.error ?? book.error, 'Could not complete the request.')}
          </Alert>
        )}
        {book.isSuccess && <Alert variant="success" className="py-2">Booking created.</Alert>}

        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Employee</Form.Label>
          <Form.Select
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setEstimate(null); }}
          >
            <option value="">Choose an employee…</option>
            {employees.data?.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <Row className="g-2">
          <Col xs={12} md={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Pickup</Form.Label>
              <Form.Select value={pickupIdx} onChange={(e) => { setPickupIdx(Number(e.target.value)); setEstimate(null); }}>
                {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Destination</Form.Label>
              <Form.Select value={destIdx} onChange={(e) => { setDestIdx(Number(e.target.value)); setEstimate(null); }}>
                {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="g-2">
          <Col xs={12} md={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Vehicle</Form.Label>
              <Form.Select value={vehicleTypeId} onChange={(e) => { setVehicleTypeId(e.target.value); setEstimate(null); }}>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Allocation</Form.Label>
              <Form.Select value={allocationMode} onChange={(e) => setAllocationMode(e.target.value)}>
                <option value={RideAllocationMode.Auto}>Auto (any vehicle)</option>
                <option value={RideAllocationMode.Fleet}>Preferred fleet</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {fleetRequired && (
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted mb-1">Fleet</Form.Label>
            <Form.Select value={preferredFleetId} onChange={(e) => setPreferredFleetId(e.target.value)}>
              <option value="">Choose a fleet…</option>
              {fleets.data?.map((f) => (
                <option key={f.ownerId} value={f.ownerId}>{f.companyName ?? f.ownerId.slice(0, 8)}</option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Schedule for later (optional)</Form.Label>
          <Form.Control type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small text-muted mb-1">Notes (optional)</Form.Label>
          <Form.Control as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Form.Group>

        {estimate && (
          <div className="bg-light rounded p-3 mb-3 small">
            <div className="d-flex justify-content-between">
              <span className="text-muted">Estimated fare</span>
              <span className="fw-medium">{formatBDT(estimate.fareEstimateMinor)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Distance</span>
              <span>{formatDistance(estimate.distanceMeters)}</span>
            </div>
            {estimate.monthlyLimitMinor != null && (
              <div className="d-flex justify-content-between">
                <span className="text-muted">Spent / cap this month</span>
                <span className={estimate.exceedsLimit ? 'text-danger fw-medium' : ''}>
                  {formatBDT(estimate.spentThisMonthMinor)} / {formatBDT(estimate.monthlyLimitMinor)}
                </span>
              </div>
            )}
            {estimate.approvalRequired && (
              <div className="text-warning mt-1">
                {estimate.exceedsLimit ? 'Over the monthly cap — ' : ''}this booking will need approval.
              </div>
            )}
          </div>
        )}

        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            disabled={!formValid || estimateM.isPending}
            onClick={() => estimateM.mutate()}
          >
            {estimateM.isPending ? 'Estimating…' : 'Estimate'}
          </Button>
          <Button
            variant="success"
            disabled={!formValid || book.isPending}
            onClick={() => book.mutate()}
          >
            {book.isPending ? 'Booking…' : 'Book ride'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

// ---- Approval queue --------------------------------------------------------

function ApprovalQueueCard() {
  const { endpoints } = useServices();
  const params = { status: CorporateBookingStatus.PendingApproval };
  const queue = useQuery({
    queryKey: queryKeys.corporate.bookings(params),
    queryFn: () => endpoints.corporate.bookings(params),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 text-uppercase text-muted mb-3">Awaiting approval</h2>
        {queue.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {queue.data && queue.data.length === 0 && (
          <p className="text-muted mb-0">Nothing awaiting approval.</p>
        )}
        {queue.data?.map((b) => <BookingRow key={b.id} booking={b} />)}
      </Card.Body>
    </Card>
  );
}

// ---- All bookings ----------------------------------------------------------

function BookingsListCard() {
  const { endpoints } = useServices();
  const [statusFilter, setStatusFilter] = useState('');
  const params = useMemo(() => (statusFilter ? { status: statusFilter } : {}), [statusFilter]);
  const bookings = useQuery({
    queryKey: queryKeys.corporate.bookings(params),
    queryFn: () => endpoints.corporate.bookings(params),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 text-uppercase text-muted mb-0">All bookings</h2>
          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {Object.values(CorporateBookingStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </Form.Select>
        </div>
        {bookings.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {bookings.data && bookings.data.length === 0 && (
          <p className="text-muted mb-0">No bookings yet.</p>
        )}
        {bookings.data?.map((b) => <BookingRow key={b.id} booking={b} />)}
      </Card.Body>
    </Card>
  );
}

// ---- A single booking row + its actions ------------------------------------

function BookingRow({ booking }: { booking: CorporateBooking }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.corporate.bookingsAll() });

  const approve = useMutation({
    mutationFn: () => endpoints.corporate.approveBooking(booking.id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => endpoints.corporate.rejectBooking(booking.id, { reason: reason.trim() || undefined }),
    onSuccess: () => { setShowReject(false); invalidate(); },
  });
  const complete = useMutation({
    mutationFn: () => endpoints.corporate.completeBooking(booking.id),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => endpoints.corporate.cancelBooking(booking.id),
    onSuccess: invalidate,
  });

  const isPending = booking.status === CorporateBookingStatus.PendingApproval;
  const isActive =
    booking.status === CorporateBookingStatus.Approved ||
    booking.status === CorporateBookingStatus.Scheduled;
  const cancellable = isPending || isActive;

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">
            {booking.employeeName ?? 'Employee'} · {booking.vehicleTypeId}
          </div>
          <div className="text-muted small">
            {booking.pickupAddress ?? '—'} → {booking.destAddress ?? '—'}
          </div>
          <div className="small mt-1">
            <span className="fw-medium">{formatBDT(booking.finalFareMinor ?? booking.fareEstimateMinor)}</span>
            <span className="text-muted"> · {formatDistance(booking.distanceMeters)}</span>
            {booking.scheduledFor && (
              <span className="text-muted"> · for {formatDateTime(booking.scheduledFor)}</span>
            )}
          </div>
          {booking.rejectionReason && (
            <div className="text-danger small mt-1">Rejected: {booking.rejectionReason}</div>
          )}
        </div>
        <Badge bg={STATUS_VARIANT[booking.status] ?? 'secondary'} text={booking.status === CorporateBookingStatus.PendingApproval ? 'dark' : undefined}>
          {booking.status}
        </Badge>
      </div>

      {(approve.isError || reject.isError || complete.isError || cancel.isError) && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {errMsg(approve.error ?? reject.error ?? complete.error ?? cancel.error, 'Action failed.')}
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mt-2">
        {isPending && (
          <>
            <Button size="sm" variant="success" disabled={approve.isPending} onClick={() => approve.mutate()}>
              {approve.isPending ? 'Approving…' : 'Approve'}
            </Button>
            <Button size="sm" variant="outline-danger" onClick={() => setShowReject((s) => !s)}>
              Reject
            </Button>
          </>
        )}
        {isActive && (
          <Button size="sm" variant="outline-success" disabled={complete.isPending} onClick={() => complete.mutate()}>
            {complete.isPending ? 'Completing…' : 'Mark completed'}
          </Button>
        )}
        {cancellable && (
          <Button size="sm" variant="outline-secondary" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel'}
          </Button>
        )}
      </div>

      {showReject && (
        <Row className="g-2 align-items-center mt-1">
          <Col xs="auto" className="flex-grow-1">
            <Form.Control
              size="sm"
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Col>
          <Col xs="auto">
            <Button size="sm" variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
              {reject.isPending ? 'Rejecting…' : 'Confirm reject'}
            </Button>
          </Col>
        </Row>
      )}
    </div>
  );
}

// ---- Recurring schedules ---------------------------------------------------

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RecurringCard() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const employees = useQuery({
    queryKey: queryKeys.corporate.employees(),
    queryFn: () => endpoints.corporate.employees(),
  });
  const recurring = useQuery({
    queryKey: queryKeys.corporate.recurring(),
    queryFn: () => endpoints.corporate.recurring(),
  });

  const [employeeId, setEmployeeId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>(VEHICLE_TYPES[2]);
  const [pickupIdx, setPickupIdx] = useState(0);
  const [destIdx, setDestIdx] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [timeOfDay, setTimeOfDay] = useState('08:00');

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.corporate.recurring() });

  const create = useMutation({
    mutationFn: () => {
      const p = placeAt(pickupIdx);
      const d = placeAt(destIdx);
      return endpoints.corporate.createRecurring({
        employeeId,
        vehicleTypeId,
        pickupLat: p.lat,
        pickupLng: p.lng,
        pickupAddress: describePoint(p.lat, p.lng),
        destLat: d.lat,
        destLng: d.lng,
        destAddress: describePoint(d.lat, d.lng),
        daysOfWeek: days,
        timeOfDay,
      });
    },
    onSuccess: () => { setDays([]); invalidate(); },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => endpoints.corporate.cancelRecurring(id),
    onSuccess: invalidate,
  });

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const formValid = !!employeeId && days.length > 0 && !!timeOfDay;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 text-uppercase text-muted mb-3">Recurring rides</h2>

        {create.isError && (
          <Alert variant="danger" className="py-2">{errMsg(create.error, 'Could not create schedule.')}</Alert>
        )}

        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Employee</Form.Label>
          <Form.Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Choose an employee…</option>
            {employees.data?.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
          </Form.Select>
        </Form.Group>

        <Row className="g-2">
          <Col xs={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Pickup</Form.Label>
              <Form.Select value={pickupIdx} onChange={(e) => setPickupIdx(Number(e.target.value))}>
                {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Destination</Form.Label>
              <Form.Select value={destIdx} onChange={(e) => setDestIdx(Number(e.target.value))}>
                {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Vehicle</Form.Label>
              <Form.Select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted mb-1">Time</Form.Label>
              <Form.Control type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
            </Form.Group>
          </Col>
        </Row>

        <div className="mb-3">
          <div className="small text-muted mb-1">Repeat on</div>
          <div className="d-flex flex-wrap gap-1">
            {DOW.map((label, d) => (
              <Button
                key={label}
                size="sm"
                variant={days.includes(d) ? 'success' : 'outline-secondary'}
                onClick={() => toggleDay(d)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Button variant="success" className="mb-3" disabled={!formValid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating…' : 'Create schedule'}
        </Button>

        {recurring.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {recurring.data && recurring.data.length === 0 && (
          <p className="text-muted mb-0">No recurring rides.</p>
        )}
        {recurring.data?.map((r) => (
          <div key={r.id} className="d-flex justify-content-between align-items-center border-top py-2">
            <div>
              <div className="fw-medium small">{r.employeeName ?? 'Employee'} · {r.vehicleTypeId}</div>
              <div className="text-muted small">
                {r.daysOfWeek.map((d) => DOW[d]).join(', ')} at {r.timeOfDay}
              </div>
            </div>
            <Button size="sm" variant="outline-danger" disabled={cancel.isPending} onClick={() => cancel.mutate(r.id)}>
              Remove
            </Button>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}
