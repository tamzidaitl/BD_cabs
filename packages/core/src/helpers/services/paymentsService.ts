import type { Payment, PaymentMethod } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface PaymentMethodInput {
  type: string;
  label?: string;
  last4?: string;
  providerToken?: string;
  isDefault?: boolean;
}

export const createPaymentsService = (api: ApiClient) => ({
  listMethods: () => api.request<PaymentMethod[]>('/payments/methods'),
  addMethod: (body: PaymentMethodInput) =>
    api.request<PaymentMethod>('/payments/methods', { method: 'POST', body }),
  removeMethod: (id: string) =>
    api.request<void>(`/payments/methods/${id}`, { method: 'DELETE' }),
  charge: (rideId: string, body: { method?: string; paymentMethodId?: string } = {}) =>
    api.request<Payment>(`/payments/${rideId}/charge`, { method: 'POST', body }),
  history: () => api.request<Payment[]>('/payments/me'),
});

export type PaymentsService = ReturnType<typeof createPaymentsService>;
