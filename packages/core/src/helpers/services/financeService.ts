import type { ApiClient } from '../api/apiCore';

export const createFinanceService = (api: ApiClient) => ({
  runPayouts: () => api.request<{ runId: string }>('/finance/payouts/run', { method: 'POST' }),
  reports: (query: { from?: string; to?: string }) =>
    api.request<Record<string, unknown>>('/finance/reports', { query }),
});

export type FinanceService = ReturnType<typeof createFinanceService>;
