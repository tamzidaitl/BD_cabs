import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Spinner } from 'react-bootstrap';
import { queryKeys, useServices, type Review } from '@bd-cabs/core';
import { Avatar } from '@/components/Avatar';

/**
 * Every portal role's own rating page — their average star rating and the reviews
 * they've received after completed rides/trips/rentals. (Capability: receive
 * ratings/reviews.) Reads the shared, role-agnostic `/reviews/me` profile summary,
 * so a single page serves customers, drivers, fleet owners, and corporate clients.
 * Hidden/removed reviews are filtered out server-side, so only live feedback shows.
 */
export default function RatingPage() {
  const { endpoints } = useServices();
  const data = useQuery({
    queryKey: queryKeys.reviews.me(),
    queryFn: () => endpoints.reviews.me(),
  });

  const summary = data.data?.summary;
  const reviews = data.data?.reviews ?? [];

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h5 mb-0">My rating &amp; reviews</h1>
          {summary && summary.count > 0 && (
            <div className="text-end">
              <div className="h4 mb-0 text-success">★ {summary.average.toFixed(2)}</div>
              <div className="text-muted small">
                {summary.count} review{summary.count === 1 ? '' : 's'}
              </div>
            </div>
          )}
        </div>
        {data.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {!data.isLoading && reviews.length === 0 && (
          <p className="text-muted mb-0">No reviews yet. Ratings you receive will appear here.</p>
        )}
        {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
      </Card.Body>
    </Card>
  );
}

function ReviewRow({ review }: { review: Review }) {
  return (
    <div className="border-bottom py-3 d-flex gap-3">
      <Avatar user={{ fullName: review.reviewerName, avatarUrl: review.reviewerAvatarUrl }} size={40} />
      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="fw-medium">{review.reviewerName ?? 'Anonymous'}</div>
            <span className="text-warning" aria-label={`${review.rating} stars`}>
              {'★'.repeat(review.rating)}<span className="text-muted">{'★'.repeat(5 - review.rating)}</span>
            </span>
          </div>
          <span className="text-muted small">{new Date(review.createdAt).toLocaleDateString()}</span>
        </div>
        {review.comment && <p className="mb-1 mt-1">{review.comment}</p>}
        {review.tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-1">
            {review.tags.map((t) => <Badge key={t} bg="light" text="dark" className="border">{t}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}
