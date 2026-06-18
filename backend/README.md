# BD Cabs — Backend API

ASP.NET Core Web API for the BD Cabs platform. Architecture follows the layered
pattern from `asp-net-ecommerce-web-api` (Models → DTOs → Interfaces → Services →
Controllers, plus Data/Profiles/Migrations), with the wire contract matched to the
frontend monorepo (`apps/admin`) and `API_ENDPOINTS.md`.

> **Target framework:** `net8.0` (per request). This machine currently has only the
> .NET 10 SDK/runtime installed, so the project sets `<RollForward>LatestMajor</RollForward>`
> to run on .NET 10. Install the .NET 8 SDK + runtime for a strict .NET 8 toolchain,
> then you can remove that line.

## Stack

| Component | Choice |
|---|---|
| Framework | ASP.NET Core (`net8.0`) |
| ORM / DB | EF Core 8 + PostgreSQL (Npgsql) |
| Auth | JWT bearer (access + rotating refresh tokens), BCrypt password hashing |
| Mapping | AutoMapper |
| Docs | Swagger / Swashbuckle (with bearer auth) |

## Project layout

```
backend/
├─ Program.cs                # DI, JWT, CORS, Swagger, error envelope, migrate+seed
├─ appsettings.json          # connection string, JWT, CORS origins, seed admin
├─ Common/                   # ApiError envelope, PagedResult, AppException, error middleware
├─ Configuration/            # JwtOptions
├─ Models/                   # User, RefreshToken, DriverProfile, Coupon + role/status constants
├─ DTOs/                     # Auth, User, Coupon request/response shapes
├─ Interfaces/               # service contracts
├─ Services/                 # AuthService, UserService, CouponService, OpsService, FinanceService, JwtTokenService
├─ Controllers/              # Auth, Users, Ops, Finance, Coupons, System
├─ Data/                     # AppDbContext, DbSeeder
├─ Profiles/                 # AutoMapper MappingProfile
└─ Migrations/               # EF Core InitialCreate
```

## Wire contract (matches the frontend)

The frontend's `ApiClient` (`packages/core/src/api/client.ts`) deserializes success
bodies **directly** into typed results — so responses are returned **raw, not
enveloped**:

- **Success** → the DTO itself (e.g. `/auth/login` → `AuthSession` with **nested
  `tokens`**), or a paginated envelope `{ items, totalCount, page, pageSize }` for lists.
- **Errors** → `{ "error": { "code", "message", "details" } }` for every failure
  (validation, auth, domain, 500), produced by `ErrorHandlingMiddleware` and the
  model-validation factory in `Program.cs`.
- **Base path** → all routes are under `/api/v1` to match `NEXT_PUBLIC_API_BASE_URL`.

## Implemented endpoints (the slice the admin app calls)

| Method | Route | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/refresh` | public |
| POST | `/api/v1/auth/logout` | authenticated |
| GET  | `/api/v1/auth/me` | authenticated |
| POST | `/api/v1/auth/change-password` | authenticated |
| GET  | `/api/v1/users` | SupportAdmin, SuperAdmin |
| GET  | `/api/v1/users/{id}` | SupportAdmin, SuperAdmin |
| PATCH| `/api/v1/users/{id}/status` | SuperAdmin |
| GET  | `/api/v1/ops/dashboard` | SupportAdmin, SuperAdmin |
| GET  | `/api/v1/ops/drivers/pending` | SupportAdmin, SuperAdmin |
| POST | `/api/v1/finance/payouts/run` | FinanceAdmin, SuperAdmin |
| GET  | `/api/v1/finance/reports` | FinanceAdmin, SuperAdmin |
| GET  | `/api/v1/coupons/admin` | SuperAdmin |
| POST | `/api/v1/coupons` | SuperAdmin |
| PATCH| `/api/v1/coupons/{id}/status` | SuperAdmin |
| GET  | `/api/v1/health`, `/api/v1/version` | public |

The remaining sections of `API_ENDPOINTS.md` (rides, vehicles, payments, reviews,
SignalR hubs, etc.) are not yet implemented — the layered structure makes adding
them a matter of dropping in a model + DTO + service + controller.

## Running it

Prerequisites: a local PostgreSQL reachable with the connection string in
`appsettings.json` (default `Server=localhost;Port=5432;Database=bd-cabs-db;
Username=postgres;Password=963852`). Adjust as needed.

```bash
cd backend
dotnet ef database update      # create schema (also runs automatically on startup)
dotnet run --launch-profile http
```

API: `http://localhost:5175` · Swagger UI: `http://localhost:5175/swagger`

On first run the app migrates the DB and seeds:

- **SuperAdmin** — `admin@bdcabs.com` / `Admin123!` (override via `Seed:*` config)
- a sample pending Driver and the `WELCOME20` coupon (so dashboards aren't empty)

## Connecting the frontend

`apps/admin/.env.local` is already pointed at this backend:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5175/api/v1
```

CORS allows `http://localhost:3000` (configurable via `Cors:AllowedOrigins`). Start
the admin app (`pnpm --filter @bd-cabs/admin dev`) and sign in with the seeded
SuperAdmin. Only staff roles (`SupportAdmin`, `FinanceAdmin`, `SuperAdmin`) can
enter the admin panel — the login page enforces this client-side and the API
enforces it per-endpoint.

## Security notes

- Change `Jwt:Secret` and the seed password before any non-local use (use user
  secrets / environment variables, not `appsettings.json`).
- `RollForward` is a local convenience; prefer installing the real .NET 8 runtime.
