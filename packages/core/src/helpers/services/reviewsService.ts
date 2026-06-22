import type { ProfileReviews, Review } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface ReviewInput {
  rideId: string;
  rating: number;
  comment?: string;
  tags?: string[];
  revieweeType?: string;
}

/** Body for POST /reviews/rental/{agreementId} — driver rates the vehicle or its owner. */
export interface RentalReviewInput {
  rating: number;
  comment?: string;
  tags?: string[];
  /** One of ReviewTargetType — 'Vehicle' or 'Owner'. */
  revieweeType: string;
}

export const createReviewsService = (api: ApiClient) => ({
  create: (body: ReviewInput) => api.request<Review>('/reviews', { method: 'POST', body }),
  me: () => api.request<ProfileReviews>('/reviews/me'),
  forRide: (rideId: string) => api.request<Review[]>(`/reviews/ride/${rideId}`),
  forUser: (userId: string) => api.request<Review[]>(`/reviews/user/${userId}`),
  createForRental: (agreementId: string, body: RentalReviewInput) =>
    api.request<Review>(`/reviews/rental/${agreementId}`, { method: 'POST', body }),
  forRental: (agreementId: string) => api.request<Review[]>(`/reviews/rental/${agreementId}`),
});

export type ReviewsService = ReturnType<typeof createReviewsService>;
