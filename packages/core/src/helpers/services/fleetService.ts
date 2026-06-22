import type {
  CorporateRentalContract,
  FleetDriver,
  FleetProfile,
  RentalAgreement,
  RentReceived,
  RevenueReport,
  Review,
  Settlement,
  Vehicle,
  VehiclePerformance,
} from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface FleetOnboardingInput {
  companyName?: string;
  tradeLicenseNumber: string;
  nidNumber: string;
  bankAccount?: string;
}

export interface ApproveRentalInput {
  rentType: string;
  rentAmountMinor?: number;
  revenueSharePct?: number;
  note?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateRentalTermsInput {
  rentType?: string;
  rentAmountMinor?: number;
  revenueSharePct?: number;
  note?: string;
  endDate?: string;
}

export interface ApproveCorporateRentalInput {
  /** Rate per billing period (minor units). */
  rateMinor: number;
  /** Billing cadence override — one of RentalPeriod (daily | weekly | monthly). */
  period?: string;
  startDate?: string;
  endDate?: string;
  note?: string;
}

export interface FleetCorporateReviewInput {
  corporateId: string;
  rating: number;
  comment?: string;
}

/** Body for POST /fleet/driver-reviews — an owner rates one of their drivers. */
export interface FleetDriverReviewInput {
  driverId: string;
  rating: number;
  comment?: string;
}

export const createFleetService = (api: ApiClient) => ({
  onboard: (body: FleetOnboardingInput) =>
    api.request<FleetProfile>('/fleet/onboarding', { method: 'POST', body }),
  me: () => api.request<FleetProfile>('/fleet/me'),
  vehicles: () => api.request<Vehicle[]>('/fleet/vehicles'),
  drivers: () => api.request<FleetDriver[]>('/fleet/drivers'),
  inviteDriver: (body: { emailOrPhone: string; note?: string }) =>
    api.request<FleetDriver>('/fleet/drivers/invite', { method: 'POST', body }),
  removeDriver: (driverId: string) =>
    api.request<void>(`/fleet/drivers/${driverId}`, { method: 'DELETE' }),
  rentalRequests: () => api.request<RentalAgreement[]>('/fleet/rental-requests'),
  approveRental: (id: string, body: ApproveRentalInput) =>
    api.request<RentalAgreement>(`/fleet/rental-requests/${id}/approve`, { method: 'POST', body }),
  rejectRental: (id: string, body: { reason?: string } = {}) =>
    api.request<RentalAgreement>(`/fleet/rental-requests/${id}/reject`, { method: 'POST', body }),
  updateTerms: (id: string, body: UpdateRentalTermsInput) =>
    api.request<RentalAgreement>(`/fleet/rentals/${id}/terms`, { method: 'PATCH', body }),
  rentReceived: (id: string) =>
    api.request<RentReceived>(`/fleet/rentals/${id}/rent-received`),
  performance: () => api.request<VehiclePerformance[]>('/fleet/performance'),
  revenue: (query: { from?: string; to?: string } = {}) =>
    api.request<RevenueReport>('/fleet/revenue', { query }),
  settlements: () => api.request<Settlement[]>('/fleet/settlements'),
  reviews: () => api.request<Review[]>('/fleet/reviews'),
  reviewDriver: (body: FleetDriverReviewInput) =>
    api.request<Review>('/fleet/driver-reviews', { method: 'POST', body }),
  corporateRentals: () => api.request<CorporateRentalContract[]>('/fleet/corporate-rentals'),
  approveCorporateRental: (id: string, body: ApproveCorporateRentalInput) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/approve`, { method: 'POST', body }),
  rejectCorporateRental: (id: string, body: { reason?: string } = {}) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/reject`, { method: 'POST', body }),
  activateCorporateRental: (id: string) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/activate`, { method: 'POST' }),
  completeCorporateRental: (id: string) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/complete`, { method: 'POST' }),
  assignRentalDriver: (id: string, body: { driverId: string }) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/assign-driver`, { method: 'POST', body }),
  unassignRentalDriver: (id: string, driverId: string) =>
    api.request<CorporateRentalContract>(`/fleet/corporate-rentals/${id}/drivers/${driverId}`, { method: 'DELETE' }),
  reviewCorporate: (body: FleetCorporateReviewInput) =>
    api.request<Review>('/fleet/corporate-reviews', { method: 'POST', body }),
});

export type FleetService = ReturnType<typeof createFleetService>;
