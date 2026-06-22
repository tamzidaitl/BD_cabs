import type {
  FareBreakdownResult,
  FareEstimateResult,
  GeoPoint,
  NearbyVehicle,
  Paginated,
  RecurringRide,
  Ride,
  RideCreated,
  RideTrack,
  RoutePath,
} from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface RideEstimateInput {
  pickup: GeoPoint;
  destination: GeoPoint;
  vehicleTypeId: string;
}

export interface RideRequestInput {
  pickup: GeoPoint;
  destination: GeoPoint;
  vehicleTypeId: string;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
  /** ISO timestamp for an advance booking; omit for an instant ride. */
  scheduledFor?: string;
}

export interface RecurringRideInput {
  pickup: GeoPoint;
  destination: GeoPoint;
  vehicleTypeId: string;
  paymentMethod?: string;
  /** Days of week to repeat: 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  timeOfDay: string;
  startDate: string;
  endDate?: string;
}

export const createRidesService = (api: ApiClient) => ({
  estimate: (body: RideEstimateInput) =>
    api.request<FareEstimateResult>('/rides/estimate', { method: 'POST', body }),
  nearbyVehicles: (query: { lat: number; lng: number; vehicleType?: string }) =>
    api.request<NearbyVehicle[]>('/rides/nearby-vehicles', { query }),
  /** Road-following route between two points (proxied to the routing provider). 204 → null. */
  route: (query: { fromLat: number; fromLng: number; toLat: number; toLng: number }) =>
    api.request<RoutePath | null>('/rides/route', { query }),
  request: (body: RideRequestInput) =>
    api.request<RideCreated>('/rides/request', { method: 'POST', body }),
  mine: (query: { page?: number; pageSize?: number }) =>
    api.request<Paginated<Ride>>('/rides/me', { query }),
  get: (id: string) => api.request<Ride>(`/rides/${id}`),
  track: (id: string) => api.request<RideTrack>(`/rides/${id}/track`),
  cancel: (id: string, reason?: string) =>
    api.request<Ride>(`/rides/${id}/cancel`, { method: 'POST', body: { reason } }),
  fareBreakdown: (rideId: string) => api.request<FareBreakdownResult>(`/fares/breakdown/${rideId}`),
  listRecurring: () => api.request<RecurringRide[]>('/rides/recurring'),
  createRecurring: (body: RecurringRideInput) =>
    api.request<RecurringRide>('/rides/recurring', { method: 'POST', body }),
  cancelRecurring: (id: string) =>
    api.request<void>(`/rides/recurring/${id}`, { method: 'DELETE' }),
  nearbyRequests: () => api.request<Ride[]>('/rides/nearby-requests'),
  accept: (id: string) => api.request<Ride>(`/rides/${id}/accept`, { method: 'POST' }),
  reject: (id: string) => api.request<Ride>(`/rides/${id}/reject`, { method: 'POST' }),
  arrived: (id: string) => api.request<Ride>(`/rides/${id}/arrived`, { method: 'POST' }),
  start: (id: string, otp: string) =>
    api.request<Ride>(`/rides/${id}/start`, { method: 'POST', body: { otp } }),
  complete: (id: string) => api.request<Ride>(`/rides/${id}/complete`, { method: 'POST' }),
});

export type RidesService = ReturnType<typeof createRidesService>;
