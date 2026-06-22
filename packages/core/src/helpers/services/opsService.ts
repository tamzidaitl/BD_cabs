import type { AdminReview, AdminRide, Paginated, User, Vehicle, VehicleVerification } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

/** Body for PATCH /ops/reviews/{id} — hide, unhide, or remove a review. */
export interface ReviewModerationInput {
  /** One of ReviewModerationAction (hide | unhide | remove). */
  action: string;
  reason?: string;
}

export const createOpsService = (api: ApiClient) => ({
  dashboard: () => api.request<Record<string, number>>('/ops/dashboard'),
  rides: (query: { status?: string; page?: number; pageSize?: number } = {}) =>
    api.request<Paginated<AdminRide>>('/ops/rides', { query }),
  pendingDrivers: (query: { page?: number; pageSize?: number } = {}) =>
    api.request<Paginated<User>>('/ops/drivers/pending', { query }),
  verifyDriver: (id: string, status: string, note?: string) =>
    api.request<User>(`/ops/drivers/${id}/verification`, { method: 'PATCH', body: { status, note } }),
  pendingVehicles: (query: { page?: number; pageSize?: number } = {}) =>
    api.request<Paginated<VehicleVerification>>('/ops/vehicles/pending', { query }),
  verifyVehicle: (id: string, status: string, note?: string) =>
    api.request<Vehicle>(`/ops/vehicles/${id}/verification`, { method: 'PATCH', body: { status, note } }),
  reviews: (query: { status?: string; revieweeType?: string; page?: number; pageSize?: number } = {}) =>
    api.request<Paginated<AdminReview>>('/ops/reviews', { query }),
  moderateReview: (id: string, body: ReviewModerationInput) =>
    api.request<AdminReview>(`/ops/reviews/${id}`, { method: 'PATCH', body }),
});

export type OpsService = ReturnType<typeof createOpsService>;
