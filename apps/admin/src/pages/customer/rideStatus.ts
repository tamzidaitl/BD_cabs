import { RideStatus } from '@bd-cabs/core';

/** Maps a ride status to a Bootstrap badge variant. Shared across ride views. */
export function rideStatusVariant(status: string): string {
  switch (status) {
    case RideStatus.Completed:
      return 'success';
    case RideStatus.Cancelled:
    case RideStatus.NoDriverFound:
      return 'danger';
    case RideStatus.InProgress:
      return 'primary';
    case RideStatus.Accepted:
    case RideStatus.DriverArrived:
      return 'info';
    case RideStatus.Scheduled:
      return 'secondary';
    default:
      return 'warning'; // Requested
  }
}
