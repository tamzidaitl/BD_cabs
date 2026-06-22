import type { Wallet, WalletTransaction } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export const createWalletService = (api: ApiClient) => ({
  me: () => api.request<Wallet>('/wallet/me'),
  transactions: () => api.request<WalletTransaction[]>('/wallet/transactions'),
  topup: (body: { amountMinor: number; method?: string }) =>
    api.request<Wallet>('/wallet/topup', { method: 'POST', body }),
  withdraw: (body: { amountMinor: number }) =>
    api.request<Wallet>('/wallet/withdraw', { method: 'POST', body }),
});

export type WalletService = ReturnType<typeof createWalletService>;
