'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { EyeOff, Eye, Trash2 } from 'lucide-react';
import {
  ApiError,
  Permission,
  ReviewStatus,
  ReviewTargetType,
  queryKeys,
  useServices,
  type AdminReview,
} from '@bd-cabs/core';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

const STATUS_VARIANT: Record<string, string> = {
  [ReviewStatus.Visible]: 'success',
  [ReviewStatus.Hidden]: 'warning',
  [ReviewStatus.Removed]: 'danger',
};

/**
 * Review moderation — guarded by REVIEWS_MODERATE. Staff monitor every review and
 * hide, unhide, or remove inappropriate ones. Hidden/removed reviews drop out of
 * public listings and rating averages (enforced server-side). Filters by status
 * and reviewee type; actions capture an optional reason.
 */
function ReviewModerationInner() {
  const { endpoints } = useServices();
  const qc = useQueryClient();

  const [status, setStatus] = useState('');
  const [revieweeType, setRevieweeType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params = { status: status || undefined, revieweeType: revieweeType || undefined, page, pageSize };
  const reviews = useQuery({
    queryKey: queryKeys.ops.reviews(params),
    queryFn: () => endpoints.ops.reviews(params),
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const moderate = useMutation({
    mutationFn: (vars: { id: string; action: string; reason?: string }) =>
      endpoints.ops.moderateReview(vars.id, { action: vars.action, reason: vars.reason }),
    onMutate: (vars) => {
      setActionError(null);
      setBusyId(vars.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops', 'reviews'] }),
    onError: (err) =>
      setActionError(err instanceof ApiError ? err.message : 'Could not moderate this review.'),
    onSettled: () => setBusyId(null),
  });

  function act(review: AdminReview, action: 'hide' | 'unhide' | 'remove') {
    let reason: string | undefined;
    if (action !== 'unhide') {
      const verb = action === 'hide' ? 'hide' : 'remove';
      const input = window.prompt(`Reason to ${verb} this review (optional):`, review.moderationReason ?? '');
      if (input === null) return; // cancelled
      reason = input.trim() || undefined;
    }
    moderate.mutate({ id: review.id, action, reason });
  }

  const data = reviews.data;
  const items = data?.items ?? [];

  const onFilter = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    set(e.target.value);
    setPage(1);
  };

  return (
    <>
      <h1 className="h4 mb-3">Review moderation</h1>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Form.Select value={status} onChange={onFilter(setStatus)} style={{ maxWidth: 200 }} aria-label="Filter by status">
              <option value="">All statuses</option>
              {Object.values(ReviewStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Form.Select>
            <Form.Select value={revieweeType} onChange={onFilter(setRevieweeType)} style={{ maxWidth: 200 }} aria-label="Filter by reviewee type">
              <option value="">All targets</option>
              {Object.values(ReviewTargetType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Form.Select>
          </div>

          {actionError && (
            <Alert variant="danger" dismissible onClose={() => setActionError(null)}>{actionError}</Alert>
          )}

          {reviews.isLoading && <Spinner animation="border" variant="success" size="sm" />}
          {reviews.isError && <div className="text-danger">Failed to load reviews.</div>}

          {data && (
            <div className="table-responsive" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>From → To</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const busy = busyId === r.id;
                    const removed = r.status === ReviewStatus.Removed;
                    const hidden = r.status === ReviewStatus.Hidden;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-medium">{r.reviewerName ?? r.reviewerId.slice(0, 8)}</div>
                          <div className="text-muted small">
                            → {r.revieweeName ?? r.revieweeId.slice(0, 8)}{' '}
                            <Badge bg="light" text="dark" className="border">{r.revieweeType}</Badge>
                          </div>
                        </td>
                        <td className="text-warning text-nowrap" aria-label={`${r.rating} stars`}>
                          {'★'.repeat(r.rating)}<span className="text-muted">{'★'.repeat(5 - r.rating)}</span>
                        </td>
                        <td style={{ maxWidth: 320 }}>
                          <div className="text-truncate">{r.comment ?? <span className="text-muted">—</span>}</div>
                          {r.moderationReason && (
                            <div className="text-muted small fst-italic">Reason: {r.moderationReason}</div>
                          )}
                        </td>
                        <td><Badge bg={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge></td>
                        <td className="text-end text-nowrap">
                          {hidden ? (
                            <Button size="sm" variant="outline-success" className="me-2" disabled={busy} onClick={() => act(r, 'unhide')}>
                              <Eye size={14} className="me-1" />Unhide
                            </Button>
                          ) : (
                            !removed && (
                              <Button size="sm" variant="outline-warning" className="me-2" disabled={busy} onClick={() => act(r, 'hide')}>
                                <EyeOff size={14} className="me-1" />Hide
                              </Button>
                            )
                          )}
                          {!removed && (
                            <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => act(r, 'remove')}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted py-4">No reviews found.</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}

          {data && data.totalCount > pageSize && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Page {data.page} · {data.totalCount} total
              </span>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline-secondary" disabled={page * pageSize >= data.totalCount} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default function ReviewModerationPage() {
  return (
    <ProtectedRoute permission={Permission.REVIEWS_MODERATE}>
      <ReviewModerationInner />
    </ProtectedRoute>
  );
}
