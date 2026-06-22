import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Role, useAuthStore } from '@bd-cabs/core';
import { PublicLayout } from '@/layouts/PublicLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PortalShell } from '@/layouts/PortalShell';
import { RoleRoute } from '@/components/rbac/RoleRoute';
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import { PageSpinner } from '@/components/PageSpinner';

// Each page is code-split into its own chunk via React.lazy, so a visitor only
// downloads the JS for the route they're on. Layouts stay eager (small, shared)
// and host their own Suspense boundary around <Outlet/> so the chrome (navbar /
// sidebar) never flashes during navigation.

// Public site
const Home = lazy(() => import('@/pages/public/Home'));
const About = lazy(() => import('@/pages/public/About'));
const Support = lazy(() => import('@/pages/public/Support'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const Signup = lazy(() => import('@/pages/public/Signup'));

// Auth / standalone
const Login = lazy(() => import('@/pages/Login'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const AccountSettings = lazy(() => import('@/pages/AccountSettings'));
const Rating = lazy(() => import('@/pages/Rating'));

// Admin (each page self-guards with its required permission)
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const Ops = lazy(() => import('@/pages/dashboard/Ops'));
const OpsRides = lazy(() => import('@/pages/dashboard/Rides'));
const Users = lazy(() => import('@/pages/dashboard/Users'));
const Payouts = lazy(() => import('@/pages/dashboard/Payouts'));
const Coupons = lazy(() => import('@/pages/dashboard/Coupons'));
const DriverVerification = lazy(() => import('@/pages/dashboard/DriverVerification'));
const VehicleVerification = lazy(() => import('@/pages/dashboard/VehicleVerification'));
const ReviewModeration = lazy(() => import('@/pages/dashboard/ReviewModeration'));

// Customer portal
const Book = lazy(() => import('@/pages/customer/Book'));
const MyRides = lazy(() => import('@/pages/customer/Rides'));
const RideDetail = lazy(() => import('@/pages/customer/RideDetail'));
const CustomerWallet = lazy(() => import('@/pages/customer/Wallet'));
const Places = lazy(() => import('@/pages/customer/Places'));
const CustomerSupport = lazy(() => import('@/pages/customer/Support'));

// Driver portal
const Drive = lazy(() => import('@/pages/driver/Drive'));
const DriverTrips = lazy(() => import('@/pages/driver/Trips'));
const DriverEarnings = lazy(() => import('@/pages/driver/Earnings'));
const DriverDocuments = lazy(() => import('@/pages/driver/Documents'));
const DriverRentals = lazy(() => import('@/pages/driver/Rentals'));

// Fleet / Vehicle Owner portal
const FleetOverview = lazy(() => import('@/pages/fleet/Overview'));
const FleetVehicles = lazy(() => import('@/pages/fleet/Vehicles'));
const FleetDrivers = lazy(() => import('@/pages/fleet/Drivers'));
const FleetPerformance = lazy(() => import('@/pages/fleet/Performance'));
const FleetReviews = lazy(() => import('@/pages/fleet/Reviews'));
const FleetCorporateRentals = lazy(() => import('@/pages/fleet/CorporateRentals'));

// Corporate Client portal
const CorporateOverview = lazy(() => import('@/pages/corporate/Overview'));
const CorporateEmployees = lazy(() => import('@/pages/corporate/Employees'));
const CorporateBookings = lazy(() => import('@/pages/corporate/Bookings'));
const CorporateBilling = lazy(() => import('@/pages/corporate/Billing'));
const CorporateReviews = lazy(() => import('@/pages/corporate/Reviews'));
const CorporateVehicleRentals = lazy(() => import('@/pages/corporate/VehicleRentals'));

/**
 * The `/app` index page. All four portal roles share the path, so the landing
 * page is chosen from the signed-in role: customers book, drivers drive, fleet
 * owners and corporate clients see their overview.
 */
function PortalHome() {
  const role = useAuthStore((s) => s.session?.role);
  switch (role) {
    case Role.Driver:
      return <Drive />;
    case Role.FleetOwner:
      return <FleetOverview />;
    case Role.Corporate:
      return <CorporateOverview />;
    case Role.Customer:
      return <Book />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}

/**
 * Client-side route table. Public marketing site, the staff-only dashboard, and
 * one shared role portal at `/app` (customer + driver + fleet owner), plus
 * standalone login/unauthorized. Dashboard enforces staff auth; the portal is
 * gated by RoleRoute and each role's pages are role-scoped within it.
 */
export function App() {
  return (
    <Suspense fallback={<PageSpinner minHeight="100vh" />}>
      <Routes>
        {/* Public marketing site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Standalone */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Account settings — any authenticated role */}
        <Route
          path="/account-settings"
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          }
        />

        {/* Staff-only admin console */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/ops" element={<Ops />} />
          <Route path="/rides" element={<OpsRides />} />
          <Route path="/verification/drivers" element={<DriverVerification />} />
          <Route path="/verification/vehicles" element={<VehicleVerification />} />
          <Route path="/reviews" element={<ReviewModeration />} />
          <Route path="/users" element={<Users />} />
          <Route path="/finance/payouts" element={<Payouts />} />
          <Route path="/config/coupons" element={<Coupons />} />
        </Route>

        {/* Shared role portal — one path (/app) for customers, drivers, and fleet
            owners. The shell + landing page adapt to the signed-in role; each
            role's inner pages are guarded so the others can't reach them. */}
        <Route
          element={
            <RoleRoute roles={[Role.Customer, Role.Driver, Role.FleetOwner, Role.Corporate]}>
              <PortalShell />
            </RoleRoute>
          }
        >
          <Route path="/app" element={<PortalHome />} />

          {/* Shared across every portal role — your own received rating & reviews */}
          <Route path="/app/rating" element={<Rating />} />

          {/* Customer-only pages */}
          <Route
            element={
              <RoleRoute roles={[Role.Customer]}>
                <Outlet />
              </RoleRoute>
            }
          >
            <Route path="/app/rides" element={<MyRides />} />
            <Route path="/app/rides/:id" element={<RideDetail />} />
            <Route path="/app/wallet" element={<CustomerWallet />} />
            <Route path="/app/places" element={<Places />} />
            <Route path="/app/support" element={<CustomerSupport />} />
          </Route>

          {/* Driver-only pages */}
          <Route
            element={
              <RoleRoute roles={[Role.Driver]}>
                <Outlet />
              </RoleRoute>
            }
          >
            <Route path="/app/trips" element={<DriverTrips />} />
            <Route path="/app/earnings" element={<DriverEarnings />} />
            <Route path="/app/documents" element={<DriverDocuments />} />
            <Route path="/app/rentals" element={<DriverRentals />} />
          </Route>

          {/* Fleet-owner-only pages */}
          <Route
            element={
              <RoleRoute roles={[Role.FleetOwner]}>
                <Outlet />
              </RoleRoute>
            }
          >
            <Route path="/app/vehicles" element={<FleetVehicles />} />
            <Route path="/app/drivers" element={<FleetDrivers />} />
            <Route path="/app/corporate-rentals" element={<FleetCorporateRentals />} />
            <Route path="/app/performance" element={<FleetPerformance />} />
            <Route path="/app/reviews" element={<FleetReviews />} />
          </Route>

          {/* Corporate-client-only pages */}
          <Route
            element={
              <RoleRoute roles={[Role.Corporate]}>
                <Outlet />
              </RoleRoute>
            }
          >
            <Route path="/app/employees" element={<CorporateEmployees />} />
            <Route path="/app/bookings" element={<CorporateBookings />} />
            <Route path="/app/vehicle-rentals" element={<CorporateVehicleRentals />} />
            <Route path="/app/billing" element={<CorporateBilling />} />
            <Route path="/app/fleet-reviews" element={<CorporateReviews />} />
          </Route>
        </Route>

        {/* Legacy portal paths → the shared portal */}
        <Route path="/drive/*" element={<Navigate to="/app" replace />} />
        <Route path="/fleet/*" element={<Navigate to="/app" replace />} />

        {/* Unknown routes → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
