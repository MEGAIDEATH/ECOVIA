# ECOVIA security audit — 2026-11-26 (status updated 2026-11-27)

Scope: authentication, authorization, input validation, file handling, database safety and API
behaviour of the current branch. Each item was **demonstrated** against a local production build on a
disposable Neon branch (`test-e2e`) and/or the Vercel preview with QA fixtures — never against the
live site or its database. "Potential risk" marks concerns that were reasoned about but not exploited.

## Findings fixed in this round

| # | Finding | Severity | Affected | Demonstrated | Fix | Verification |
|---|---|---|---|---|---|---|
| S1 | **No brute-force protection on password sign-in.** 12 consecutive wrong passwords for one account all returned 401; nothing throttled them (the app calls Better Auth's server API directly, bypassing Better Auth's per-route limiter). | High | `POST /api/login`, `POST /api/admin/login` | Yes (local) | Failed attempts are counted per identity (10 / 15 min) and per IP (100 / 15 min) in the DB-backed limiter shared by all instances; once spent, the endpoint answers **429** even for the right password until the window passes. Successful sign-ins never consume budget. | e2e `security hardening` (attempts 11–12 → 429) on desktop + mobile |
| S2 | **Public sign-up bypassed OTP verification.** `POST /api/auth/sign-up/email` (Better Auth's own handler) returned 200 for any email/password; that session could then create a specialist profile via `/api/register/specialist` without phone or email ownership being verified. The profile still landed `pending` (no privilege gain), so this is identity-verification bypass and spam, not escalation. | Medium | `/api/auth/[...all]`, `/api/register/*` | Yes (local) | `emailAndPassword.disableSignUp = true` on the app's Better Auth instance; only the seed/fixture CLI scripts opt back in. Accounts are created only by the OTP flows. | e2e `security hardening` (sign-up ≥ 400); preview check returned 400; OTP registration specs still pass |
| S3 | **No anti-framing headers** — every page could be embedded by another site (clickjacking risk on actions such as contract signing). | Low–Medium | all pages | Yes (`curl -I /` had none) | `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`; `X-Powered-By` removed. | e2e header assertions; in-browser PDF viewer (blob iframe) still renders (e2e) |
| S4 | **Admin could approve a rejected account directly** (no state guard) and rejection overwrote the previous state without guarding concurrency. | Low | `approve` / `reject` routes, `src/repositories/profiles.ts` | By code review + test | Conditional state machine (`pending→approved/rejected`, `rejected→pending` via resubmit/reopen), each step audited; wrong state → 409. | integration `account review state machine` (4 tests); e2e re-review journey |

Findings fixed in the previous round (still verified): see §8 of `ECHOVIA_IMPLEMENTATION_REPORT.md`
(pending users entering dashboards, logout not reaching the server, open redirect on `/set-password`,
broken `?next=`, file IDOR on CVs/photos, approval-blind chat APIs, foreign document ids on profiles,
cascade deletion of signed contracts).

## Final-release re-verification (2026-11-27)

S1–S4 were re-tested on the release candidate `d6909f1` deployed as a Vercel preview
(`ecovia-eaiijq392`, source verified file-by-file against the commit) with the preview database:
attempts 11–12 of a wrong password → 429; `POST /api/auth/sign-up/email` → rejected;
`X-Frame-Options: DENY` and `frame-ancestors 'none'` present, no `X-Powered-By`; approve on a rejected
account → 409. The same build was also run locally against a copy of the live database (`demo`):
admin pages, review history and the legacy chat contract render; anonymous `/api/service-requests` → 401.

**Live site today:** `ecovia-kappa.vercel.app` still serves the old build `dpl_Cihe8…` (checked
2026-11-27: `/waiting` → 200, `/dashboard` → 404, no anti-framing headers). Until the release candidate
is promoted, the pre-fix weaknesses listed below remain live.

## Open finding (not fixed in this release — launch prerequisite)

| # | Finding | Severity | Affected | Demonstrated | Plan |
|---|---|---|---|---|---|
| S5 | **Phone OTP codes are stored in plaintext** in `verification.value` (`<code>:<attempts>`) by Better Auth's `phone-number` plugin, which has no hashing option (email OTPs are hashed via `storeOTP: 'hashed'`). Reading them needs database access, and they expire after 5 minutes. Today nothing is delivered by SMS: rows hold either the configured demo code (allowlisted numbers) or codes that were never sent. | Low today; **Medium once real SMS is enabled** | `src/lib/auth/options.ts` (`phoneNumber` plugin) | By code review + `routes.mjs` of better-auth 1.7.6 | Use a provider-side verification API (the provider generates, delivers and checks the code) through the plugin's `sendOTP` / `verifyOTP` hooks, and overwrite the plugin's locally stored code with a random value. See NEXT_STEPS P0-3. |

## Incident 2026-11-27: QA credentials pushed to the public repository

The VS Code GitDoc extension (enabled in `.vscode/settings.json`) auto-committed and pushed
`docs/account.txt`, containing the passwords of the four Preview-only QA accounts, to the public GitHub
repository (commit `9fa7edc`, 14:26 UTC). Exposure: Preview QA accounts only (no production data, the
accounts do not exist on `demo`); the Preview site additionally requires Vercel authentication or a share
link. Within the hour: all four passwords rotated (Better Auth re-hash via `npm run db:seed:qa` with
`QA_RESET_PASSWORDS=true`), all their sessions revoked on the Preview database, old passwords verified to
return 401, the file untracked and git-ignored (`8b18d7b`), GitDoc disabled. The values remain in Git
history (removing them would need a history rewrite + force-push, which is not authorised); they are
invalid now.

## Verified controls (no change needed)

| Area | Check | Result |
|---|---|---|
| Role escalation | `POST /api/auth/update-user {"role":"admin"}` | `FIELD_NOT_ALLOWED` (role is `input: false`) |
| Session / logout | logout → `/api/specialist/profile` | 401 (local and preview) |
| 401 vs 403 vs 404 | anonymous / pending / unrelated on requests, chat, files | 401 / 403 / 404 as documented (local + preview) |
| Private requests | other specialist → page and API | 404 (local + preview); not in lists, notifications go to the target only |
| Attachments | guessed uuid, malformed id, foreign document | 404 / 404 / 403; anonymous 401 (local + preview incl. Neon Object Storage) |
| CV by id substitution | pending user → another specialist's CV via directory | 403 |
| Account switching | forged `ecovia_active_role` cookie | ignored; workspace re-checks ownership |
| Contract signing race | 3 simultaneous signatures | exactly one; one audit event; request closed (integration) |
| SQL injection | all queries use Drizzle parameters; raw `sql` templates interpolate only parameters | no string-built SQL found |
| External redirects | `?next=//evil`, `https://evil`, CR/LF | rejected by `safeRedirectPath` (unit tests) |
| CSRF | Server Actions: Next.js Origin/Host check; JSON route handlers: `SameSite=Lax` session cookie (not sent on cross-site POST) + Better Auth origin checks | adequate for this architecture |
| Error leakage | `mapError` returns generic messages; details only in server logs | OK |
| Message content | rendered as text by React; 2000-char limit; 30/min | OK |

## Remaining / potential risks

| Risk | Status | Notes |
|---|---|---|
| Files are served through an authenticated proxy, not short-lived signed URLs | Accepted design | Every download re-checks authorization; URLs are not bearer tokens. Signed URLs would need a presigner dependency and would be bearer links. |
| Unreferenced uploads are never deleted (7 on the live DB) | Potential risk (retention) | Uploaded-but-unattached documents stay in storage; owner-only access. Needs a reviewed cleanup job (NEXT_STEPS P2). |
| No OTP delivery provider | Existing — launch blocker | Production runs demo mode for allowlisted identities only; everyone else gets 503 from the OTP endpoints, so public self-registration is effectively closed. Expiry (5 min), 5 attempts per code, and DB-backed send/verify limits are enforced server-side. See S5 and NEXT_STEPS P0-3. |
| CR number not unique across facilities | Potential risk | Two facilities can register the same CR; admin review is the control. |
| Phone of a specialist profile added to an existing login is not OTP-verified | Accepted | The login identity is authenticated; the profile is pending and reviewed by an admin (license check). |
| No full script CSP | Potential risk | Only `frame-ancestors`; a nonce-based CSP needs care with Google Fonts and the OCR workers. |
| Live production runs the **old build** (rolled back) against the migrated DB | **Open — decided (Option A), awaiting the promotion approval** | The old build carries the pre-fix weaknesses (e.g. file IDOR, no approval checks in chat) and its chat-contract creation fails on the new NOT NULL columns. Release procedure: implementation report §R. |
| Better Auth's in-memory limiter for `/api/auth/*` sign-in | Existing | Per-instance only; the app's own `/api/login` limiter is DB-backed. |
