import type { RecentPlace, SavedPlace } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface SavedPlaceInput {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export const createPlacesService = (api: ApiClient) => ({
  list: () => api.request<SavedPlace[]>('/places/me'),
  recent: () => api.request<RecentPlace[]>('/places/recent'),
  create: (body: SavedPlaceInput) => api.request<SavedPlace>('/places', { method: 'POST', body }),
  update: (id: string, body: SavedPlaceInput) =>
    api.request<SavedPlace>(`/places/${id}`, { method: 'PUT', body }),
  remove: (id: string) => api.request<void>(`/places/${id}`, { method: 'DELETE' }),
});

export type PlacesService = ReturnType<typeof createPlacesService>;
