'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card } from 'react-bootstrap';
import { Permission, useServices } from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { Can } from '@/components/rbac/Can';

/**
 * Finance payouts — guarded by FINANCE_PAYOUTS_RUN. A Support Admin can never
 * reach this (separation of duties), and even within the page the action button
 * is wrapped in <Can> as defence-in-depth. The API must enforce the same rule.
 */
function PayoutsInner() {
  const { endpoints } = useServices();
  const [runId, setRunId] = useState<string | null>(null);

  const runPayouts = useMutation({
    mutationFn: () => endpoints.finance.runPayouts(),
    onSuccess: (res) => setRunId(res.runId),
  });

  return (
    <>
      <h1 className="h4 mb-3">Payouts</h1>
      <Card className="shadow-sm border-0" style={{ maxWidth: 560 }}>
        <Card.Body>
          <Card.Title>Run payout cycle</Card.Title>
          <Card.Text className="text-muted">
            Disburse pending earnings to drivers and fleet owners for the current settlement window.
          </Card.Text>

          {runId && (
            <Alert variant="success">
              Payout run started — <code>{runId}</code>
            </Alert>
          )}
          {runPayouts.isError && <Alert variant="danger">Failed to start payout run.</Alert>}

          <Can
            permission={Permission.FINANCE_PAYOUTS_RUN}
            fallback={<Alert variant="warning">You do not have permission to run payouts.</Alert>}
          >
            <Button
              variant="success"
              disabled={runPayouts.isPending}
              onClick={() => runPayouts.mutate()}
            >
              {runPayouts.isPending ? 'Running…' : 'Run payouts now'}
            </Button>
          </Can>
        </Card.Body>
      </Card>
    </>
  );
}

export default function PayoutsPage() {
  return (
    <ProtectedRoute permission={Permission.FINANCE_PAYOUTS_RUN}>
      <PayoutsInner />
    </ProtectedRoute>
  );
}
