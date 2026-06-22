import type {
  Driver,
  DriverDocument,
  DriverEarnings,
  Paginated,
  RatingSummary,
  Ride,
} from '../../models/entities';
import type { AvailabilityMode } from '../../models/enums';
import type { ApiClient } from '../api/apiCore';

export interface DriverDocumentInput {
  type: string;
  documentUrl: string;
  number?: string;
  expiresAt?: string;
}

export const createDriversService = (api: ApiClient) => ({
  me: () => api.request<Driver>('/drivers/me'),
  onboard: (body: { licenseNumber: string; isRentalDriver?: boolean }) =>
    api.request<Driver>('/drivers/onboarding', { method: 'POST', body }),
  update: (body: { licenseNumber?: string; isRentalDriver?: boolean; activeVehicleId?: string }) =>
    api.request<Driver>('/drivers/me', { method: 'PUT', body }),
  setAvailability: (isOnline: boolean) =>
    api.request<Driver>('/drivers/me/availability', { method: 'PATCH', body: { isOnline } }),
  setAvailabilityMode: (mode: AvailabilityMode) =>
    api.request<Driver>('/drivers/me/availability', { method: 'PATCH', body: { mode } }),
  updateLocation: (body: { lat: number; lng: number }) =>
    api.request<Driver>('/drivers/me/location', { method: 'PATCH', body }),
  addDocument: (body: DriverDocumentInput) =>
    api.request<DriverDocument>('/drivers/me/documents', { method: 'POST', body }),
  documents: () => api.request<DriverDocument[]>('/drivers/me/documents'),
  earnings: () => api.request<DriverEarnings>('/drivers/me/earnings'),
  trips: (query: { page?: number; pageSize?: number }) =>
    api.request<Paginated<Ride>>('/drivers/me/trips', { query }),
  rating: (id: string) => api.request<RatingSummary>(`/drivers/${id}/rating`),
});

export type DriversService = ReturnType<typeof createDriversService>;
