import {
  ApiClient,
  createEndpoints,
  createRealtimeConnection,
  useAuthStore,
  type Services,
} from '@bd-cabs/core';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.bdcabs.com/api/v1';
// SignalR hubs live at the host root (/hubs/...), not under /api/v1.
const REALTIME_ORIGIN = import.meta.env.VITE_REALTIME_ORIGIN ?? new URL(BASE_URL).origin;

/**
 * Builds the concrete ApiClient + endpoints for the web app and wires them to
 * the shared auth store: token reads, refresh-on-401, and forced logout all go
 * through the same store the UI renders from.
 */
export function createWebServices(): Services {
  const api = new ApiClient({
    baseUrl: BASE_URL,
    getAccessToken: () => useAuthStore.getState().session?.tokens.accessToken,
    refreshAccessToken: async () => {
      const store = useAuthStore.getState();
      const refreshToken = store.session?.tokens.refreshToken;
      if (!refreshToken) return null;
      try {
        // Use a bare client to avoid recursive refresh.
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const tokens = await res.json();
        store.setTokens(tokens);
        return tokens.accessToken as string;
      } catch {
        return null;
      }
    },
    onUnauthorized: () => useAuthStore.getState().clear(),
  });

  return {
    api,
    endpoints: createEndpoints(api),
    createHub: (hubPath: string) =>
      createRealtimeConnection({
        hubUrl: new URL(hubPath, REALTIME_ORIGIN).toString(),
        getAccessToken: () => useAuthStore.getState().session?.tokens.accessToken,
      }),
  };
}
