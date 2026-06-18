import type { Permission } from './permissions';

/**
 * Declarative admin navigation. Each item names the permission required to see
 * it; the sidebar renders only items the current role can() access, so nav and
 * route-guards share one definition. `href` matches the Next.js App Router paths.
 */
export interface NavItem {
  label: string;
  href: string;
  /** lucide-react icon name (resolved in the web app). */
  icon: string;
  /** Permission required to see this item. Omit for always-visible. */
  permission?: Permission;
  /** Logical grouping in the sidebar. */
  group: 'Overview' | 'Operations' | 'Finance' | 'Configuration';
}

import { Permission as P } from './permissions';

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', group: 'Overview' },

  // Operations — Support Admin
  { label: 'Live Ops', href: '/ops', icon: 'Activity', permission: P.OPS_DASHBOARD, group: 'Operations' },
  { label: 'Rides', href: '/rides', icon: 'Car', permission: P.OPS_RIDES_VIEW, group: 'Operations' },
  { label: 'Driver Verification', href: '/verification/drivers', icon: 'BadgeCheck', permission: P.DRIVER_VERIFICATION_REVIEW, group: 'Operations' },
  { label: 'Vehicle Verification', href: '/verification/vehicles', icon: 'ShieldCheck', permission: P.VEHICLE_VERIFICATION_REVIEW, group: 'Operations' },
  { label: 'Incidents', href: '/incidents', icon: 'Siren', permission: P.OPS_INCIDENTS_MANAGE, group: 'Operations' },
  { label: 'Review Moderation', href: '/reviews', icon: 'MessageSquareWarning', permission: P.REVIEWS_MODERATE, group: 'Operations' },
  { label: 'Users', href: '/users', icon: 'Users', permission: P.USERS_READ, group: 'Operations' },

  // Finance — Finance Admin
  { label: 'Transactions', href: '/finance/transactions', icon: 'Receipt', permission: P.FINANCE_TRANSACTIONS_VIEW, group: 'Finance' },
  { label: 'Payouts', href: '/finance/payouts', icon: 'Banknote', permission: P.FINANCE_PAYOUTS_RUN, group: 'Finance' },
  { label: 'Invoices', href: '/finance/invoices', icon: 'FileText', permission: P.FINANCE_INVOICES_MANAGE, group: 'Finance' },
  { label: 'Financial Reports', href: '/finance/reports', icon: 'TrendingUp', permission: P.FINANCE_REPORTS_VIEW, group: 'Finance' },

  // Configuration — Super Admin
  { label: 'Pricing & Fare Split', href: '/config/pricing', icon: 'Calculator', permission: P.PRICING_MANAGE, group: 'Configuration' },
  { label: 'Coupons', href: '/config/coupons', icon: 'Ticket', permission: P.COUPONS_MANAGE, group: 'Configuration' },
  { label: 'Cities & Zones', href: '/config/cities', icon: 'MapPin', permission: P.CITIES_MANAGE, group: 'Configuration' },
  { label: 'Analytics', href: '/config/analytics', icon: 'BarChart3', permission: P.ANALYTICS_VIEW, group: 'Configuration' },
  { label: 'Audit Logs', href: '/config/audit', icon: 'ScrollText', permission: P.AUDIT_LOGS_VIEW, group: 'Configuration' },
  { label: 'Roles & Permissions', href: '/config/rbac', icon: 'KeyRound', permission: P.RBAC_MANAGE, group: 'Configuration' },
];
