import type { RentalAgreement, RentalVehicleListing, RentDue, RentPayment } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export const createRentalsService = (api: ApiClient) => ({
  availableVehicles: () => api.request<RentalVehicleListing[]>('/rentals/available-vehicles'),
  request: (body: { vehicleId: string; note?: string }) =>
    api.request<RentalAgreement>('/rentals/requests', { method: 'POST', body }),
  mine: () => api.request<RentalAgreement[]>('/rentals/me'),
  rentDue: (id: string) => api.request<RentDue>(`/rentals/${id}/rent-due`),
  payRent: (id: string, body: { amountMinor: number; period?: string }) =>
    api.request<RentPayment>(`/rentals/${id}/pay-rent`, { method: 'POST', body }),
});

export type RentalsService = ReturnType<typeof createRentalsService>;
