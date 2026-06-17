import type {
  AuthSession,
  Coupon,
  Paginated,
  User,
} from '../models/entities';
import type { ApiClient } from './client';

/**
 * Typed endpoint wrappers grouped by resource. These mirror API_ENDPOINTS.md.
 * Screens never build URLs by hand — they call these, so a path change is a
 * one-line edit shared by web and native.
 *
 * Only a representative slice is implemented here to establish the pattern;
 * extend per the endpoint catalogue as features land.
 */
export const createEndpoints = (api: ApiClient) => ({
  auth: {
    login: (body: { emailOrPhone: string; password: string }) =>
      api.request<AuthSession>('/auth/login', { method: 'POST', body, anonymous: true }),
    refresh: (body: { refreshToken: string }) =>
      api.request<AuthSession['tokens']>('/auth/refresh', { method: 'POST', body, anonymous: true }),
    me: () => api.request<User>('/auth/me'),
    logout: () => api.request<void>('/auth/logout', { method: 'POST' }),
  },

  users: {
    list: (query: { page?: number; pageSize?: number; q?: string }) =>
      api.request<Paginated<User>>('/users', { query }),
    get: (id: string) => api.request<User>(`/users/${id}`),
    setStatus: (id: string, status: string) =>
      api.request<User>(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  ops: {
    dashboard: () => api.request<Record<string, number>>('/ops/dashboard'),
    pendingDrivers: () => api.request<Paginated<User>>('/ops/drivers/pending'),
  },

  finance: {
    runPayouts: () => api.request<{ runId: string }>('/finance/payouts/run', { method: 'POST' }),
    reports: (query: { from?: string; to?: string }) =>
      api.request<Record<string, unknown>>('/finance/reports', { query }),
  },

  coupons: {
    listAdmin: () => api.request<Coupon[]>('/coupons/admin'),
    create: (body: Partial<Coupon>) => api.request<Coupon>('/coupons', { method: 'POST', body }),
    setStatus: (id: string, status: string) =>
      api.request<Coupon>(`/coupons/${id}/status`, { method: 'PATCH', body: { status } }),
  },
});

export type Endpoints = ReturnType<typeof createEndpoints>;
