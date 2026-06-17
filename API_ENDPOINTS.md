# BD_Cabs — Core API Endpoints

> Backend: **ASP.NET Core Web API** · Auth: **JWT (access + refresh)** · DB: **PostgreSQL** · Real-time: **SignalR**
> Base URL: `https://api.bdcabs.com/api/v1`
> All request/response bodies are JSON unless stated otherwise.

---

## Conventions

| Item | Convention |
|---|---|
| Auth header | `Authorization: Bearer <access_token>` |
| Roles | `Customer`, `Driver`, `FleetOwner`, `Corporate`, `SupportAdmin`, `FinanceAdmin`, `SuperAdmin` (plus `Guest` for public routes) |
| Timestamps | ISO 8601 UTC (`2026-06-17T10:30:00Z`) |
| IDs | UUID (v4) |
| Pagination | `?page=1&pageSize=20` → response includes `totalCount`, `page`, `pageSize` |
| Errors | `{ "error": { "code": "string", "message": "string", "details": [] } }` |
| Money | Minor units (e.g. paisa/cents) as integer, plus `currency` (e.g. `BDT`) |

**Standard HTTP status codes:** `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `429 Too Many Requests`, `500 Server Error`.

---

## 1. Authentication & Account

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Self-signup: `Customer`, `Driver`, `FleetOwner`, or `Corporate` (staff roles are created by Super Admin, not here) |
| `POST` | `/auth/login` | Public | Login with email/phone + password → tokens |
| `POST` | `/auth/otp/request` | Public | Request OTP for phone login/verification |
| `POST` | `/auth/otp/verify` | Public | Verify OTP → tokens |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/auth/logout` | Authenticated | Revoke current refresh token |
| `POST` | `/auth/forgot-password` | Public | Send password reset link/OTP |
| `POST` | `/auth/reset-password` | Public | Reset password with token/OTP |
| `POST` | `/auth/change-password` | Authenticated | Change password (current → new) |
| `GET`  | `/auth/me` | Authenticated | Get current authenticated user |

**`POST /auth/register`**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+8801712345678",
  "password": "Secret123!",
  "role": "Customer"
}
```
Response `201`:
```json
{
  "userId": "uuid",
  "role": "Customer",
  "status": "active",
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "expiresIn": 3600
}
```
> **Activation gate:** `Customer` is `active` immediately. `Driver`, `FleetOwner`, and `Corporate` are created with `status: "pending"` and cannot transact until verified/approved (driver docs, owner KYC, corporate billing agreement). `SupportAdmin` / `FinanceAdmin` / `SuperAdmin` cannot be self-registered — `403` if requested here.

---

## 2. User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/users/me` | Authenticated | Get own profile |
| `PUT`  | `/users/me` | Authenticated | Update profile (name, photo, email) |
| `PATCH`| `/users/me/avatar` | Authenticated | Upload/update profile picture |
| `DELETE` | `/users/me` | Authenticated | Delete/deactivate account |
| `GET`  | `/users/{id}` | SupportAdmin, SuperAdmin | Get any user |
| `GET`  | `/users` | SupportAdmin, SuperAdmin | List/search users (paginated) |
| `PATCH`| `/users/{id}/status` | SuperAdmin | Activate/suspend/ban a user |
| `POST` | `/admin/staff` | SuperAdmin | Create a staff account (`SupportAdmin` / `FinanceAdmin`) |
| `GET`  | `/admin/staff` | SuperAdmin | List staff accounts |
| `PATCH`| `/admin/staff/{id}/role` | SuperAdmin | Change a staff member's role/permissions |

---

## 3. Driver-Specific

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/drivers/onboarding` | Driver | Submit onboarding (license, NID, docs) |
| `GET`  | `/drivers/me` | Driver | Get driver profile + verification status |
| `PUT`  | `/drivers/me` | Driver | Update driver details |
| `POST` | `/drivers/me/documents` | Driver | Upload documents (license, insurance, etc.) |
| `PATCH`| `/drivers/me/availability` | Driver | Go online/offline |
| `PATCH`| `/drivers/me/location` | Driver | Push live GPS location |
| `GET`  | `/drivers/me/earnings` | Driver | Earnings summary (daily/weekly/total) |
| `GET`  | `/drivers/me/trips` | Driver | Driver's trip history |
| `GET`  | `/drivers/{id}/verification` | SupportAdmin | Review driver KYC |
| `PATCH`| `/drivers/{id}/verification` | SupportAdmin | Approve/reject driver verification |
| **Rental (rental drivers only)** | | | |
| `GET`  | `/rentals/available-vehicles` | Driver | Browse vehicles offered for rent by owners |
| `POST` | `/rentals/requests` | Driver | Request to rent a vehicle from an owner |
| `GET`  | `/rentals/me` | Driver | My active/past rental agreements |
| `GET`  | `/rentals/{id}/rent-due` | Driver | Amount of rent due (fixed or revenue-share) |
| `POST` | `/rentals/{id}/pay-rent` | Driver | Pay rent to the Vehicle Owner |

---

## 4. Vehicles

> Vehicles are owned by a **Fleet/Vehicle Owner** (or an owner-driver who owns their car). A **rental driver** does not register vehicles — they are assigned one via a rental agreement (see §3 Rental and §4b Fleet/Vehicle Owner).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/vehicles` | FleetOwner, Driver(owner-driver) | Register a vehicle |
| `GET`  | `/vehicles/me` | FleetOwner, Driver | List own/assigned vehicles |
| `PUT`  | `/vehicles/{id}` | FleetOwner, Driver(owner) | Update vehicle |
| `DELETE` | `/vehicles/{id}` | FleetOwner, Driver(owner) | Remove vehicle |
| `PATCH`| `/vehicles/{id}/active` | Driver | Set active vehicle for rides |
| `PATCH`| `/vehicles/{id}/status` | FleetOwner | Activate/deactivate or mark under maintenance |
| `POST` | `/vehicles/{id}/documents` | FleetOwner | Upload vehicle docs (registration, insurance, fitness) |
| `GET`  | `/vehicles/{id}/verification` | SupportAdmin | Review vehicle verification |
| `PATCH`| `/vehicles/{id}/verification` | SupportAdmin | Approve/reject vehicle verification |
| `GET`  | `/vehicle-types` | Public | List ride categories (Bike, Car, Premium, etc.) |

---

## 4b. Fleet / Vehicle Owner

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/fleet/onboarding` | FleetOwner | Submit company/owner KYC (trade license, NID, bank) |
| `GET`  | `/fleet/me` | FleetOwner | Owner profile + verification status |
| `GET`  | `/fleet/vehicles` | FleetOwner | List all vehicles in the fleet + status |
| `GET`  | `/fleet/drivers` | FleetOwner | List drivers in the fleet |
| `POST` | `/fleet/drivers/invite` | FleetOwner | Invite/add a driver to the fleet |
| `DELETE`| `/fleet/drivers/{id}` | FleetOwner | Remove a driver from the fleet |
| `GET`  | `/fleet/rental-requests` | FleetOwner | Pending driver rental requests |
| `POST` | `/fleet/rental-requests/{id}/approve` | FleetOwner | Approve a request + set rental terms (fixed rent or % split) |
| `POST` | `/fleet/rental-requests/{id}/reject` | FleetOwner | Reject a rental request |
| `PATCH`| `/fleet/rentals/{id}/terms` | FleetOwner | Update rental price/terms |
| `GET`  | `/fleet/rentals/{id}/rent-received` | FleetOwner | Rent/revenue-share received from a driver |
| `GET`  | `/fleet/performance` | FleetOwner | Per-vehicle/per-driver performance |
| `GET`  | `/fleet/revenue` | FleetOwner | Revenue reports (date range) |
| `GET`  | `/fleet/settlements` | FleetOwner | Owner payout/settlement statements |

---

## 4c. Corporate Client

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/corporate/onboarding` | Corporate | Submit company details + billing/credit agreement |
| `GET`  | `/corporate/me` | Corporate | Company profile + approval status |
| `GET`  | `/corporate/employees` | Corporate | List employees authorized to book |
| `POST` | `/corporate/employees` | Corporate | Add an employee |
| `PATCH`| `/corporate/employees/{id}/limits` | Corporate | Set spending limit / approval rules |
| `DELETE`| `/corporate/employees/{id}` | Corporate | Remove an employee |
| `POST` | `/corporate/bookings` | Corporate | Book a ride for an employee (billed to company) |
| `POST` | `/corporate/recurring-rides` | Corporate | Schedule recurring rides (e.g. shuttles) |
| `GET`  | `/corporate/recurring-rides` | Corporate | List/cancel recurring schedules |
| `GET`  | `/corporate/invoices` | Corporate | Consolidated company invoices |
| `GET`  | `/corporate/reports` | Corporate | Consolidated trip & spend reports |
| `POST` | `/corporate/reviews` | Corporate | Rate/review a Fleet/Vehicle Owner |

---

## 5. Ride / Trip Lifecycle

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/rides/estimate` | Customer | Get fare estimate + ETA for a route |
| `POST` | `/rides/request` | Customer | Request a ride (creates a pending ride) |
| `POST` | `/rides/{id}/cancel` | Customer/Driver | Cancel a ride (with reason) |
| `GET`  | `/rides/{id}` | Customer/Driver | Get ride details + status |
| `GET`  | `/rides/me` | Customer | Customer's ride history (paginated) |
| `GET`  | `/rides/{id}/track` | Customer | Live tracking snapshot (driver location/ETA) |
| **Driver actions** | | | |
| `POST` | `/rides/{id}/accept` | Driver | Accept a ride request |
| `POST` | `/rides/{id}/arrived` | Driver | Mark "arrived at pickup" |
| `POST` | `/rides/{id}/start` | Driver | Start trip (verify OTP) |
| `POST` | `/rides/{id}/complete` | Driver | Complete trip → triggers fare/payment |
| `GET`  | `/rides/nearby-requests` | Driver | Pending requests near driver |

**Ride status flow:** `Requested → Accepted → DriverArrived → InProgress → Completed` (or `Cancelled` / `NoDriverFound`).

**`POST /rides/request`**
```json
{
  "pickup":      { "lat": 23.8103, "lng": 90.4125, "address": "Gulshan 1" },
  "destination": { "lat": 23.7806, "lng": 90.4070, "address": "Banani" },
  "vehicleTypeId": "uuid",
  "paymentMethod": "Cash",
  "couponCode": "WELCOME20",
  "notes": "Near the blue gate"
}
```

---

## 6. Real-Time (SignalR Hubs)

WebSocket hubs (not REST) for low-latency updates.

| Hub | Event (server → client) | Description |
|---|---|---|
| `/hubs/rides` | `RideMatched` | Driver assigned to rider |
| | `DriverLocationUpdated` | Live driver position |
| | `RideStatusChanged` | Status transitions |
| | `RideCancelled` | Cancellation notice |
| `/hubs/drivers` | `NewRideRequest` | New nearby request for driver |
| | `RequestExpired` | Request taken/timed out |

---

## 7. Fares, Pricing & Coupons

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/fares/breakdown/{rideId}` | Customer/Driver | Detailed fare breakdown (incl. discount + fare-split) |
| `GET`  | `/pricing/rules` | SuperAdmin | List pricing rules (base, per-km, per-min, surge) |
| `POST` | `/pricing/rules` | SuperAdmin | Create pricing rule |
| `PUT`  | `/pricing/rules/{id}` | SuperAdmin | Update pricing rule |
| `GET`  | `/pricing/fare-split` | SuperAdmin | Get fare-split / commission model |
| `PUT`  | `/pricing/fare-split` | SuperAdmin | Configure platform commission, owner cut, driver share, coupon-cost owner |
| **Coupons** | | | |
| `GET`  | `/coupons` | Customer/Corporate | List coupons available to the user |
| `POST` | `/coupons/apply` | Customer/Corporate | Validate & apply a coupon to a booking (runs all validation rules) |
| `GET`  | `/coupons/admin` | SuperAdmin | List all coupons |
| `POST` | `/coupons` | SuperAdmin | Create a coupon |
| `PUT`  | `/coupons/{id}` | SuperAdmin | Update a coupon |
| `PATCH`| `/coupons/{id}/status` | SuperAdmin | Pause / activate / expire a coupon |

**`POST /coupons` (SuperAdmin)** — mirrors the coupon data model in `role_wise_story.md`:
```json
{
  "code": "WELCOME20",
  "type": "percentage",
  "value": 20,
  "maxDiscount": 10000,
  "minFare": 5000,
  "validFrom": "2026-06-01T00:00:00Z",
  "validTo": "2026-07-01T00:00:00Z",
  "usageLimitTotal": 10000,
  "usageLimitPerUser": 1,
  "applicableCities": ["uuid-dhaka"],
  "applicableRoles": ["Customer"],
  "costBorneBy": "platform",
  "firstRideOnly": true,
  "status": "active"
}
```

**`POST /coupons/apply`** — validation errors return `422` with one of:
`COUPON_NOT_FOUND` · `COUPON_INACTIVE` · `COUPON_EXPIRED` · `MIN_FARE_NOT_MET` · `CITY_NOT_ELIGIBLE` · `PER_USER_LIMIT_REACHED` · `TOTAL_LIMIT_REACHED` · `NOT_FIRST_RIDE` · `COUPON_ALREADY_APPLIED` (no stacking).

> Discount is logged against `costBorneBy` (`platform` or `owner`) for Finance Admin reconciliation. Redemption is locked on ride completion and released on cancellation. See `role_wise_story.md` → Coupon System.

---

## 8. Payments & Wallet

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/payments/methods` | Customer | List saved payment methods |
| `POST` | `/payments/methods` | Customer | Add card / bKash / Nagad |
| `DELETE` | `/payments/methods/{id}` | Customer | Remove payment method |
| `POST` | `/payments/{rideId}/charge` | System/Customer | Charge for completed ride |
| `GET`  | `/payments/me` | Customer | Payment history |
| `POST` | `/payments/{id}/refund` | FinanceAdmin | Issue refund (reverses coupon discount per `costBorneBy`) |
| **Wallet** | | | |
| `GET`  | `/wallet/me` | Authenticated | Wallet balance |
| `POST` | `/wallet/topup` | Customer | Top up wallet |
| `GET`  | `/wallet/transactions` | Authenticated | Wallet transaction history |
| `POST` | `/wallet/withdraw` | Driver | Driver payout request |

---

## 9. Ratings & Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/reviews` | Customer/Driver | Submit rating + review after a ride |
| `GET`  | `/reviews/{id}` | Authenticated | Get a single review |
| `PUT`  | `/reviews/{id}` | Customer/Driver | Edit own review (within time window) |
| `DELETE` | `/reviews/{id}` | Customer/Driver/SupportAdmin | Delete review |
| `GET`  | `/reviews/user/{userId}` | Authenticated | Reviews received by a user/driver |
| `GET`  | `/reviews/ride/{rideId}` | Customer/Driver | Reviews for a ride (both sides) |
| `GET`  | `/drivers/{id}/rating` | Public | Driver's aggregate rating + count |
| `POST` | `/reviews/{id}/report` | Authenticated | Report an abusive review |
| `GET`  | `/reviews/reported` | SupportAdmin | List reported reviews for moderation |
| `PATCH`| `/reviews/{id}/moderate` | SupportAdmin | Approve/hide a review |

**`POST /reviews`**
```json
{
  "rideId": "uuid",
  "rating": 5,
  "comment": "Smooth ride, polite driver.",
  "tags": ["Clean Car", "Safe Driving"]
}
```
> A ride can have **two reviews** — rider→driver and driver→rider. Reviews are only allowed for `Completed` rides and become visible once both sides submit (or after a timeout) to reduce bias.

---

## 10. Saved Places & Favorites

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/places/me` | Customer | List saved places (Home, Work, etc.) |
| `POST` | `/places` | Customer | Save a place |
| `PUT`  | `/places/{id}` | Customer | Update saved place |
| `DELETE` | `/places/{id}` | Customer | Delete saved place |
| `GET`  | `/places/recent` | Customer | Recently used locations |

---

## 11. Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/notifications/me` | Authenticated | List notifications (paginated) |
| `PATCH`| `/notifications/{id}/read` | Authenticated | Mark as read |
| `PATCH`| `/notifications/read-all` | Authenticated | Mark all as read |
| `POST` | `/notifications/devices` | Authenticated | Register device push token (FCM/APNs) |
| `DELETE` | `/notifications/devices/{id}` | Authenticated | Unregister device |
| `GET`  | `/notifications/preferences` | Authenticated | Get notification preferences |
| `PUT`  | `/notifications/preferences` | Authenticated | Update preferences |

---

## 12. Support & Safety

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/support/tickets` | Authenticated | Create a support ticket |
| `GET`  | `/support/tickets/me` | Authenticated | List own tickets |
| `GET`  | `/support/tickets/{id}` | Authenticated | Ticket details + messages |
| `POST` | `/support/tickets/{id}/messages` | Authenticated | Reply to ticket |
| `POST` | `/safety/sos` | Customer/Driver | Trigger SOS / emergency alert |
| `POST` | `/safety/share-trip` | Customer | Share live trip with a contact |
| `GET`  | `/support/faqs` | Public | List FAQs |

---

## 13. Operations, Finance & Admin

### 13a. Support Admin (Operations)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/ops/dashboard` | SupportAdmin | Live ops KPIs (active rides, online drivers, heatmaps) |
| `GET`  | `/ops/rides` | SupportAdmin | All rides (filter/search) |
| `GET`  | `/ops/trips/active` | SupportAdmin | Monitor active trips in real time |
| `POST` | `/ops/bookings` | SupportAdmin | Create a manual / call-center booking |
| `POST` | `/ops/trips/{id}/reassign` | SupportAdmin | Reassign or override the driver |
| `GET`  | `/ops/drivers/pending` | SupportAdmin | Drivers/vehicles awaiting verification |
| `GET`  | `/ops/fraud/flags` | SupportAdmin | Fraud-detection flags/alerts |
| `POST` | `/ops/incidents` | SupportAdmin | Log/resolve an incident or emergency |

### 13b. Finance Admin (Money)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/finance/transactions` | FinanceAdmin | All transactions / reconciliation |
| `POST` | `/finance/payouts/run` | FinanceAdmin | Run driver & fleet-owner payout cycle |
| `GET`  | `/finance/commissions` | FinanceAdmin | Commission calculations |
| `POST` | `/finance/corporate/{id}/invoice` | FinanceAdmin | Generate corporate invoice |
| `GET`  | `/finance/reports` | FinanceAdmin | Financial reports (revenue, tax, coupon cost) |

### 13c. Super Admin (Configuration & Analytics)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/admin/analytics` | SuperAdmin | Platform-wide analytics |
| `CRUD` | `/admin/cities`, `/admin/zones` | SuperAdmin | Manage cities / zones / geofences |
| `POST` | `/admin/announcements` | SuperAdmin | Broadcast announcement/promo |
| `GET`  | `/admin/audit-logs` | SuperAdmin | System audit logs |
| `GET/PUT` | `/admin/config` | SuperAdmin | System configuration |
| `CRUD` | `/admin/permissions` | SuperAdmin | Manage roles & permissions (RBAC) |

---

## 14. System / Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/health` | Public | Health check (liveness/readiness) |
| `GET`  | `/version` | Public | API version info |
| `GET`  | `/config/app` | Public | Client app config (min version, flags) |
| `GET`  | `/geocode/search` | Authenticated | Address autocomplete/search |
| `GET`  | `/geocode/reverse` | Authenticated | Coordinates → address |

---

## Suggested Data Entities

`User` · `Customer` · `Driver` · `FleetOwner` · `CorporateAccount` · `CorporateEmployee` · `StaffAccount` · `Vehicle` · `RentalAgreement` · `RentPayment` · `Ride` · `RecurringRide` · `FareBreakdown` · `FareSplit` · `Payment` · `Wallet` · `WalletTransaction` · `CorporateInvoice` · `Review` · `Coupon` · `CouponRedemption` · `PricingRule` · `City` · `Zone` · `SavedPlace` · `Notification` · `Device` · `SupportTicket` · `Incident` · `AuditLog`

---

*Generated for BD_Cabs · v1 · Aligned with role_wise_story.md · Last updated 2026-06-17*
