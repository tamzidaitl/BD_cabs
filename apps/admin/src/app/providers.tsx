'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  ApiError,
  ServicesProvider,
  configureAuthStorage,
  useAuthStore,
  type Services,
} from '@bd-cabs/core';
import { webStorage } from '@/lib/webStorage';
import { createWebServices } from '@/lib/services';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Don't retry auth/permission failures.
          if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Top-level client providers: TanStack Query, the core ServicesProvider (DI),
 * and one-time auth-storage wiring + session hydration. Everything below this
 * can use the shared hooks.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const services = useRef<Services>();
  if (!services.current) {
    configureAuthStorage(webStorage);
    services.current = createWebServices();
  }

  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const value = useMemo(() => services.current!, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={value}>{children}</ServicesProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
