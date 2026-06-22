/**
 * Centralised TanStack Query keys. Co-locating them prevents cache-key drift
 * between the web admin and the native app, and makes invalidation explicit.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    all: () => ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  ops: {
    dashboard: () => ['ops', 'dashboard'] as const,
    rides: (params: Record<string, unknown>) => ['ops', 'rides', params] as const,
    pendingDrivers: () => ['ops', 'drivers', 'pending'] as const,
    pendingVehicles: () => ['ops', 'vehicles', 'pending'] as const,
    reviews: (params: Record<string, unknown>) => ['ops', 'reviews', params] as const,
  },
  coupons: {
    admin: () => ['coupons', 'admin'] as const,
    available: () => ['coupons', 'available'] as const,
  },
  rides: {
    all: () => ['rides'] as const,
    mine: (params: Record<string, unknown>) => ['rides', 'mine', params] as const,
    detail: (id: string) => ['rides', 'detail', id] as const,
    track: (id: string) => ['rides', 'track', id] as const,
    fareBreakdown: (id: string) => ['rides', 'fare', id] as const,
    recurring: () => ['rides', 'recurring'] as const,
    nearbyVehicles: (params: Record<string, unknown>) => ['rides', 'nearby-vehicles', params] as const,
    nearbyRequests: () => ['rides', 'nearby-requests'] as const,
  },
  places: {
    list: () => ['places', 'list'] as const,
    recent: () => ['places', 'recent'] as const,
  },
  payments: {
    methods: () => ['payments', 'methods'] as const,
    history: () => ['payments', 'history'] as const,
  },
  wallet: {
    me: () => ['wallet', 'me'] as const,
    transactions: () => ['wallet', 'transactions'] as const,
  },
  reviews: {
    me: () => ['reviews', 'me'] as const,
    forRide: (rideId: string) => ['reviews', 'ride', rideId] as const,
    forUser: (userId: string) => ['reviews', 'user', userId] as const,
    forRental: (agreementId: string) => ['reviews', 'rental', agreementId] as const,
  },
  support: {
    mine: () => ['support', 'tickets', 'me'] as const,
    detail: (id: string) => ['support', 'tickets', id] as const,
  },
  drivers: {
    me: () => ['drivers', 'me'] as const,
    documents: () => ['drivers', 'documents'] as const,
    earnings: () => ['drivers', 'earnings'] as const,
    trips: (params: Record<string, unknown>) => ['drivers', 'trips', params] as const,
    rating: (id: string) => ['drivers', 'rating', id] as const,
  },
  rentals: {
    available: () => ['rentals', 'available'] as const,
    mine: () => ['rentals', 'mine'] as const,
    rentDue: (id: string) => ['rentals', 'rent-due', id] as const,
  },
  vehicles: {
    mine: () => ['vehicles', 'mine'] as const,
    documents: (id: string) => ['vehicles', 'documents', id] as const,
  },
  fleet: {
    me: () => ['fleet', 'me'] as const,
    vehicles: () => ['fleet', 'vehicles'] as const,
    drivers: () => ['fleet', 'drivers'] as const,
    rentalRequests: () => ['fleet', 'rental-requests'] as const,
    rentReceived: (id: string) => ['fleet', 'rent-received', id] as const,
    performance: () => ['fleet', 'performance'] as const,
    revenue: (params: Record<string, unknown>) => ['fleet', 'revenue', params] as const,
    settlements: () => ['fleet', 'settlements'] as const,
    reviews: () => ['fleet', 'reviews'] as const,
    corporateRentals: () => ['fleet', 'corporate-rentals'] as const,
  },
  corporate: {
    me: () => ['corporate', 'me'] as const,
    employees: () => ['corporate', 'employees'] as const,
    /** Prefix for every bookings query, for invalidating all status filters at once. */
    bookingsAll: () => ['corporate', 'bookings'] as const,
    bookings: (params: Record<string, unknown>) => ['corporate', 'bookings', params] as const,
    recurring: () => ['corporate', 'recurring'] as const,
    billing: () => ['corporate', 'billing'] as const,
    reports: (params: Record<string, unknown>) => ['corporate', 'reports', params] as const,
    fleets: () => ['corporate', 'fleets'] as const,
    reviews: () => ['corporate', 'reviews'] as const,
    reviewsReceived: () => ['corporate', 'reviews-received'] as const,
    rentalVehicles: () => ['corporate', 'rental-vehicles'] as const,
    rentalContracts: () => ['corporate', 'rental-contracts'] as const,
  },
  system: {
    health: () => ['system', 'health'] as const,
  },
} as const;
