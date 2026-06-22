import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { ApiClient, Endpoints } from '../helpers';
import type { RealtimeConnection } from '../realtime/connection';

/**
 * Dependency-injection seam for data services. The host app constructs the
 * ApiClient (with its platform storage + token refresh) and the endpoints, then
 * provides them here. Hooks read from this context, so `packages/core` stays
 * free of any concrete baseUrl or storage — the same hooks work in RN by
 * wrapping the native tree in this provider with a native-built ApiClient.
 */
export interface Services {
  api: ApiClient;
  endpoints: Endpoints;
  /** Opens a real-time connection to the given hub path (e.g. Hub.Rides). */
  createHub: (hubPath: string) => RealtimeConnection;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices must be used within a <ServicesProvider>.');
  }
  return ctx;
}
