import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { queryKeys, useServices } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';

/**
 * Fleet owner home: a revenue report over a date range and settlement
 * statements. (Capabilities: view revenue reports, settlements.) Owner
 * verification (KYC) lives in Account settings.
 */
export default function FleetOverviewPage() {
  const { endpoints } = useServices();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const revenueParams = { from: from || undefined, to: to || undefined };
  const revenue = useQuery({
    queryKey: queryKeys.fleet.revenue(revenueParams),
    queryFn: () => endpoints.fleet.revenue(revenueParams),
  });
  const settlements = useQuery({
    queryKey: queryKeys.fleet.settlements(),
    queryFn: () => endpoints.fleet.settlements(),
  });

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Revenue report</h2>
            <div className="d-flex gap-2">
              <Form.Control size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              <Form.Control size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </div>
          </div>
          {revenue.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {revenue.data && (
            <Row className="g-3 text-center">
              <Stat label="Completed trips" value={String(revenue.data.completedTrips)} />
              <Stat label="Gross fares" value={formatBDT(revenue.data.grossFareMinor)} />
              <Stat label="Owner cut" value={formatBDT(revenue.data.ownerCutMinor)} />
              <Stat label="Rent collected" value={formatBDT(revenue.data.rentCollectedMinor)} />
              <Col xs={12}>
                <div className="bg-success-subtle rounded p-3">
                  <div className="text-muted small">Total revenue</div>
                  <div className="h4 mb-0 text-success">{formatBDT(revenue.data.totalRevenueMinor)}</div>
                </div>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h2 className="h6 text-uppercase text-muted mb-3">Settlement statements</h2>
          {settlements.isLoading && <Spinner animation="border" size="sm" variant="success" />}
          {settlements.data && settlements.data.length === 0 && <p className="text-muted mb-0">No settlements yet.</p>}
          {settlements.data && settlements.data.length > 0 && (
            <Table responsive size="sm" className="mb-0 align-middle">
              <thead>
                <tr className="text-muted small">
                  <th>Period</th>
                  <th className="text-end">Rent collected</th>
                  <th className="text-end">Owner cut</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {settlements.data.map((s) => (
                  <tr key={s.period}>
                    <td>{s.period}</td>
                    <td className="text-end">{formatBDT(s.rentCollectedMinor)}</td>
                    <td className="text-end">{formatBDT(s.ownerCutMinor)}</td>
                    <td className="text-end fw-medium">{formatBDT(s.totalMinor)}</td>
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
    <Col xs={6}>
      <div className="border rounded p-3 h-100">
        <div className="text-muted small">{label}</div>
        <div className="h5 mb-0">{value}</div>
      </div>
    </Col>
  );
}
