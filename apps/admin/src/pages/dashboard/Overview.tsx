import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import { Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import * as Icons from 'lucide-react';
import {
  ADMIN_NAV,
  Permission,
  can,
  useAuthStore,
  useOpsDashboard,
  useSystemHealth,
  type NavItem,
} from '@bd-cabs/core';
import { useCan } from '@/components/rbac/useCan';

type IconCmp = ComponentType<{ size?: number; className?: string }>;
const icon = (name: string): IconCmp =>
  (Icons[name as keyof typeof Icons] ?? Icons.Circle) as IconCmp;

/** Live KPI cards sourced from /ops/dashboard, keyed to its response. */
const STATS: { key: string; label: string; icon: string }[] = [
  { key: 'totalUsers', label: 'Total users', icon: 'Users' },
  { key: 'onlineDrivers', label: 'Drivers online', icon: 'Car' },
  { key: 'pendingDriverVerifications', label: 'Pending verifications', icon: 'BadgeCheck' },
  { key: 'pendingAccounts', label: 'Pending accounts', icon: 'UserCog' },
  { key: 'activeCoupons', label: 'Active coupons', icon: 'Ticket' },
  { key: 'ridesToday', label: 'Rides today', icon: 'Route' },
];

const GROUP_ORDER: NavItem['group'][] = ['Operations', 'Finance', 'Configuration'];

/**
 * Platform overview — the admin home page. Three bands:
 *   1. system status (live API health),
 *   2. live KPIs (only for roles with OPS_DASHBOARD),
 *   3. quick-access tiles for every area the current role can reach.
 * All RBAC-filtered, so each role sees an overview scoped to what it can do.
 */
export default function OverviewPage() {
  const role = useAuthStore((s) => s.session?.role ?? null);
  const canOps = useCan(Permission.OPS_DASHBOARD);

  const ops = useOpsDashboard(canOps);
  const health = useSystemHealth();

  // Quick-access tiles: every nav item the role is permitted to see, minus the
  // dashboard self-link, grouped by section.
  const tiles = ADMIN_NAV.filter(
    (item) => item.href !== '/dashboard' && (!item.permission || can(role, item.permission)),
  );

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '—';

  return (
    <>
      {/* Hero */}
      <div
        className="rounded-3 p-4 mb-4 text-white"
        style={{ background: 'linear-gradient(135deg, #0b8457 0%, #0f1f1a 100%)' }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h1 className="h3 mb-1">Platform Overview</h1>
            <p className="mb-0 opacity-75">
              BD Cabs admin console — operations, finance &amp; configuration at a glance.
            </p>
          </div>
          <Badge bg="light" text="dark" className="fs-6">
            {role}
          </Badge>
        </div>
      </div>

      {/* System status */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={6} xl={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <StatusDot
                state={health.isLoading ? 'pending' : health.data?.status === 'ok' ? 'ok' : 'down'}
              />
              <div>
                <div className="fw-medium">API</div>
                <div className="text-muted small">
                  {health.isLoading
                    ? 'Checking…'
                    : health.data?.status === 'ok'
                      ? 'Operational'
                      : 'Unreachable'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} xl={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <div className="text-muted small">Connected API</div>
              <code className="text-break">{apiBase}</code>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Live KPIs (ops-permitted roles only) */}
      {canOps && (
        <>
          <h2 className="h5 mb-3">Today at a glance</h2>
          <Row className="g-3 mb-4">
            {ops.isLoading &&
              STATS.map((s) => (
                <Col key={s.key} xs={6} md={4} xl={2}>
                  <Card className="shadow-sm border-0 h-100">
                    <Card.Body className="text-center py-4">
                      <Spinner animation="border" size="sm" variant="success" />
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            {ops.data &&
              STATS.map((s) => {
                const Icon = icon(s.icon);
                return (
                  <Col key={s.key} xs={6} md={4} xl={2}>
                    <Card className="shadow-sm border-0 h-100">
                      <Card.Body>
                        <Icon size={20} className="text-success mb-2" />
                        <div className="fs-4 fw-semibold">{ops.data?.[s.key] ?? 0}</div>
                        <div className="text-muted small">{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            {ops.isError && (
              <Col xs={12}>
                <Card className="border-0 bg-light">
                  <Card.Body className="text-muted">KPIs are unavailable right now.</Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* Quick access */}
      <h2 className="h5 mb-3">Explore</h2>
      {GROUP_ORDER.map((group) => {
        const items = tiles.filter((t) => t.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-4">
            <div className="text-uppercase text-muted small fw-semibold mb-2">{group}</div>
            <Row className="g-3">
              {items.map((item) => {
                const Icon = icon(item.icon);
                return (
                  <Col key={item.href} xs={12} sm={6} lg={4} xl={3}>
                    <Card
                      as={Link}
                      to={item.href}
                      className="shadow-sm border-0 h-100 text-decoration-none text-reset"
                    >
                      <Card.Body className="d-flex align-items-center gap-3">
                        <span className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success" style={{ width: 44, height: 44 }}>
                          <Icon size={22} />
                        </span>
                        <div>
                          <div className="fw-medium">{item.label}</div>
                          <div className="text-muted small">Open {item.label.toLowerCase()}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        );
      })}
    </>
  );
}

function StatusDot({ state }: { state: 'ok' | 'down' | 'pending' }) {
  const color = state === 'ok' ? '#0b8457' : state === 'down' ? '#dc3545' : '#ffc107';
  return (
    <span
      aria-hidden
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 0 4px ${color}22`,
        flexShrink: 0,
      }}
    />
  );
}
