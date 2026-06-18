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
} as const;
export type ReviewTargetType = (typeof ReviewTargetType)[keyof typeof ReviewTargetType];

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
