# @bd-cabs/mobile (placeholder)

The future **React Native** app (Customer + Driver) lives here. It is intentionally
empty for now — the point of this folder is to lock in the monorepo seam so that
when the RN app is scaffolded (Expo recommended), it reuses `@bd-cabs/core`
**unchanged**.

## What it will reuse from `@bd-cabs/core`

Everything that is platform-agnostic is already built and shared:

| Concern | Shared module | RN reuse notes |
|---|---|---|
| Domain types & enums | `@bd-cabs/core/models` | identical |
| RBAC engine (`can`, matrix, permissions) | `@bd-cabs/core/rbac` | identical |
| HTTP client + typed endpoints | `@bd-cabs/core/api` | identical (`fetch` works in RN) |
| Auth/session store (Zustand) | `@bd-cabs/core/auth` | identical |
| Server-state hooks (TanStack Query) | `@bd-cabs/core/query` | identical |
| Money / fare-split business rules | `@bd-cabs/core/utils` | identical |

## What the RN app must provide (the platform seam)

Only the two host-specific adapters — mirroring what `apps/admin/src/lib` does for web:

```ts
// 1. Storage adapter (AsyncStorage / SecureStore) implementing KeyValueStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureAuthStorage, type KeyValueStorage } from '@bd-cabs/core';

const nativeStorage: KeyValueStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};
configureAuthStorage(nativeStorage);

// 2. Build the ApiClient + endpoints exactly like apps/admin/src/lib/services.ts,
//    then wrap the tree in <ServicesProvider> + <QueryClientProvider>.
```

UI is the only thing rewritten (Bootstrap → RN components). Logic is not.

## Suggested setup (when ready)

```bash
# from repo root
pnpm create expo-app apps/mobile --template
# add "@bd-cabs/core": "workspace:*" to its package.json
```