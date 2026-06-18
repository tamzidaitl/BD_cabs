import { Role } from '@bd-cabs/core';

/**
 * Where each role lands after sign-in. Customers, drivers, and fleet owners all
 * share one authenticated portal mounted at `/app`; which pages they see is
 * decided by their role (see `portalConfigForRole`). Staff go to the admin
 * console. The Corporate portal is not built yet, so it falls back there too.
 */
export function homePathForRole(role: Role | null | undefined): string {
  switch (role) {
    case Role.Customer:
    case Role.Driver:
    case Role.FleetOwner:
      return '/app';
    default:
      return '/dashboard';
  }
}

export interface AppNavItem {
  to: string;
  label: string;
  /** lucide-react icon name. */
  icon: string;
  /** Match the route exactly (for index routes). */
  end?: boolean;
}

export const CUSTOMER_NAV: AppNavItem[] = [
  { to: '/app', label: 'Book a ride', icon: 'MapPin', end: true },
  { to: '/app/rides', label: 'My rides', icon: 'Route' },
  { to: '/app/wallet', label: 'Wallet', icon: 'Wallet' },
  { to: '/app/places', label: 'Saved places', icon: 'Star' },
  { to: '/app/support', label: 'Support', icon: 'LifeBuoy' },
];

export const DRIVER_NAV: AppNavItem[] = [
  { to: '/app', label: 'Drive', icon: 'Navigation', end: true },
  { to: '/app/trips', label: 'Trips', icon: 'Route' },
  { to: '/app/earnings', label: 'Earnings', icon: 'Banknote' },
  { to: '/app/documents', label: 'Documents', icon: 'FileText' },
  { to: '/app/rentals', label: 'Rentals', icon: 'Car' },
];

export const FLEET_NAV: AppNavItem[] = [
  { to: '/app', label: 'Overview', icon: 'LayoutDashboard', end: true },
  { to: '/app/vehicles', label: 'Vehicles', icon: 'Car' },
  { to: '/app/drivers', label: 'Drivers & Rentals', icon: 'Users' },
  { to: '/app/performance', label: 'Performance', icon: 'TrendingUp' },
  { to: '/app/reviews', label: 'Reviews', icon: 'Star' },
];

/** Brand + nav + nav style for a role's view of the shared `/app` portal. */
export interface PortalConfig {
  brand: string;
  nav: AppNavItem[];
  navVariant: 'inline' | 'dropdown';
}

/**
 * Resolve the portal chrome for the three portal roles. Returns null for any
 * other role (staff/corporate/guest), which the shell treats as unauthorized.
 */
export function portalConfigForRole(role: Role | null | undefined): PortalConfig | null {
  switch (role) {
    case Role.Customer:
      return { brand: 'BD Cabs', nav: CUSTOMER_NAV, navVariant: 'dropdown' };
    case Role.Driver:
      return { brand: 'BD Cabs Driver', nav: DRIVER_NAV, navVariant: 'inline' };
    case Role.FleetOwner:
      return { brand: 'BD Cabs Fleet', nav: FLEET_NAV, navVariant: 'inline' };
    default:
      return null;
  }
}

/** A named map location, used by the pickup/destination pickers. */
export interface PresetPlace {
  name: string;
  lat: number;
  lng: number;
}

/**
 * A handful of well-known Dhaka locations so booking is usable without a live
 * map widget. Real apps geocode/drop a pin; these keep the demo realistic.
 */
export const DHAKA_PLACES: PresetPlace[] = [
  { name: 'Gulshan 1', lat: 23.7806, lng: 90.4143 },
  { name: 'Banani', lat: 23.7937, lng: 90.4066 },
  { name: 'Mohakhali', lat: 23.7785, lng: 90.4053 },
  { name: 'Dhanmondi 27', lat: 23.7461, lng: 90.3742 },
  { name: 'Motijheel', lat: 23.733, lng: 90.4172 },
  { name: 'Mirpur 10', lat: 23.8069, lng: 90.3687 },
  { name: 'Uttara Sector 7', lat: 23.8759, lng: 90.3795 },
  { name: 'Shahjalal Airport', lat: 23.8513, lng: 90.4086 },
  { name: 'Farmgate', lat: 23.7583, lng: 90.3899 },
  { name: 'Old Dhaka (Sadarghat)', lat: 23.7104, lng: 90.4074 },
];

/** Safe indexed access into DHAKA_PLACES (falls back to the first entry). */
export function placeAt(index: number): PresetPlace {
  return DHAKA_PLACES[index] ?? DHAKA_PLACES[0]!;
}

/** Great-circle distance between two coordinates, in metres (Haversine). */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** The preset place closest to a coordinate, with its distance in metres. */
export function nearestPlace(lat: number, lng: number): { place: PresetPlace; meters: number } {
  let best = DHAKA_PLACES[0]!;
  let bestMeters = Infinity;
  for (const p of DHAKA_PLACES) {
    const m = haversineMeters(lat, lng, p.lat, p.lng);
    if (m < bestMeters) {
      bestMeters = m;
      best = p;
    }
  }
  return { place: best, meters: bestMeters };
}

/**
 * A human label for a dropped pin: the preset place name when the pin is very
 * close, "Near X" when within ~1.2 km, else the rounded coordinates.
 */
export function describePoint(lat: number, lng: number): string {
  const { place, meters } = nearestPlace(lat, lng);
  if (meters < 250) return place.name;
  if (meters < 1200) return `Near ${place.name}`;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export const VEHICLE_TYPES = ['Bike', 'CNG', 'Car', 'Premium'] as const;

/** Rental billing cadences an owner can advertise (matches backend RentalPeriod). */
export const RENTAL_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export type RentalPeriod = (typeof RENTAL_PERIODS)[number];

/** Per-unit label for a rent price, e.g. "monthly" → "/ month". */
export function rentalPeriodSuffix(period: string | null | undefined): string {
  switch (period) {
    case 'daily':
      return '/ day';
    case 'weekly':
      return '/ week';
    case 'monthly':
      return '/ month';
    default:
      return '/ period';
  }
}

/**
 * Standard, non-negotiable rental terms shown to both owners and drivers on every
 * rental listing. Vehicle-specific terms are added on top of this.
 */
export const RENTAL_STANDARD_TERMS =
  "Fuel and maintenance are the driver's responsibility, and the driver is liable for all accident-related costs.";

/** Format minor units (poisha) as Bangladeshi Taka, e.g. 14178 → "৳141.78". */
export function formatBDT(minor: number | null | undefined): string {
  const v = (minor ?? 0) / 100;
  return `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert taka entered in a form to integer minor units. */
export function takaToMinor(taka: number): number {
  return Math.round(taka * 100);
}

/** Human distance: 3350 → "3.4 km", 850 → "850 m". */
export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

/** Human duration: 482 → "8 min". */
export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Short absolute date-time, e.g. "18 Jun, 2:30 PM". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Relative time from now, e.g. "just now", "5 min ago", "2 h ago", "3 d ago". */
export function formatTimeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  return `${Math.round(diffHr / 24)} d ago`;
}
