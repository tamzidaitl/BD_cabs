import type {
  AccountStatus,
  AvailabilityMode,
  CorporateBookingStatus,
  CorporateEmployeeStatus,
  CorporateRentalStatus,
  CouponStatus,
  CouponType,
  PaymentMethodType,
  PaymentStatus,
  RentalStatus,
  RentType,
  ReviewStatus,
  ReviewTargetType,
  RideAllocationMode,
  RideParty,
  RideStatus,
  Role,
  TicketCategory,
  TicketStatus,
  VerificationStatus,
  WalletTxnType,
} from './enums';

/** UUID v4 string (per API convention). */
export type UUID = string;
/** ISO 8601 UTC timestamp string. */
export type ISODateString = string;

/**
 * Money is always minor units (paisa) + currency, per API_ENDPOINTS.md §Conventions.
 * Never store money as a float.
 */
export interface Money {
  amount: number; // integer, minor units
  currency: string; // e.g. "BDT"
}

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface User {
  id: UUID;
  firstName: string;
  lastName: string;
  /** Display name, composed from first + last name on registration. */
  fullName: string;
  /** "male" | "female" | "third-gender". */
  gender?: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  avatarUrl?: string;
  createdAt: ISODateString;
}

/** Driver profile (GET /drivers/me), aligned with the backend DriverProfileDto. */
export interface Driver {
  id: UUID;
  userId: UUID;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  availabilityMode: AvailabilityMode;
  rating?: number;
  isRentalDriver: boolean;
  activeVehicleId?: UUID;
  currentLat?: number;
  currentLng?: number;
  licenseNumber?: string;
}

export interface Vehicle {
  id: UUID;
  ownerId: UUID;
  type: string; // one of VehicleType
  plateNumber: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  description?: string;
  /** Cover photo (first of photoUrls). */
  photoUrl?: string;
  /** Uploaded vehicle photos (1–5). */
  photoUrls: string[];
  verificationStatus: VerificationStatus;
  /** Operational state — one of VehicleStatus. */
  status: string;
  isActive: boolean;
  forRent: boolean;
  rentalPriceMinor?: number;
  /** Billing cadence for the rent — one of RentalPeriod (daily | weekly | monthly). */
  rentalPeriod?: string;
  rentalTerms?: string;
  /** True when the car is in a renting driver's hands — the owner can't change its status. */
  isRentedOut?: boolean;
  createdAt: ISODateString;
}

/** A vehicle in the Ops verification queue, with the owner who posted it + its documents. */
export interface VehicleVerification {
  vehicle: Vehicle;
  owner?: User;
  documents: VehicleDocument[];
}

/** The Fleet Owner offering a vehicle for rent, with their aggregate rating. */
export interface RentalOwner {
  id: UUID;
  fullName: string;
  companyName?: string;
  avatarUrl?: string;
  /** Aggregate rating from rider/driver reviews; absent until first rated. */
  rating?: number;
}

/**
 * A rentable vehicle as shown to a driver browsing the marketplace, enriched with
 * the offering owner and the vehicle's verified documents.
 */
export interface RentalVehicleListing {
  vehicle: Vehicle;
  owner?: RentalOwner;
  /** Uploaded documents (registration, insurance, fitness) with verification status. */
  documents: VehicleDocument[];
}

/** A document attached to a vehicle (registration, insurance, fitness — track expiry). */
export interface VehicleDocument {
  id: UUID;
  vehicleId: UUID;
  type: string; // one of DocumentType
  documentUrl: string;
  number?: string;
  expiresAt?: ISODateString;
  verificationStatus: VerificationStatus;
  createdAt: ISODateString;
}

/** Lightweight customer profile attached to a ride for the driver's view. */
export interface RideCustomer {
  id: UUID;
  fullName: string;
  avatarUrl?: string | null;
}

/**
 * A ride/trip. Money fields are minor units (poisha). Mirrors the backend
 * RideDto — the spine of both the Customer and Driver flows.
 */
export interface Ride {
  id: UUID;
  customerId: UUID;
  driverId?: UUID;
  vehicleId?: UUID;
  vehicleTypeId: string;
  status: RideStatus;
  pickup: GeoPoint;
  destination: GeoPoint;
  distanceMeters: number;
  durationSeconds: number;
  currency: string;
  fareEstimateMinor: number;
  finalFareMinor?: number;
  discountMinor: number;
  couponCode?: string;
  paymentMethod: string;
  /** Settlement state of the ride charge — one of PaymentStatus. "Paid" once the
   * rider has paid; persisted server-side so the UI shows a durable paid state
   * across reloads rather than relying on transient mutation state. */
  paymentStatus?: PaymentStatus;
  /** Amount actually charged (minor units); present once paid. */
  amountPaidMinor?: number;
  /** When the charge settled; absent until paid. */
  paidAt?: ISODateString;
  notes?: string;
  scheduledFor?: ISODateString;
  /** Unique per-trip start code, generated when the ride is requested. Surfaced
   * only to the rider on their own ride — they read it out to the driver, who
   * enters it to start the trip. Never sent to the driver. */
  startOtp?: string;
  /** Customer summary (name + avatar) — populated in the driver's nearby-requests feed. */
  customer?: RideCustomer;
  cancelledBy?: RideParty;
  cancelReason?: string;
  cancellationFeeMinor: number;
  requestedAt: ISODateString;
  acceptedAt?: ISODateString;
  arrivedAt?: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  cancelledAt?: ISODateString;
  /** Stars (1–5) the customer gave the driver for this ride; present on the
   * customer's own ride history once rated, absent when not yet rated. */
  customerRating?: number;
  /** Stars (1–5) the driver gave the passenger for this trip; present on the
   * driver's own trip history once rated, absent when not yet rated. */
  driverRating?: number;
}

/** A ride party (customer or driver) summarised for the Ops rides console. */
export interface AdminRideParty {
  id: UUID;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

/** The car assigned to a ride, summarised for the Ops rides console. */
export interface AdminRideVehicle {
  id: UUID;
  type: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
  /** Operational state — one of VehicleStatus. */
  status: string;
  /** One of VerificationStatus. */
  verificationStatus: string;
}

/**
 * An enriched ride row for the Support/Super Admin rides console (GET /ops/rides):
 * who is riding with whom, the pickup/destination, the assigned car, and any
 * problems flagged on the trip. Mirrors the backend AdminRideDto.
 */
export interface AdminRide {
  id: UUID;
  status: RideStatus;
  vehicleTypeId: string;
  customer: AdminRideParty;
  driver?: AdminRideParty | null;
  vehicle?: AdminRideVehicle | null;
  pickup: GeoPoint;
  destination: GeoPoint;
  distanceMeters: number;
  durationSeconds: number;
  currency: string;
  fareEstimateMinor: number;
  finalFareMinor?: number | null;
  discountMinor: number;
  paymentMethod: string;
  /** Settlement state of the ride charge — one of PaymentStatus. */
  paymentStatus?: PaymentStatus;
  amountPaidMinor?: number | null;
  paidAt?: ISODateString | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
  /** Human-readable problems flagged on this ride; empty when all is well. */
  problems: string[];
  requestedAt: ISODateString;
  startedAt?: ISODateString | null;
  completedAt?: ISODateString | null;
  cancelledAt?: ISODateString | null;
}

/** Result of POST /rides/request — the ride plus the OTP shared with the driver. */
export interface RideCreated {
  ride: Ride;
  startOtp?: string;
}

/** Result of POST /rides/estimate. */
export interface FareEstimateResult {
  currency: string;
  fareEstimateMinor: number;
  distanceMeters: number;
  durationSeconds: number;
  etaSeconds: number;
}

/** A driving route traced along roads (GET /rides/route) — the line a map draws. */
export interface RoutePath {
  distanceMeters: number;
  durationSeconds: number;
  /** Ordered [lat, lng] points tracing the route along roads. */
  coordinates: [number, number][];
}

/** A driver/vehicle available near a pickup (GET /rides/nearby-vehicles). */
export interface NearbyVehicle {
  driverId: UUID;
  vehicleType: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  etaSeconds: number;
  rating?: number;
}

/** Live tracking snapshot (GET /rides/{id}/track). */
export interface RideTrack {
  rideId: UUID;
  status: RideStatus;
  driverLat?: number;
  driverLng?: number;
  etaSeconds?: number;
  updatedAt?: ISODateString;
}

/** A recurring ride schedule (e.g. a daily commute). */
export interface RecurringRide {
  id: UUID;
  customerId: UUID;
  pickup: GeoPoint;
  destination: GeoPoint;
  vehicleTypeId: string;
  paymentMethod: string;
  /** Days of week to repeat: 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  /** Local pickup time, "HH:mm". */
  timeOfDay: string;
  startDate: ISODateString;
  endDate?: ISODateString;
  active: boolean;
  createdAt: ISODateString;
}

export interface FareSplit {
  platformCommission: Money;
  ownerCut: Money;
  driverEarnings: Money;
  couponCost: Money;
  couponCostBorneBy: 'platform' | 'owner';
}

export interface FareBreakdown {
  rideId: UUID;
  baseFare: Money;
  distanceFare: Money;
  timeFare: Money;
  surge?: Money;
  discount: Money;
  total: Money;
  split: FareSplit;
}

export interface Coupon {
  id: UUID;
  code: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minFare?: number;
  validFrom: ISODateString;
  validTo: ISODateString;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  applicableCities?: UUID[];
  applicableRoles?: Role[];
  costBorneBy: 'platform' | 'owner';
  firstRideOnly?: boolean;
  status: CouponStatus;
}

/** Generic paginated envelope returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Error envelope: { error: { code, message, details } }. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  userId: UUID;
  role: Role;
  status: AccountStatus;
  tokens: AuthTokens;
}

// ---- Customer: places, payments, wallet, reviews, support, safety ----------

export interface SavedPlace {
  id: UUID;
  label: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: ISODateString;
}

/** A recently used location, derived from ride history. */
export interface RecentPlace {
  address: string;
  lat: number;
  lng: number;
  usedAt: ISODateString;
}

export interface PaymentMethod {
  id: UUID;
  type: PaymentMethodType;
  label?: string;
  last4?: string;
  isDefault: boolean;
  createdAt: ISODateString;
}

export interface Payment {
  id: UUID;
  rideId: UUID;
  currency: string;
  amountMinor: number;
  method: PaymentMethodType;
  status: PaymentStatus;
  createdAt: ISODateString;
}

export interface Wallet {
  id: UUID;
  currency: string;
  balanceMinor: number;
}

export interface WalletTransaction {
  id: UUID;
  type: WalletTxnType;
  /** Signed minor-unit amount (positive = credit, negative = debit). */
  amountMinor: number;
  balanceAfterMinor: number;
  reference?: string;
  createdAt: ISODateString;
}

export interface Review {
  id: UUID;
  /** The ride this review is about; absent for rental-agreement reviews. */
  rideId?: UUID;
  /** The rental agreement this review is about; absent for ride reviews. */
  rentalAgreementId?: UUID;
  reviewerId: UUID;
  /** Display name of who left the review; present on the "my rating & reviews" surface. */
  reviewerName?: string;
  /** Avatar of who left the review; present on the "my rating & reviews" surface. */
  reviewerAvatarUrl?: string;
  revieweeId: UUID;
  revieweeType: ReviewTargetType;
  rating: number;
  comment?: string;
  tags: string[];
  createdAt: ISODateString;
}

/** Aggregate rating for a user/driver (GET /drivers/{id}/rating). */
export interface RatingSummary {
  userId: UUID;
  average: number;
  count: number;
}

/** The signed-in user's rating summary + received review history (GET /reviews/me). */
export interface ProfileReviews {
  summary: RatingSummary;
  reviews: Review[];
}

/**
 * A review as seen by a moderator (GET /ops/reviews). Adds the moderation state
 * and the names of both parties so staff can judge it in context.
 */
export interface AdminReview {
  id: UUID;
  rideId: UUID;
  reviewerId: UUID;
  reviewerName?: string;
  revieweeId: UUID;
  revieweeName?: string;
  revieweeType: ReviewTargetType;
  rating: number;
  comment?: string;
  tags: string[];
  /** One of ReviewStatus (Visible | Hidden | Removed). */
  status: ReviewStatus;
  moderatedBy?: UUID;
  moderatedAt?: ISODateString;
  moderationReason?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SupportTicket {
  id: UUID;
  category: TicketCategory;
  subject: string;
  body: string;
  rideId?: UUID;
  status: TicketStatus;
  createdAt: ISODateString;
}

export interface SafetyEvent {
  id: UUID;
  kind: 'sos' | 'trip-share';
  rideId?: UUID;
  status: 'active' | 'resolved';
  shareToken?: string;
  createdAt: ISODateString;
}

/** Fare-split as returned by the API (flat minor units), per GET /fares/breakdown. */
export interface FareSplitResult {
  platformCommissionMinor: number;
  ownerCutMinor: number;
  driverEarningsMinor: number;
  couponCostMinor: number;
  couponCostBorneBy: 'platform' | 'owner';
}

/** Detailed fare breakdown as returned by GET /fares/breakdown/{rideId}. */
export interface FareBreakdownResult {
  rideId: UUID;
  currency: string;
  baseFareMinor: number;
  distanceFareMinor: number;
  timeFareMinor: number;
  surgeMinor: number;
  discountMinor: number;
  totalMinor: number;
  split: FareSplitResult;
}

/** Result of POST /coupons/apply. */
export interface ApplyCouponResult {
  code: string;
  type: CouponType;
  discountMinor: number;
  fareMinor: number;
  payableMinor: number;
  costBorneBy: 'platform' | 'owner';
}

// ---- Driver: documents, earnings, rentals ---------------------------------

export interface DriverDocument {
  id: UUID;
  type: string; // one of DocumentType
  documentUrl: string;
  number?: string;
  expiresAt?: ISODateString;
  verificationStatus: VerificationStatus;
  createdAt: ISODateString;
}

export interface DriverEarnings {
  currency: string;
  todayMinor: number;
  weekMinor: number;
  totalMinor: number;
  completedTrips: number;
  walletBalanceMinor: number;
}

export interface RentalAgreement {
  id: UUID;
  vehicleId: UUID;
  ownerId: UUID;
  driverId: UUID;
  status: RentalStatus;
  rentType?: RentType;
  rentAmountMinor?: number;
  revenueSharePct?: number;
  startDate?: ISODateString;
  endDate?: ISODateString;
  requestedAt: ISODateString;
  approvedAt?: ISODateString;
  /** The driver who requested/rents the car (name, phone, avatar, rating). */
  driver?: RentalDriver;
  /** The rented car (photo, plate, and the owner's listed price/period). */
  vehicle?: RentalVehicleSummary;
}

/** Lightweight vehicle summary attached to a rental agreement: enough to show the
 * car (photo, make/model/plate) and the Fleet Owner's listed rent. */
export interface RentalVehicleSummary {
  id: UUID;
  type: string;
  plateNumber: string;
  make?: string;
  model?: string;
  photoUrl?: string;
  /** The owner's listed rent (minor units), independent of the negotiated terms. */
  rentalPriceMinor?: number;
  rentalPeriod?: string;
}

/** Lightweight driver summary attached to a rental request for the owner's view. */
export interface RentalDriver {
  id: UUID;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  rating?: number;
}

export interface RentDue {
  rentalAgreementId: UUID;
  currency: string;
  amountDueMinor: number;
  rentType: RentType;
  period: string;
}

export interface RentPayment {
  id: UUID;
  rentalAgreementId: UUID;
  currency: string;
  amountMinor: number;
  status: PaymentStatus;
  period?: string;
  createdAt: ISODateString;
}

// ---- Fleet / Vehicle Owner ------------------------------------------------

/** Owner business profile + KYC verification status (GET /fleet/me). */
export interface FleetProfile {
  id: UUID;
  userId: UUID;
  companyName?: string;
  tradeLicenseNumber?: string;
  nidNumber?: string;
  bankAccount?: string;
  verificationStatus: VerificationStatus;
  rating?: number;
}

/** A driver in the owner's fleet roster (GET /fleet/drivers). */
export interface FleetDriver {
  id: UUID;
  driverId: UUID;
  status: string; // one of FleetDriverStatus
  note?: string;
  invitedAt: ISODateString;
  driver?: User;
}

/** Rent/revenue-share received from a driver (GET /fleet/rentals/{id}/rent-received). */
export interface RentReceived {
  rentalAgreementId: UUID;
  currency: string;
  totalReceivedMinor: number;
  payments: RentPayment[];
}

/** Per-vehicle performance row (GET /fleet/performance). */
export interface VehiclePerformance {
  vehicleId: UUID;
  plateNumber: string;
  status: string;
  completedTrips: number;
  grossFareMinor: number;
  ownerEarningsMinor: number;
  activeDriverId?: UUID;
  currentLat?: number;
  currentLng?: number;
  locationUpdatedAt?: ISODateString;
}

/** Revenue report over a date range (GET /fleet/revenue). */
export interface RevenueReport {
  currency: string;
  from: ISODateString;
  to: ISODateString;
  completedTrips: number;
  grossFareMinor: number;
  ownerCutMinor: number;
  rentCollectedMinor: number;
  totalRevenueMinor: number;
}

/** Owner settlement/payout statement line (GET /fleet/settlements). */
export interface Settlement {
  period: string;
  currency: string;
  rentCollectedMinor: number;
  ownerCutMinor: number;
  totalMinor: number;
}

// ---- Corporate Client -----------------------------------------------------

/** Company business profile + KYC/billing details (GET /corporate/me). */
export interface CorporateProfile {
  id: UUID;
  userId: UUID;
  companyName?: string;
  tradeLicenseNumber?: string;
  billingEmail?: string;
  billingAddress?: string;
  verificationStatus: VerificationStatus;
  rating?: number;
}

/** An employee who may have rides booked under the company (GET /corporate/employees). */
export interface CorporateEmployee {
  id: UUID;
  fullName: string;
  email?: string;
  phone?: string;
  /** Linked end-user account, when the employee email matches one. */
  userId?: UUID;
  status: CorporateEmployeeStatus;
  /** Monthly spend cap in minor units; null = no cap. */
  monthlySpendLimitMinor?: number;
  /** When true, every booking for this employee needs admin approval. */
  requiresApproval: boolean;
  /** This calendar month's completed spend (minor units). */
  spentThisMonthMinor: number;
}

/** A ride booked for an employee (GET /corporate/bookings). Money is minor units. */
export interface CorporateBooking {
  id: UUID;
  employeeId: UUID;
  employeeName?: string;
  vehicleTypeId: string;
  status: CorporateBookingStatus;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  destLat: number;
  destLng: number;
  destAddress?: string;
  distanceMeters: number;
  durationSeconds: number;
  currency: string;
  fareEstimateMinor: number;
  finalFareMinor?: number;
  allocationMode: RideAllocationMode;
  preferredFleetId?: UUID;
  approvalRequired: boolean;
  rejectionReason?: string;
  notes?: string;
  scheduledFor?: ISODateString;
  requestedAt: ISODateString;
  completedAt?: ISODateString;
}

/** Result of POST /corporate/bookings/estimate — fare + whether approval is needed. */
export interface CorporateBookingEstimate {
  currency: string;
  distanceMeters: number;
  durationSeconds: number;
  fareEstimateMinor: number;
  approvalRequired: boolean;
  monthlyLimitMinor?: number;
  spentThisMonthMinor: number;
  /** True when this trip would push the employee over their monthly cap. */
  exceedsLimit: boolean;
}

/** A recurring corporate ride schedule for an employee (GET /corporate/recurring). */
export interface CorporateRecurringRide {
  id: UUID;
  employeeId: UUID;
  employeeName?: string;
  vehicleTypeId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  destLat: number;
  destLng: number;
  destAddress?: string;
  allocationMode: RideAllocationMode;
  preferredFleetId?: UUID;
  /** Days of week the ride repeats: 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  /** Local pickup time, "HH:mm". */
  timeOfDay: string;
  startDate: ISODateString;
  endDate?: ISODateString;
  active: boolean;
}

/** A monthly billing statement line (part of GET /corporate/billing). */
export interface CorporateStatement {
  period: string;
  currency: string;
  trips: number;
  amountMinor: number;
}

/** Company billing summary — current outstanding + monthly statements. */
export interface CorporateBilling {
  currency: string;
  billingEmail?: string;
  billingAddress?: string;
  currentMonthMinor: number;
  currentMonthTrips: number;
  statements: CorporateStatement[];
}

/** Per-employee row in the consolidated report. */
export interface CorporateEmployeeSpend {
  employeeId: UUID;
  employeeName: string;
  trips: number;
  spendMinor: number;
}

/** Per-vehicle-type row in the consolidated report. */
export interface CorporateVehicleTypeSpend {
  vehicleType: string;
  trips: number;
  spendMinor: number;
}

/** Consolidated trip + spend report over a date range (GET /corporate/reports). */
export interface CorporateReport {
  currency: string;
  from: ISODateString;
  to: ISODateString;
  totalTrips: number;
  totalSpendMinor: number;
  byEmployee: CorporateEmployeeSpend[];
  byVehicleType: CorporateVehicleTypeSpend[];
}

/** A Fleet/Vehicle Owner the corporate can route to / review (GET /corporate/fleets). */
export interface CorporateFleetSummary {
  ownerId: UUID;
  companyName?: string;
  rating?: number;
  vehicleCount: number;
  /** True when a rental contract with this owner has completed — gates the review. */
  canReview: boolean;
}

// ---- Corporate ↔ Vehicle Owner rental contracts ---------------------------

/**
 * A rental contract under which a Vehicle Owner rents a vehicle to a Corporate
 * Client for a service period. Enrichment fields are filled per audience: the
 * corporate sees `ownerCompanyName`; the owner sees `corporateCompanyName`; both
 * see the vehicle and the assigned drivers.
 */
export interface CorporateRentalContract {
  id: UUID;
  corporateId: UUID;
  ownerId: UUID;
  vehicleId: UUID;
  status: CorporateRentalStatus;
  /** Billing cadence — one of RentalPeriod (daily | weekly | monthly). */
  period: string;
  currency: string;
  /** Rate per period (minor units); set when the owner approves. */
  rateMinor?: number;
  startDate?: ISODateString;
  endDate?: ISODateString;
  servicePurpose?: string;
  notes?: string;
  rejectionReason?: string;
  requestedAt: ISODateString;
  approvedAt?: ISODateString;
  activatedAt?: ISODateString;
  completedAt?: ISODateString;
  cancelledAt?: ISODateString;
  // Enrichment
  vehicle?: Vehicle;
  /** The owner's fleet company name (shown to the corporate). */
  ownerCompanyName?: string;
  /** The renting company's name (shown to the owner). */
  corporateCompanyName?: string;
  /** Drivers currently assigned to operate the vehicle. */
  drivers: CorporateRentalDriver[];
  /** True once completed — the two parties may review each other. */
  canReview: boolean;
}

/** A driver assigned by the owner to operate a vehicle on a corporate rental contract. */
export interface CorporateRentalDriver {
  id: UUID;
  contractId: UUID;
  driverId: UUID;
  status: string; // one of CorporateRentalDriverStatus (assigned | unassigned)
  assignedAt: ISODateString;
  /** The assigned driver's profile (name, phone, avatar, rating). */
  driver?: RentalDriver;
}

/** A rentable owner vehicle a corporate can request (GET /corporate/rental-vehicles). */
export interface CorporateRentalVehicle {
  vehicle: Vehicle;
  ownerId: UUID;
  ownerCompanyName?: string;
  ownerRating?: number;
}
