# ECOVIA (Echovia) — implementation report

> Written after the work, from observed results. Product spelling in the codebase is **ECOVIA / إيكوفيا**
> (unchanged); this file uses the requested `ECHOVIA_` name. Routes: [ROUTES.md](ROUTES.md) ·
> interactive map: [route-map.html](route-map.html) · data: [routes.json](routes.json) ·
> security: [SECURITY_AUDIT.md](SECURITY_AUDIT.md) · backlog: [NEXT_STEPS.md](NEXT_STEPS.md).

## 0. Release-readiness round (2026-11-26) — current state

**Verdict: ready for a production release with limitations — blocked only on an owner decision
about the live site (P0 below).**

### Discrepancies found vs. the previous report
- **Production is not on the new build.** The audit log shows the new deployment was promoted at
  22:02 UTC and the *previous* deployment (`dpl_Cihe8NXff7DJFrbSoXBiZ919Rf1i`) was re-promoted from the
  owner's CLI session at 22:08 UTC. `ecovia-kappa.vercel.app` serves the old build (`/waiting` → 200,
  `/dashboard` → 404) **against the `demo` DB that already has 0006**. The old build's chat
  contract creation fails there, and its pre-fix weaknesses are live. `demo` contains no 0006-only data
  yet, so either path forward is clean — see NEXT_STEPS P0-1. Nothing was changed in production this round.
- Everything else matched: `f71b488` holds the code; docs/scripts/`.vercelignore` were uncommitted;
  nothing staged or pushed; `dev` DB was at 6 migrations.

### Completed this round (verified)
| Item | Verification |
|---|---|
| **Second profile on one login** (specialist ⇄ facility): signed-in users reuse the registration forms; the OTP step is replaced by a confirmation; the server attaches a **pending** profile to the same user; duplicates redirect to the existing profile; switcher marks it "(قيد المراجعة)"; "add profile" entry in the nav | e2e both directions (same `user` row, 1 profile of each kind, `pending`); integration duplicate-profile test |
| **Rejected-account re-review**: state machine `pending→approved/rejected`, `rejected→pending` (owner **resubmits** with a note, or admin **reopens**); approve/reject only from `pending` (409 otherwise); admin details panel with registration record, attachments and full history; every step in `account_events` | integration (4 tests incl. double-approval race); e2e reject → 409 on direct approve → resubmit → history `[registered, rejected, resubmitted]` → approve |
| **Directory filters in the URL** (`q`, `region`, `years`, `city`, `page`), validated, filtered on the server via `next/form`; client directory component removed | unit (5) + e2e (reload, back/forward, invalid values ignored) |
| **Security fixes** S1–S4 (failed-login throttling, public sign-up disabled, anti-framing headers, guarded review transitions) | see SECURITY_AUDIT.md |
| `/forgot-password` and `/admin` pages are now Server Components (client forms/dashboard kept as islands) | build + e2e |
| Migration **0007** (2 evidence-based indexes) + rollback; applied to `dev`, `preview`, test branches; **not** to `demo` (needs approval) | migrate output; index present |
| `dev` DB migrated 6 → 8 (3 users preserved) | query |
| DB audit + proposed (unapplied) `drizzle/proposed/0008_drop_applications.sql` | §5a |

### Authenticated end-to-end verification performed
- **Local production build + disposable DB `test-e2e`** (desktop + mobile Chromium): 58 passed,
  6 intentionally skipped (account-creating / multi-account flows run once on desktop; one OCR test
  skips itself on mobile).
- **Real Vercel preview** `https://ecovia-ap8i5ueqf-megaideaths-projects.vercel.app` (preview DB with QA
  fixtures — never the live DB):
  - Browser (Playwright, via a 23-hour share link): publish → regional notification → two offers →
    contract prepared (request still open) → signing → request closed, other offer declined → signed
    document for both parties → chat View CV; private-request isolation; pending restrictions; account
    switching; notification counter — **5/5 passed**.
  - API (`vercel curl`): logins 200; unsupported service type 400; Riyadh specialist unread 1 / Eastern 0;
    private request target 200 / other specialist 404 / anonymous 401; pending 403 on approved APIs and
    chat, 200 on own CV; **Neon Object Storage upload on Vercel** + owner GET 200 / unrelated facility 403 /
    anonymous 401; public sign-up 400; security headers present; logout → 401.
- Not verified on preview: the account-creating flows (second profile, re-review) — the preview's OTP
  allowlist doesn't include fresh identities and there is no admin on the preview DB; they are verified
  on the local production build.

### Fresh test results (this round)
| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `eslint .` | ✅ 0 problems |
| Unit (`vitest run`) | ✅ 39 files, 249 passed (−8 tests of the removed client directory component, +5 directory-filter tests) |
| Integration (`test:integration`, `test-integration` branch) | ✅ 19 passed (14 + 5 new) |
| E2E local (`playwright test`, desktop + mobile) | ✅ 58 passed, 6 skipped, 0 failed |
| E2E on Vercel preview (`marketplace.spec.ts`, desktop) | ✅ 5 passed |
| `next build` | ✅ |
| `node scripts/route-docs.mjs --check` | ✅ 66 route files, 18 server actions, 9 flows |
| Route map in Chromium (1280 px, 390 px) | ✅ 84 nodes, search/filter/click/flow steps, no overflow, no JS errors |
| Migration validation | ✅ 0007 applied to 4 non-production branches; 0006 forward/rollback tested earlier |
| Formatting check | **Not run** — no formatter configured (proposal in NEXT_STEPS P2-10) |

### Remaining Client Components (legitimate)
Chat (`ChatLayout` + children: polling, scroll, composer), CV editor (uploads with previews, form state),
registration + OTP + OCR (camera/file processing, multi-step draft), admin dashboard (lazy island so admin
code never ships with public pages), forms bound to Server Actions (`RequestForm`, `OfferForm`,
`PrepareContractDialog`, `SignContractForm`, `ActionForm`, `FacilityProfileForm`, `LinkProfileStep`),
small islands (`NotificationBell`, `WorkspaceNav`, `RegionFilter`, `AutoSubmitSelect`,
`ServiceTypeMultiSelect`, `AttachmentItem`, `PrintButton`, modals, toast, landing-page interactions).
No `page.tsx` is a Client Component any more.

### Attachment access — the "business relationship"
`canViewDocument` (src/repositories/documents.ts): owner and admins always. Otherwise the document must
belong to an **approved** profile and:
| Document | Who else may view |
|---|---|
| Specialist photo, CV file | any approved facility (directory / CV) |
| Specialist permit (license) | approved facility **with a relationship**: an offer by the specialist on one of its requests, a private request it addressed to the specialist, a contract between them, or a conversation between them |
| Facility logo | any approved specialist |
| Facility commercial registration | approved specialist with the same relationship definition |
| Contract document | its two parties (approved) and admins (`/contracts/[id]`) |

### Git
Branch `branch` (remote `origin` = github.com/MEGAIDEATH/ECOVIA); `f71b488` untouched; this round is
committed on top — see the final message for hashes and push status.

---

## 1. Executive summary

The facility ⇄ specialist marketplace was reworked end to end and deployed:

- **Lifecycle:** requests stay open to any number of offers until a contract is **signed**; selecting an
  offer only prepares a contract. Signing is one transaction with row locks, and PostgreSQL guarantees
  at most one signed (and one pending) contract per request.
- **Requests:** "Service Name" → **Service Type** multi-select (the 4 exact services, enum array);
  Price and Duration removed from the facility form (duration now belongs to each offer); **Activity
  Description** and **Notes** added; **public vs private** requests with server-side visibility.
- **Specialists:** region filter in the URL, regional notifications (approved specialists of that region
  only, idempotent), offers with validated execution duration.
- **Access:** `/waiting` removed. Pending/rejected users land on their own CV (specialist) or facility
  profile and can edit it and log out; everything else redirects there (pages) or returns **403** (APIs).
  One server-side policy layer replaces the old client-side guards (which let pending users in).
- **Also:** facility profile page, contract document page, notification bell + dashboard counters,
  account switcher, working "View CV" in chat, registration details and attachments with
  relationship-based access, old workspace headers removed, server-first pages.
- **Database:** one additive migration (0006), tested forward → rollback → forward on a copy of the
  production data, applied to `preview` and `demo` (backed up first) with all rows preserved.
- **Deployed:** https://ecovia-kappa.vercel.app (verified anonymously — see §11).

## 2. Repository baseline (discovered)

| Area | Found |
|---|---|
| Framework | Next.js 16.3.6 (App Router, Turbopack), React 19.3, TypeScript strict, Tailwind 4 |
| Database | PostgreSQL 18 on Neon via Drizzle ORM 0.45 + drizzle-kit; migrations 0000–0005. Branches: `dev` (local), `preview` (Vercel Preview), `demo` (Vercel Production — public demo, real demo data: 7 users, 2 requests, 1 signed contract, 11 documents), `production` (unused) |
| Auth | Better Auth 1.7 (email/phone OTP + password), sessions in PostgreSQL; approval = `status` on `specialists` / `organizations` (`pending`/`approved`/`rejected`); no `isApproved` flag exists |
| Storage | Neon Object Storage (S3, private bucket) behind the authenticated `/api/files/[id]` proxy; local FS in dev |
| Hosting | Vercel project `ecovia` (Git-connected repo `MEGAIDEATH/ECOVIA`, previews behind Vercel Authentication, production domain `ecovia-kappa.vercel.app` public). Previous production deployment was a CLI deploy from 13 days earlier |
| Tests | Vitest (34 files / 199 tests, all passing), Playwright e2e, no formatter configured |
| Baseline gates | tsc ✅, ESLint ✅, unit ✅, build ✅ |

**Defects found in the baseline** (all fixed): pending users got full dashboard access (client guard never
blocked them); logout never called the server; `safeRedirectPath` rejected any path containing `r` or `n`
(broken `?next=`); `/set-password?next=` was an open redirect; chat "View CV" passed a user id into a uuid
query (always failed); any approved facility could read *any* resume/photo file; chat/applications APIs
ignored approval; anyone could attach another user's document id to their profile; a specialist could
open a chat with any facility; contracts cascade-deleted with users; the chat showed a false
"encrypted channel" badge; "accept" let the first specialist close a request for everyone.

## 3. Features and status

| Requirement | Status | Notes |
|---|---|---|
| Facility profile (name, fields of business, logo, description, contact, registration) | **Completed** | `/organization/profile`; registered name / CR read-only (verified at registration) |
| Specialist test identity | **Completed** | Dev/test fixtures only (`npm run db:seed:fixtures`), labelled "(تجريبي)"; never seeded into `preview`/`demo` |
| Remove workspace headers | **Completed** | Replaced by one compact `AppShell` nav; e2e checks nested routes |
| Service Type multi-select, no Price/Duration, Activity Description, Notes | **Completed** | Checkbox-based multi-select with removable chips; server validation + DB enum |
| Public / private requests | **Completed** | Private visible only to target (404 for others, page and API) |
| Region filter (URL) | **Completed** | `?region=<code>`, survives refresh; unknown codes reported and ignored |
| Regional notifications | **Completed** | Approved + same region only, dedupe key, retry-safe |
| Offers with duration; multiple offers until signing | **Completed** | One offer row per specialist per request (revisions update it) |
| One signed contract per request (atomic) | **Completed** | Row locks + conditional updates + partial unique indexes; concurrency tested |
| View contract document | **Completed** | `/contracts/[id]` for both parties/admin, printable, drafts labelled, no e-signature claim. It is a server-rendered document, not a stored PDF |
| View CV in chat | **Completed** | Uses specialist profile id via authorized directory API |
| Chats from request/offer screens | **Completed** | "مراسلة" links on offers and requests |
| Registration details & attachments | **Completed** | Owner: full record; counterparties: permit / CR only after a business relationship; admin unchanged |
| Notification bell + dashboard counter, mark read | **Completed** | Shared bell (9+ cap, exact count in accessible name) + counters on both homes |
| Account switcher | **Completed** (switching) / **Partially** (obtaining a second profile) | Works for users owning both profiles; the UI still has no flow to *add* a second profile to an existing login (registration creates a separate login). Dual-profile users exist via fixtures |
| Remove `/waiting`, pending CV access, 401/403 | **Completed** | |
| Public website | **Completed** | Landing/auth pages public; workspaces/APIs/files protected |
| Server Components by default | **Partially** | All workspace pages, dashboards, request pages, profile, contract, notifications are Server Components; registration, login form, CV editor, chat, directory filtering and admin remain client components (see §9) |
| Database cleanup | **Partially** | Relations/constraints made explicit (0006); legacy columns and the unused `applications` table kept (not dropped) pending sign-off |
| Route docs + interactive map | **Completed** | Generated from `docs/routes.json`, drift-checked against `src/app` |

## 4. Important files

- **Auth:** `src/lib/auth/access.ts` (pure rules: approval, entry path, workspace/API decisions),
  `policies.ts` (`requireAuthenticatedUser`, `requireRole`, `requireApprovedUser`, `requireWorkspacePage`),
  `recordAccess.ts` (`requireRecordAccess` for requests, contracts, documents), `session.ts`.
- **Domain:** `src/lib/marketplace/rules.ts` (visibility, offer eligibility, transitions),
  `src/lib/serviceTypes.ts`, `src/lib/regions.ts`, `src/lib/validation/{marketplace,profile}.ts`.
- **Data:** `src/repositories/{serviceRequests,marketplace,contracts,notifications,documents,chat}.ts`.
- **Actions:** `src/server/actions/{marketplace,notifications,account,profile}.ts`.
- **UI:** `src/components/layout/AppShell.tsx`, `src/features/marketplace/*`,
  `src/features/contracts/*`, `src/features/notifications/*`, `src/features/organizations/profile/*`,
  pages under `src/app/{specialist,organization,contracts,dashboard}`.
- **Schema:** `src/db/schema/{domain,engagement,contracts,chat}.ts`, `drizzle/0006_*.sql`,
  `drizzle/rollback/0006_down.sql`.
- **Removed (references traced first):** `/waiting`, `useApprovalListener`, `useDashboardGuard`,
  `useDashboardEntry`, `dashboardRouting`, `preferredRole` (localStorage), old workspace headers and
  client providers, client-fetching request/home views, freeform chat `ContractModal`, the dead
  `/api/applications` flow, `/api/organization/recent-specialists`, and
  `/api/service-requests/[id]/{accept,cancel,reject,status}` (replaced by Server Actions; `accept`
  encoded the obsolete "first wins" rule).

## 5a. Database audit (2026-11-26, read-only on `demo`)

| Object | Represents | Read | Written | Rows on `demo` | Replaced by | Removal |
|---|---|---|---|---|---|---|
| `applications` table | old "apply to organization" flow | no | no | 0 (also 0 on dev/preview) | `service_request_offers` | safe after approval — `drizzle/proposed/0008_drop_applications.sql` (not applied) |
| `service_requests.service_name`, `cost`, `duration`, `duration_value/unit`, `service_category`, `description` | pre-0006 request form | yes (legacy rows displayed) | no | 2 legacy requests use them | `service_types`, `activity_description`, `notes`, offer duration | **not safe** — only copy of that history |
| `service_requests.status = 'rejected'` | legacy global rejection | yes (label) | no | 0 | personal declines | keep (enum value removal is a type rebuild) |
| Unattached documents | uploads never linked to a profile | owner only | — | 7 | — | retention job (NEXT_STEPS P1-6), no deletion now |
| `account_events` without `target_kind` | contract events (by design) | — | yes | 1 | — | fine |

Integrity: no orphan messages, no dangling notification targets, no duplicate pairs (unique keys),
signed-contract uniqueness and RESTRICT FKs intact. FK columns without an index: added
`contracts_offer_idx` and `account_events_target_idx` (0007) for the queries that use them; the
document FKs on profiles are left unindexed (tiny tables, only hit on document deletion).

## 5. Database (migration 0006, additive)

**Added:** `regions` lookup (13 rows; `service_requests.region` and new `specialists.region` are FKs to
`regions.name_ar`, ON UPDATE CASCADE); `service_type` enum array + `activity_description`, `notes`,
`visibility`, `target_specialist_id` on requests with CHECKs (private ⇔ target; new rows need types +
activity); `service_request_offers` (unique per request+specialist); contracts gained
`service_request_id`, `offer_id`, `organization_id`, `specialist_id`, `organization_signed_at`,
`cancelled_at`, `created_at`, `updated_at`, status `cancelled`, partial unique indexes
`contracts_one_signed_per_request` / `contracts_one_pending_per_request`, a signed-needs-signature CHECK,
and **all contract FKs changed to RESTRICT** (no cascade into signed contracts); facility
`business_fields`, `profile_image_id`, `website`; notification `dedupe_key` (unique per recipient) and an
unread partial index; indexes for discovery and fan-out.

**Kept (legacy, documented):** `service_name`, `cost`, `duration*`, `service_category`, `description`
on requests (now nullable; shown only on legacy rows); `applications` table (0 rows everywhere).

**Data handling:** legacy chat contract backfilled from its conversation/message; specialist region
backfilled only from unambiguous city names; region FK validated only when every row is canonical.

**Process actually followed:**
1. Read-only inventory of `dev`, `preview`, `demo`.
2. Throwaway branch `test-0006-from-demo`: migrate → verify → `0006_down.sql` → verify → migrate again (all OK).
3. Applied to disposable copies of `dev` (`test-integration`, `test-e2e`) for the test suites, then to `preview` (empty).
4. `demo`: backup branch **`demo-backup-pre-0006`** created (no expiry), counts recorded, migrated,
   counts identical afterwards (users 7, specialists 3, organizations 3, requests 2, contracts 1,
   messages 8, documents 11, conversations 1), legacy contract backfilled, constraints validated.

Update 2026-11-26: `dev` is now migrated (0006 + 0007). The `production` Neon branch (unused by any
deployment) was not touched. `demo` is at 0006 (0007 pending approval).

## 6. Authentication & authorization

- Canonical rule: approved ⇔ `status === 'approved'` (`isApprovedStatus`); `pending` and `rejected`
  are both unapproved (rejected users see the reason in their banner).
- `/dashboard` (server) decides the landing page: approved → workspace; unapproved → `/specialist/cv` or
  `/organization/profile`; no profile → `/choose-role` (no loop); admin → `/admin`. Login, signup and
  password setup all go through it. `?next=` is same-origin only (both fixed bugs).
- Every workspace page calls `requireWorkspacePage(role, 'any'|'approved', path)`; signed-out users go to
  `/login?next=<exact path>`.
- APIs: **401** no session, **403** unapproved / wrong role, **404** records outside the caller's scope.
  Own-profile APIs (`/api/specialist/profile`, `/api/organization/profile`, `/api/files` upload) allow
  pending users; IDs never select whose profile.
- Logout: `logoutAction` / `/api/session/logout` revoke the DB session and clear the `__Secure-` cookie
  variants; works in every state.
- Active-context cookie (`ecovia_active_role`) only chooses among owned profiles; forged values are
  ignored (e2e-tested).
- No `proxy.ts` was added: checks need the database, and a cookie-only proxy would add no security.

## 7. Request / offer / contract lifecycle

| Entity | States |
|---|---|
| Request | `pending` (**open for offers**, may have a contract awaiting signature) → `accepted` (**contracted**, closed) → `in_progress` → `completed`; `pending` → `cancelled`; `rejected` legacy |
| Offer | `submitted` (**offer submitted**) ⇄ `selected` (**contract preparation pending**) → `accepted`; `declined` (facility, or request awarded elsewhere/cancelled); `withdrawn` (specialist) |
| Contract | `pending` (draft, facility signed) → `signed` (**contract signed**) or `cancelled` |

Signing (`signContract`): lock request row → lock contract row → require both still pending → contract
`signed`, its offer `accepted`, other active offers `declined`, other pending contracts `cancelled`,
request `accepted` with the specialist assigned, notifications and audit event — one transaction. All
mutations lock the request first (no deadlock ordering issues). The partial unique index rejects any
second signed contract even if code is bypassed (tested with a raw insert).

## 8. Security improvements and remaining risks

Fixed: everything in §2's defect list; document access is now owner/admin or workflow counterparty
(permit / CR only with an offer, private request, contract or conversation), `Cache-Control: no-store`
for registration files; chat size (2000) and rate (30/min) limits; upload rate limit (30/15 min);
profile attachments must be the caller's own upload of the right kind; competitor offer counts hidden
from specialists.

Remaining risks: files are served through an authenticated proxy rather than short-lived signed URLs
(no presigner dependency added; every fetch is re-authorized); typed-name signatures are not legal
e-signatures (stated on the document); OTP delivery still has no real SMS/email provider (demo mode
by allowlist, unchanged); chat polls every 3–5 s.

## 9. Next.js architecture

Server Components: all workspace pages and layouts, `/dashboard`, `/contracts/[id]`, login page shell,
landing page. Mutations use Server Actions (17) with `useActionState`; lifecycle actions redirect with a
server-rendered `?notice=` so confirmations survive re-render. URL state: `tab`, `region`, `page`,
`specialist`, `notice`, `created`, `chat`.

Remaining client components (genuinely interactive): `NotificationBell`, `WorkspaceNav` (active tab),
`RegionFilter`, `ServiceTypeMultiSelect`, `RequestForm`, `OfferForm`, `PrepareContractDialog`,
`SignContractForm`, `ActionForm`, `FacilityProfileForm`, `AttachmentItem`, `PrintButton`, chat,
`CVEditor`, directory filters, registration/OCR, login/forgot/set-password forms, admin dashboard.
The root layout no longer fetches the session on every page (public pages stay static).

## 10. Commands run and results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint .` | ✅ 0 problems |
| `npx vitest run` | ✅ 39 files, **252 passed** (was 199) |
| `npm run test:integration` (real DB, `test-integration` branch) | ✅ **14 passed** — concurrency (3 simultaneous signatures → 1), concurrent preparation, DB-level guard, private isolation, regional fan-out + idempotency, permit gating, notification ownership, cascade protection |
| `npx playwright test` (prod build on :3100, `test-e2e` branch, desktop + mobile) | ✅ **47 passed, 3 skipped** (multi-account flows run on desktop only by design; one OCR test skipped on mobile by its own guard) |
| `npx next build` | ✅ |
| `node scripts/route-docs.mjs --check` | ✅ 64 route files, 17 actions, 7 flows |
| Migration 0006 forward/rollback/forward on demo copy | ✅ |
| Formatting check | **Not run** — no formatter is configured in the repo |

Test-design fixes made to existing e2e specs: unique phone numbers per run (fixed numbers tripped the
per-identity OTP rate limit on repeated runs) and waiting for the OTP before typing (race under load).
An authenticated check of the deployed production site was **not run**: it required your admin
credentials and was refused by the permission system; no test accounts exist in production by design.

## 11. Deployment (verified on 2026-11-25 — superseded, see §0: production was later rolled back)

- Preview: `https://ecovia-nkanazd4w-megaideaths-projects.vercel.app` (Ready; behind Vercel Authentication).
- Production: `https://ecovia-5nfb0o1h8-megaideaths-projects.vercel.app` promoted to
  **https://ecovia-kappa.vercel.app** (CLI deploy from the working tree = commit `f71b488` + docs).
- Verified anonymously on the public domain: `/`, `/login`, `/choose-role` 200; `/waiting` 404;
  `/specialist`, `/organization/requests/new`, `/contracts/[id]` → `/login?next=…`; APIs 401;
  logo asset 200; Open Graph title present. No runtime errors in the Vercel logs.
- The unmigrated `production` Neon branch stayed idle after production traffic (it is not in use).
- Domains, DNS, billing and protection settings were not changed. A `.vercelignore` now keeps `.env*`,
  local data and test artifacts out of CLI uploads.

## 12. Known limitations / blockers

- No UI to add a second profile to an existing login (switcher only appears for users who already own both).
- Admin dashboard still offers approve/reject only for pending rows (no re-review of rejected accounts).
- Directory filters are client-side state, not URL parameters.
- Contract "document" is generated on demand (printable page), not a stored file.
- Between migrating `demo` and promoting (~6 minutes), the old production build could not create chat
  contracts (new NOT NULL party columns). Promotion closed that window.
- Not committed/pushed by me: you committed the code (`f71b488`); the docs, README, scripts and
  `.vercelignore` from this last step are uncommitted. `origin/branch` still has one docs commit you don't.
- Disposable branches `test-0006-from-demo`, `test-integration`, `test-e2e` expire on 2026-11-26/27.

## 13. Manual production smoke test (run by the owner after promoting)

Use real (non-fixture) accounts; the admin password stays with the owner.
1. **Sign-up → pending:** register a specialist with the OTP flow → set password → lands on
   `/specialist/cv` with the pending banner; `/specialist/requests` sends you back to the CV.
2. **Admin approval:** in `/admin`, open "التفاصيل وسجل المراجعة" (attachments + history), approve →
   the specialist logs in to `/specialist`; set the work region on the CV.
3. **Facility request:** register or use an approved facility; publish a public request with two
   service types in that region → the specialist's bell count rises.
4. **Two offers:** two approved specialists offer with different durations.
5. **Selection:** the facility compares offers and prepares a contract → the request stays "مفتوح للعروض".
6. **Signing:** the chosen specialist opens the draft and signs → request "تم التعاقد", the other offer
   "لم يُقبل"; a second signature attempt is refused.
7. **Signed document:** both parties open `/contracts/[id]` and print it; a third account gets 404.
8. **Private-request isolation:** send a private request to one specialist → a different specialist
   neither sees it in lists nor opens its URL (404).
9. **Attachment access:** a facility with no relationship to a specialist cannot open the permit
   (403); after an offer or chat it can. Anonymous `/api/files/<id>` → 401.
10. **Second profile:** while signed in, use "إضافة ملف" → confirm → switcher shows "(قيد المراجعة)".
11. **Re-review:** reject a test account with a reason → it resubmits from the banner → approve.
12. Phone-width pass over the request form, offer form and contract page.

## 14. Rollback

- App: `vercel promote https://ecovia-p4utbqxwk-megaideaths-projects.vercel.app` (previous production build).
- Data: the old build tolerates the new schema except chat-contract creation; full revert:
  `psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f drizzle/rollback/0006_down.sql` (refuses while
  request-linked contracts exist), or restore from Neon branch `demo-backup-pre-0006`.

## 15. Links

[ROUTES.md](ROUTES.md) · [route-map.html](route-map.html) · [routes.json](routes.json) ·
[SECURITY_AUDIT.md](SECURITY_AUDIT.md) · [NEXT_STEPS.md](NEXT_STEPS.md)

## 16. Recommended next steps

Superseded by the prioritized backlog in [NEXT_STEPS.md](NEXT_STEPS.md). Items 2–4 of the previous list
(migrate `dev`, profile linking, re-review) are done.
