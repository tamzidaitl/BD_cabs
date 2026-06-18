/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the BD Cabs API, including /api/v1 (see API_ENDPOINTS.md). */
  readonly VITE_API_BASE_URL?: string;
  /** Origin for SignalR hubs (/hubs/...). Defaults to the API origin. */
  readonly VITE_REALTIME_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
