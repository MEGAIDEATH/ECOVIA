# ECOVIA — Firebase migration & deployment runbook

Date of migration: **2026-09-26**
Migrated from (previous developer's project): `baeeyen-c7107` → to (owner's project): **`ecovia-platform`**

> This file documents exactly what was moved, what is deployed, what still needs
> a one-time action in the Firebase Console, and how to deploy/verify.

---

## 1. New Firebase project (owner-controlled)

| Item | Value |
| --- | --- |
| Project ID | `ecovia-platform` |
| Display name | ECOVIA |
| Project number | `616712884865` |
| Google account that owns it | the account signed in to the Firebase CLI on this machine (`firebase login:list`) |
| Firestore database | `(default)`, edition STANDARD, type FIRESTORE_NATIVE, location **`nam5`** (same as the legacy project) |
| Firestore rules + indexes | **deployed** (`firebase deploy --only firestore:rules,firestore:indexes`) |
| Web app | `ECOVIA Web` — app ID `1:616712884865:web:30cbb9b8c8a88b7f88b380` |
| Auth domain | `ecovia-platform.firebaseapp.com` |
| Storage bucket (name reserved) | `ecovia-platform.firebasestorage.app` — **not created yet**, see §3 |
| Data namespace | unchanged: `artifacts/default-app-id/public/data/...` (`NEXT_PUBLIC_DATA_APP_ID=default-app-id`) |

Enabled APIs on the new project (via Service Usage): `identitytoolkit`, `securetoken`,
`firebaseinstallations`, `firestore`, `firebasestorage`, `storage`, `iam`,
`cloudresourcemanager`, `cloudbilling` (+ the default Firebase set).

Client config now lives in `.env.local` (git-ignored) and in the Netlify
environment (§4). `.env.example` documents every variable; the legacy project's
values were removed from it.

### Admin SDK (server-only)

* Default service account: `firebase-adminsdk-fbsvc@ecovia-platform.iam.gserviceaccount.com`
  (roles: `firebase.sdkAdminServiceAgent`, `iam.serviceAccountTokenCreator`).
* A private key was generated for it and written **outside the repository** to
  `~/.config/ecovia/firebase-adminsdk-ecovia-platform.json` (mode `600`).
* Use it locally with `GOOGLE_APPLICATION_CREDENTIALS=<path>`; on Netlify use the
  single-line JSON in `FIREBASE_SERVICE_ACCOUNT`. **Never** commit the JSON and
  never prefix it with `NEXT_PUBLIC_`.

---

## 2. BLOCKER 1 — Firebase Authentication needs one console click

Firebase Auth is **not initialised** on `ecovia-platform`. Until it is, the app
cannot sign in anonymously and every Firestore write is rejected by the rules
(`request.auth != null`), so registration/admin flows cannot work.

Evidence that this is console-only (all attempted with the owner's own OAuth
token against the new project):

| Attempt | Result |
| --- | --- |
| `POST identitytoolkit.googleapis.com/v2/projects/{p}/identityPlatform:initializeAuth` | `400 BILLING_NOT_ENABLED : Identity Platform feature requires billing to be enabled.` |
| `PATCH`/`GET` `/admin/v2/projects/{p}/config`, `v2/.../config` (by project id **and** number) | `404 CONFIGURATION_NOT_FOUND` |
| `firebase auth:import` (provisions nothing, fails first) | `400 CONFIGURATION_NOT_FOUND` |
| `POST .../defaultSupportedIdpConfigs?idpId=anonymous` | `400 INVALID_PROVIDER_ID` (anonymous is not a supported IdP id) |
| Anonymous `accounts:signUp` with the Web API key | `CONFIGURATION_NOT_FOUND` |

The legacy project proves Auth works on the **free Spark plan**; only the
*Identity Platform upgrade* endpoint is billing-gated, and that is not what the
console uses for basic Auth.

**Owner action (≈30 seconds, free):**

1. Open <https://console.firebase.google.com/project/ecovia-platform/authentication>
2. Click **Get started** (this creates the Auth configuration).
3. On **Sign-in method → Anonymous**, click **Enable** → **Save**.

No API key or other value changes — the client config already in `.env.local`
stays valid. If the console instead demands a Blaze upgrade, stop and treat it
as blocker #2 (billing) — nothing else in this migration requires billing.

## 3. BLOCKER 2 — Cloud Storage needs the Blaze plan (billing)

New Firebase projects require the **Blaze** plan to set up Cloud Storage, and
**this Google account currently has no billing account at all**
(`billingAccounts: []`, `billingEnabled: false` on both projects — the legacy
project's bucket is grandfathered from before the 2024 policy change).

Evidence:

* `POST storage.googleapis.com/storage/v1/b?project=ecovia-platform` → `403 The billing account for the owning project is disabled in state absent`
* `POST firebasestorage.googleapis.com/v1beta/projects/{p}/defaultBucket` → `403 The caller does not have permission`
* `firebase deploy --only storage` → `Error: Firebase Storage has not been set up on project 'ecovia-platform'. Go to .../storage and click 'Get Started' ...`

**Owner action:** open
<https://console.firebase.google.com/project/ecovia-platform/storage>, click
**Get started** and follow the Blaze upgrade (a payment method is required).
Until then, document/file uploads (`src/features/storage/storageService.ts` →
`uploadBytesResumable`) fail with a catchable error and the UI shows its upload
failure message; everything else works.

After the bucket exists, deploy the rules with:

```bash
firebase deploy --only storage --project ecovia-platform
```


---

## 4. Netlify deployment

`netlify.toml` (repo root) is already correct: build `npm run build`,
`NODE_VERSION = 24`, no `publish` override (the Next.js runtime handles SSR and
`/api/*` route handlers). Environment variables are set in the Netlify UI
(**Site configuration → Environment variables**), never in the file:

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from §1 client config | public by design |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `ecovia-platform.firebaseapp.com` | public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `ecovia-platform` | public |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `ecovia-platform.firebasestorage.app` | public |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:616712884865:web:30cbb9b8c8a88b7f88b380` | public |
| `NEXT_PUBLIC_DATA_APP_ID` | `default-app-id` | data namespace |
| `NEXT_PUBLIC_DEMO_OTP` | `123456` | demo code shown in the UI |
| `NEXT_PUBLIC_DEMO_SESSION_RESET` | *(leave unset in production)* | hides the demo reset control |
| `ADMIN_PASSWORD` | a strong password (**not** the local demo `1234`) | server-only |
| `ADMIN_SESSION_SECRET` | long random string | server-only, signs the admin cookie |
| `FIREBASE_SERVICE_ACCOUNT` | **single-line JSON** of the key from §1 | server-only; do **not** use `NEXT_PUBLIC_*` |
| *(do not set)* `GOOGLE_APPLICATION_CREDENTIALS` | — | file path only works locally; Netlify cannot read your filesystem |

Create the single-line JSON from the key file with:

```bash
python3 -c "import json;print(json.dumps(json.load(open('$HOME/.config/ecovia/firebase-adminsdk-ecovia-platform.json'))))"
```

Steps: `netlify login` → `netlify link` (or “Import from Git” for
`https://github.com/MEGAIDEATH/ECOVIA`, branch `main`) → paste the variables
above → `netlify deploy --prod`. The CLI on this machine is **not logged in**
(`netlify login` needs the owner's browser), and the repository has not been
pushed yet (no GitHub credentials here), so this step is owner-run.

## 5. Verification commands

Local (uses `.env.local`, no Admin credentials → admin endpoints answer 503 by
design, which is what `e2e/admin-config-error.spec.ts` asserts):

```bash
npm run lint && npx tsc --noEmit && npx vitest run
npm run test:rules                       # 37 emulator rule checks, no network
npm run build
npx playwright test --workers=1          # serial: OCR is CPU/memory heavy
```

Admin SDK smoke test (temporary shell env, no file edits):

```bash
FIREBASE_SERVICE_ACCOUNT="$(python3 -c "import json;print(json.dumps(json.load(open('$HOME/.config/ecovia/firebase-adminsdk-ecovia-platform.json'))))")" \
  npm run start -- --port 3100
# then, in another shell:
curl -s -c /tmp/c.txt -X POST localhost:3100/api/admin/login -H 'content-type: application/json' -d '{"password":"1234"}'
curl -s -b /tmp/c.txt localhost:3100/api/admin/accounts   # expect the JSON account list
```

After the Auth console click (§2), confirm the browser can mint an anonymous
session and that the rules accept a write:

```bash
npx playwright test e2e/registration.spec.ts --workers=1   # real Firestore writes
```

## 6. Rollback

The old project `baeeyen-c7107` was **left untouched** (data, rules, users and
its web app) as a rollback path. To go back temporarily, restore the
`NEXT_PUBLIC_FIREBASE_*` values in `.env.local` from git history
(`git log -p -- .env.example`) and restart — nothing in the source code is tied
to a project id, so the switch is config-only.

## 7. Repository hygiene

* Removed: legacy `firebase-app.js` bundle (unreferenced, held the old project
  config), `scripts/ocr-diag.mjs`, root `*-debug.log` files, the GitHub Pages
  workflow (conflicts with Netlify), and the old project's values from
  `.env.example`.
* `.gitignore` now excludes `*.log`, `.firebase/`, `.lsp/`,
  `service-account*.json`, `*firebase-adminsdk*.json`, `*-credentials.json`.
* Local-only names that intentionally stay unchanged (they are UI/brand
  strings, not Firebase resources): npm package name `baeeyen-platform`, the
  localStorage probe key `__baeeyen_storage_probe__`, the admin cookie
  `baeeyen_admin_session`, and the emulator project id `demo-baeeyen`.
