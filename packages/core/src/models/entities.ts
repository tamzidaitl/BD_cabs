import type {
  AccountStatus,
  AvailabilityMode,
  CouponStatus,
  CouponType,
  PaymentMethodType,
  PaymentStatus,
  RentalStatus,
  RentType,
  ReviewTargetType,
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
  rentalTerms?: string;
  createdAt: ISODateString;
}

/** A vehicle in the Ops verification queue, with the owner who posted it + its documents. */
export interface VehicleVerification {
  vehicle: Vehicle;
  owner?: User;
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
  notes?: string;
  scheduledFor?: ISODateString;
  /** Trip start code — only present for the assigned driver when a fixed test OTP
   * is configured on the backend; undefined in production. */
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
  rideId: UUID;
  reviewerId: UUID;
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
