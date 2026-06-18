# BD Cabs — Test Accounts

Local development credentials for testing every role/feature.
**Login:** http://localhost:3000/login  ·  **API:** http://localhost:5175  ·  All verified working ✅

> Dev/local only. Do not reuse these passwords in staging or production.

## Staff (admin console)

| Role | Email | Password | Status | Use to test |
|---|---|---|---|---|
| **SuperAdmin** | `admin@bdcabs.com` | `Admin123!` | active | Everything — users (activate/deactivate/delete), coupons, finance, ops |
| **SupportAdmin** | `support@bdcabs.com` | `Support123!` | active | Users list + **activate only**, ops dashboard, pending drivers |
| **SupportAdmin** | `suptester@bdcabs.com` | `Support123!` | active | Spare SupportAdmin (same caps as above) |
| **FinanceAdmin** | `finance1@bdcabs.com` | `Finance123!` | active | Finance: payouts, reports |

## End users

| Role | Email | Password | Status | Use to test |
|---|---|---|---|---|
| **Customer** | `customer1@bdcabs.com` | `Customer123!` | active | Rides, coupons (`WELCOME20`), wallet, reviews |
| **Customer** | `rahim.test@example.com` | `Secret123!` | active | Spare customer (has first/last name + gender + intl phone) |
| **Driver** | `driver1@bdcabs.com` | `Driver123!` | pending | Driver onboarding/verification flow (shows in ops pending queue) |
| **FleetOwner** | `fleet1@bdcabs.com` | `Fleet123!` | pending | Fleet onboarding/KYC, vehicles, rentals |
| **Corporate** | `corporate1@bdcabs.com` | `Corporate123!` | pending | Corporate onboarding, employees, bookings |

## Notes

- **Activation gate:** Customer/staff are `active` immediately; Driver, FleetOwner, and
  Corporate start `pending` until verified/approved (by design — see `role_wise_story.md`).
  Use the SuperAdmin to activate them from the `/users` page.
- **Login is open to all roles.** Route/permission guards decide what each role sees after sign-in.
- `admin`, `support`, `customer1`, `driver1` are **seeded automatically** on backend startup
  (`backend/Data/DbSeeder.cs`). `finance1`, `fleet1`, `corporate1`, and `rahim.test` were
  created via the API for full role coverage.
- Seed admin/credentials can be overridden via `Seed:*` config in `appsettings.json`.
