# BD Cabs — Frontend Monorepo

A scalable frontend architecture for the BD Cabs ride-hailing platform. A
**Next.js admin panel** today; a **React Native** customer/driver app tomorrow —
both built on one shared, platform-agnostic business-logic core.

> Backend (separate): ASP.NET Core Web API · JWT (access + refresh) · PostgreSQL ·
> SignalR. See `API_ENDPOINTS.md` and `role_wise_story.md` in the repo root.

---

## Why this shape

| Requirement | Decision |
|---|---|
| Next.js admin panel | `apps/admin` — Next.js 14 **App Router**, React 18 |
| State management | **Zustand** (session/UI state) + **TanStack Query** (server state) — both run unchanged in React Native |
| Role-based access control | Pure `can()` engine + role→permission matrix in `@bd-cabs/core/rbac`; web guards `<Can>` / `<ProtectedRoute>` / `useCan` |
| Bootstrap 5 | `react-bootstrap` + `bootstrap` SCSS with a themable brand override |
| Responsive UI | Bootstrap grid + responsive sidebar (persistent on desktop, Offcanvas drawer on mobile) |
| Clean monorepo | **pnpm workspaces** + **Turborepo** |
| Shared logic for future RN app | `packages/core` — zero DOM/Next imports; the RN app reuses it verbatim |

**Why not Redux Toolkit?** Zustand has no Provider/boilerplate and runs identically
in RN; combined with TanStack Query for caching/refetching, it covers both
client and server state with far less code — directly serving the "shared core"
goal.

---

## Structure

```
bd-cabs/
├── apps/
│   ├── admin/                 # Next.js admin panel (the deliverable)
│   │   └── src/
│   │       ├── app/           # App Router: login, (dashboard) group, unauthorized
│   │       ├── components/    # rbac/ (Can, ProtectedRoute, useCan), layout/ (Sidebar, Topbar)
│   │       ├── lib/           # web platform seam: webStorage, services (ApiClient wiring)
│   │       └── styles/        # globals.scss (Bootstrap import + theme)
│   └── mobile/                # React Native app placeholder (reuses @bd-cabs/core)
├── packages/
│   └── core/                  # SHARED, platform-agnostic business logic
│       └── src/
│           ├── models/        # entities + enums (Role, RideStatus, Money, …)
│           ├── rbac/          # permissions, roleMatrix, can(), navigation
│           ├── api/           # ApiClient (fetch), typed endpoints, storage seam
│           ├── auth/          # Zustand auth/session store
│           ├── query/         # TanStack Query hooks + ServicesProvider (DI)
│           └── utils/         # money + fareSplit business rules
├── turbo.json · pnpm-workspace.yaml · tsconfig.base.json
```

### The one rule that keeps RN reuse honest
Nothing in `packages/core` may import `next`, `react-dom`, `react-bootstrap`, the
DOM, or RN-only modules. Allowed peers: `react`, `@tanstack/react-query`,
`zustand`. Platform specifics (storage, base URL, token refresh) are **injected**
by each host app — see `apps/admin/src/lib/services.ts` and `apps/mobile/README.md`.

---

## RBAC model

Roles (`@bd-cabs/core/models`): `Customer`, `Driver`, `FleetOwner`, `Corporate`,
`SupportAdmin`, `FinanceAdmin`, `SuperAdmin`, `Guest`. Only the three staff roles
may enter the admin panel (`STAFF_ROLES`).

- **Permissions** are `resource:action` strings (`packages/core/src/rbac/permissions.ts`).
- **`ROLE_PERMISSIONS`** maps each role to its permissions; `SuperAdmin` holds the
  `*` wildcard. **Separation of duties** is enforced here: the Support Admin who
  verifies a driver cannot run that driver's payout (Finance Admin only).
- **`can(role, permission)`** is the single pure check used everywhere.
- The sidebar (`ADMIN_NAV`) is permission-tagged, so navigation and route guards
  share one definition — no drift.

> The UI gates are **defence-in-depth, not security**. The API must enforce the
> same permissions; never rely on hidden buttons.

---

## Getting started

```bash
# 1. Install (pnpm required)
pnpm install

# 2. Configure the API base URL
cp apps/admin/.env.example apps/admin/.env.local
#   edit NEXT_PUBLIC_API_BASE_URL

# 3. Run the admin panel
pnpm dev            # turbo runs apps/admin on http://localhost:3000

# Other tasks
pnpm build          # build all packages/apps
pnpm typecheck      # tsc across the workspace
pnpm lint
```

Requires Node ≥ 18.18 and pnpm ≥ 9.

---

## Adding a new admin feature (the pattern)

1. Add the permission to `packages/core/src/rbac/permissions.ts` and grant it in
   `roleMatrix.ts`.
2. Add a typed endpoint in `packages/core/src/api/endpoints.ts` and a query hook
   in `query/hooks.ts` (+ a key in `query/keys.ts`).
3. Add a sidebar entry in `rbac/navigation.ts` tagged with the permission.
4. Create the page under `apps/admin/src/app/(dashboard)/…` and wrap it in
   `<ProtectedRoute permission={…}>`; gate inline actions with `<Can>`.

Because steps 1–2 live in `@bd-cabs/core`, the React Native app gets the data
access and authorization for free.
