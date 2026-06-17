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
  Accepted: 'Accepted',
  DriverArrived: 'DriverArrived',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoDriverFound: 'NoDriverFound',
} as const;
export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

export const VerificationStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

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
