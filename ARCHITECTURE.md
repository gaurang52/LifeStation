# LifeStation — Architecture & Conventions

## Overview

React Native app (0.82) with TypeScript, feature-based structure, Zustand for state, and a centralized API client. Use this as the source of truth for where to put code and how to name things.

---

## Folder Structure

```
src/
├── core/           # Cross-cutting: API, store, types, utils, constants
├── features/       # Feature modules (auth, home, profile, …)
├── shared/         # Reusable UI (components, theme)
└── types/          # Global declarations (e.g. env.d.ts)
```

### `core/`

| Path              | Role                                        | Examples                                   |
| ----------------- | ------------------------------------------- | ------------------------------------------ |
| `core/api/`       | HTTP client, interceptors, endpoint modules | `client.ts`, `authApi.ts`, `setup.ts`      |
| `core/constants/` | Env, app-wide constants                     | `env.ts`                                   |
| `core/store/`     | Zustand stores (auth, etc.)                 | `authStore.ts`), `index` re-exports        |
| `core/types/`     | Shared TS types (API, domain)               | `ApiResponse`, `PaginatedResponse`, `User` |
| `core/utils/`     | Pure helpers, error handling, logging       | `errorHandler`, `logger`                   |

- **Do:** Keep `core` free of UI and feature-specific logic.
- **Don’t:** Put screens or feature-specific API calls here; those live under `features/`.

### `features/`

Each feature is a folder: `auth`, `home`, `profile`, etc.

```
features/<name>/
├── screens/        # Top-level screens for the navigator
├── components/     # (optional) Feature-specific UI
├── hooks/          # (optional) Feature-specific hooks
├── services/       # (optional) API calls for this feature
└── types.ts        # (optional) Feature-only types
```

- **Screens:** One file per route. Use `@shared` for `Screen`, `AppText`, `Button`, `Input`; use `@core` for store and API.
- **Services:** Use `apiClient` from `@core/api/client`. Keep `client.ts` generic; feature-specific URLs and DTOs live in `features/<name>/services/`.

### `shared/`

| Path                 | Role                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `shared/components/` | Reusable UI: `Screen`, `AppText`, `Button`, `Input`, `ErrorBoundary` |
| `shared/theme/`      | Design tokens: `colors`, `spacing`, `typography`                     |

- **Do:** Use `shared` for anything used in 2+ features.
- **Don’t:** Put feature-only views here.

---

## Path Aliases

Use these in imports (Babel + Metro + TS are aligned):

| Alias         | Maps to          |
| ------------- | ---------------- |
| `@core/*`     | `src/core/*`     |
| `@features/*` | `src/features/*` |
| `@shared/*`   | `src/shared/*`   |
| `@/*`         | `src/*`          |

Examples:

```ts
import { useAuthStore } from '@core/store';
import { apiClient } from '@core/api/client';
import { Screen, Button, AppText } from '@shared/components';
import { colors, spacing, typography } from '@shared/theme';
import HomeScreen from '@features/home/screens/HomeScreen';
```

---

## Conventions

### Theming & Styling

- Prefer `colors`, `spacing`, `typography` from `@shared/theme` in `StyleSheet` and components.
- `AppText`: use `variant` (e.g. `h1`, `h2`, `body`, `bodyBold`, `caption`) and optional `color` instead of ad‑hoc `fontSize`/`fontWeight`.

### API & Errors

- Use `apiClient.get|post|put|patch|delete<T>(url, ...)` for HTTP. It already:
  - Sends `Authorization: Bearer <token>` when `authStore` has a token.
  - Logs and normalizes errors; surfaces a `message` string.
- In screens: `try/catch` + `ErrorHandler.getErrorMessage(err)` for user-facing messages.
- For new endpoints: add a function in `features/<name>/services/` that calls `apiClient` and returns typed data.

### State (Zustand)

- Stores in `core/store/`, re-exported from `core/store/index.ts`.
- Use `persist` + `AsyncStorage` for auth-like state that must survive restarts.
  - Use `partialize` to persist only `user`, `token`, `isAuthenticated` (exclude `isLoading`, `_hasHydrated`, and actions).
  - Use `_hasHydrated` and `onRehydrateStorage` so the app does not render the auth gate until rehydration is done; show a neutral loading view meanwhile to avoid a Login flash on cold start.
- In components: `useAuthStore(state => state.login)` (or other selectors) to avoid over-renders.
- **Store I/O:** Stores may call API modules (e.g. `authStore` → `authApi`). Keep this pattern consistent for new domains; alternatively, call APIs from screens/hooks and keep stores pure. Do not mix both styles without documenting.

### Navigation

- Root: `RootStack` — auth vs app (tabs).
- App: `Tab` (Home, Profile, …).
- Auth: `AuthStack` (Login, …).
- Route names and param types live in `core/constants/routes.ts` and `src/types/navigation.d.ts` for type-safe `navigation.navigate()`. `RootStackParamList` uses `NavigatorScreenParams<AuthStackParamList>` and `NavigatorScreenParams<TabParamList>` so nested routes (e.g. `navigate(ROUTES.AUTH, { screen: ROUTES.LOGIN })`) are typed.

### Imports

- Prefer the barrel `@shared/components` for shared UI; avoid mixing `@shared/components/X` and `@shared/components` in the same codebase.
- Within `core/` or a feature folder, relative imports (e.g. `../constants/env`) are fine. Use `@core`, `@features`, `@shared` for cross-boundary imports (e.g. from a feature into `core` or `shared`). Do not add an `@types` alias for `src/types` (it can be confused with npm `@types/*`); `src/types` is included via `tsconfig` for ambient declarations.

### Naming

- **Screens:** `PascalCase` + `Screen`, e.g. `LoginScreen`, `HomeScreen`.
- **Components:** `PascalCase`, e.g. `Button`, `AppText`, `Input`.
- **Stores:** `camelCase` + `Store`, e.g. `useAuthStore`.
- **Services:** `camelCase` + `Service`, e.g. `authService`.
- **Hooks:** `camelCase` + `use` prefix, e.g. `useAuth`, `useDebounce`.

---

## What’s in place

- [x] `core/api/client` (axios, interceptors, Bearer token via getter, error shape), `core/api/authApi` (login, logout, me).
- [x] `core/store` (Zustand + persist for auth, `partialize`, `_hasHydrated` + `onRehydrateStorage`).
- [x] `core/types` (`ApiResponse`, `PaginatedResponse`, `User`).
- [x] `core/utils` (`ErrorHandler`, `logger`).
- [x] `core/constants/env` (from `@env` / `.env`).
- [x] `shared/theme` (colors, spacing, typography).
- [x] `shared` components: `Screen`, `AppText`, `Button`, `Input`, `ErrorBoundary`.
- [x] `features/auth`: `LoginScreen`; auth API in `core/api/authApi.ts`, used by `authStore`.
- [x] `features/home`, `features/profile`: screens using `Screen`, `AppText`, store.
- [x] App entry: `GestureHandlerRootView` → `SafeAreaProvider` → loading until `_hasHydrated` → `ErrorBoundary` → `NavigationContainer` → RootStack (Auth | Tabs).
- [x] Path aliases in Babel, Metro, `tsconfig`.
- [x] `.env.example`, `core/constants/routes.ts`, navigation typings (`NavigatorScreenParams` for nested stacks).
- [x] Jest `moduleNameMapper` for `@core`, `@features`, `@shared`.
- [x] ESLint, Prettier, Husky, lint-staged.

---

## Adding a new feature

1. Create `src/features/<feature>/screens/<Name>Screen.tsx`.
2. If it has API calls: add `core/api/<name>Api.ts` (like `authApi`) for app-wide endpoints, or `features/<feature>/services/` for feature-specific ones; both use `apiClient`.
3. Register the screen in `App.tsx` (in the correct Stack or Tab) and use `ROUTES.*` for `name`.
4. Use `Screen`, `AppText`, `Button`, `Input` from `@shared/components` and `colors`/`spacing`/`typography` from `@shared/theme`.
5. If you need new shared UI, add it to `shared/components` and re-export from `shared/components/index.ts`.

---

## Env & config

- Copy `.env.example` to `.env` and set `API_BASE_URL`, etc.
- `@env` is typed in `src/types/env.d.ts`; `core/constants/env.ts` reads and re-exports.

---

## Testing

- Jest with `@testing-library/react-native` and `jest-native`.
- `moduleNameMapper` mirrors path aliases so `@core`, `@features`, `@shared` resolve in tests.
- Pre-commit runs lint and format via Husky + lint-staged.
