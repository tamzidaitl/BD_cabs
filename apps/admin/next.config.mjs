/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared core (it ships as TS source, not pre-built JS).
  transpilePackages: ['@bd-cabs/core'],
  experimental: {
    // Bootstrap/react-bootstrap optimisation: import only what's used.
    optimizePackageImports: ['react-bootstrap', 'lucide-react'],
  },
};

export default nextConfig;
