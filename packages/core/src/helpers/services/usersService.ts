import type { Paginated, User } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export const createUsersService = (api: ApiClient) => ({
  list: (query: { page?: number; pageSize?: number; q?: string; role?: string }) =>
    api.request<Paginated<User>>('/users', { query }),
  get: (id: string) => api.request<User>(`/users/${id}`),
  setStatus: (id: string, status: string) =>
    api.request<User>(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id: string) => api.request<void>(`/users/${id}`, { method: 'DELETE' }),
});

export type UsersService = ReturnType<typeof createUsersService>;
