import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { queryKeys, useServices, type RentalAgreement } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';

/**
 * Rental-driver tools: browse owner-offered vehicles, request one, and pay rent
 * on an approved/active agreement. (Only relevant to rental drivers.)
 */
export default function RentalsPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const available = useQuery({
    queryKey: queryKeys.rentals.available(),
    queryFn: () => endpoints.rentals.availableVehicles(),
  });
  const mine = useQuery({
    queryKey: queryKeys.rentals.mine(),
    queryFn: () => endpoints.rentals.mine(),
  });

  const request = useMutation({
    mutationFn: (vehicleId: string) => endpoints.rentals.request({ vehicleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rentals.mine() }),
  });

  return (
    <Row className="g-4">
      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-3">Vehicles for rent</h1>
            {available.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {available.data && available.data.length === 0 && <p className="text-muted mb-0">No vehicles are offered for rent right now.</p>}
            {available.data?.map((v) => (
              <div key={v.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <div className="fw-medium">{v.make ?? v.type} {v.model ?? ''} · {v.plateNumber}</div>
                  <div className="text-muted small">{v.rentalPriceMinor ? `${formatBDT(v.rentalPriceMinor)} / period` : 'Terms on approval'}</div>
                </div>
                <Button size="sm" variant="outline-success" disabled={request.isPending} onClick={() => request.mutate(v.id)}>Request</Button>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My rental agreements</h2>
            {mine.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {mine.data && mine.data.length === 0 && <p className="text-muted mb-0">You have no rental agreements.</p>}
            {mine.data?.map((a) => <AgreementCard key={a.id} agreement={a} />)}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

function AgreementCard({ agreement }: { agreement: RentalAgreement }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const payable = agreement.status === 'Active' || agreement.status === 'Approved';

  const due = useQuery({
    queryKey: queryKeys.rentals.rentDue(agreement.id),
    queryFn: () => endpoints.rentals.rentDue(agreement.id),
    enabled: payable,
  });

  const pay = useMutation({
    mutationFn: (amountMinor: number) => endpoints.rentals.payRent(agreement.id, { amountMinor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rentals.rentDue(agreement.id) }),
  });

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between">
        <span className="fw-medium">Agreement {agreement.id.slice(0, 8)}</span>
        <Badge bg={agreement.status === 'Active' ? 'success' : agreement.status === 'Rejected' ? 'danger' : 'secondary'}>{agreement.status}</Badge>
      </div>
      {payable && due.data && (
        <div className="mt-2">
          <div className="small text-muted">Rent due ({due.data.period}): <span className="fw-medium text-body">{formatBDT(due.data.amountDueMinor)}</span></div>
          {pay.isSuccess && <Alert variant="success" className="py-1 px-2 my-2 small">Rent paid.</Alert>}
          <Button
            size="sm"
            variant="success"
            className="mt-2"
            disabled={pay.isPending || due.data.amountDueMinor <= 0}
            onClick={() => pay.mutate(due.data!.amountDueMinor)}
          >
            {pay.isPending ? 'Paying…' : `Pay ${formatBDT(due.data.amountDueMinor)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
