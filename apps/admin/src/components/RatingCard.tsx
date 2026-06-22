import { useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { Star } from 'lucide-react';
import { ApiError, useCreateRentalReview, useCreateReview, type ReviewTargetType } from '@bd-cabs/core';

const RATING_LABELS = ['', 'Terrible', 'Not great', 'Okay', 'Good', 'Excellent'];

export interface RatingCardProps {
  /** Rate a ride — pass the ride id. Mutually exclusive with `rentalAgreementId`. */
  rideId?: string;
  /** Rate a rental's vehicle/owner — pass the agreement id. Requires `revieweeType`. */
  rentalAgreementId?: string;
  /** Who is being rated — omit to let the backend default by role (rider→driver). */
  revieweeType?: ReviewTargetType;
  title: string;
  prompt: string;
  /** Quick-feedback chips folded into the comment on submit. */
  tags?: string[];
  successTitle?: string;
  successText?: string;
  className?: string;
}

/**
 * Reusable "rate the other party" surface — an interactive 5-star picker with
 * hover feedback, a dynamic label, optional quick-feedback chips, and a comment
 * box. Drives both the rider→driver rating and the driver→passenger / driver→
 * owner ratings; the only differences are copy, chips, and the reviewee type.
 */
export function RatingCard({
  rideId,
  rentalAgreementId,
  revieweeType,
  title,
  prompt,
  tags: tagOptions = [],
  successTitle = 'Thanks for your feedback!',
  successText = 'Your rating helps keep rides great for everyone.',
  className = 'border-0 shadow-sm',
}: RatingCardProps) {
  const rideReview = useCreateReview();
  const rentalReview = useCreateRentalReview(rentalAgreementId ?? '');
  const review = rentalAgreementId ? rentalReview : rideReview;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const active = hover || rating;

  function toggleTag(tag: string) {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  function submit() {
    const parts = [tags.join(', '), comment.trim()].filter(Boolean);
    const combined = parts.join(' — ') || undefined;
    if (rentalAgreementId) {
      rentalReview.mutate({ rating, revieweeType: revieweeType ?? '', tags, comment: combined });
    } else if (rideId) {
      rideReview.mutate({ rideId, rating, revieweeType, tags, comment: combined });
    }
  }

  return (
    <Card className={className}>
      <Card.Body className="p-4 text-center">
        {review.isSuccess ? (
          <>
            <div className="text-success mb-2"><Star size={40} fill="currentColor" strokeWidth={0} /></div>
            <h2 className="h5 mb-1">{successTitle}</h2>
            <p className="text-muted small mb-0">{successText}</p>
          </>
        ) : (
          <>
            <h2 className="h5 mb-1">{title}</h2>
            <p className="text-muted small mb-3">{prompt}</p>

            <div className="d-flex justify-content-center gap-2 mb-2" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-link p-0 border-0 lh-1"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={rating === n}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onClick={() => setRating(n)}
                >
                  <Star
                    size={36}
                    className={n <= active ? 'text-warning' : 'text-secondary opacity-25'}
                    fill={n <= active ? 'currentColor' : 'none'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <div className="fw-medium mb-3" style={{ minHeight: '1.5rem' }}>
              {active > 0 ? RATING_LABELS[active] : <span className="text-muted small">Tap a star to rate</span>}
            </div>

            {rating > 0 && (
              <>
                {tagOptions.length > 0 && (
                  <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                    {tagOptions.map((tag) => {
                      const on = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`btn btn-sm rounded-pill ${on ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="mb-2 text-start"
                  placeholder="Add a comment (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </>
            )}

            {review.isError && (
              <div className="text-danger small mb-2">
                {review.error instanceof ApiError ? review.error.message : 'Could not submit review.'}
              </div>
            )}

            <Button
              variant="success"
              className="w-100"
              disabled={rating === 0 || review.isPending}
              onClick={submit}
            >
              {review.isPending ? 'Submitting…' : 'Submit rating'}
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
