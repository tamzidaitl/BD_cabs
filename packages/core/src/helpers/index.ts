export * from './api/apiCore';

export * from './services/authService';
export * from './services/usersService';
export * from './services/ridesService';
export * from './services/placesService';
export * from './services/paymentsService';
export * from './services/walletService';
export * from './services/reviewsService';
export * from './services/supportService';
export * from './services/safetyService';
export * from './services/driversService';
export * from './services/rentalsService';
export * from './services/vehiclesService';
export * from './services/fleetService';
export * from './services/corporateService';
export * from './services/opsService';
export * from './services/financeService';
export * from './services/couponsService';
export * from './services/systemService';

import type { ApiClient } from './api/apiCore';
import { createAuthService } from './services/authService';
import { createUsersService } from './services/usersService';
import { createRidesService } from './services/ridesService';
import { createPlacesService } from './services/placesService';
import { createPaymentsService } from './services/paymentsService';
import { createWalletService } from './services/walletService';
import { createReviewsService } from './services/reviewsService';
import { createSupportService } from './services/supportService';
import { createSafetyService } from './services/safetyService';
import { createDriversService } from './services/driversService';
import { createRentalsService } from './services/rentalsService';
import { createVehiclesService } from './services/vehiclesService';
import { createFleetService } from './services/fleetService';
import { createCorporateService } from './services/corporateService';
import { createOpsService } from './services/opsService';
import { createFinanceService } from './services/financeService';
import { createCouponsService } from './services/couponsService';
import { createSystemService } from './services/systemService';

/**
 * Composes all domain services into one typed endpoints object. Screens call
 * `endpoints.auth.login(...)` etc. — a path change is a one-line edit in the
 * relevant service file, shared by web and native.
 */
export const createEndpoints = (api: ApiClient) => ({
  auth: createAuthService(api),
  users: createUsersService(api),
  rides: createRidesService(api),
  places: createPlacesService(api),
  payments: createPaymentsService(api),
  wallet: createWalletService(api),
  reviews: createReviewsService(api),
  support: createSupportService(api),
  safety: createSafetyService(api),
  drivers: createDriversService(api),
  rentals: createRentalsService(api),
  vehicles: createVehiclesService(api),
  fleet: createFleetService(api),
  corporate: createCorporateService(api),
  ops: createOpsService(api),
  finance: createFinanceService(api),
  coupons: createCouponsService(api),
  system: createSystemService(api),
});

export type Endpoints = ReturnType<typeof createEndpoints>;
