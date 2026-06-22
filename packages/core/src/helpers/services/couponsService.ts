import type { ApplyCouponResult, Coupon } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export const createCouponsService = (api: ApiClient) => ({
  listAdmin: () => api.request<Coupon[]>('/coupons/admin'),
  create: (body: Partial<Coupon>) => api.request<Coupon>('/coupons', { method: 'POST', body }),
  setStatus: (id: string, status: string) =>
    api.request<Coupon>(`/coupons/${id}/status`, { method: 'PATCH', body: { status } }),
  listAvailable: () => api.request<Coupon[]>('/coupons'),
  apply: (body: { code: string; fareMinor: number; cityId?: string }) =>
    api.request<ApplyCouponResult>('/coupons/apply', { method: 'POST', body }),
});

export type CouponsService = ReturnType<typeof createCouponsService>;
