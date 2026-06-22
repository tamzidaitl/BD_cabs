import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { CorporateBookingStatus, queryKeys, useServices } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';

/**
 * Corporate client home: a snapshot of this month's spend and trips, the size
 * of the employee roster, how many bookings are awaiting approval, and the
 * recent monthly billing statements. Company KYC lives in Account settings.
 */
export default function CorporateOverviewPage() {
  const { endpoints } = useServices();

  const billing = useQuery({
    queryKey: queryKeys.corporate.billing(),
    queryFn: () => endpoints.corporate.billing(),
  });
  const employees = useQuery({
    queryKey: queryKeys.corporate.employees(),
    queryFn: () => endpoints.corporate.employees(),
  });
  const pendingParams = { status: CorporateBookingStatus.PendingApproval };
  const pending = useQuery({
    queryKey: queryKeys.corporate.bookings(pendingParams),
    queryFn: () => endpoints.corporate.bookings(pendingParams),
  });

  const statements = billing.data?.statements ?? [];

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <h2 className="h6 text-uppercase text-muted mb-3">This month</h2>
          {billing.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {billing.data && (
            <Row className="g-3 text-center">
              <Stat label="Spend this month" value={formatBDT(billing.data.currentMonthMinor)} />
              <Stat label="Trips this month" value={String(billing.data.currentMonthTrips)} />
              <Stat label="Employees" value={String(employees.data?.length ?? '—')} />
              <Stat label="Awaiting approval" value={String(pending.data?.length ?? '—')} />
            </Row>
          )}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h2 className="h6 text-uppercase text-muted mb-3">Monthly statements</h2>
          {billing.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {billing.data && statements.length === 0 && (
            <p className="text-muted mb-0">No completed trips billed yet.</p>
          )}
          {statements.length > 0 && (
            <Table responsive size="sm" className="mb-0 align-middle">
              <thead>
                <tr className="text-muted small">
                  <th>Period</th>
                  <th className="text-end">Trips</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => (
                  <tr key={s.period}>
                    <td>{s.period}</td>
                    <td className="text-end">{s.trips}</td>
                    <td className="text-end fw-medium">{formatBDT(s.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={6} md={3}>
      <div className="border rounded p-3 h-100">
        <div className="text-muted small">{label}</div>
        <div className="h5 mb-0">{value}</div>
      </div>
    </Col>
  );
}
