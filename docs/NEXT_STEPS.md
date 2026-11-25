# ECOVIA — next steps (prioritized)

P0 = security, data integrity or release-blocking · P1 = essential business functionality ·
P2 = maintainability / architecture · P3 = optional. Updated 2026-11-26.

## P0

1. **Decide the production state (owner).** The live domain serves the *old* build (re-promoted on
   2026-11-25 ~22:08 UTC) against the `demo` database that already has migration 0006.
   *Impact:* old code's chat "create contract" fails (new NOT NULL party columns) and the old security
   weaknesses (file IDOR, approval-blind chat, open redirect) are live again.
   *Options:* (a) promote the verified build after your own smoke test (§13 of the report), then apply
   0007 to `demo`; or (b) keep the old build and roll the DB back with `drizzle/rollback/0006_down.sql`
   / branch `demo-backup-pre-0006` — loses nothing today because no 0006-only data was created there.
   *Dependencies:* your approval; manual smoke test.
2. **Commit review & merge path.** `branch` must merge `origin/branch` (one notes commit) before it can
   be pushed; production deploys come from `main`. *Impact:* reviewable history, Git-based deploys.
3. **Real OTP delivery before a real launch.** Demo OTP mode is the only verification channel.
   *Dependencies:* an SMS/email provider integration in `src/lib/auth/otp.ts`.

## P1

4. **Apply migration 0007 to `demo`** (two indexes, additive) once the code is promoted.
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
