import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  ApiError,
  CorporateRentalStatus,
  queryKeys,
  useServices,
  type CorporateRentalContract,
  type FleetDriver,
} from '@bd-cabs/core';
import { formatBDT, formatDateTime, RENTAL_PERIODS, rentalPeriodSuffix, takaToMinor } from '@/lib/appNav';

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function statusVariant(status: string): string {
  switch (status) {
    case CorporateRentalStatus.Active:
    case CorporateRentalStatus.Completed:
      return 'success';
    case CorporateRentalStatus.Approved:
      return 'info';
    case CorporateRentalStatus.Requested:
      return 'warning';
    default:
      return 'secondary';
  }
}

/**
 * Vehicle Owner's view of Corporate ↔ Vehicle Owner rentals. The owner reviews
 * incoming requests from corporate clients, approves them with a rate, assigns
 * one or more roster drivers to operate the vehicle during the service period,
 * starts/completes the contract, and — once complete — rates the corporate
 * client (on payment compliance, communication, and cooperation).
 */
export default function FleetCorporateRentalsPage() {
  const { endpoints } = useServices();
  const contracts = useQuery({
    queryKey: queryKeys.fleet.corporateRentals(),
    queryFn: () => endpoints.fleet.corporateRentals(),
  });
  const drivers = useQuery({
    queryKey: queryKeys.fleet.drivers(),
    queryFn: () => endpoints.fleet.drivers(),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Corporate rentals</h1>
        {contracts.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {contracts.data && contracts.data.length === 0 && (
          <p className="text-muted mb-0">No corporate rental requests yet.</p>
        )}
        {contracts.data?.map((c) => (
          <ContractRow key={c.id} contract={c} roster={drivers.data ?? []} />
        ))}
      </Card.Body>
    </Card>
  );
}

function ContractRow({ contract, roster }: { contract: CorporateRentalContract; roster: FleetDriver[] }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const v = contract.vehicle;

  const [rateTaka, setRateTaka] = useState('');
  const [period, setPeriod] = useState<string>(contract.period || 'monthly');
  const [reason, setReason] = useState('');
  const [driverId, setDriverId] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.fleet.corporateRentals() });

  const approve = useMutation({
    mutationFn: () =>
      endpoints.fleet.approveCorporateRental(contract.id, {
        rateMinor: rateTaka ? takaToMinor(Number(rateTaka)) : 0,
        period,
      }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => endpoints.fleet.rejectCorporateRental(contract.id, { reason: reason.trim() || undefined }),
    onSuccess: invalidate,
  });
  const activate = useMutation({
    mutationFn: () => endpoints.fleet.activateCorporateRental(contract.id),
    onSuccess: invalidate,
  });
  const complete = useMutation({
    mutationFn: () => endpoints.fleet.completeCorporateRental(contract.id),
    onSuccess: invalidate,
  });
  const assign = useMutation({
    mutationFn: () => endpoints.fleet.assignRentalDriver(contract.id, { driverId }),
    onSuccess: () => { setDriverId(''); invalidate(); },
  });
  const unassign = useMutation({
    mutationFn: (id: string) => endpoints.fleet.unassignRentalDriver(contract.id, id),
    onSuccess: invalidate,
  });

  const isRequested = contract.status === CorporateRentalStatus.Requested;
  const isApproved = contract.status === CorporateRentalStatus.Approved;
  const isActive = contract.status === CorporateRentalStatus.Active;
  const isCompleted = contract.status === CorporateRentalStatus.Completed;
  const canStaff = isApproved || isActive;

  // Roster drivers not already assigned to this contract.
  const assignedIds = new Set(contract.drivers.map((d) => d.driverId));
  const assignable = roster.filter((d) => !assignedIds.has(d.driverId));

  const anyError = [approve.error, reject.error, activate.error, complete.error, assign.error, unassign.error]
    .map((e) => (e instanceof ApiError ? e.message : null)).find(Boolean);

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">{contract.corporateCompanyName ?? `Company ${contract.corporateId.slice(0, 8)}`}</div>
          <div className="text-muted small">
            {v ? `${v.make ?? v.type} ${v.model ?? ''} · ${v.plateNumber}` : `Vehicle ${contract.vehicleId.slice(0, 8)}`}
          </div>
          <div className="text-muted small">
            {contract.rateMinor != null
              ? <>{formatBDT(contract.rateMinor)} <span className="text-muted">{rentalPeriodSuffix(contract.period)}</span></>
              : `Rate pending · ${contract.period}`}
            {contract.startDate && <> · from {formatDateTime(contract.startDate)}</>}
          </div>
          {contract.servicePurpose && <div className="text-muted small">For: {contract.servicePurpose}</div>}
          {contract.notes && <div className="text-muted small">Note: {contract.notes}</div>}
        </div>
        <Badge bg={statusVariant(contract.status)} text={isRequested ? 'dark' : undefined}>{contract.status}</Badge>
      </div>

      {/* Assigned drivers */}
      {contract.drivers.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {contract.drivers.map((d) => (
            <Badge key={d.id} bg="light" text="dark" className="border d-flex align-items-center gap-1">
              {d.driver?.fullName ?? d.driverId.slice(0, 8)}
              {canStaff && (
                <button
                  type="button"
                  className="btn-close btn-close-sm ms-1"
                  style={{ fontSize: '0.55rem' }}
                  aria-label={`Unassign ${d.driver?.fullName ?? 'driver'}`}
                  disabled={unassign.isPending}
                  onClick={() => unassign.mutate(d.driverId)}
                />
              )}
            </Badge>
          ))}
        </div>
      )}

      {anyError && <Alert variant="danger" className="py-1 px-2 my-2 small">{anyError}</Alert>}

      {isRequested && (
        <div className="mt-2">
          <Row className="g-2 align-items-end">
            <Col xs="auto">
              <Form.Label className="small text-muted mb-1">Rate (৳)</Form.Label>
              <Form.Control size="sm" type="number" placeholder="Rate" value={rateTaka} onChange={(e) => setRateTaka(e.target.value)} style={{ width: 120 }} />
            </Col>
            <Col xs="auto">
              <Form.Label className="small text-muted mb-1">Per</Form.Label>
              <Form.Select size="sm" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 120 }}>
                {RENTAL_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </Col>
            <Col xs="auto">
              <Button size="sm" variant="success" disabled={!rateTaka || approve.isPending} onClick={() => approve.mutate()}>
                {approve.isPending ? 'Approving…' : 'Approve'}
              </Button>
            </Col>
          </Row>
          <Row className="g-2 align-items-end mt-1">
            <Col xs="auto">
              <Form.Control size="sm" placeholder="Reject reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: 240 }} />
            </Col>
            <Col xs="auto">
              <Button size="sm" variant="outline-danger" disabled={reject.isPending} onClick={() => reject.mutate()}>Reject</Button>
            </Col>
          </Row>
        </div>
      )}

      {canStaff && (
        <div className="mt-2">
          <Row className="g-2 align-items-end">
            <Col xs="auto">
              <Form.Label className="small text-muted mb-1">Assign driver</Form.Label>
              <Form.Select size="sm" value={driverId} onChange={(e) => setDriverId(e.target.value)} style={{ width: 220 }}>
                <option value="">Select a roster driver…</option>
                {assignable.map((d) => (
                  <option key={d.driverId} value={d.driverId}>{d.driver?.fullName ?? d.driverId.slice(0, 8)}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs="auto">
              <Button size="sm" variant="outline-success" disabled={!driverId || assign.isPending} onClick={() => assign.mutate()}>
                {assign.isPending ? 'Assigning…' : 'Assign'}
              </Button>
            </Col>
            <Col xs="auto" className="ms-auto">
              {isApproved && (
                <Button size="sm" variant="success" disabled={activate.isPending} onClick={() => activate.mutate()}>
                  {activate.isPending ? 'Starting…' : 'Start service'}
                </Button>
              )}
              {isActive && (
                <Button size="sm" variant="success" disabled={complete.isPending} onClick={() => complete.mutate()}>
                  {complete.isPending ? 'Completing…' : 'Complete'}
                </Button>
              )}
            </Col>
          </Row>
          {assignable.length === 0 && (
            <div className="text-muted small mt-1">Add drivers to your fleet roster to assign them here.</div>
          )}
        </div>
      )}

      {isCompleted && <ReviewCorporate corporateId={contract.corporateId} />}
    </div>
  );
}

function ReviewCorporate({ corporateId }: { corporateId: string }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () => endpoints.fleet.reviewCorporate({ corporateId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.fleet.corporateRentals() });
    },
  });

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline-success" onClick={() => setOpen((o) => !o)}>
        {open ? 'Close' : 'Rate client'}
      </Button>
      {open && (
        <div className="mt-2">
          {submit.isError && (
            <Alert variant="danger" className="py-1 px-2 mb-2 small">{errMsg(submit.error, 'Could not save review.')}</Alert>
          )}
          <div className="text-muted small mb-2">Rate payment compliance, communication, and overall cooperation.</div>
          <div className="d-flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button key={n} size="sm" variant={n <= rating ? 'warning' : 'outline-secondary'} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}>★</Button>
            ))}
          </div>
          <Form.Control as="textarea" rows={2} className="mb-2" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" variant="success" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Saving…' : 'Submit review'}
          </Button>
        </div>
      )}
    </div>
  );
}
