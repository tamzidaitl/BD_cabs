import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useServices } from './ServicesContext';
import { queryKeys } from './keys';
import { useAuthStore } from '../auth/authStore';
import type {
  RecurringRideInput,
  RentalReviewInput,
  ReviewInput,
  RideRequestInput,
  SavedPlaceInput,
  SupportTicketInput,
  RegisterInput,
} from '../helpers';
import type { AvailabilityMode } from '../models/enums';
import type {
  AdminRide,
  AuthSession,
  Coupon,
  Driver,
  DriverEarnings,
  Paginated,
  Review,
  Ride,
  RideCreated,
  RideTrack,
  SavedPlace,
  SupportTicket,
  User,
  Wallet,
} from '../models/entities';

/**
 * Hooks are thin wrappers over the typed endpoints + query keys. They are the
 * public data-access surface for any React renderer — Next.js or React Native —
 * because they depend only on `react` and `@tanstack/react-query`.
 */

export function useCurrentUser(): UseQueryResult<User> {
  const { endpoints } = useServices();
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => endpoints.auth.me(),
    enabled: isAuthed,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegister(): UseMutationResult<AuthSession, unknown, RegisterInput> {
  const { endpoints } = useServices();
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  // Auto-login on signup: the backend returns the same AuthSession as login
  // (tokens + role + status), so we set the session immediately. Pending roles
  // (Driver/FleetOwner/Corporate) are logged in too; route guards decide what
  // they can reach based on their status.
  return useMutation({
    mutationFn: (body) => endpoints.auth.register(body),
    onSuccess: (session) => {
      setSession(session);
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export function useLogin(): UseMutationResult<
  AuthSession,
  unknown,
  { emailOrPhone: string; password: string }
> {
  const { endpoints } = useServices();
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => endpoints.auth.login(vars),
    onSuccess: (session) => {
      setSession(session);
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

/** Change the signed-in user's own password (current + new). Available to every role. */
export function useChangePassword(): UseMutationResult<
  void,
  unknown,
  { currentPassword: string; newPassword: string }
> {
  const { endpoints } = useServices();
  return useMutation({
    mutationFn: (body) => endpoints.auth.changePassword(body),
  });
}

/** Update the signed-in user's own profile (display name / avatar URL). */
export function useUpdateProfile(): UseMutationResult<
  User,
  unknown,
  { fullName?: string; avatarUrl?: string }
> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.auth.updateProfile(body),
    onSuccess: (user) => qc.setQueryData(queryKeys.auth.me(), user),
  });
}

/** Upload a new profile photo; the response is the updated user. */
export function useUploadAvatar(): UseMutationResult<User, unknown, File | Blob> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => endpoints.auth.uploadAvatar(file),
    onSuccess: (user) => qc.setQueryData(queryKeys.auth.me(), user),
  });
}

export function useUsers(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: string;
}): UseQueryResult<Paginated<User>> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => endpoints.users.list(params),
    placeholderData: (prev) => prev,
  });
}

/** Activate / deactivate / suspend / ban a user (authorization enforced by the API). */
export function useSetUserStatus(): UseMutationResult<User, unknown, { id: string; status: string }> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => endpoints.users.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all() }),
  });
}

/** Delete a user (SuperAdmin only — enforced by the API). */
export function useDeleteUser(): UseMutationResult<void, unknown, string> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.users.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all() }),
  });
}

export function useOpsDashboard(enabled = true): UseQueryResult<Record<string, number>> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.ops.dashboard(),
    queryFn: () => endpoints.ops.dashboard(),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/**
 * All rides for the Ops console (paginated, newest first), enriched with the
 * customer, driver, assigned car, and any flagged problems. Refreshes on an
 * interval so the operator sees in-flight trips update. Optionally filtered by
 * ride status.
 */
export function useOpsRides(
  params: { status?: string; page?: number; pageSize?: number } = {},
): UseQueryResult<Paginated<AdminRide>> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.ops.rides(params),
    queryFn: () => endpoints.ops.rides(params),
    placeholderData: (prev) => prev,
    refetchInterval: 20_000,
  });
}

export function useSystemHealth(): UseQueryResult<{ status: string; time: string }> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.system.health(),
    queryFn: () => endpoints.system.health(),
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useAdminCoupons(): UseQueryResult<Coupon[]> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.coupons.admin(),
    queryFn: () => endpoints.coupons.listAdmin(),
  });
}

export function useCreateCoupon(): UseMutationResult<Coupon, unknown, Partial<Coupon>> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.coupons.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.coupons.admin() }),
  });
}

export function useSetCouponStatus(): UseMutationResult<
  Coupon,
  unknown,
  { id: string; status: string }
> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => endpoints.coupons.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.coupons.admin() }),
  });
}

// ===========================================================================
// Customer flow
// ===========================================================================

export function useMyRides(
  params: { page?: number; pageSize?: number } = {},
): UseQueryResult<Paginated<Ride>> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.rides.mine(params),
    queryFn: () => endpoints.rides.mine(params),
    placeholderData: (prev) => prev,
  });
}

export function useRide(id: string, enabled = true): UseQueryResult<Ride> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.rides.detail(id),
    queryFn: () => endpoints.rides.get(id),
    enabled: enabled && !!id,
  });
}

/** Live driver-location/ETA snapshot — polls while the ride is active. */
export function useRideTrack(id: string, enabled = true): UseQueryResult<RideTrack> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.rides.track(id),
    queryFn: () => endpoints.rides.track(id),
    enabled: enabled && !!id,
    refetchInterval: 5_000,
  });
}

export function useRequestRide(): UseMutationResult<RideCreated, unknown, RideRequestInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.rides.request(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rides.all() }),
  });
}

export function useCancelRide(): UseMutationResult<Ride, unknown, { id: string; reason?: string }> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => endpoints.rides.cancel(id, reason),
    onSuccess: (ride) => {
      void qc.invalidateQueries({ queryKey: queryKeys.rides.detail(ride.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.rides.all() });
    },
  });
}

export function useCreateRecurringRide(): UseMutationResult<unknown, unknown, RecurringRideInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.rides.createRecurring(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rides.recurring() }),
  });
}

export function useSavedPlaces(): UseQueryResult<SavedPlace[]> {
  const { endpoints } = useServices();
  return useQuery({ queryKey: queryKeys.places.list(), queryFn: () => endpoints.places.list() });
}

export function useSavePlace(): UseMutationResult<SavedPlace, unknown, SavedPlaceInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.places.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.places.list() }),
  });
}

export function useWallet(): UseQueryResult<Wallet> {
  const { endpoints } = useServices();
  return useQuery({ queryKey: queryKeys.wallet.me(), queryFn: () => endpoints.wallet.me() });
}

export function useApplyCoupon(): UseMutationResult<
  { discountMinor: number; payableMinor: number },
  unknown,
  { code: string; fareMinor: number; cityId?: string }
> {
  const { endpoints } = useServices();
  return useMutation({ mutationFn: (body) => endpoints.coupons.apply(body) });
}

export function useCreateReview(): UseMutationResult<Review, unknown, ReviewInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.reviews.create(body),
    onSuccess: (review) => {
      if (review.rideId) qc.invalidateQueries({ queryKey: queryKeys.reviews.forRide(review.rideId) });
    },
  });
}

/** Reviews left on a ride (visible to its participants) — used to tell which
 * directions a user has already rated. */
export function useRideReviews(rideId: string, enabled = true): UseQueryResult<Review[]> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.reviews.forRide(rideId),
    queryFn: () => endpoints.reviews.forRide(rideId),
    enabled: enabled && !!rideId,
  });
}

/** A rental driver rates the rented car / its owner once the agreement has ended. */
export function useCreateRentalReview(
  agreementId: string,
): UseMutationResult<Review, unknown, RentalReviewInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.reviews.createForRental(agreementId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.reviews.forRental(agreementId) }),
  });
}

/** Reviews left on a rental agreement (visible to its driver/owner) — used to tell
 * which of the vehicle/owner ratings the driver has already submitted. */
export function useRentalReviews(agreementId: string, enabled = true): UseQueryResult<Review[]> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.reviews.forRental(agreementId),
    queryFn: () => endpoints.reviews.forRental(agreementId),
    enabled: enabled && !!agreementId,
  });
}

export function useMyTickets(): UseQueryResult<SupportTicket[]> {
  const { endpoints } = useServices();
  return useQuery({ queryKey: queryKeys.support.mine(), queryFn: () => endpoints.support.myTickets() });
}

export function useCreateTicket(): UseMutationResult<SupportTicket, unknown, SupportTicketInput> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.support.createTicket(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.support.mine() }),
  });
}

// ===========================================================================
// Driver flow
// ===========================================================================

export function useDriverProfile(enabled = true): UseQueryResult<Driver> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.drivers.me(),
    queryFn: () => endpoints.drivers.me(),
    enabled,
  });
}

export function useDriverEarnings(): UseQueryResult<DriverEarnings> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.drivers.earnings(),
    queryFn: () => endpoints.drivers.earnings(),
    refetchInterval: 30_000,
  });
}

/** Pending ride requests near the driver — polls frequently while online. */
export function useNearbyRequests(enabled = true): UseQueryResult<Ride[]> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.rides.nearbyRequests(),
    queryFn: () => endpoints.rides.nearbyRequests(),
    enabled,
    refetchInterval: 10_000,
  });
}

export function useSetAvailability(): UseMutationResult<Driver, unknown, boolean> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isOnline) => endpoints.drivers.setAvailability(isOnline),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.me() }),
  });
}

/** Set the driver availability mode explicitly (online / offline / auto). */
export function useSetAvailabilityMode(): UseMutationResult<Driver, unknown, AvailabilityMode> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode) => endpoints.drivers.setAvailabilityMode(mode),
    onSuccess: (driver) => qc.setQueryData(queryKeys.drivers.me(), driver),
  });
}

/** Push the driver's live GPS location (does not invalidate — fire and forget). */
export function useUpdateDriverLocation(): UseMutationResult<
  Driver,
  unknown,
  { lat: number; lng: number }
> {
  const { endpoints } = useServices();
  return useMutation({ mutationFn: (body) => endpoints.drivers.updateLocation(body) });
}

/** Generic ride-lifecycle action for the driver (accept/arrived/start/complete). */
export function useRideAction(): UseMutationResult<
  Ride,
  unknown,
  { id: string; action: 'accept' | 'reject' | 'arrived' | 'complete' } | { id: string; action: 'start'; otp: string }
> {
  const { endpoints } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => {
      switch (vars.action) {
        case 'accept':
          return endpoints.rides.accept(vars.id);
        case 'reject':
          return endpoints.rides.reject(vars.id);
        case 'arrived':
          return endpoints.rides.arrived(vars.id);
        case 'start':
          return endpoints.rides.start(vars.id, vars.otp);
        case 'complete':
          return endpoints.rides.complete(vars.id);
      }
    },
    onSuccess: (ride) => {
      void qc.invalidateQueries({ queryKey: queryKeys.rides.detail(ride.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.rides.nearbyRequests() });
    },
  });
}
