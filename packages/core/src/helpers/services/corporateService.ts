import type {
  CorporateBilling,
  CorporateBooking,
  CorporateBookingEstimate,
  CorporateEmployee,
  CorporateFleetSummary,
  CorporateProfile,
  CorporateRecurringRide,
  CorporateRentalContract,
  CorporateRentalVehicle,
  CorporateReport,
  Review,
} from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface CorporateOnboardingInput {
  companyName: string;
  tradeLicenseNumber: string;
  billingEmail?: string;
  billingAddress?: string;
}

export interface CorporateEmployeeInput {
  fullName: string;
  email?: string;
  phone?: string;
  monthlySpendLimitMinor?: number;
  requiresApproval: boolean;
  /** One of CorporateEmployeeStatus; defaults to active on create. */
  status?: string;
}

export interface CorporateBookingEstimateInput {
  employeeId: string;
  vehicleTypeId: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
}

export interface CorporateBookingInput {
  employeeId: string;
  vehicleTypeId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  destLat: number;
  destLng: number;
  destAddress?: string;
  /** One of RideAllocationMode (auto | fleet). Defaults to auto. */
  allocationMode?: string;
  /** Required when allocationMode is "fleet". */
  preferredFleetId?: string;
  notes?: string;
  /** ISO timestamp for an advance booking; omit for an immediate one. */
  scheduledFor?: string;
}

export interface CorporateRecurringRideInput {
  employeeId: string;
  vehicleTypeId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  destLat: number;
  destLng: number;
  destAddress?: string;
  allocationMode?: string;
  preferredFleetId?: string;
  /** Days of week to repeat: 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  timeOfDay: string;
  startDate?: string;
  endDate?: string;
}

export interface CorporateReviewInput {
  ownerId: string;
  rating: number;
  comment?: string;
}

export interface CorporateRentalRequestInput {
  vehicleId: string;
  /** Preferred billing cadence — one of RentalPeriod (daily | weekly | monthly). */
  period?: string;
  startDate?: string;
  endDate?: string;
  servicePurpose?: string;
  notes?: string;
}

export const createCorporateService = (api: ApiClient) => ({
  onboard: (body: CorporateOnboardingInput) =>
    api.request<CorporateProfile>('/corporate/onboarding', { method: 'POST', body }),
  me: () => api.request<CorporateProfile>('/corporate/me'),
  employees: () => api.request<CorporateEmployee[]>('/corporate/employees'),
  addEmployee: (body: CorporateEmployeeInput) =>
    api.request<CorporateEmployee>('/corporate/employees', { method: 'POST', body }),
  updateEmployee: (id: string, body: CorporateEmployeeInput) =>
    api.request<CorporateEmployee>(`/corporate/employees/${id}`, { method: 'PUT', body }),
  removeEmployee: (id: string) =>
    api.request<void>(`/corporate/employees/${id}`, { method: 'DELETE' }),
  bookings: (query: { status?: string } = {}) =>
    api.request<CorporateBooking[]>('/corporate/bookings', { query }),
  estimateBooking: (body: CorporateBookingEstimateInput) =>
    api.request<CorporateBookingEstimate>('/corporate/bookings/estimate', { method: 'POST', body }),
  createBooking: (body: CorporateBookingInput) =>
    api.request<CorporateBooking>('/corporate/bookings', { method: 'POST', body }),
  approveBooking: (id: string) =>
    api.request<CorporateBooking>(`/corporate/bookings/${id}/approve`, { method: 'POST' }),
  rejectBooking: (id: string, body: { reason?: string } = {}) =>
    api.request<CorporateBooking>(`/corporate/bookings/${id}/reject`, { method: 'POST', body }),
  completeBooking: (id: string) =>
    api.request<CorporateBooking>(`/corporate/bookings/${id}/complete`, { method: 'POST' }),
  cancelBooking: (id: string) =>
    api.request<CorporateBooking>(`/corporate/bookings/${id}/cancel`, { method: 'POST' }),
  recurring: () => api.request<CorporateRecurringRide[]>('/corporate/recurring'),
  createRecurring: (body: CorporateRecurringRideInput) =>
    api.request<CorporateRecurringRide>('/corporate/recurring', { method: 'POST', body }),
  cancelRecurring: (id: string) =>
    api.request<void>(`/corporate/recurring/${id}`, { method: 'DELETE' }),
  billing: () => api.request<CorporateBilling>('/corporate/billing'),
  reports: (query: { from?: string; to?: string } = {}) =>
    api.request<CorporateReport>('/corporate/reports', { query }),
  rentalVehicles: () => api.request<CorporateRentalVehicle[]>('/corporate/rental-vehicles'),
  rentalContracts: () => api.request<CorporateRentalContract[]>('/corporate/rental-contracts'),
  requestRental: (body: CorporateRentalRequestInput) =>
    api.request<CorporateRentalContract>('/corporate/rental-contracts', { method: 'POST', body }),
  cancelRental: (id: string) =>
    api.request<CorporateRentalContract>(`/corporate/rental-contracts/${id}/cancel`, { method: 'POST' }),
  fleets: () => api.request<CorporateFleetSummary[]>('/corporate/fleets'),
  reviews: () => api.request<Review[]>('/corporate/reviews'),
  reviewsReceived: () => api.request<Review[]>('/corporate/reviews-received'),
  createReview: (body: CorporateReviewInput) =>
    api.request<Review>('/corporate/reviews', { method: 'POST', body }),
});

export type CorporateService = ReturnType<typeof createCorporateService>;
