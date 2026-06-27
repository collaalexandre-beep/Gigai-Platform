---
name: Auth system
description: Session-based login with roles; how passwords are hashed; where admin is seeded.
---

## Implementation

- **Password hashing**: `crypto.scrypt` (Node built-in) via `server/auth.ts` — no bcrypt needed.
- **Session**: `express-session` with `SESSION_SECRET` env var; declared in `server/index.ts` BEFORE `registerRoutes`.
- **Session type**: `req.session.userId` — augmented in `server/routes.ts` with `declare module "express-session"`.
- **Admin seed**: `server/seed-admin.ts` — runs on startup, creates `admin` user only if `users` table is empty.

## Roles

- `admin` — full access + user management (`/admin/users`)
- `gerente` — regular access, no user management
- `operador` — regular access, no user management

## Middleware

- `requireAuth(req, res, next)` — checks `req.session.userId`, loads user, attaches to `(req as any).currentUser`
- `requireAdmin(req, res, next)` — calls requireAuth then checks `role === "admin"`

## Routes

- `POST /api/auth/login` — public, sets session
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — returns current user (no password field)
- `GET/POST/PATCH/DELETE /api/users` — admin only

## Frontend

- `client/src/contexts/auth-context.tsx` — `AuthProvider` + `useAuth()` hook
- `AuthProvider` wraps the entire app in `App.tsx`
- If `user === null && !isLoading`, renders `<LoginPage />` instead of the app shell
- Sidebar footer shows user name, role badge, and logout button
- Admin-only: "Usuários" link in sidebar Configurações section + `/admin/users` route

**Why crypto.scrypt:** bcryptjs was not installed and adding packages requires build. Node's built-in crypto.scrypt is secure and avoids dependency issues.
