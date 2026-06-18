import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useDriverEarnings, useServices } from '@bd-cabs/core';
import { formatBDT, takaToMinor } from '@/lib/appNav';

/** Driver earnings summary + payout (withdraw to wallet → payout request). */
export default function EarningsPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const earnings = useDriverEarnings();
  const [amount, setAmount] = useState('');

  const withdraw = useMutation({
    mutationFn: () => endpoints.wallet.withdraw({ amountMinor: takaToMinor(Number(amount)) }),
    onSuccess: () => {
      setAmount('');
      void qc.invalidateQueries({ queryKey: queryKeys.drivers.earnings() });
      void qc.invalidateQueries({ queryKey: queryKeys.wallet.me() });
    },
  });

  const e = earnings.data;
  const stats = [
    { label: 'Today', value: e?.todayMinor },
    { label: 'This week', value: e?.weekMinor },
    { label: 'All time', value: e?.totalMinor },
  ];

  return (
    <Row className="g-4">
      <Col xs={12}>
        <h1 className="h4 mb-0">Earnings</h1>
      </Col>

      {earnings.isLoading && <Col xs={12}><Spinner animation="border" variant="success" /></Col>}

      {e && stats.map((s) => (
        <Col xs={12} md={4} key={s.label}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small text-uppercase">{s.label}</div>
              <div className="fs-3 fw-semibold">{formatBDT(s.value)}</div>
            </Card.Body>
          </Card>
        </Col>
      ))}

      {e && (
        <Col xs={12} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small text-uppercase">Completed trips</div>
              <div className="fs-3 fw-semibold">{e.completedTrips}</div>
            </Card.Body>
          </Card>
        </Col>
      )}

      {e && (
        <Col xs={12} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small text-uppercase">Wallet balance</div>
              <div className="fs-3 fw-semibold mb-2">{formatBDT(e.walletBalanceMinor)}</div>
              {withdraw.isSuccess && <Alert variant="success" className="py-2">Payout requested.</Alert>}
              {withdraw.isError && (
                <Alert variant="danger" className="py-2">
                  {withdraw.error instanceof ApiError ? withdraw.error.message : 'Withdrawal failed.'}
                </Alert>
              )}
              <div className="d-flex gap-2">
                <Form.Control type="number" min={1} placeholder="Amount (৳)" value={amount} onChange={(ev) => setAmount(ev.target.value)} />
                <Button variant="success" disabled={withdraw.isPending || Number(amount) <= 0} onClick={() => withdraw.mutate()}>
                  {withdraw.isPending ? 'Requesting…' : 'Withdraw'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>
  );
}
