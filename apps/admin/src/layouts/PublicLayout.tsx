import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PageSpinner } from '@/components/PageSpinner';

/**
 * Layout for the public-facing marketing site (home, about, support, contact,
 * signup). Open — no auth guard — with a shared navbar + footer.
 */
export function PublicLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <PublicNavbar />
      <main className="flex-grow-1">
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
