import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useServices, type FleetDriver, type RentalAgreement } from '@bd-cabs/core';
import { formatBDT, takaToMinor, rentalPeriodSuffix } from '@/lib/appNav';
import { Avatar } from '@/components/Avatar';

/**
 * Fleet roster + rental request management. The owner invites/removes drivers,
 * approves rental requests (setting fixed rent or a revenue-share %), updates
 * terms, and tracks rent received. (Capabilities: add/remove drivers, approve
 * which driver may rent, set rental terms/price, receive rent payments.)
 */
export default function FleetDriversPage() {
  return (
    <Row className="g-4">
      <Col xs={12} lg={5}><RosterCard /></Col>
      <Col xs={12} lg={7}><RequestsCard /></Col>
    </Row>
  );
}

function RosterCard() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [note, setNote] = useState('');

  const drivers = useQuery({
    queryKey: queryKeys.fleet.drivers(),
    queryFn: () => endpoints.fleet.drivers(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.fleet.drivers() });

  const invite = useMutation({
    mutationFn: () => endpoints.fleet.inviteDriver({ emailOrPhone: emailOrPhone.trim(), note: note.trim() || undefined }),
    onSuccess: () => { setEmailOrPhone(''); setNote(''); invalidate(); },
  });
  const remove = useMutation({
    mutationFn: (driverId: string) => endpoints.fleet.removeDriver(driverId),
    onSuccess: invalidate,
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Fleet drivers</h1>
        {invite.isError && (
          <Alert variant="danger" className="py-2">{invite.error instanceof ApiError ? invite.error.message : 'Could not add driver.'}</Alert>
        )}
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Add a driver by email or phone</Form.Label>
          <Form.Control value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} placeholder="driver1@bdcabs.com" />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control size="sm" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Group>
        <Button variant="success" className="mb-3" disabled={!emailOrPhone.trim() || invite.isPending} onClick={() => invite.mutate()}>
          {invite.isPending ? 'Adding…' : 'Add to fleet'}
        </Button>

        {drivers.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {drivers.data && drivers.data.length === 0 && <p className="text-muted mb-0">No drivers in your fleet yet.</p>}
        {drivers.data?.map((d) => (
          <DriverRow key={d.id} driver={d} onRemove={() => remove.mutate(d.driverId)} removing={remove.isPending} />
        ))}
      </Card.Body>
    </Card>
  );
}

/** A roster driver row with remove + an inline owner→driver rating (one standing review). */
function DriverRow({ driver, onRemove, removing }: { driver: FleetDriver; onRemove: () => void; removing: boolean }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      endpoints.fleet.reviewDriver({ driverId: driver.driverId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.fleet.drivers() });
    },
  });

  return (
    <div className="border-bottom py-2">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-medium">{driver.driver?.fullName ?? driver.driverId.slice(0, 8)}</div>
          <div className="text-muted small">{driver.driver?.email ?? driver.driver?.phone ?? ''}</div>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-success" onClick={() => setOpen((o) => !o)}>
            {open ? 'Cancel' : 'Rate'}
          </Button>
          <Button size="sm" variant="outline-danger" disabled={removing} onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {submit.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {submit.error instanceof ApiError ? submit.error.message : 'Could not save review.'}
        </Alert>
      )}

      {open && (
        <div className="mt-2">
          <div className="d-flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n <= rating ? 'warning' : 'outline-secondary'}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                ★
              </Button>
            ))}
          </div>
          <Form.Control
            as="textarea"
            rows={2}
            className="mb-2"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button size="sm" variant="success" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Saving…' : 'Submit review'}
          </Button>
        </div>
      )}
    </div>
  );
}

function RequestsCard() {
  const { endpoints } = useServices();
  const requests = useQuery({
    queryKey: queryKeys.fleet.rentalRequests(),
    queryFn: () => endpoints.fleet.rentalRequests(),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 text-uppercase text-muted mb-3">Rental requests &amp; agreements</h2>
        {requests.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {requests.data && requests.data.length === 0 && <p className="text-muted mb-0">No rental requests yet.</p>}
        {requests.data?.map((a) => <RequestRow key={a.id} agreement={a} />)}
      </Card.Body>
    </Card>
  );
}

function RequestRow({ agreement }: { agreement: RentalAgreement }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [rentType, setRentType] = useState<'fixed' | 'revenue-share'>('fixed');
  const [rentTaka, setRentTaka] = useState('');
  const [sharePct, setSharePct] = useState('');
  const [endDate, setEndDate] = useState(agreement.endDate ? agreement.endDate.slice(0, 10) : '');
  const [showReceived, setShowReceived] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.fleet.rentalRequests() });

  const termsBody = () => ({
    ...(rentType === 'fixed'
      ? { rentType, rentAmountMinor: rentTaka ? takaToMinor(Number(rentTaka)) : 0 }
      : { rentType, revenueSharePct: sharePct ? Number(sharePct) : 0 }),
    // The rental auto-ends (and clears from the driver's active list) once this date passes.
    ...(endDate ? { endDate: new Date(endDate).toISOString() } : {}),
  });

  const approve = useMutation({
    mutationFn: () => endpoints.fleet.approveRental(agreement.id, termsBody()),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => endpoints.fleet.rejectRental(agreement.id),
    onSuccess: invalidate,
  });
  const updateTerms = useMutation({
    mutationFn: () => endpoints.fleet.updateTerms(agreement.id, termsBody()),
    onSuccess: invalidate,
  });

  const isPending = agreement.status === 'Requested';
  const isLive = agreement.status === 'Active' || agreement.status === 'Approved';
  const statusVariant = agreement.status === 'Active' ? 'success' : agreement.status === 'Rejected' ? 'danger' : isPending ? 'warning' : 'secondary';

  const termsEditor = (
    <Row className="g-2 align-items-center mt-1">
      <Col xs="auto">
        <Form.Select size="sm" value={rentType} onChange={(e) => setRentType(e.target.value as 'fixed' | 'revenue-share')} aria-label="Rent type">
          <option value="fixed">Fixed rent</option>
          <option value="revenue-share">Revenue share</option>
        </Form.Select>
      </Col>
      {rentType === 'fixed' ? (
        <Col xs="auto"><Form.Control size="sm" type="number" placeholder="Rent (৳)" value={rentTaka} onChange={(e) => setRentTaka(e.target.value)} style={{ width: 140 }} /></Col>
      ) : (
        <Col xs="auto"><Form.Control size="sm" type="number" placeholder="Owner %" value={sharePct} onChange={(e) => setSharePct(e.target.value)} style={{ width: 120 }} /></Col>
      )}
      <Col xs="auto">
        <Form.Control size="sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Rental end date" title="Rental end date (auto-ends the rental)" style={{ width: 160 }} />
      </Col>
    </Row>
  );

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div className="d-flex gap-2">
          <Avatar user={agreement.driver ? { fullName: agreement.driver.fullName, avatarUrl: agreement.driver.avatarUrl } : null} size={40} />
          <div>
            <div className="fw-medium">{agreement.driver?.fullName ?? `Driver ${agreement.driverId.slice(0, 8)}`}</div>
            <div className="text-muted small d-flex flex-wrap align-items-center gap-2">
              {agreement.driver?.phone && <span>{agreement.driver.phone}</span>}
              {agreement.driver?.rating != null && (
                <span className="text-warning" aria-label={`Rated ${agreement.driver.rating.toFixed(1)} out of 5`}>
                  ★ <span className="text-muted">{agreement.driver.rating.toFixed(1)}</span>
                </span>
              )}
            </div>
            <div className="d-flex align-items-center gap-2 mt-1">
              {agreement.vehicle?.photoUrl && (
                <img
                  src={agreement.vehicle.photoUrl}
                  alt={agreement.vehicle.plateNumber}
                  className="rounded border"
                  style={{ width: 48, height: 36, objectFit: 'cover' }}
                />
              )}
              <div className="text-muted small">
                <div>
                  {agreement.vehicle
                    ? `${agreement.vehicle.make ?? agreement.vehicle.type} ${agreement.vehicle.model ?? ''} · ${agreement.vehicle.plateNumber}`
                    : `Vehicle ${agreement.vehicleId.slice(0, 8)}`}
                </div>
                <div>
                  {agreement.vehicle?.rentalPriceMinor != null && (
                    <span className="me-2">Listed {formatBDT(agreement.vehicle.rentalPriceMinor)} {rentalPeriodSuffix(agreement.vehicle.rentalPeriod)}</span>
                  )}
                  {agreement.rentType
                    ? agreement.rentType === 'fixed'
                      ? `Agreed ${formatBDT(agreement.rentAmountMinor ?? 0)}/period`
                      : `Revenue share ${agreement.revenueSharePct}%`
                    : 'Terms not set'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Badge bg={statusVariant} text={isPending ? 'dark' : undefined}>{agreement.status}</Badge>
      </div>

      {(approve.isError || reject.isError || updateTerms.isError) && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {[approve.error, reject.error, updateTerms.error].map((e) => (e instanceof ApiError ? e.message : null)).find(Boolean) ?? 'Action failed.'}
        </Alert>
      )}

      {isPending && (
        <div className="mt-2">
          {termsEditor}
          <div className="d-flex gap-2 mt-2">
            <Button size="sm" variant="success" disabled={approve.isPending} onClick={() => approve.mutate()}>
              {approve.isPending ? 'Approving…' : 'Approve with terms'}
            </Button>
            <Button size="sm" variant="outline-danger" disabled={reject.isPending} onClick={() => reject.mutate()}>Reject</Button>
          </div>
        </div>
      )}

      {isLive && (
        <div className="mt-2">
          {termsEditor}
          <div className="d-flex gap-2 mt-2">
            <Button size="sm" variant="outline-success" disabled={updateTerms.isPending} onClick={() => updateTerms.mutate()}>
              {updateTerms.isPending ? 'Updating…' : 'Update terms'}
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setShowReceived((s) => !s)}>
              {showReceived ? 'Hide rent received' : 'Rent received'}
            </Button>
          </div>
          {showReceived && <RentReceived agreementId={agreement.id} />}
        </div>
      )}
    </div>
  );
}

function RentReceived({ agreementId }: { agreementId: string }) {
  const { endpoints } = useServices();
  const received = useQuery({
    queryKey: queryKeys.fleet.rentReceived(agreementId),
    queryFn: () => endpoints.fleet.rentReceived(agreementId),
  });

  return (
    <div className="bg-light rounded p-3 mt-2">
      {received.isLoading && <Spinner animation="border" size="sm" variant="success" />}
      {received.data && (
        <>
          <div className="small text-muted mb-2">
            Total received: <span className="fw-medium text-success">{formatBDT(received.data.totalReceivedMinor)}</span>
          </div>
          {received.data.payments.length === 0 && <div className="text-muted small">No payments yet.</div>}
          {received.data.payments.map((p) => (
            <div key={p.id} className="d-flex justify-content-between small border-bottom py-1">
              <span>{p.period ?? new Date(p.createdAt).toLocaleDateString()}</span>
              <span className="fw-medium">{formatBDT(p.amountMinor)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
