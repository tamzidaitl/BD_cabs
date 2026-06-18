'use client';

import { Card, Col, Row } from 'react-bootstrap';
import { Permission, useAuthStore } from '@bd-cabs/core';
import { Can } from '@/components/rbac/Can';

/**
 * Dashboard landing. Cards are gated with <Can> so each staff role sees only
 * the KPIs relevant to them — Support sees ops, Finance sees money, Super sees
 * everything.
 */
export default function DashboardPage() {
  const role = useAuthStore((s) => s.session?.role);

  return (
    <>
      <h1 className="h4 mb-1">Welcome back</h1>
      <p className="text-muted mb-4">
        Signed in as <span className="badge text-bg-success">{role}</span>
      </p>

      <Row className="g-3">
        <Can permission={Permission.OPS_DASHBOARD}>
          <Col xs={12} md={6} xl={3}>
            <KpiCard title="Active rides" hint="Live operations" value="—" />
          </Col>
        </Can>
        <Can permission={Permission.DRIVER_VERIFICATION_REVIEW}>
          <Col xs={12} md={6} xl={3}>
            <KpiCard title="Pending verifications" hint="Awaiting review" value="—" />
          </Col>
        </Can>
        <Can permission={Permission.FINANCE_PAYOUTS_RUN}>
          <Col xs={12} md={6} xl={3}>
            <KpiCard title="Payouts due" hint="This cycle" value="—" />
          </Col>
        </Can>
        <Can permission={Permission.ANALYTICS_VIEW}>
          <Col xs={12} md={6} xl={3}>
            <KpiCard title="GMV (today)" hint="Platform-wide" value="—" />
          </Col>
        </Can>
      </Row>
    </>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body>
        <div className="text-muted small">{title}</div>
        <div className="fs-3 fw-semibold">{value}</div>
        <div className="text-muted small">{hint}</div>
      </Card.Body>
    </Card>
  );
}
