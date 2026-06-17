import type { ISODateString, UUID } from '../models/entities';
import type { RideStatus } from '../models/enums';

/**
 * SignalR hub + event catalogue, mirroring API_ENDPOINTS.md §6. Centralised so
 * the admin panel and the future RN app subscribe to the exact same event
 * names and typed payloads — a renamed event is a one-line change here.
 */
export const Hub = {
  Rides: '/hubs/rides',
  Drivers: '/hubs/drivers',
} as const;
export type Hub = (typeof Hub)[keyof typeof Hub];

export const RideHubEvent = {
  RideMatched: 'RideMatched',
  DriverLocationUpdated: 'DriverLocationUpdated',
  RideStatusChanged: 'RideStatusChanged',
  RideCancelled: 'RideCancelled',
} as const;
export type RideHubEvent = (typeof RideHubEvent)[keyof typeof RideHubEvent];

export const DriverHubEvent = {
  NewRideRequest: 'NewRideRequest',
  RequestExpired: 'RequestExpired',
} as const;
export type DriverHubEvent = (typeof DriverHubEvent)[keyof typeof DriverHubEvent];

// ---- Payload shapes (server → client) ----

export interface RideMatchedPayload {
  rideId: UUID;
  driverId: UUID;
  vehicleId?: UUID;
  etaSeconds?: number;
}

export interface DriverLocationUpdatedPayload {
  rideId: UUID;
  driverId: UUID;
  lat: number;
  lng: number;
  at: ISODateString;
}

export interface RideStatusChangedPayload {
  rideId: UUID;
  status: RideStatus;
  at: ISODateString;
}

export interface RideCancelledPayload {
  rideId: UUID;
  cancelledBy: 'Customer' | 'Driver' | 'System';
  reason?: string;
}

export interface NewRideRequestPayload {
  rideId: UUID;
  pickupAddress?: string;
  fareEstimateMinor?: number;
  expiresInSeconds: number;
}
