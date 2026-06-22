/**
 * Domain enums for BD Cabs. Mirrors API_ENDPOINTS.md conventions.
 * Kept as `const` objects + union types so they are usable as runtime values
 * (iteration, validation) and as types — and tree-shake cleanly into RN.
 */

export const Role = {
  Guest: 'Guest',
  Customer: 'Customer',
  Driver: 'Driver',
  FleetOwner: 'FleetOwner',
  Corporate: 'Corporate',
  SupportAdmin: 'SupportAdmin',
  FinanceAdmin: 'FinanceAdmin',
  SuperAdmin: 'SuperAdmin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Roles that may sign into the admin panel (staff). */
export const STAFF_ROLES: Role[] = [Role.SupportAdmin, Role.FinanceAdmin, Role.SuperAdmin];

export const AccountStatus = {
  Active: 'active',
  Pending: 'pending',
  Suspended: 'suspended',
  Banned: 'banned',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const RideStatus = {
  Requested: 'Requested',
  /** Booked in advance / spawned from a recurring schedule. */
  Scheduled: 'Scheduled',
  Accepted: 'Accepted',
  DriverArrived: 'DriverArrived',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoDriverFound: 'NoDriverFound',
} as const;
export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

/** Who initiated a ride cancellation / which side a review is from. */
export const RideParty = {
  Customer: 'Customer',
  Driver: 'Driver',
  System: 'System',
} as const;
export type RideParty = (typeof RideParty)[keyof typeof RideParty];

export const VehicleType = {
  Bike: 'Bike',
  Car: 'Car',
  Premium: 'Premium',
  CNG: 'CNG',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

/** Operational state of a vehicle, set by its Fleet/Vehicle Owner. */
export const VehicleStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Maintenance: 'maintenance',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

/** Membership state of a driver within an owner's fleet. */
export const FleetDriverStatus = {
  Active: 'active',
  Removed: 'removed',
} as const;
export type FleetDriverStatus = (typeof FleetDriverStatus)[keyof typeof FleetDriverStatus];

export const PaymentMethodType = {
  Cash: 'Cash',
  Card: 'Card',
  Bkash: 'bKash',
  Nagad: 'Nagad',
  Wallet: 'Wallet',
} as const;
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

export const PaymentStatus = {
  Pending: 'Pending',
  Paid: 'Paid',
  Failed: 'Failed',
  Refunded: 'Refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const WalletTxnType = {
  Topup: 'Topup',
  RidePayment: 'RidePayment',
  Payout: 'Payout',
  Refund: 'Refund',
  RentPayment: 'RentPayment',
  Adjustment: 'Adjustment',
} as const;
export type WalletTxnType = (typeof WalletTxnType)[keyof typeof WalletTxnType];

/** Who/what a review is about. */
export const ReviewTargetType = {
  Driver: 'Driver',
  Customer: 'Customer',
  Owner: 'Owner',
  /** A rented Vehicle, rated by a rental Driver after the agreement ends. */
  Vehicle: 'Vehicle',
  /** A Corporate Client, rated by a Vehicle Owner after a rental contract. */
  Corporate: 'Corporate',
} as const;
export type ReviewTargetType = (typeof ReviewTargetType)[keyof typeof ReviewTargetType];

/**
 * Moderation state of a review (Super Admin / Support Admin moderation). Hidden
 * and Removed reviews are kept out of public listings and rating averages;
 * Hidden is reversible, Removed is a soft-delete kept for audit.
 */
export const ReviewStatus = {
  Visible: 'Visible',
  Hidden: 'Hidden',
  Removed: 'Removed',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

/** The action a moderator takes on a review. */
export const ReviewModerationAction = {
  Hide: 'hide',
  Unhide: 'unhide',
  Remove: 'remove',
} as const;
export type ReviewModerationAction =
  (typeof ReviewModerationAction)[keyof typeof ReviewModerationAction];

export const RentalStatus = {
  Requested: 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Active: 'Active',
  Ended: 'Ended',
} as const;
export type RentalStatus = (typeof RentalStatus)[keyof typeof RentalStatus];

export const RentType = {
  Fixed: 'fixed',
  RevenueShare: 'revenue-share',
} as const;
export type RentType = (typeof RentType)[keyof typeof RentType];

export const TicketCategory = {
  Complaint: 'complaint',
  FareDispute: 'fare-dispute',
  Other: 'other',
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketStatus = {
  Open: 'open',
  Pending: 'pending',
  Resolved: 'resolved',
  Closed: 'closed',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const SafetyEventKind = {
  Sos: 'sos',
  TripShare: 'trip-share',
} as const;
export type SafetyEventKind = (typeof SafetyEventKind)[keyof typeof SafetyEventKind];

export const DocumentType = {
  License: 'license',
  Nid: 'nid',
  Insurance: 'insurance',
  Fitness: 'fitness',
  Registration: 'registration',
  Other: 'other',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const VerificationStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** How a driver controls their online availability. "auto" lets the platform manage it. */
export const AvailabilityMode = {
  Online: 'online',
  Offline: 'offline',
  Auto: 'auto',
} as const;
export type AvailabilityMode = (typeof AvailabilityMode)[keyof typeof AvailabilityMode];

export const CouponType = {
  Percentage: 'percentage',
  Flat: 'flat',
  FreeRide: 'free-ride',
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const CouponStatus = {
  Active: 'active',
  Paused: 'paused',
  Expired: 'expired',
} as const;
export type CouponStatus = (typeof CouponStatus)[keyof typeof CouponStatus];

// ---- Corporate Client flows -----------------------------------------------

/** Membership state of an employee under a corporate account. */
export const CorporateEmployeeStatus = {
  Active: 'active',
  Suspended: 'suspended',
} as const;
export type CorporateEmployeeStatus =
  (typeof CorporateEmployeeStatus)[keyof typeof CorporateEmployeeStatus];

/**
 * How a corporate booking is allocated a vehicle: the platform auto-allocates
 * any available vehicle, or the ride is routed to a chosen Fleet/Vehicle Owner.
 */
export const RideAllocationMode = {
  Auto: 'auto',
  Fleet: 'fleet',
} as const;
export type RideAllocationMode = (typeof RideAllocationMode)[keyof typeof RideAllocationMode];

/**
 * Lifecycle of a corporate booking. Bookings that hit an employee's approval
 * rule or spend limit start `PendingApproval`; once cleared they are `Approved`
 * (or `Scheduled` for advance bookings), then `Completed` — which is what
 * billing and reports count.
 */
export const CorporateBookingStatus = {
  PendingApproval: 'PendingApproval',
  Approved: 'Approved',
  Scheduled: 'Scheduled',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
} as const;
export type CorporateBookingStatus =
  (typeof CorporateBookingStatus)[keyof typeof CorporateBookingStatus];

/**
 * Lifecycle of a Corporate ↔ Vehicle Owner rental contract. The corporate
 * requests a rentable vehicle (`Requested`); the owner sets terms and approves
 * (`Approved`), assigns drivers and starts the service period (`Active`), then
 * completes it (`Completed`) — which unlocks the two-way review.
 */
export const CorporateRentalStatus = {
  Requested: 'Requested',
  Approved: 'Approved',
  Active: 'Active',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
} as const;
export type CorporateRentalStatus =
  (typeof CorporateRentalStatus)[keyof typeof CorporateRentalStatus];
