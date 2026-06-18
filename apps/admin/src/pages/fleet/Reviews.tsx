import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Spinner } from 'react-bootstrap';
import { queryKeys, useServices, type Review } from '@bd-cabs/core';

/**
 * Ratings &amp; reviews the owner has received from drivers and corporate clients
 * after completed rentals/trips. (Capability: receive ratings/reviews.) Each row
 * shows the star rating, comment, and tags, with an average summary up top.
 */
export default function FleetReviewsPage() {
  const { endpoints } = useServices();
  const reviews = useQuery({
    queryKey: queryKeys.fleet.reviews(),
    queryFn: () => endpoints.fleet.reviews(),
  });

  const list = reviews.data ?? [];
  const average = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h5 mb-0">Ratings &amp; reviews</h1>
          {list.length > 0 && (
            <div className="text-end">
              <div className="h4 mb-0 text-success">★ {average.toFixed(2)}</div>
              <div className="text-muted small">{list.length} review{list.length === 1 ? '' : 's'}</div>
            </div>
          )}
        </div>
        {reviews.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {!reviews.isLoading && list.length === 0 && <p className="text-muted mb-0">No reviews yet.</p>}
        {list.map((r) => <ReviewRow key={r.id} review={r} />)}
      </Card.Body>
    </Card>
  );
}

function ReviewRow({ review }: { review: Review }) {
  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between">
        <span className="text-warning" aria-label={`${review.rating} stars`}>
          {'★'.repeat(review.rating)}<span className="text-muted">{'★'.repeat(5 - review.rating)}</span>
        </span>
        <span className="text-muted small">{new Date(review.createdAt).toLocaleDateString()}</span>
      </div>
      {review.comment && <p className="mb-1 mt-1">{review.comment}</p>}
      {review.tags.length > 0 && (
        <div className="d-flex flex-wrap gap-1">
          {review.tags.map((t) => <Badge key={t} bg="light" text="dark" className="border">{t}</Badge>)}
        </div>
      )}
    </div>
  );
}
