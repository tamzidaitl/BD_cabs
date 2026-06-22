import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  ApiError,
  queryKeys,
  useServices,
  type CorporateFleetSummary,
  type Review,
} from '@bd-cabs/core';

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Fleet/Vehicle owners the company can route rides to, each with its rating and
 * a control to rate it (one standing review per fleet, editable). A separate
 * card lists the reviews this company has left.
 */
export default function CorporateReviewsPage() {
  const { endpoints } = useServices();

  const fleets = useQuery({
    queryKey: queryKeys.corporate.fleets(),
    queryFn: () => endpoints.corporate.fleets(),
  });
  const reviews = useQuery({
    queryKey: queryKeys.corporate.reviews(),
    queryFn: () => endpoints.corporate.reviews(),
  });

  // Index my existing reviews by the owner they're about.
  const myReviewByOwner = new Map<string, Review>();
  for (const r of reviews.data ?? []) myReviewByOwner.set(r.revieweeId, r);

  return (
    <Row className="g-4">
      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-3">Fleets</h1>
            {fleets.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {fleets.data && fleets.data.length === 0 && (
              <p className="text-muted mb-0">No fleets available yet.</p>
            )}
            {fleets.data?.map((f) => (
              <FleetRow key={f.ownerId} fleet={f} existing={myReviewByOwner.get(f.ownerId)} />
            ))}
          </Card.Body>
        </Card>
      </Col>
      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My reviews</h2>
            {reviews.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {reviews.data && reviews.data.length === 0 && (
              <p className="text-muted mb-0">You haven't reviewed any fleets yet.</p>
            )}
            {reviews.data?.map((r) => (
              <div key={r.id} className="border-bottom py-2">
                <span className="text-warning" aria-label={`${r.rating} stars`}>
                  {'★'.repeat(r.rating)}<span className="text-muted">{'★'.repeat(5 - r.rating)}</span>
                </span>
                {r.comment && <p className="mb-0 mt-1 small">{r.comment}</p>}
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

function FleetRow({ fleet, existing }: { fleet: CorporateFleetSummary; existing?: Review }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');

  const submit = useMutation({
    mutationFn: () =>
      endpoints.corporate.createReview({
        ownerId: fleet.ownerId,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.reviews() });
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.fleets() });
    },
  });

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-medium">{fleet.companyName ?? fleet.ownerId.slice(0, 8)}</div>
          <div className="text-muted small">
            {fleet.vehicleCount} vehicle{fleet.vehicleCount === 1 ? '' : 's'}
            {fleet.rating != null && <> · <span className="text-warning">★ {fleet.rating.toFixed(1)}</span></>}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {existing && <Badge bg="light" text="dark" className="border">Reviewed</Badge>}
          <Button size="sm" variant="outline-success" onClick={() => setOpen((o) => !o)}>
            {existing ? 'Edit review' : 'Rate'}
          </Button>
        </div>
      </div>

      {submit.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">{errMsg(submit.error, 'Could not save review.')}</Alert>
      )}

      {open && (
        <div className="mt-2">
          <div className="d-flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n <= rating ? 'warning' : 'outline-secondary'}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                ★
              </Button>
            ))}
          </div>
          <Form.Control
            as="textarea"
            rows={2}
            className="mb-2"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button size="sm" variant="success" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Saving…' : 'Submit review'}
          </Button>
        </div>
      )}
    </div>
  );
}
