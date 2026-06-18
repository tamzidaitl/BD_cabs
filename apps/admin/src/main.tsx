import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/styles/globals.scss';
import { Providers } from '@/providers';
import { App } from '@/App';

/**
 * SPA entry point. BrowserRouter owns client-side routing; Providers wires the
 * QueryClient, the core ServicesProvider (DI), and one-time auth hydration.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);
