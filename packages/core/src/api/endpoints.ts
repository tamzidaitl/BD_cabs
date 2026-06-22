import type {
  AdminRide,
  ApplyCouponResult,
  AuthSession,
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
  Coupon,
  Driver,
  DriverDocument,
  DriverEarnings,
  FareBreakdownResult,
  FareEstimateResult,
  GeoPoint,
  NearbyVehicle,
  Paginated,
  Payment,
  PaymentMethod,
  RatingSummary,
  RecentPlace,
  RecurringRide,
  RentalAgreement,
  RentalVehicleListing,
  RentDue,
  RentPayment,
  FleetProfile,
  FleetDriver,
  RentReceived,
  VehicleDocument,
  VehiclePerformance,
  RevenueReport,
  Settlement,
  Review,
  AdminReview,
  ProfileReviews,
  Ride,
  RideCreated,
  RideTrack,
  RoutePath,
  SafetyEvent,
  SavedPlace,
  SupportTicket,
  User,
  Vehicle,
  VehicleVerification,
  Wallet,
  WalletTransaction,
} from '../models/entities';
import type { AvailabilityMode, Role } from '../models/enums';
import type { ApiClient } from './client';

/** Body for POST /auth/register (self-registerable roles only). */
export interface RegisterInput {
  firstName: string;
  lastName: string;
  /** "male" | "female" | "third-gender". */
  gender: string;
  email: string;
  /** E.164 phone including the dialing code, e.g. "+8801712345678". */
  phone: string;
  password: string;
  role: Role;
}

// ---- Customer / Driver flow inputs ----------------------------------------

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

export interface SavedPlaceInput {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface PaymentMethodInput {
  type: string;
  label?: string;
  last4?: string;
  providerToken?: string;
  isDefault?: boolean;
}

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

export interface SupportTicketInput {
  category?: string;
  subject: string;
  body: string;
  rideId?: string;
}

export interface DriverDocumentInput {
  type: string;
  documentUrl: string;
  number?: string;
  expiresAt?: string;
}

// ---- Fleet / Vehicle Owner inputs -----------------------------------------

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

// ---- Corporate Client inputs ----------------------------------------------

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

// ---- Fleet/Vehicle Owner: corporate rental inputs -------------------------

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

/** Body for PATCH /ops/reviews/{id} — hide, unhide, or remove a review. */
export interface ReviewModerationInput {
  /** One of ReviewModerationAction (hide | unhide | remove). */
  action: string;
  reason?: string;
}

/**
 * Typed endpoint wrappers grouped by resource. These mirror API_ENDPOINTS.md.
 * Screens never build URLs by hand — they call these, so a path change is a
 * one-line edit shared by web and native.
 */
export const createEndpoints = (api: ApiClient) => ({
  auth: {
    register: (body: RegisterInput) =>
      api.request<AuthSession>('/auth/register', { method: 'POST', body, anonymous: true }),
    login: (body: { emailOrPhone: string; password: string }) =>
      api.request<AuthSession>('/auth/login', { method: 'POST', body, anonymous: true }),
    refresh: (body: { refreshToken: string }) =>
      api.request<AuthSession['tokens']>('/auth/refresh', { method: 'POST', body, anonymous: true }),
    me: () => api.request<User>('/auth/me'),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      api.request<void>('/auth/change-password', { method: 'POST', body }),
    updateProfile: (body: { fullName?: string; avatarUrl?: string }) =>
      api.request<User>('/auth/me', { method: 'PUT', body }),
    uploadAvatar: (file: File | Blob) => {
      const form = new FormData();
      form.append('file', file);
      return api.request<User>('/auth/me/avatar', { method: 'POST', body: form });
    },
    logout: () => api.request<void>('/auth/logout', { method: 'POST' }),
  },

  users: {
    list: (query: { page?: number; pageSize?: number; q?: string; role?: string }) =>
      api.request<Paginated<User>>('/users', { query }),
    get: (id: string) => api.request<User>(`/users/${id}`),
    setStatus: (id: string, status: string) =>
      api.request<User>(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
    remove: (id: string) => api.request<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  // ---- Customer: rides, fares, places, payments, wallet, reviews, support, safety ----
  rides: {
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
    // Recurring
    listRecurring: () => api.request<RecurringRide[]>('/rides/recurring'),
    createRecurring: (body: RecurringRideInput) =>
      api.request<RecurringRide>('/rides/recurring', { method: 'POST', body }),
    cancelRecurring: (id: string) =>
      api.request<void>(`/rides/recurring/${id}`, { method: 'DELETE' }),
    // Driver lifecycle
    nearbyRequests: () => api.request<Ride[]>('/rides/nearby-requests'),
    accept: (id: string) => api.request<Ride>(`/rides/${id}/accept`, { method: 'POST' }),
    reject: (id: string) => api.request<Ride>(`/rides/${id}/reject`, { method: 'POST' }),
    arrived: (id: string) => api.request<Ride>(`/rides/${id}/arrived`, { method: 'POST' }),
    start: (id: string, otp: string) =>
      api.request<Ride>(`/rides/${id}/start`, { method: 'POST', body: { otp } }),
    complete: (id: string) => api.request<Ride>(`/rides/${id}/complete`, { method: 'POST' }),
  },

  places: {
    list: () => api.request<SavedPlace[]>('/places/me'),
    recent: () => api.request<RecentPlace[]>('/places/recent'),
    create: (body: SavedPlaceInput) => api.request<SavedPlace>('/places', { method: 'POST', body }),
    update: (id: string, body: SavedPlaceInput) =>
      api.request<SavedPlace>(`/places/${id}`, { method: 'PUT', body }),
    remove: (id: string) => api.request<void>(`/places/${id}`, { method: 'DELETE' }),
  },

  payments: {
    listMethods: () => api.request<PaymentMethod[]>('/payments/methods'),
    addMethod: (body: PaymentMethodInput) =>
      api.request<PaymentMethod>('/payments/methods', { method: 'POST', body }),
    removeMethod: (id: string) =>
      api.request<void>(`/payments/methods/${id}`, { method: 'DELETE' }),
    charge: (rideId: string, body: { method?: string; paymentMethodId?: string } = {}) =>
      api.request<Payment>(`/payments/${rideId}/charge`, { method: 'POST', body }),
    history: () => api.request<Payment[]>('/payments/me'),
  },

  wallet: {
    me: () => api.request<Wallet>('/wallet/me'),
    transactions: () => api.request<WalletTransaction[]>('/wallet/transactions'),
    topup: (body: { amountMinor: number; method?: string }) =>
      api.request<Wallet>('/wallet/topup', { method: 'POST', body }),
    withdraw: (body: { amountMinor: number }) =>
      api.request<Wallet>('/wallet/withdraw', { method: 'POST', body }),
  },

  reviews: {
    create: (body: ReviewInput) => api.request<Review>('/reviews', { method: 'POST', body }),
    /** The signed-in user's own rating summary + received review history. */
    me: () => api.request<ProfileReviews>('/reviews/me'),
    forRide: (rideId: string) => api.request<Review[]>(`/reviews/ride/${rideId}`),
    forUser: (userId: string) => api.request<Review[]>(`/reviews/user/${userId}`),
    /** A rental driver rates the rented car / its owner after the agreement ended. */
    createForRental: (agreementId: string, body: RentalReviewInput) =>
      api.request<Review>(`/reviews/rental/${agreementId}`, { method: 'POST', body }),
    /** Reviews left on a rental agreement (its driver/owner). */
    forRental: (agreementId: string) => api.request<Review[]>(`/reviews/rental/${agreementId}`),
  },

  support: {
    createTicket: (body: SupportTicketInput) =>
      api.request<SupportTicket>('/support/tickets', { method: 'POST', body }),
    myTickets: () => api.request<SupportTicket[]>('/support/tickets/me'),
    getTicket: (id: string) => api.request<SupportTicket>(`/support/tickets/${id}`),
  },

  safety: {
    sos: (body: { rideId?: string; lat?: number; lng?: number } = {}) =>
      api.request<SafetyEvent>('/safety/sos', { method: 'POST', body }),
    shareTrip: (body: { rideId: string; contactName: string; contactPhone: string }) =>
      api.request<SafetyEvent>('/safety/share-trip', { method: 'POST', body }),
  },

  // ---- Driver: profile, documents, availability, location, earnings, rentals ----
  drivers: {
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
  },

  rentals: {
    availableVehicles: () => api.request<RentalVehicleListing[]>('/rentals/available-vehicles'),
    request: (body: { vehicleId: string; note?: string }) =>
      api.request<RentalAgreement>('/rentals/requests', { method: 'POST', body }),
    mine: () => api.request<RentalAgreement[]>('/rentals/me'),
    rentDue: (id: string) => api.request<RentDue>(`/rentals/${id}/rent-due`),
    payRent: (id: string, body: { amountMinor: number; period?: string }) =>
      api.request<RentPayment>(`/rentals/${id}/pay-rent`, { method: 'POST', body }),
  },

  // ---- Fleet/Vehicle Owner: vehicles ----
  vehicles: {
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
  },

  // ---- Fleet/Vehicle Owner: console ----
  fleet: {
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
    // Corporate rental contracts (Corporate ↔ Vehicle Owner)
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
  },

  // ---- Corporate Client: company console ----
  corporate: {
    onboard: (body: CorporateOnboardingInput) =>
      api.request<CorporateProfile>('/corporate/onboarding', { method: 'POST', body }),
    me: () => api.request<CorporateProfile>('/corporate/me'),
    // Employees
    employees: () => api.request<CorporateEmployee[]>('/corporate/employees'),
    addEmployee: (body: CorporateEmployeeInput) =>
      api.request<CorporateEmployee>('/corporate/employees', { method: 'POST', body }),
    updateEmployee: (id: string, body: CorporateEmployeeInput) =>
      api.request<CorporateEmployee>(`/corporate/employees/${id}`, { method: 'PUT', body }),
    removeEmployee: (id: string) =>
      api.request<void>(`/corporate/employees/${id}`, { method: 'DELETE' }),
    // Bookings
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
    // Recurring rides
    recurring: () => api.request<CorporateRecurringRide[]>('/corporate/recurring'),
    createRecurring: (body: CorporateRecurringRideInput) =>
      api.request<CorporateRecurringRide>('/corporate/recurring', { method: 'POST', body }),
    cancelRecurring: (id: string) =>
      api.request<void>(`/corporate/recurring/${id}`, { method: 'DELETE' }),
    // Billing & reporting
    billing: () => api.request<CorporateBilling>('/corporate/billing'),
    reports: (query: { from?: string; to?: string } = {}) =>
      api.request<CorporateReport>('/corporate/reports', { query }),
    // Vehicle rental contracts (Corporate ↔ Vehicle Owner)
    rentalVehicles: () => api.request<CorporateRentalVehicle[]>('/corporate/rental-vehicles'),
    rentalContracts: () => api.request<CorporateRentalContract[]>('/corporate/rental-contracts'),
    requestRental: (body: CorporateRentalRequestInput) =>
      api.request<CorporateRentalContract>('/corporate/rental-contracts', { method: 'POST', body }),
    cancelRental: (id: string) =>
      api.request<CorporateRentalContract>(`/corporate/rental-contracts/${id}/cancel`, { method: 'POST' }),
    // Reviews of Fleet/Vehicle owners
    fleets: () => api.request<CorporateFleetSummary[]>('/corporate/fleets'),
    reviews: () => api.request<Review[]>('/corporate/reviews'),
    reviewsReceived: () => api.request<Review[]>('/corporate/reviews-received'),
    createReview: (body: CorporateReviewInput) =>
      api.request<Review>('/corporate/reviews', { method: 'POST', body }),
  },

  ops: {
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
    // Review moderation (reviews:moderate)
    reviews: (query: { status?: string; revieweeType?: string; page?: number; pageSize?: number } = {}) =>
      api.request<Paginated<AdminReview>>('/ops/reviews', { query }),
    moderateReview: (id: string, body: ReviewModerationInput) =>
      api.request<AdminReview>(`/ops/reviews/${id}`, { method: 'PATCH', body }),
  },

  finance: {
    runPayouts: () => api.request<{ runId: string }>('/finance/payouts/run', { method: 'POST' }),
    reports: (query: { from?: string; to?: string }) =>
      api.request<Record<string, unknown>>('/finance/reports', { query }),
  },

  coupons: {
    listAdmin: () => api.request<Coupon[]>('/coupons/admin'),
    create: (body: Partial<Coupon>) => api.request<Coupon>('/coupons', { method: 'POST', body }),
    setStatus: (id: string, status: string) =>
      api.request<Coupon>(`/coupons/${id}/status`, { method: 'PATCH', body: { status } }),
    // Customer-facing
    listAvailable: () => api.request<Coupon[]>('/coupons'),
    apply: (body: { code: string; fareMinor: number; cityId?: string }) =>
      api.request<ApplyCouponResult>('/coupons/apply', { method: 'POST', body }),
  },

  system: {
    health: () =>
      api.request<{ status: string; time: string }>('/health', { anonymous: true }),
  },
});

export type Endpoints = ReturnType<typeof createEndpoints>;
