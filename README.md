# ECOVIA — منصة بيئيين

Arabic (RTL) environmental-services marketplace connecting **specialists** with
**organizations**: registration, approval workflow, CV, directories,
applications, messaging, and contracts.

Built with **Next.js (App Router) + React + TypeScript**, backed by
**PostgreSQL via Drizzle ORM**, with **Better Auth** for authentication.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers, Server/Client Components) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 4, IBM Plex Sans Arabic, Material Symbols |
| Database | PostgreSQL 17 (local Docker **or** company-owned Neon) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth (email + password, sessions in PostgreSQL) |
| Validation | Zod + React Hook Form |
| OCR/PDF | pdf.js + Tesseract.js (lazy-loaded, browser-side) |
| Storage | Provider-neutral `StorageProvider` (local filesystem in dev) |
| Tests | Vitest + React Testing Library, Playwright |

---

## Quick start (local development)

```bash
npm install                        # 1. install

docker compose up -d               # 2. PostgreSQL (host 5433 -> container 5432)

cp .env.example .env.local         # 3. configure
openssl rand -base64 48            #    put the output in BETTER_AUTH_SECRET

npm run db:migrate                 # 4. schema
npm run db:seed                    #    + admin account

npm run dev                        # 5. run (http://localhost:3000)
```

Stop / remove the database:

```bash
docker compose down       # stop, keep data
docker compose down -v    # stop and DELETE the local data volume
```

If you already run PostgreSQL locally, skip Docker and point `DATABASE_URL` at
it — the application only ever depends on that single variable.

### Recreating the database from scratch

```bash
docker compose down -v && docker compose up -d
npm run db:migrate && npm run db:seed
```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. **Server-only.** |
| `BETTER_AUTH_SECRET` | yes | Session/token signing secret (≥32 chars, high entropy). |
| `BETTER_AUTH_URL` | yes | Public origin used for auth cookies/callbacks. |
| `ADMIN_EMAIL` | for seed | Administrator login created by `npm run db:seed`. |
| `ADMIN_PASSWORD` | for seed | Administrator password. |
| `DEV_OTP_CODE` | no | Development-only OTP (default `123456`); ignored in production. |
| `NEXT_PUBLIC_ALLOW_DEV_OTP` | no | `true` only for local production-build/E2E runs. |
| `NEXT_PUBLIC_DEMO_SESSION_RESET` | no | Renders the «بدء جلسة تجريبية جديدة» control. |
| `STORAGE_LOCAL_DIR` | no | Protected upload directory (default `.data/uploads`). |

---

## Database

Schema lives in `src/db/schema/`; generated SQL migrations in `drizzle/`.

| Table | Purpose |
| --- | --- |
| `user`, `session`, `account`, `verification` | Better Auth tables (auth is DB-backed). |
| `specialists` | Specialist profile + CV + approval `status`. |
| `organizations` | Organization profile + approval `status`. |
| `documents` | Uploaded files: `storage_key`, MIME, size, owner, kind. |
| `conversations` | One chat per specialist↔organization pair. |
| `messages` | Chat messages, including contract messages. |
| `contracts` | Contract fields, signatures, `pending` → `signed`. |
| `applications` | Structured specialist→organization applications. |

Enums (`account_status`, `profile_kind`, `document_kind`, …) keep status values
consistent at the database level, and every relationship is a real foreign key
with an explicit `onDelete` rule.

### Commands

```bash
npm run db:generate   # generate a migration from the schema
npm run db:migrate    # apply pending migrations
npm run db:seed       # create the admin account from ADMIN_EMAIL/ADMIN_PASSWORD
```

### Production (Neon)

Nothing is Neon-specific. Create a Neon project, put its connection string in
`DATABASE_URL` in the deployment environment, then run `npm run db:migrate` once.
`pg` honours `sslmode=require` straight from the connection string.

---

## Authentication & authorization

- Better Auth owns credentials and sessions, stored in PostgreSQL.
- **The browser never supplies a role.** `user.role` is read from the database
  on the server; admin routes verify the session server-side.
- The admin portal (`/admin`) uses the same Better Auth email/password flow —
  there is no hard-coded admin password.
- OTP verification keeps the legacy UX. In development a fixed code
  (`DEV_OTP_CODE`, default `123456`) is used and logged. **In production the
  fixed code is never accepted**, and `deliverOtp()` throws until a real
  email/SMS provider is configured — add one in `src/lib/auth/otp.ts` without
  redesigning authentication.

---

## Document storage

`src/lib/storage/index.ts` defines a provider-neutral `StorageProvider`
(`put` / `get` / `delete` / `exists`). Development writes to a local directory
outside the served `public/` tree; files are reachable only through the
authenticated `GET /api/files/[id]` route, which re-checks ownership. A
company-controlled S3-compatible backend can be added later by implementing
the same interface.

Uploads are validated (MIME type, size) before being written, and no base64
file blobs are stored in the database.

---

## OCR / PDF

`src/features/ocr/` is fully independent of the backend:

1. The file is validated and detected as PDF or image.
2. PDFs go through **pdf.js text extraction first** (multi-page).
3. Only if the required text is missing does it fall back to **Tesseract OCR**.
4. Parsers (`extractors/`) handle national ID, phone, name, ELESL license,
   issue date, and CR number.

Both libraries are **dynamically imported** — never part of the initial bundle,
and no worker is created until a document is actually selected. Workers are
reused within a session and released via `disposeOcrResources()`; every PDF
loading task is destroyed in a `finally` path and object URLs are revoked.

---

## Testing

```bash
npm run lint          # ESLint
npx tsc --noEmit      # type check
npm test              # Vitest unit + component tests
npm run build         # production build
npm run test:e2e      # Playwright (builds and serves the app on :3100)
```

Playwright needs a reachable `DATABASE_URL` (see `webServer` in
`playwright.config.ts`); it exercises the real registration, admin, OCR, and
chat flows against a real database.

---

## Project layout

```
src/
  app/            routes, pages, Route Handlers (/api/*)
  components/     shared UI (modal, toast, spinner, scan overlay, layout)
  db/             connection, schema, migrations runner, seed
  features/       domain features (auth, registration, chat, contracts,
                  specialists, organizations, admin, ocr, storage, ...)
  lib/            auth, api helpers, config, storage, utils, validation
  repositories/   server-side data access (users, profiles, chat,
                  applications, documents)
  types/          shared domain types
drizzle/          generated SQL migrations
e2e/              Playwright specs
```

---

## Deployment (Netlify)

`netlify.toml` sets the build command and Node version. Configure these in the
Netlify UI (all **server-side**, none public):

```
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, ADMIN_EMAIL, ADMIN_PASSWORD
```

`docker-compose.yml` is for local development only and is not used by the
hosting platform.


`DATABASE_URL` is never exposed to the browser — `src/db/index.ts` is
`server-only`. Never rename it to a `NEXT_PUBLIC_*` variable.
