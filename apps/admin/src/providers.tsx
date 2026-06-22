import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiError,
  ServicesProvider,
  configureAuthStorage,
  useAuthStore,
  type Services,
} from '@bd-cabs/core';
import { webStorage } from '@/lib/webStorage';
import { createWebServices } from '@/helpers';

// Devtools are dev-only and lazy-loaded so they stay out of the production bundle.
const Devtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null;

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
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <Devtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
