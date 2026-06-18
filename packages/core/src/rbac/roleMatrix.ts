import { Role } from '../models/enums';
import { ALL_PERMISSIONS, Permission } from './permissions';

/**
 * The single source of truth mapping a Role to the permissions it holds.
 *
 * Separation of duties (per role_wise_story.md §6): the Support Admin who
 * VERIFIES a driver must NOT be able to APPROVE that driver's payout — hence
 * verification permissions live only with SupportAdmin and payout permissions
 * only with FinanceAdmin. SuperAdmin gets the wildcard.
 *
 * Non-staff roles (Customer/Driver/FleetOwner/Corporate) are listed for
 * completeness so the future React Native app reuses this same matrix; they
 * simply carry no admin-panel permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly (Permission | typeof ALL_PERMISSIONS)[]> = {
  [Role.SuperAdmin]: [ALL_PERMISSIONS],

  [Role.SupportAdmin]: [
    Permission.USERS_READ,
    Permission.USERS_ACTIVATE,
    Permission.OPS_DASHBOARD,
    Permission.OPS_RIDES_VIEW,
    Permission.OPS_BOOKINGS_CREATE,
    Permission.OPS_TRIPS_REASSIGN,
    Permission.OPS_FRAUD_VIEW,
    Permission.OPS_INCIDENTS_MANAGE,
    Permission.DRIVER_VERIFICATION_REVIEW,
    Permission.VEHICLE_VERIFICATION_REVIEW,
    Permission.REVIEWS_MODERATE,
  ],

  [Role.FinanceAdmin]: [
    Permission.USERS_READ,
    Permission.FINANCE_TRANSACTIONS_VIEW,
    Permission.FINANCE_PAYOUTS_RUN,
    Permission.FINANCE_REFUNDS_ISSUE,
    Permission.FINANCE_INVOICES_MANAGE,
    Permission.FINANCE_COMMISSIONS_VIEW,
    Permission.FINANCE_REPORTS_VIEW,
  ],

  // Non-staff roles: no admin-panel permissions (their UIs live in the RN app).
  [Role.Customer]: [],
  [Role.Driver]: [],
  [Role.FleetOwner]: [],
  [Role.Corporate]: [],
  [Role.Guest]: [],
};
