'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
  CouponStatus,
  CouponType,
  Permission,
  formatMoney,
  money,
  useAdminCoupons,
  useCreateCoupon,
  useSetCouponStatus,
  type Coupon,
} from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

/**
 * Coupon management (Super Admin) — guarded by COUPONS_MANAGE. Demonstrates the
 * full create + list + status-toggle flow against the shared coupon model and
 * mutation hooks. `value`, `minFare`, `maxDiscount` are minor units (paisa).
 */
function CouponsInner() {
  const { data: coupons, isLoading, isError } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const setStatus = useSetCouponStatus();

  const [form, setForm] = useState<Partial<Coupon>>({
    code: '',
    type: CouponType.Percentage,
    value: 20,
    costBorneBy: 'platform',
    status: CouponStatus.Active,
  });

  function update<K extends keyof Coupon>(key: K, val: Coupon[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createCoupon.mutateAsync(form);
    setForm({
      code: '',
      type: CouponType.Percentage,
      value: 20,
      costBorneBy: 'platform',
      status: CouponStatus.Active,
    });
  }

  return (
    <>
      <h1 className="h4 mb-3">Coupons</h1>

      <Row className="g-3">
        <Col xs={12} lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="h6">Create coupon</Card.Title>
              <Form onSubmit={handleCreate}>
                <Form.Group className="mb-2" controlId="code">
                  <Form.Label>Code</Form.Label>
                  <Form.Control
                    required
                    value={form.code ?? ''}
                    onChange={(e) => update('code', e.target.value.toUpperCase())}
                    placeholder="WELCOME20"
                  />
                </Form.Group>

                <Row className="g-2">
                  <Col xs={7}>
                    <Form.Group className="mb-2" controlId="type">
                      <Form.Label>Type</Form.Label>
                      <Form.Select
                        value={form.type}
                        onChange={(e) => update('type', e.target.value as Coupon['type'])}
                      >
                        <option value={CouponType.Percentage}>Percentage</option>
                        <option value={CouponType.Flat}>Flat</option>
                        <option value={CouponType.FreeRide}>Free ride</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={5}>
                    <Form.Group className="mb-2" controlId="value">
                      <Form.Label>{form.type === CouponType.Percentage ? '%' : 'Paisa'}</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={form.value ?? 0}
                        onChange={(e) => update('value', Number(e.target.value))}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-2" controlId="costBorneBy">
                  <Form.Label>Cost borne by</Form.Label>
                  <Form.Select
                    value={form.costBorneBy}
                    onChange={(e) => update('costBorneBy', e.target.value as Coupon['costBorneBy'])}
                  >
                    <option value="platform">Platform</option>
                    <option value="owner">Owner</option>
                  </Form.Select>
                </Form.Group>

                {createCoupon.isError && (
                  <Alert variant="danger" className="py-2">
                    Failed to create coupon.
                  </Alert>
                )}

                <Button type="submit" variant="success" className="w-100" disabled={createCoupon.isPending}>
                  {createCoupon.isPending ? 'Creating…' : 'Create coupon'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="h6">All coupons</Card.Title>
              {isLoading && <Spinner animation="border" variant="success" size="sm" />}
              {isError && <div className="text-danger">Failed to load coupons.</div>}
              {coupons && (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c) => (
                        <tr key={c.id}>
                          <td className="fw-medium">{c.code}</td>
                          <td>{c.type}</td>
                          <td>
                            {c.type === CouponType.Percentage
                              ? `${c.value}%`
                              : formatMoney(money(c.value))}
                          </td>
                          <td>
                            <Badge bg={c.status === CouponStatus.Active ? 'success' : 'secondary'}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant={c.status === CouponStatus.Active ? 'outline-secondary' : 'outline-success'}
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({
                                  id: c.id,
                                  status:
                                    c.status === CouponStatus.Active
                                      ? CouponStatus.Paused
                                      : CouponStatus.Active,
                                })
                              }
                            >
                              {c.status === CouponStatus.Active ? 'Pause' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            No coupons yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default function CouponsPage() {
  return (
    <ProtectedRoute permission={Permission.COUPONS_MANAGE}>
      <CouponsInner />
    </ProtectedRoute>
  );
}
