/**
 * Permissions are `resource:action` strings. UI and (ideally) the API both
 * gate on these. Keeping them as a const map gives us autocomplete + a single
 * source of truth that the React Native app reuses verbatim.
 *
 * Derived from API_ENDPOINTS.md §13 (Ops / Finance / Admin) and role_wise_story.md.
 */
export const Permission = {
  // Users & staff
  USERS_READ: 'users:read',
  USERS_MANAGE_STATUS: 'users:manage-status', // activate/suspend/ban
  STAFF_MANAGE: 'staff:manage', // create staff, change roles

  // Operations (Support Admin)
  OPS_DASHBOARD: 'ops:dashboard',
  OPS_RIDES_VIEW: 'ops:rides-view',
  OPS_BOOKINGS_CREATE: 'ops:bookings-create',
  OPS_TRIPS_REASSIGN: 'ops:trips-reassign',
  OPS_FRAUD_VIEW: 'ops:fraud-view',
  OPS_INCIDENTS_MANAGE: 'ops:incidents-manage',
  DRIVER_VERIFICATION_REVIEW: 'driver-verification:review',
  VEHICLE_VERIFICATION_REVIEW: 'vehicle-verification:review',
  REVIEWS_MODERATE: 'reviews:moderate',

  // Finance (Finance Admin)
  FINANCE_TRANSACTIONS_VIEW: 'finance:transactions-view',
  FINANCE_PAYOUTS_RUN: 'finance:payouts-run',
  FINANCE_REFUNDS_ISSUE: 'finance:refunds-issue',
  FINANCE_INVOICES_MANAGE: 'finance:invoices-manage',
  FINANCE_COMMISSIONS_VIEW: 'finance:commissions-view',
  FINANCE_REPORTS_VIEW: 'finance:reports-view',

  // Configuration & analytics (Super Admin)
  PRICING_MANAGE: 'pricing:manage',
  FARE_SPLIT_MANAGE: 'fare-split:manage',
  COUPONS_MANAGE: 'coupons:manage',
  CITIES_MANAGE: 'cities:manage',
  ANNOUNCEMENTS_SEND: 'announcements:send',
  ANALYTICS_VIEW: 'analytics:view',
  AUDIT_LOGS_VIEW: 'audit-logs:view',
  SYSTEM_CONFIG_MANAGE: 'system-config:manage',
  RBAC_MANAGE: 'rbac:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/** Wildcard granted to Super Admin — matches every permission in `can()`. */
export const ALL_PERMISSIONS = '*' as const;
