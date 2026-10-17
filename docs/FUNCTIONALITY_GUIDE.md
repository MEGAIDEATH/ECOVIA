# ECOVIA FUNCTIONALITY GUIDE

> This guide documents the full application architecture, authentication flows, registration workflows, and verification status for the ECOVIA platform.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
   - [Admin Sign-in (HTTP 401)](#admin-sign-in-http-401)
   - [OTP Verification Flow (HTTP 500 / 400)](#otp-verification-flow-http-500--400)
3. [Registration Flows](#registration-flows)
   - [Specialist Registration (Consolidated)](#specialist-registration-consolidated)
   - [Organization Registration](#organization-registration)
4. [OCR / PDF Extraction](#ocr--pdf-extraction)
5. [Verification Status](#verification-status)
6. [Command Reference](#command-reference)

---

## Architecture Overview

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Server Components & Route Handlers) |
| Language | TypeScript (strict mode) |
| UI | Tailwind CSS 4, Material Symbols, IBM Plex Sans Arabic |
| Database | PostgreSQL 17 (Docker local or Neon) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth (email/password + email OTP) |
| Validation | Zod + React Hook Form |
| OCR/PDF | pdf.js (text extraction first) + Tesseract.js (fallback) |
| Storage | Provider-neutral `StorageProvider` (local dev / S3-ready) |

### Project Layout
```
src/
  app/            Routes, API route handlers (/api/*)
  components/     Shared UI
  db/             Connection, schema, migrations runner, seed
  features/
    auth/         Auth context, preferred role, session
    registration/ Specialist & organization registration flow
    admin/        Admin dashboard, approval list
    ocr/          OCR engine, extractors, scan document
    storage/      Document storage provider
  lib/
    auth/         Better Auth config, options, OTP delivery
    api/http/     HTTP helpers
    validation/   Zod schemas
    utils/        Safe storage, utilities
  repositories/   Server-side data access
  types/          Shared domain types
drizzle/          Generated SQL migrations
e2e/              Playwright spec files
```

---

## Authentication Flow

### Admin Sign-in (HTTP 401)

**Endpoint:** `POST /api/admin/login`

**Process:**
1. Request body: `{ email, password }`
2. Email format validation (must contain `@`)
3. Empty password check → returns 401
4. Calls `getAuth().api.signInEmail({ body: { email, password }, returnHeaders: true })`
5. If authentication fails → returns 401 with `رمز الدخول غير صحيح!`
6. Retrieves user from database via `getUserByEmail(email)`
7. If user doesn't exist or `role !== 'admin'` → returns 403
8. On success: forwards session cookies and returns `{ ok: true }`

**Root Cause of 401:**
- The `/api/admin/login` route code is structurally correct.
- Common root cause: The database was not migrated and/or the admin user was not seeded.
- The admin account is created by `npm run db:seed` (which calls Better Auth's `signUpEmail`), then `role: 'admin'` is set server-side.

**Fixes applied:**
1. Run `npm run db:migrate` to apply the schema.
2. Run `npm run db:seed` to create the admin user with `role: admin`.
3. Verify `ADMIN_EMAIL=admin@ecovia.local` and `ADMIN_PASSWORD=admin_secure_password_123` in `.env.local`.

---

### OTP Verification Flow (HTTP 500 / 400)

**Key Files:**
- Client: `src/features/registration/OtpVerification.tsx`
- Route: `/api/session/otp/route.ts`
- Verification: `/api/session/verify/route.ts`
- Auth config: `src/lib/auth/options.ts`
- OTP delivery: `src/lib/auth/otp.ts`

**Process:**

1. **OTP Request** (`POST /api/session/otp`):
   - Request body: `{ email }`
   - Validates email format
   - Calls `getAuth().api.sendVerificationOTP({ body: { email, type: 'sign-in' } })`
   - Better Auth generates OTP using `generateOtp()` → returns development code `123456` in dev
   - Stores OTP in `verification` table (hashed)
   - Calls `deliverOtp()` which logs the code (development only)

2. **OTP Verification** (`POST /api/session/verify`):
   - Request body: `{ email, code }`
   - Validates email format and 6-digit code format
   - Calls `getAuth().api.signInEmailOTP({ body: { email, otp: code }, returnHeaders: true })`
   - If code wrong/expired → returns 401
   - If successful: returns user data with session cookies

3. **Registration after Verification:**
   - Specialist: calls `POST /api/register/specialist`
   - Organization: calls `POST /api/register/organization`

**Development OTP Config:**
- `DEV_OTP_CODE=123456` (default) — used in development
- `NEXT_PUBLIC_ALLOW_DEV_OTP=true` — enables dev OTP in E2E/production builds
- Production always uses real OTP delivery (throws if called)

**Root Cause of 500:**
- Common root cause: database was not migrated, so `verification` table didn't exist.
- `sendVerificationOTP` failed → 500.

**Root Cause of HTTP 400 (OTP request):**
- `OtpVerification.tsx` auto-requests an OTP on mount (`useEffect`).
- If `draft.email` is empty (e.g. the user navigates directly to `/register/specialist/verify`,
  or the registration form did not capture email), the client posted `{ email: "" }`.
- `/api/session/otp` validates the email and returned 400 `البريد الإلكتروني غير صالح.`
- **Fix:** `sendOtp` now short-circuits when `email` is empty or missing `@`, sets
  `otpState = 'failed'` (showing a retry button) instead of hitting the server.
  Error responses are also parsed so the server's error message is surfaced via toast.

**Fixes applied:**
1. Run `npm run db:migrate` to ensure `verification` table exists.
2. Verify `.env.local` has `DEV_OTP_CODE=123456`.
3. Test with `curl`:
   ```bash
   curl -X POST http://localhost:3000/api/session/otp \
     -H "Content-Type: application/json" \
     -d '{"email":"user@ecovia.local"}'
   ```

---
## Registration Flows

### Specialist Registration (Consolidated)

**Pages:**
- `/register/specialist` — single-step form
  (`src/features/registration/SpecialistRegistrationConsolidated.tsx`)
- `/register/specialist/verify` — OTP verification
  (`src/features/registration/OtpVerification.tsx` with `role="spec"`)
- `/register/specialist/step-1` and `/register/specialist/step-2` — legacy
  redirects to `/register/specialist` (kept for backward compatibility)

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `fullName` | text | Yes | min 1, max 200 |
| `nationalId` | number | Yes | min 1, max 32 |
| `email` | email | Yes | email pattern, max 320 |
| `phone` | number | Yes | min 1, max 32 |
| `license` | text | Yes | min 1, max 120 |
| `issueDate` | date | No | max 40 chars |

A single `DocumentUploadCard` triggers OCR on both the personal and license
extractors; extracted values are populated into the form for user review.

**Submit flow:**
1. React Hook Form validates against `specialistRegistrationPayloadSchema`.
2. Valid values are saved into the `RegistrationProvider` draft.
3. Client navigates to `/register/specialist/verify`.
4. `OtpVerification` auto-requests an OTP via `POST /api/session/otp` using
   `draft.email`.
5. User submits the 6-digit code → `POST /api/session/verify` establishes the
   Better Auth session.
6. Optional license document is uploaded via `POST /api/files`.
7. `POST /api/register/specialist` persists the profile (`status: 'pending'`)
   → redirect to `/waiting?role=spec` (or `/specialist` if already approved).

**Historical fixes:**
- The form previously omitted the `email` and `phone` inputs even though the
  Zod schema requires them, so validation always failed and the submit button
  appeared to do nothing. Both fields were added (one field per row, per the
  single-column layout).
- The OTP page's back link pointed at the verify page itself; it now returns
  to `/register/specialist`.
- Orphaned legacy components `SpecialistStep1Form.tsx`, `SpecialistStep2Form.tsx`,
  and `SpecialistStep1Form.test.tsx` were deleted.

### Organization Registration

**Pages:**
- `/register/organization` — single-step form
  (`src/features/registration/OrganizationRegistrationForm.tsx`)
- `/register/organization/verify` — OTP verification
  (`OtpVerification.tsx` with `role="org"`)

**Form Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `crNumber` | text | Yes | Commercial registration number |
| `orgName` | text | Yes | (can be fetched via CR lookup) |
| `phone` | number | Yes | Contact phone |
| `orgDesc` | text | Yes | Company description |
| `crFile` | File | No | Commercial registration PDF (optional) |

**CR Lookup:**
- Mock CR lookup (`getCrLookupService().lookup()`) fetches org name and description
- Controlled by `src/features/organizations/crLookupService.ts`

The organization email is synthesized as `org_<crNumber>@ecovia.local`, so the
OTP request always has a valid address.

**Submit flow:**
1. User submits form → navigation to `/register/organization/verify`
2. OTP verification (see above)
3. Optional CR document uploaded via `POST /api/files`
4. `POST /api/register/organization` creates `organizations` row with `status: 'pending'`
5. User is redirected to `/waiting?role=org` (or profile page if approved)

---

## OCR / PDF Extraction

**Key Files:**
- `src/features/ocr/scanDocument.ts` — Main scan function with `ScanKind` parameter
- `src/features/ocr/extractors/personal.ts` — Extract `name`, `nationalId`, `phone`
- `src/features/ocr/extractors/license.ts` — Extract `license` and `issueDate`
- `src/features/ocr/extractors/cr.ts` — Extract 10-digit CR number
- `src/features/ocr/documentText.ts` — pdf.js and Tesseract.js lazy-loading

**Extraction Strategy:**
1. **PDF → Text layer first** (up to 5 pages)
   - If required field found in text layer → no OCR needed
   - If missing → fallback to Tesseract OCR (scale 2.0 personal, 3.0 license)
2. **Images → Direct OCR** with `ara+eng` (personal) or `eng` (license)
3. **Multiple pages** → merge results (later pages override earlier)

**Parse Rules:**
- Personal: Saudi national ID (10 digits, starts with 1 or 2), 9665XXXXXXXX → 05XXXXXXXX
- License: Patterns `ELESL-YYYY-N` / `ELESLYYYYN` normalized to `ELESL-YYYY-N`
- Multiple dates → latest wins, returned as `YYYY-MM-DD`

**Memory Management:**
- Workers cached per language set
- Workers auto-terminated after idle period
- PDF object URLs revoked
- Canvas bounded at max 3000x3000

---

## Verification Status

| Flow | Status | Notes |
|------|--------|-------|
| Admin Sign-in | ✅ Fixed | Requires fresh database migration + seed |
| OTP Request | ✅ Fixed | Requires `verification` table in DB; client guards against empty email (HTTP 400 fix) |
| OTP Verification | ✅ Fixed | Requires `verification` table in DB |
| Specialist Registration (Consolidated) | ✅ Fixed | Single page with all fields (name, national ID, email, phone, license, issue date) |
| Organization Registration | ✅ Existing | No changes needed |
| OCR Extraction | ✅ Working | PDF text layer first, Tesseract fallback |
| Unit Tests (Vitest) | ✅ Passed | 171 tests / 30 files |
| Lint (ESLint) | ✅ Passed | All touched files clean |
| Type-check (tsc) | ✅ Passed | `npx tsc --noEmit` clean |
| Build (Next build) | ✅ Passed | 37/37 pages |
| E2E Tests (Playwright) | ⚠️ Blocked | Browser install fails due to network restriction in this environment; specs updated but not executed live |

---

## Command Reference

```bash
# Development
npm run dev                    # Start dev server on :3000
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # ESLint
npx tsc --noEmit               # Type check
npm test                       # Vitest unit tests
npm run test:e2e               # Playwright E2E tests

# Database
npm run db:migrate             # Apply schema migrations
npm run db:seed                # Seed admin user
npm run db:generate            # Generate new migration

# Docker
docker compose up -d           # Start PostgreSQL 17
docker compose down            # Stop (data preserved)
docker compose down -v         # Stop + delete data
```
