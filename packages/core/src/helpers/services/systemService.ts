import type { ApiClient } from '../api/apiCore';

export const createSystemService = (api: ApiClient) => ({
  health: () =>
    api.request<{ status: string; time: string }>('/health', { anonymous: true }),
});

export type SystemService = ReturnType<typeof createSystemService>;
