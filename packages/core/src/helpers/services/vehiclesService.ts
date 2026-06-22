import type { Vehicle, VehicleDocument } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface VehicleInput {
  type: string;
  plateNumber: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  description?: string;
  /** Stored photo URLs (from vehicles.uploadPhoto). Required: 1–5 images. */
  photoUrls: string[];
  forRent?: boolean;
  rentalPriceMinor?: number;
  /** One of RentalPeriod (daily | weekly | monthly). */
  rentalPeriod?: string;
  rentalTerms?: string;
}

export interface VehicleDocumentInput {
  type: string;
  documentUrl: string;
  number?: string;
  expiresAt?: string;
}

export const createVehiclesService = (api: ApiClient) => ({
  uploadPhoto: (file: File | Blob) => {
    const form = new FormData();
    form.append('file', file);
    return api.request<{ url: string }>('/vehicles/photos', { method: 'POST', body: form });
  },
  uploadDocumentFile: (file: File | Blob) => {
    const form = new FormData();
    form.append('file', file);
    return api.request<{ url: string }>('/vehicles/documents/upload', { method: 'POST', body: form });
  },
  create: (body: VehicleInput) => api.request<Vehicle>('/vehicles', { method: 'POST', body }),
  mine: () => api.request<Vehicle[]>('/vehicles/me'),
  update: (id: string, body: Partial<VehicleInput>) =>
    api.request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body }),
  remove: (id: string) => api.request<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  setStatus: (id: string, status: string) =>
    api.request<Vehicle>(`/vehicles/${id}/status`, { method: 'PATCH', body: { status } }),
  addDocument: (id: string, body: VehicleDocumentInput) =>
    api.request<VehicleDocument>(`/vehicles/${id}/documents`, { method: 'POST', body }),
  documents: (id: string) => api.request<VehicleDocument[]>(`/vehicles/${id}/documents`),
});

export type VehiclesService = ReturnType<typeof createVehiclesService>;
