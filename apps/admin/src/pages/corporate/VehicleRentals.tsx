import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  ApiError,
  CorporateRentalStatus,
  queryKeys,
  useServices,
  type CorporateRentalContract,
  type CorporateRentalVehicle,
} from '@bd-cabs/core';
import {
  formatBDT,
  formatDateTime,
  RENTAL_PERIODS,
  rentalPeriodSuffix,
  RENTAL_STANDARD_TERMS,
} from '@/lib/appNav';

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Bootstrap badge colour for a contract status. */
function statusVariant(status: string): string {
  switch (status) {
    case CorporateRentalStatus.Active:
    case CorporateRentalStatus.Completed:
      return 'success';
    case CorporateRentalStatus.Approved:
      return 'info';
    case CorporateRentalStatus.Requested:
      return 'warning';
    case CorporateRentalStatus.Rejected:
    case CorporateRentalStatus.Cancelled:
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Corporate ↔ Vehicle Owner rentals. The company browses owner vehicles offered
 * for rent, requests one for a service period, tracks its contracts (with the
 * drivers the owner assigned), cancels open ones, and — once a contract has
 * completed — rates the vehicle owner.
 */
export default function CorporateVehicleRentalsPage() {
  return (
    <Row className="g-4">
      <Col xs={12} lg={5}><AvailableVehiclesCard /></Col>
      <Col xs={12} lg={7}><ContractsCard /></Col>
    </Row>
  );
}

function AvailableVehiclesCard() {
  const { endpoints } = useServices();
  const vehicles = useQuery({
    queryKey: queryKeys.corporate.rentalVehicles(),
    queryFn: () => endpoints.corporate.rentalVehicles(),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Vehicles for rent</h1>
        {vehicles.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {vehicles.data && vehicles.data.length === 0 && (
          <p className="text-muted mb-0">No vehicles are available to rent right now.</p>
        )}
        {vehicles.data?.map((v) => <VehicleRow key={v.vehicle.id} item={v} />)}
      </Card.Body>
    </Card>
  );
}

function VehicleRow({ item }: { item: CorporateRentalVehicle }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const { vehicle } = item;
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<string>(vehicle.rentalPeriod ?? 'monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const request = useMutation({
    mutationFn: () =>
      endpoints.corporate.requestRental({
        vehicleId: vehicle.id,
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        servicePurpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.rentalContracts() });
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.rentalVehicles() });
    },
  });

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">
            {vehicle.make ?? vehicle.type} {vehicle.model ?? ''} · {vehicle.plateNumber}
          </div>
          <div className="text-muted small">
            {item.ownerCompanyName ?? `Owner ${item.ownerId.slice(0, 8)}`}
            {item.ownerRating != null && <> · <span className="text-warning">★ {item.ownerRating.toFixed(1)}</span></>}
          </div>
          <div className="text-muted small">
            {vehicle.rentalPriceMinor != null
              ? <>{formatBDT(vehicle.rentalPriceMinor)} <span className="text-muted">{rentalPeriodSuffix(vehicle.rentalPeriod)}</span></>
              : 'Rate on request'}
          </div>
        </div>
        <Button size="sm" variant="outline-success" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Request'}
        </Button>
      </div>

      {request.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">{errMsg(request.error, 'Could not request this vehicle.')}</Alert>
      )}

      {open && (
        <div className="mt-2">
          <Row className="g-2">
            <Col xs={6}>
              <Form.Label className="small text-muted mb-1">Billing period</Form.Label>
              <Form.Select size="sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {RENTAL_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6}>
              <Form.Label className="small text-muted mb-1">Start date</Form.Label>
              <Form.Control size="sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Col>
            <Col xs={6}>
              <Form.Label className="small text-muted mb-1">End date</Form.Label>
              <Form.Control size="sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Col>
            <Col xs={6}>
              <Form.Label className="small text-muted mb-1">Service purpose</Form.Label>
              <Form.Control size="sm" placeholder="e.g. employee shuttle" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </Col>
            <Col xs={12}>
              <Form.Control size="sm" as="textarea" rows={2} placeholder="Notes for the owner (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Col>
          </Row>
          <p className="text-muted small mt-2 mb-2">{RENTAL_STANDARD_TERMS}</p>
          <Button size="sm" variant="success" disabled={request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? 'Requesting…' : 'Send request'}
          </Button>
        </div>
      )}
    </div>
  );
}

function ContractsCard() {
  const { endpoints } = useServices();
  const contracts = useQuery({
    queryKey: queryKeys.corporate.rentalContracts(),
    queryFn: () => endpoints.corporate.rentalContracts(),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 text-uppercase text-muted mb-3">My rental contracts</h2>
        {contracts.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {contracts.data && contracts.data.length === 0 && (
          <p className="text-muted mb-0">You have no rental contracts yet.</p>
        )}
        {contracts.data?.map((c) => <ContractRow key={c.id} contract={c} />)}
      </Card.Body>
    </Card>
  );
}

function ContractRow({ contract }: { contract: CorporateRentalContract }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const v = contract.vehicle;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.corporate.rentalContracts() });
    void qc.invalidateQueries({ queryKey: queryKeys.corporate.rentalVehicles() });
  };

  const cancel = useMutation({
    mutationFn: () => endpoints.corporate.cancelRental(contract.id),
    onSuccess: invalidate,
  });

  const cancellable =
    contract.status === CorporateRentalStatus.Requested ||
    contract.status === CorporateRentalStatus.Approved ||
    contract.status === CorporateRentalStatus.Active;

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">
            {v ? `${v.make ?? v.type} ${v.model ?? ''} · ${v.plateNumber}` : `Vehicle ${contract.vehicleId.slice(0, 8)}`}
          </div>
          <div className="text-muted small">{contract.ownerCompanyName ?? `Owner ${contract.ownerId.slice(0, 8)}`}</div>
          <div className="text-muted small">
            {contract.rateMinor != null
              ? <>{formatBDT(contract.rateMinor)} <span className="text-muted">{rentalPeriodSuffix(contract.period)}</span></>
              : `Rate pending · ${contract.period}`}
            {contract.startDate && <> · from {formatDateTime(contract.startDate)}</>}
          </div>
          {contract.servicePurpose && <div className="text-muted small">For: {contract.servicePurpose}</div>}
        </div>
        <Badge bg={statusVariant(contract.status)} text={contract.status === CorporateRentalStatus.Requested ? 'dark' : undefined}>
          {contract.status}
        </Badge>
      </div>

      {contract.drivers.length > 0 && (
        <div className="text-muted small mt-1">
          Drivers: {contract.drivers.map((d) => d.driver?.fullName ?? d.driverId.slice(0, 8)).join(', ')}
        </div>
      )}
      {contract.rejectionReason && contract.status === CorporateRentalStatus.Rejected && (
        <div className="text-danger small mt-1">Rejected: {contract.rejectionReason}</div>
      )}

      {cancel.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">{errMsg(cancel.error, 'Could not cancel.')}</Alert>
      )}

      <div className="d-flex gap-2 mt-2">
        {cancellable && (
          <Button size="sm" variant="outline-danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel'}
          </Button>
        )}
        {contract.canReview && <ReviewOwner ownerId={contract.ownerId} />}
      </div>
    </div>
  );
}

function ReviewOwner({ ownerId }: { ownerId: string }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () => endpoints.corporate.createReview({ ownerId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.reviews() });
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.fleets() });
    },
  });

  return (
    <>
      <Button size="sm" variant="outline-success" onClick={() => setOpen((o) => !o)}>
        {open ? 'Close' : 'Rate owner'}
      </Button>
      {open && (
        <div className="w-100 mt-2">
          {submit.isError && (
            <Alert variant="danger" className="py-1 px-2 mb-2 small">{errMsg(submit.error, 'Could not save review.')}</Alert>
          )}
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
    </>
  );
}
