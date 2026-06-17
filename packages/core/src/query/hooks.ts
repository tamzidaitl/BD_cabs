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
import type { AuthSession, Coupon, Paginated, User } from '../models/entities';

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

export function useUsers(params: { page?: number; pageSize?: number; q?: string }): UseQueryResult<
  Paginated<User>
> {
  const { endpoints } = useServices();
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => endpoints.users.list(params),
    placeholderData: (prev) => prev,
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
