import type { Metadata, Viewport } from 'next';
import '@/styles/globals.scss';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BD Cabs — Admin',
  description: 'Operations, finance, and configuration console for the BD Cabs platform.',
};

// Responsive baseline: correct scaling on mobile/tablet.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
