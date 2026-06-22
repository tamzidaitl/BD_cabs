import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { queryKeys, useServices } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';

/**
 * Company billing and consolidated reporting. The billing card shows where
 * invoices go plus this month's spend and the monthly statement history; the
 * report card breaks completed-trip spend down by employee and vehicle type
 * over a chosen date range.
 */
export default function CorporateBillingPage() {
  const { endpoints } = useServices();

  const billing = useQuery({
    queryKey: queryKeys.corporate.billing(),
    queryFn: () => endpoints.corporate.billing(),
  });

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const reportParams = { from: from || undefined, to: to || undefined };
  const report = useQuery({
    queryKey: queryKeys.corporate.reports(reportParams),
    queryFn: () => endpoints.corporate.reports(reportParams),
  });

  const statements = billing.data?.statements ?? [];

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <h1 className="h5 mb-3">Billing</h1>
          {billing.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {billing.data && (
            <>
              <Row className="g-3 text-center mb-3">
                <Col xs={6} md={4}>
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Spend this month</div>
                    <div className="h5 mb-0">{formatBDT(billing.data.currentMonthMinor)}</div>
                  </div>
                </Col>
                <Col xs={6} md={4}>
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Trips this month</div>
                    <div className="h5 mb-0">{billing.data.currentMonthTrips}</div>
                  </div>
                </Col>
                <Col xs={12} md={4}>
                  <div className="border rounded p-3 h-100 text-md-start">
                    <div className="text-muted small">Invoices to</div>
                    <div className="small fw-medium">{billing.data.billingEmail ?? 'Not set'}</div>
                    {billing.data.billingAddress && (
                      <div className="text-muted small">{billing.data.billingAddress}</div>
                    )}
                  </div>
                </Col>
              </Row>

              <h2 className="h6 text-uppercase text-muted mb-2">Monthly statements</h2>
              {statements.length === 0 ? (
                <p className="text-muted mb-0">No completed trips billed yet.</p>
              ) : (
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
            </>
          )}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Consolidated report</h2>
            <div className="d-flex gap-2">
              <Form.Control size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              <Form.Control size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </div>
          </div>

          {report.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {report.data && (
            <>
              <Row className="g-3 text-center mb-4">
                <Col xs={6}>
                  <div className="bg-success-subtle rounded p-3">
                    <div className="text-muted small">Total trips</div>
                    <div className="h4 mb-0 text-success">{report.data.totalTrips}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="bg-success-subtle rounded p-3">
                    <div className="text-muted small">Total spend</div>
                    <div className="h4 mb-0 text-success">{formatBDT(report.data.totalSpendMinor)}</div>
                  </div>
                </Col>
              </Row>

              <Row className="g-4">
                <Col xs={12} md={6}>
                  <h3 className="h6 text-muted mb-2">By employee</h3>
                  {report.data.byEmployee.length === 0 ? (
                    <p className="text-muted small mb-0">No completed trips in range.</p>
                  ) : (
                    <Table responsive size="sm" className="mb-0 align-middle">
                      <thead>
                        <tr className="text-muted small">
                          <th>Employee</th>
                          <th className="text-end">Trips</th>
                          <th className="text-end">Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.data.byEmployee.map((e) => (
                          <tr key={e.employeeId}>
                            <td>{e.employeeName}</td>
                            <td className="text-end">{e.trips}</td>
                            <td className="text-end fw-medium">{formatBDT(e.spendMinor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <h3 className="h6 text-muted mb-2">By vehicle type</h3>
                  {report.data.byVehicleType.length === 0 ? (
                    <p className="text-muted small mb-0">No completed trips in range.</p>
                  ) : (
                    <Table responsive size="sm" className="mb-0 align-middle">
                      <thead>
                        <tr className="text-muted small">
                          <th>Vehicle</th>
                          <th className="text-end">Trips</th>
                          <th className="text-end">Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.data.byVehicleType.map((v) => (
                          <tr key={v.vehicleType}>
                            <td>{v.vehicleType}</td>
                            <td className="text-end">{v.trips}</td>
                            <td className="text-end fw-medium">{formatBDT(v.spendMinor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
