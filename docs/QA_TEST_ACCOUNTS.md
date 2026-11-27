# ECOVIA — persistent QA test accounts

Reusable accounts for manual testing. Since 2026-11-27 (owner decision) the three accounts below exist
in **both** the isolated Preview database and the **live site** (`https://ecovia-kappa.vercel.app/login`,
database `demo`), with the same passwords. The QA admin exists only on Preview. On the live site the
accounts are visible to real users (directory, Riyadh request notifications), so label anything you create
there as a test and avoid sending offers to real facilities. Automated specs still refuse the live domain.
Passwords are **not** in this file or anywhere in Git — they live in the git-ignored `.env.qa.local`
(and the git-ignored `docs/account.txt`) on the machine that created them. They were rotated on
2026-11-27 after an auto-commit pushed the first set to GitHub (see SECURITY_AUDIT.md).

## Accounts

| Display name | Role | Login email | Profile | Region |
|---|---|---|---|---|
| Ecovia QA Organization | Facility (organization), approved | `qa.organization@test.ecovia.local` | synthetic CR number, business fields, description, synthetic logo, synthetic commercial-registration PDF | requests are published to Riyadh (facilities have no region field) |
| Ecovia QA Specialist | Specialist, approved | `qa.specialist@test.ecovia.local` | synthetic photo, summary + competencies, synthetic CV PDF, synthetic permit PDF | منطقة الرياض (same as the organization's requests) |
| Ecovia QA Observer | Specialist, approved, independent | `qa.observer@test.ecovia.local` | same kind of synthetic data | المنطقة الشرقية (does **not** get Riyadh notifications) |

Also present on the Preview database: `qa.admin@test.ecovia.local` (QA-only administrator, created with
`npm run db:seed`, password in `.env.qa.local`) and the automated-test fixtures
(`*.approved@`, `*.pending@`, `dual.account@test.ecovia.local`, see `src/db/seed/fixtures.ts`).

All names, numbers (national id, licence `SYNTHETIC-QA-LIC-…`, CR `7999000001`, phones) and documents
are invented and labelled *QA / SYNTHETIC*. No real person, facility, licence or legal document is used.

## Environment

| | |
|---|---|
| Login URL | `https://ecovia-git-branch-megaideaths-projects.vercel.app/login` — the latest Git-triggered Preview of `branch` (same Preview database). The fixed build of `d6909f1` stays available at `https://ecovia-eaiijq392-megaideaths-projects.vercel.app/login`. |
| Access to the preview | protected by Vercel Authentication: sign in to Vercel with an account of the `megaideaths-projects` team, or use a share link from the Vercel dashboard (Deployment → Share) |
| Database | Neon branch `preview` (`br-late-meadow-a1pla6ex`) — isolated QA data, not `demo` |
| File storage | the Preview bucket configured in the Preview environment |
| OTP | Preview delivers no codes except to allowlisted identities. The QA accounts are **pre-verified** in the QA database and sign in with email + password, so they do not test real OTP delivery. |

## Create or update the accounts

```bash
# 1. Passwords (once): git-ignored file, never committed. 16+ random characters each.
cat > .env.qa.local <<'EOF'
QA_ORGANIZATION_PASSWORD=...
QA_SPECIALIST_PASSWORD=...
QA_OBSERVER_PASSWORD=...
EOF
chmod 600 .env.qa.local

# 2. Accounts + approved profiles (idempotent; refuses demo/production)
P="$(neon connection-string preview)"
DATABASE_URL="$P" DATABASE_URL_UNPOOLED="$P" NEON_BRANCH=preview QA_ALLOW_PREVIEW=true \
  QA_NEON_BRANCH_ID=br-late-meadow-a1pla6ex npm run db:seed:qa

# 3. Synthetic files through the app (logo, photos, CVs, permits, CR) — idempotent
#    E2E_STORAGE_STATE = Playwright storage state holding the Vercel preview access cookie
DATABASE_URL="$P" E2E_BASE_URL=https://ecovia-eaiijq392-megaideaths-projects.vercel.app \
  E2E_STORAGE_STATE=/path/to/preview-state.json \
  npx playwright test e2e/qa-accounts.spec.ts --project=desktop-chromium -g @setup

# 4. Link the uploaded permit / CR documents to the profiles (same command as step 2)
```

Live site (accounts and profiles only, no synthetic files, QA admin never touched):

```bash
P="$(neon connection-string demo)"
DATABASE_URL="$P" DATABASE_URL_UNPOOLED="$P" NEON_BRANCH=demo QA_ALLOW_LIVE=true \
  QA_NEON_BRANCH_ID=br-sparkling-hall-a1dylzla npm run db:seed:qa
```

Re-running step 2 never duplicates accounts and keeps passwords. To change passwords, edit
`.env.qa.local` and run step 2 with `QA_RESET_PASSWORDS=true` (re-hashed by Better Auth).

The guard requires all of: `NEON_BRANCH` is `dev`, `test-*`/`ci-*`, or `preview` with
`QA_ALLOW_PREVIEW=true`, or `demo` with `QA_ALLOW_LIVE=true`; not Vercel Production; the database's own
`neon.branch_id` equals `QA_NEON_BRANCH_ID`; and that id is never the unused `production` branch.

## Automated check of the accounts and scenarios

```bash
DATABASE_URL="$P" E2E_BASE_URL=<preview url> E2E_STORAGE_STATE=<state.json> \
  npx playwright test e2e/qa-accounts.spec.ts --project=desktop-chromium
```

`@auth` (login, role, dashboard, allowed/forbidden areas, logout, re-login) and scenarios A, C, D, B.
The spec skips itself without `E2E_BASE_URL` and the passwords, refuses the live domain, and refuses a
`DATABASE_URL` on a protected branch. Data it creates stays for inspection.

## Manual test script

**A — normal workflow.** Organization: edit the profile (`/organization/profile`) → *طلب خدمة جديد* (`/organization/requests/new`) →
two service types, region Riyadh → publish → log out. Specialist: bell shows a new notification →
`/specialist/requests?region=riyadh` → open the request → offer with a duration (e.g. 3 weeks) → log out.
Organization: open the request → the offer card → *اختيار العرض وإعداد العقد* → the request is still
"مفتوح للعروض" → log out. Specialist: *عرض مسودة العقد* → sign. Both: the request is "تم التعاقد" and the
signed contract opens (`/contracts/<id>`).

**B — multiple offers.** Organization publishes a second request; Specialist and Observer both offer
(the Observer opens it from the requests list — it is not notified, because it is in another region).
The organization sees two offers, selects one: the request stays open until the specialist signs.
After signing, the other offer shows "لم يُقبل" and no further contract can be signed.

**C — private request.** From the directory (`/organization/specialists`) choose *Ecovia QA Specialist* →
*طلب خاص*. The specialist sees "طلب خاص موجّه إليك وحدك". As the Observer, open the same URL
(`/specialist/requests/<id>`) → 404; `GET /api/service-requests/<id>` → 404.

**D — security.** As the Observer: another specialist's CV, the organization ↔ specialist chat, the
specialist's permit, and the signed contract of scenario A are all refused (403/404). The organization
can open the specialist's CV and permit once there is an offer/contract between them; the specialist can
open the organization's CR. Logged out, `/api/files/<id>` → 401. None of the QA accounts shows the
account switcher (single profile each); to test switching use `dual.account@test.ecovia.local`
(fixture password in `src/db/seed/fixtures.ts`).

## Reset and clean-up

- Business data from test runs (requests, offers, contracts, chats, notifications) accumulates on the
  Preview database; that is intended. To start clean, reset the `preview` branch from its parent in Neon
  (this also removes the fixtures and QA accounts — then repeat the steps above).
- The QA accounts themselves cannot simply be deleted once they own requests/contracts (those keep
  `RESTRICT` references by design); resetting the `preview` branch is the supported clean-up.
- Delete the local passwords when no longer needed: `rm .env.qa.local`.

## Known limitations

- No real OTP delivery is exercised (pre-verified identities).
- Previously uploaded profile pictures/CVs that were replaced stay in storage as unattached files of the
  QA accounts.
- Synthetic documents are generated PDFs/PNGs marked "SYNTHETIC TEST DOCUMENT"; OCR on them is not tested.
- The organization has no region of its own; region is chosen per request.
