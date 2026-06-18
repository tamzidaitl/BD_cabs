import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { queryKeys, useServices, useWallet } from '@bd-cabs/core';
import { formatBDT, takaToMinor } from '@/lib/appNav';

/** Wallet balance + top-up, the transaction ledger, and saved payment methods. */
export default function WalletPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const wallet = useWallet();

  const txns = useQuery({
    queryKey: queryKeys.wallet.transactions(),
    queryFn: () => endpoints.wallet.transactions(),
  });
  const methods = useQuery({
    queryKey: queryKeys.payments.methods(),
    queryFn: () => endpoints.payments.listMethods(),
  });

  const [topup, setTopup] = useState('500');
  const [methodType, setMethodType] = useState('bKash');
  const [last4, setLast4] = useState('');

  const doTopup = useMutation({
    mutationFn: () => endpoints.wallet.topup({ amountMinor: takaToMinor(Number(topup)), method: 'Card' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.wallet.me() });
      void qc.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });
    },
  });

  const addMethod = useMutation({
    mutationFn: () => endpoints.payments.addMethod({ type: methodType, last4: last4 || undefined, label: methodType }),
    onSuccess: () => {
      setLast4('');
      void qc.invalidateQueries({ queryKey: queryKeys.payments.methods() });
    },
  });

  const removeMethod = useMutation({
    mutationFn: (mid: string) => endpoints.payments.removeMethod(mid),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.methods() }),
  });

  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted">Wallet balance</h2>
            <div className="display-6 fw-semibold mb-3">
              {wallet.isLoading ? <Spinner animation="border" variant="success" /> : formatBDT(wallet.data?.balanceMinor)}
            </div>
            <Form.Label className="small">Top up (৳)</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control type="number" min={1} value={topup} onChange={(e) => setTopup(e.target.value)} />
              <Button variant="success" disabled={doTopup.isPending || Number(topup) <= 0} onClick={() => doTopup.mutate()}>
                {doTopup.isPending ? 'Adding…' : 'Top up'}
              </Button>
            </div>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Payment methods</h2>
            {methods.data?.map((m) => (
              <div key={m.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <span>{m.label ?? m.type} {m.last4 && <span className="text-muted">•••• {m.last4}</span>} {m.isDefault && <Badge bg="success" className="ms-1">Default</Badge>}</span>
                <Button size="sm" variant="outline-danger" onClick={() => removeMethod.mutate(m.id)}>Remove</Button>
              </div>
            ))}
            {methods.data && methods.data.length === 0 && <p className="text-muted small">No saved methods yet.</p>}

            <div className="d-flex gap-2 mt-3">
              <Form.Select value={methodType} onChange={(e) => setMethodType(e.target.value)}>
                {['bKash', 'Nagad', 'Card'].map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
              <Form.Control placeholder="Last 4" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} style={{ maxWidth: 110 }} />
              <Button variant="outline-success" disabled={addMethod.isPending} onClick={() => addMethod.mutate()}>Add</Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Transactions</h2>
            {txns.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {txns.data && txns.data.length === 0 && <p className="text-muted mb-0">No transactions yet.</p>}
            {txns.data && txns.data.length > 0 && (
              <div className="list-group list-group-flush">
                {txns.data.map((t) => (
                  <div key={t.id} className="list-group-item d-flex justify-content-between px-0">
                    <div>
                      <div className="fw-medium">{t.type}</div>
                      <div className="text-muted small">{new Date(t.createdAt).toLocaleString()}{t.reference ? ` · ${t.reference}` : ''}</div>
                    </div>
                    <div className={`text-end ${t.amountMinor < 0 ? 'text-danger' : 'text-success'}`}>
                      {t.amountMinor < 0 ? '−' : '+'}{formatBDT(Math.abs(t.amountMinor))}
                      <div className="text-muted small">bal {formatBDT(t.balanceAfterMinor)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
