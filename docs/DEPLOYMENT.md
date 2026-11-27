# ECOVIA — deployment workflow

GitHub is the source of truth; Vercel's native GitHub integration builds every push.
Normal releases go **feature branch → Pull Request → `main`**. `vercel deploy` from a laptop is for
approved emergencies only (§12). Verified 2026-11-27.

## 1. GitHub repository

| | |
|---|---|
| Repository | https://github.com/MEGAIDEATH/ECOVIA (public, owner `MEGAIDEATH`, default branch `main`) |
| Feature branch | `branch` — open PR [#3](https://github.com/MEGAIDEATH/ECOVIA/pull/3) `branch → main` |
| Vercel access | the Vercel GitHub App is installed for the repository (it posts the `Vercel` commit status and the *Vercel Preview Comments* check / PR comment) |
| Quality gates | `.github/workflows/ci.yml` — job *typecheck · lint · unit · route docs · build* on every PR to `main` and every push to `main`. It only tests; it never deploys. |

Integration tests and Playwright are **not** in CI: they need a database, and no database credentials are
stored in GitHub. Run them locally against a disposable Neon branch (`npm run test:integration`,
`npx playwright test`) before merging.

## 2. Vercel project

| | |
|---|---|
| Project | `ecovia` — `prj_xQPtzt1nvW9y7vltAdEwB4VwCnh1` — https://vercel.com/megaideaths-projects/ecovia |
| Team | `megaideaths-projects` (`team_ZaQXE8vDkkyplEbi8fWql2xH`) |
| Git link | GitHub `MEGAIDEATH/ECOVIA` (repo id 1387380446), linked since the project was created on 2026-11-11 |
| Production domain | `ecovia-kappa.vercel.app` (auto-assigned to new production deployments) |
| Protection | Vercel Authentication on every deployment URL except the production domain; fork protection on |
| PR comments | on (pull requests), off (individual commits) |
| Ignored build step | none |

## 3. Production branch

`main`. A push to `main` (normally: merging a PR) builds a **Production** deployment of that exact commit
and, when it is READY, moves `ecovia-kappa.vercel.app` to it. Nothing else creates production builds.

## 4. Preview workflow (branches and PRs)

1. Push any non-`main` branch → Vercel builds a **Preview** deployment with Preview variables.
2. The commit gets a `Vercel` status (pending → success / failure, linking to the build), and the PR
   gets/updates the Vercel comment with the preview URL.
3. URLs: one per deployment (`ecovia-<hash>-megaideaths-projects.vercel.app`) and a moving branch alias
   (`ecovia-git-branch-megaideaths-projects.vercel.app` for `branch`).
4. Previews require Vercel login (team member) or a share link (Deployment → Share in the dashboard).
5. The CI job runs in parallel; both must be green before merging.

## 5. Production workflow

1. PR to `main` is reviewed; `CI` and `Vercel` checks are green; test on the PR's preview.
2. Merge the PR (no direct pushes to `main`).
3. Vercel builds the merge commit as Production and assigns the domain when READY.
4. Run the post-deployment checklist (implementation report §R.7) and watch runtime errors for 30 min.
5. Database migrations are **never** run by the build. Apply them manually after the deployment checks,
   with a backup branch first (report §R.9 step 3).

## 6. Environment variables

| Vercel environment | Variables (values never printed or committed) |
|---|---|
| Production | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STORAGE_*`, `OTP_MODE`, `OTP_DEMO_CODE`, `OTP_DEMO_ALLOWLIST`, `OTP_DEMO_ALLOW_PRODUCTION` |
| Preview (all branches) | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_*`, `OTP_MODE`, `OTP_DEMO_CODE`, `OTP_DEMO_ALLOWLIST` |
| Development | none in Vercel — local development reads the git-ignored `.env.local` |

Secrets are *sensitive* variables (write-only). Never copy the production `DATABASE_URL` into Preview,
never put secrets in GitHub (no repository secrets are used by CI).

## 7. Database mapping (verified from the database side)

| Environment | Neon branch | How it was verified |
|---|---|---|
| Production | `demo` (`br-sparkling-hall-a1dylzla`) | read-only failed sign-ins against the production build: reads on `user` rose on `demo` only |
| Preview (CLI and Git-triggered) | `preview` (`br-late-meadow-a1pla6ex`) | same method against `ecovia-eaiijq392` and the Git build `ecovia-pz3zf3uve`: reads rose on `preview` only |
| Development | `dev` (`br-falling-darkness-a1tw2ppi`) | `current_setting('neon.branch_id')` through `.env.local` |

Inside any Neon database, `select current_setting('neon.branch_id')` names the branch; the QA seed uses
this as a hard guard.

## 8. Inspect deployment status

- GitHub: PR → *Checks* (`CI`, `Vercel Preview Comments`) and the commit status `Vercel`.
- Vercel: dashboard → Deployments, or `vercel ls ecovia --scope megaideaths-projects`.
- One deployment: `vercel inspect <url-or-id> --scope megaideaths-projects` (target, state, aliases).

## 9. Which commit is live

`vercel inspect ecovia-kappa.vercel.app --scope megaideaths-projects` → the deployment id; Git-triggered
deployments carry `githubCommitSha` (dashboard: *Source*). CLI deployments carry the local `HEAD` even if
the tree was dirty, so for those compare the uploaded file tree with the commit (report §R.1).

## 10. Roll back

- Instant: dashboard → Deployments → previous production deployment → *Instant Rollback*, or
  `vercel rollback <deployment-url> --scope megaideaths-projects`. After a rollback Vercel stops
  auto-assigning the domain to new production builds until you promote again (`vercel promote`).
- Code: revert the merge on a branch, PR, merge — Vercel redeploys.
- Database changes are separate (`drizzle/rollback/*.sql`, Neon backup branches).

## 11. Failed Git-triggered builds

The commit status `Vercel` turns **failure** with a link to the build log; the PR comment shows
*Error*; the failed deployment never receives the production domain. Diagnose with the build log
(dashboard or `vercel inspect <url> --logs`), reproduce with `npm ci && npm run build` locally (CI runs
the same build without any secrets), fix on the branch, push again.

## 12. Emergency CLI deployment (approval required)

Only when the Git integration is unavailable and the owner approves:

```bash
git worktree add --detach /tmp/ecovia-release <commit>
mkdir -p /tmp/ecovia-release/.vercel && cp .vercel/project.json /tmp/ecovia-release/.vercel/
cd /tmp/ecovia-release && vercel deploy --prod --skip-domain --yes    # build only, domain unchanged
vercel promote <printed-url> --yes --scope megaideaths-projects         # switch traffic
```

Build from a clean worktree of a pushed commit so the deployment matches GitHub exactly.

## Other pipelines connected to the repository

- **Netlify** (`bucolic-nasturtium-acb9ec`) still builds deploy previews of every push and reports
  failures on the PR. It is not part of this workflow; disconnect the site from the repository in Netlify
  (Site configuration → Build & deploy → *Stop builds* / unlink) and then remove `netlify.toml`.
- **GitHub Pages**: the built-in *pages build and deployment* workflow last ran on 2026-09-26; no Pages
  site is currently published.
- Branch `MEGAIDEATH-patch-1` holds an unused Azure workflow (not on `main`/`branch`).
- The workspace setting `gitdoc.enabled` (VS Code GitDoc extension, auto-commit + auto-push on save)
  is now **off**: it pushed unreviewed commits, including a credentials file, straight to GitHub.

## Recommended GitHub settings (owner action)

Settings → Branches → rule for `main`: require a pull request (1 approval if collaborators review),
require status checks **CI / typecheck · lint · unit · route docs · build** and **Vercel**, require
branches to be up to date, block force pushes and deletions, include administrators.
