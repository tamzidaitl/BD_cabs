import type { AuthSession, User } from '../../models/entities';
import type { Role } from '../../models/enums';
import type { ApiClient } from '../api/apiCore';

/** Body for POST /auth/register (self-registerable roles only). */
export interface RegisterInput {
  firstName: string;
  lastName: string;
  /** "male" | "female" | "third-gender". */
  gender: string;
  email: string;
  /** E.164 phone including the dialing code, e.g. "+8801712345678". */
  phone: string;
  password: string;
  role: Role;
}

export const createAuthService = (api: ApiClient) => ({
  register: (body: RegisterInput) =>
    api.request<AuthSession>('/auth/register', { method: 'POST', body, anonymous: true }),
  login: (body: { emailOrPhone: string; password: string }) =>
    api.request<AuthSession>('/auth/login', { method: 'POST', body, anonymous: true }),
  refresh: (body: { refreshToken: string }) =>
    api.request<AuthSession['tokens']>('/auth/refresh', { method: 'POST', body, anonymous: true }),
  me: () => api.request<User>('/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.request<void>('/auth/change-password', { method: 'POST', body }),
  updateProfile: (body: { fullName?: string; avatarUrl?: string }) =>
    api.request<User>('/auth/me', { method: 'PUT', body }),
  uploadAvatar: (file: File | Blob) => {
    const form = new FormData();
    form.append('file', file);
    return api.request<User>('/auth/me/avatar', { method: 'POST', body: form });
  },
  logout: () => api.request<void>('/auth/logout', { method: 'POST' }),
});

export type AuthService = ReturnType<typeof createAuthService>;
