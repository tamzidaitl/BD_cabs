# Seed / Dev Accounts

> **Local development seed credentials only**, defined in
> [`Data/DbSeeder.cs`](Data/DbSeeder.cs) and [`appsettings.json`](appsettings.json) (`Seed:*`).
> They are created on first run by `DbSeeder.SeedAsync`, one known account per role.
>
> Real end-user passwords **cannot** be listed: they are stored as one-way
> **BCrypt hashes** in `User.PasswordHash` and are never recoverable. Only the
> seeded accounts below have known plaintext passwords.

## Accounts

| Role          | Email                   | Password       | Phone           | Status  |
| ------------- | ----------------------- | -------------- | --------------- | ------- |
| SuperAdmin    | `admin@bdcabs.com`      | `Admin123!`    | +8800000000000  | Active  |
| Support Admin | `support@bdcabs.com`    | `Support123!`  | +8800000000001  | Active  |
| Customer      | `customer1@bdcabs.com`  | `Customer123!` | +8801710000002  | Active  |
| Corporate     | `corporate1@bdcabs.com` | `Corporate123!`| +8801710000003  | Pending |
| Fleet Owner   | `fleet1@bdcabs.com`     | `Fleet123!`    | +8801710000004  | Pending |
| Driver        | `driver1@bdcabs.com`    | `Driver123!`   | +8801710000001  | Pending |

The Fleet Owner is seeded with a `FleetProfile` (KYC pending) plus two sample
vehicles — one verified & rentable, one left **pending** — so the fleet console
(`/fleet`), the driver "vehicles for rent" list, and the **Vehicle Verification**
queue are all non-empty on first run. (driver1 stays pending for the **Driver
Verification** queue.)

## Notes

- The SuperAdmin email/password come from config (`Seed:SuperAdminEmail` /
  `Seed:SuperAdminPassword`); the value above is the committed default. Override it
  via environment variables or `appsettings.*.json` for any non-local environment.
- Each account is seeded **idempotently** — `DbSeeder` inserts a role's account only
  if no user with that email already exists, so the full set survives a partially
  seeded database.
- Status reflects the activation gate: Customer/Support Admin are `active`
  immediately; Corporate and Driver start `pending` (mirrors `/auth/register`).
- New accounts created through `/auth/register` choose their own passwords; those
  are hashed on save and are not retrievable here.
- To (re)create these on an existing database, the matching email must be absent.
  Deleting the row and restarting the API re-seeds it.

> ⚠️ **Do not reuse these credentials outside local development.** Rotate every
> password before deploying anywhere shared or public.
