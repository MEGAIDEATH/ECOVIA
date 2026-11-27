# ECOVIA — next steps (prioritized)

P0 = security, data integrity or release-blocking · P1 = essential business functionality ·
P2 = maintainability / architecture · P3 = optional. Updated 2026-11-27.

## P0

1. **Release the verified build (Option A).** Production still serves the old build `dpl_Cihe8…`.
   Preferred path now that GitHub drives deployments: merge PR #3 (`branch → main`) once `CI` and `Vercel`
   are green → Vercel builds the merge commit as Production and assigns `ecovia-kappa.vercel.app`; run the
   post-deployment checklist (report §R.7); then approve migration 0007 (backup first). Alternative: promote
   the already-built `dpl_HcwNx…` first. *Rollback:* Instant Rollback / `vercel promote` the old deployment.
2. **Lock down the repository.** Branch protection on `main` (PR required, checks `CI` + `Vercel`, no force
   push); disconnect the Netlify site that still builds every push; keep GitDoc off for this repository.
3. **Real OTP delivery before public launch** (the only remaining launch blocker). Smallest integration
   that keeps Better Auth:
   - *Email:* implement `deliverOtp()` in `src/lib/auth/otp.ts` with one transactional email provider
     (SMTP or HTTP API). Codes are already random, hashed, 5-minute, 5 attempts.
   - *SMS:* use a provider **verification API** (it generates, sends and checks the code) through the
     `phoneNumber` plugin's `sendOTP` / `verifyOTP` hooks, and overwrite the locally stored code with a random
     value — this also closes S5 (phone codes stored in plaintext). Keep the existing DB-backed limits
     (5 sends / 15 min per identity, 60 per IP; 10 verifies / 15 min per identity, 120 per IP) and add a
     60-second resend cooldown.
   - Keep `OTP_MODE=demo` + allowlist until the provider is configured and tested on Preview; then
     remove `OTP_DEMO_ALLOW_PRODUCTION` / `OTP_DEMO_*` from Production. Public sign-up
     (`disableSignUp`) stays disabled — registration is only through OTP.
   - *Needed from the owner:* the provider account(s), a verified sender (email domain with SPF/DKIM; SMS
     sender ID registered for Saudi Arabia), API credentials stored as **sensitive** Vercel env vars for
     Preview and Production, and a test phone/email for Preview.

## P1

4. **Delete temporary resources after the release is verified** — see the cleanup list in report §R.8
   (`demo-backup-pre-0006`, `demo-backup-pre-0007`, QA branches, preview fixtures).
5. **Facility member management.** A facility is one login today; multi-user facilities need memberships.
6. **Uploaded-file retention.** 7 documents on the live DB are attached to nothing; add a reviewed job
   that lists (then, with approval, deletes) unattached uploads older than N days.
7. **CR / license uniqueness policy.** Decide whether one CR number may belong to several facilities;
   enforce with a unique index after cleaning duplicates.
8. **Admin notifications** for new registrations / resubmissions (today admins poll the dashboard).

## P2

9. **CI gates:** `npm run lint`, `typecheck`, `test`, `node scripts/route-docs.mjs --check`, and
   `test:integration` against a per-PR Neon branch.
10. **Prettier (proposal, not applied):** the code mostly follows 2 spaces, single quotes, semicolons,
    ~120 columns, but configs use double quotes. Add `prettier` + `.prettierrc`
    (`{"singleQuote": true, "printWidth": 120}`), `format`/`format:check` scripts, and format in one
    dedicated commit so reviews stay readable.
11. **Move `@neon/env` to devDependencies** — only its `neon-env` CLI is used (no imports).
12. **Drop the `applications` table** (0 rows everywhere, no code uses it): `drizzle/proposed/0008_drop_applications.sql`
    — needs approval; regenerate via drizzle-kit after removing it from the schema.
13. **Legacy request columns** (`service_name`, `cost`, `duration*`, `service_category`, `description`)
    hold the only data of the 2 pre-0006 requests on `demo` — keep; revisit only if those requests are archived.
14. **Chat realtime** (polling every 3–5 s today) and message pagination beyond the latest 200.
15. **Nonce-based CSP** beyond `frame-ancestors`.
16. **Housekeeping job** for expired sessions/verifications and stale rate-limit rows.

## P3

17. Directory: server-side search index when the specialist count grows (filtering is in-memory over ≤ 500 rows).
18. Stored PDF snapshots of signed contracts (today the document is rendered on demand from the DB).
19. Notification preferences (opt out of regional broadcasts).
