import type {
  AccountStatus,
  CouponStatus,
  CouponType,
  RideStatus,
  Role,
  VerificationStatus,
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
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  avatarUrl?: string;
  createdAt: ISODateString;
}

export interface Driver {
  id: UUID;
  userId: UUID;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  rating?: number;
  vehicleId?: UUID;
}

export interface Vehicle {
  id: UUID;
  ownerId: UUID;
  type: string; // ties to /vehicle-types
  plateNumber: string;
  verificationStatus: VerificationStatus;
  isActive: boolean;
}

export interface Ride {
  id: UUID;
  customerId: UUID;
  driverId?: UUID;
  vehicleTypeId: UUID;
  status: RideStatus;
  pickup: GeoPoint;
  destination: GeoPoint;
  fare?: Money;
  couponCode?: string;
  requestedAt: ISODateString;
  completedAt?: ISODateString;
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
