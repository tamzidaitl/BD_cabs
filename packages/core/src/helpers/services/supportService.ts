import type { SupportTicket } from '../../models/entities';
import type { ApiClient } from '../api/apiCore';

export interface SupportTicketInput {
  category?: string;
  subject: string;
  body: string;
  rideId?: string;
}

export const createSupportService = (api: ApiClient) => ({
  createTicket: (body: SupportTicketInput) =>
    api.request<SupportTicket>('/support/tickets', { method: 'POST', body }),
  myTickets: () => api.request<SupportTicket[]>('/support/tickets/me'),
  getTicket: (id: string) => api.request<SupportTicket>(`/support/tickets/${id}`),
});

export type SupportService = ReturnType<typeof createSupportService>;
