import type { SafetyEvent } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export const createSafetyService = (api: ApiClient) => ({
  sos: (body: { rideId?: string; lat?: number; lng?: number } = {}) =>
    api.request<SafetyEvent>('/safety/sos', { method: 'POST', body }),
  shareTrip: (body: { rideId: string; contactName: string; contactPhone: string }) =>
    api.request<SafetyEvent>('/safety/share-trip', { method: 'POST', body }),
});

export type SafetyService = ReturnType<typeof createSafetyService>;
