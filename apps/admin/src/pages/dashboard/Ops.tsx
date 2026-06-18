'use client';

import { useCallback, useRef, useState } from 'react';
import { Badge, Card, ListGroup } from 'react-bootstrap';
import {
  Hub,
  Permission,
  RideHubEvent,
  useHub,
  type DriverLocationUpdatedPayload,
  type RealtimeStatus,
  type RideCancelledPayload,
  type RideMatchedPayload,
  type RideStatusChangedPayload,
} from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

interface FeedEntry {
  id: number;
  kind: string;
  detail: string;
}

const STATUS_VARIANT: Record<RealtimeStatus, string> = {
  connected: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
  disconnected: 'secondary',
};

/**
 * Live operations feed — subscribes to the rides hub via the shared `useHub`
 * hook and renders incoming events. Guarded by OPS_DASHBOARD (Support Admin /
 * Super Admin). The same hook drives live tracking in the customer RN app.
 */
function OpsInner() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: string, detail: string) => {
    counter.current += 1;
    const entry: FeedEntry = { id: counter.current, kind, detail };
    setFeed((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const status = useHub(Hub.Rides, {
    [RideHubEvent.RideMatched]: (p: RideMatchedPayload) =>
      push('Ride matched', `ride ${p.rideId} → driver ${p.driverId}`),
    [RideHubEvent.RideStatusChanged]: (p: RideStatusChangedPayload) =>
      push('Status changed', `ride ${p.rideId} → ${p.status}`),
    [RideHubEvent.RideCancelled]: (p: RideCancelledPayload) =>
      push('Ride cancelled', `ride ${p.rideId} by ${p.cancelledBy}`),
    [RideHubEvent.DriverLocationUpdated]: (p: DriverLocationUpdatedPayload) =>
      push('Driver moved', `driver ${p.driverId} @ ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`),
  });

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">Live Operations</h1>
        <Badge bg={STATUS_VARIANT[status]} className="text-uppercase">
          {status}
        </Badge>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white fw-medium">Real-time ride events</Card.Header>
        <ListGroup variant="flush" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {feed.length === 0 && (
            <ListGroup.Item className="text-muted text-center py-4">
              Waiting for events… (connects to <code>{Hub.Rides}</code>)
            </ListGroup.Item>
          )}
          {feed.map((e) => (
            <ListGroup.Item key={e.id} className="d-flex justify-content-between gap-3">
              <span className="fw-medium">{e.kind}</span>
              <span className="text-muted small text-end">{e.detail}</span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    </>
  );
}

export default function OpsPage() {
  return (
    <ProtectedRoute permission={Permission.OPS_DASHBOARD}>
      <OpsInner />
    </ProtectedRoute>
  );
}
