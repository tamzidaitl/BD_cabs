import type { ApiErrorBody } from '../../models/entities';

export interface ApiClientConfig {
  baseUrl: string;
  /** Returns the current access token (or null). */
  getAccessToken: () => string | null | undefined;
  /**
   * Called on a 401 to attempt a token refresh. Should return a fresh access
   * token on success, or null to give up (which triggers onUnauthorized).
   */
  refreshAccessToken?: () => Promise<string | null>;
  /** Called when the request is unrecoverably unauthorized (forces logout). */
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body — serialized automatically. */
  body?: unknown;
  /** Query params — undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the Authorization header (for public endpoints). */
  anonymous?: boolean;
}

/**
 * HTTP client built on `fetch` (browsers, Node 18+, React Native). Owns auth-header
 * injection and one-shot token refresh on 401 so every screen gets the same behaviour.
 */
export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.exec<T>(path, options, true);
  }

  private async exec<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { Accept: 'application/json' };

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
    if (!options.anonymous) {
      const token = this.config.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (res.status === 401 && allowRefresh && this.config.refreshAccessToken) {
      const fresh = await this.config.refreshAccessToken();
      if (fresh) return this.exec<T>(path, options, false);
      this.config.onUnauthorized?.();
    }

    if (res.status === 204) return undefined as T;

    const payload = await this.parseBody(res);

    if (!res.ok) {
      const err = (payload as ApiErrorBody | undefined)?.error;
      throw new ApiError(
        res.status,
        err?.code ?? `HTTP_${res.status}`,
        err?.message ?? res.statusText,
        err?.details,
      );
    }

    return payload as T;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
