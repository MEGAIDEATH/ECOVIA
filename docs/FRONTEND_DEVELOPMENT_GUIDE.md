# Frontend Development Guide — ECOVIA

This guide is written for the actual ECOVIA repository. It explains where the frontend code lives, how pages and components connect, how to change design and behavior safely, and how to verify changes. It is not a generic React tutorial.

## 1. Project overview

ECOVIA is a Next.js application using the App Router. The frontend and backend API routes live in the same Next.js project.

- Framework: Next.js `16.x` (`next` `^16.3.6`) with the App Router.
- UI runtime: React `19.x` (`react`, `react-dom` `^19.3.0`).
- Language: TypeScript `6.x` (`typescript` `^6.0.3`), with project settings in `tsconfig.json`.
- Styling: Tailwind CSS `4.x` (`tailwindcss` `^4.3.3`, `@tailwindcss/postcss` `^4.3.3`). Design tokens are defined in `src/app/globals.css` using the Tailwind v4 `@theme` block.
- Forms: React Hook Form `7.x` (`react-hook-form` `^7.88.0`) plus Zod `4.x` (`zod` `^4.6.5`) through `@hookform/resolvers`.
- Authentication: Better Auth `1.x` (`better-auth` `^1.7.6`), configured in `src/lib/auth/options.ts`. The app uses email/password, email OTP, and phone-number OTP.
- Database/ORM: Drizzle ORM `0.x` (`drizzle-orm` `^0.45.3`) with PostgreSQL (`pg`).
- State/context: React Context for auth (`src/features/auth/AuthProvider.tsx`) and registration drafts (`src/features/registration/RegistrationProvider.tsx`).
- API communication: browser `fetch()` to local Next.js API routes under `src/app/api/`.
- Testing: Vitest (`vitest` `^5.0.1`) for unit/component tests and Playwright (`@playwright/test` `^1.63.0`) for end-to-end tests.

How the pieces connect:

1. A route file in `src/app/.../page.tsx` renders a feature component.
2. Feature components use shared UI components, hooks, and context providers.
3. Forms validate with Zod and submit to `/api/...` routes.
4. API routes use Better Auth sessions and Drizzle repositories.
5. `/api/session` is the trusted source of the signed-in user; the frontend never decides its own identity.

## 2. How to run the website during development

Install dependencies only when needed:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The terminal output shows the actual local URL and port. Next.js normally uses `http://localhost:3000`, but `.env.local` can change the expected auth URL. Always read the port from terminal output instead of assuming it.

Build the production version:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Run unit/component tests:

```bash
npm run test
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Apply database migrations when the database schema changes:

```bash
npm run db:migrate
```

Seed the administrator account when needed:

```bash
npm run db:seed
```

Generate Drizzle migration files when schema files change:

```bash
npm run db:generate
```

Restart the development server after changing `.env.local`, especially `DEV_OTP_CODE`, `BETTER_AUTH_URL`, or database settings. Next.js reads environment variables at startup.

Do not copy secret values from `.env.local` into source code, documentation, client responses, or screenshots.
```
## 3. Repository structure and file map

Important directories:

- `src/app/`: Next.js App Router pages, layouts, and API routes.
- `src/app/api/`: Backend API routes used by the frontend.
- `src/features/`: Feature-specific components and business logic.
- `src/components/ui/`: Shared UI components such as `LoadingButton`, `Toast`, `Modal`, `Spinner`.
- `src/components/layout/`: Layout helpers such as `FullPageSpinner` and `SplashScreen`.
- `src/lib/auth/`: Better Auth configuration, OTP logic, and session helpers.
- `src/lib/validation/`: Zod schemas for forms and API payloads.
- `src/lib/utils/`: Small utilities, including safe URL helpers.
- `src/db/`: Drizzle schema and database connection.
- `src/repositories/`: Database access functions.
- `src/types/`: Shared TypeScript types.
- `e2e/`: Playwright end-to-end tests.
- `docs/`: Project documentation.
- `public/`: Static assets if used.

Important files:

- `src/app/layout.tsx`: Root layout, global providers, metadata, fonts.
- `src/app/globals.css`: Tailwind v4 theme tokens, base styles, animations.
- `src/app/page.tsx`: Home page route.
- `src/features/home/HomeView.tsx`: Actual home page implementation.
- `src/app/login/page.tsx`: Login page and post-login redirect logic.
- `src/app/forgot-password/page.tsx`: Password recovery page.
- `src/app/set-password/page.tsx` and `SetPasswordForm.tsx`: First-time password setup after OTP verification.
- `src/app/register/specialist/page.tsx`: Specialist registration form route.
- `src/app/register/specialist/verify/page.tsx`: Specialist phone OTP verification route.
- `src/app/register/organization/page.tsx`: Organization registration form route.
- `src/app/register/organization/verify/page.tsx`: Organization verification route.
- `src/app/specialist/page.tsx` and `src/app/specialist/layout.tsx`: Specialist dashboard area.
- `src/app/organization/page.tsx` and `src/app/organization/layout.tsx`: Organization dashboard area.
- `src/app/admin/page.tsx`: Administrator area.
- `src/app/waiting/page.tsx`: Pending approval page.
- `src/features/auth/AuthProvider.tsx`: Client auth context and session hydration.
- `src/features/auth/useDashboardEntry.ts`: Role/profile resolution and redirect to dashboard or waiting page.
- `src/features/auth/dashboardRouting.ts`: Pure destination resolver.
- `src/features/auth/useDashboardGuard.ts`: Route protection for dashboard pages.
- `src/features/registration/OtpVerification.tsx`: OTP verification UI for registration.
- `src/features/registration/SpecialistRegistrationConsolidated.tsx`: Specialist registration form.
- `src/features/registration/OrganizationRegistrationForm.tsx`: Organization registration form.
- `src/lib/auth/options.ts`: Better Auth configuration.
- `src/lib/auth/otp.ts`: Development OTP and delivery adapters.
- `src/lib/auth/session.ts`: Server-side session and profile loading.

## 4. How routing works

ECOVIA uses the Next.js App Router. A file at `src/app/<route>/page.tsx` becomes the page for `/<route>`. Dynamic segments use folders such as `[id]`. Route groups and layouts use `layout.tsx`.

Real routes in this project include:

- `/`: home page (`src/app/page.tsx` -> `src/features/home/HomeView.tsx`).
- `/login`: login page (`src/app/login/page.tsx`).
- `/register/specialist`: specialist registration form.
- `/register/specialist/verify`: specialist phone OTP verification.
- `/register/organization`: organization registration form.
- `/register/organization/verify`: organization verification.
- `/specialist`: specialist dashboard.
- `/specialist/cv`: optional specialist CV/contact email page.
- `/organization`: organization dashboard.
- `/admin`: administrator area.
- `/waiting`: pending approval page.
- `/forgot-password`: password recovery.
- `/set-password`: first-time password setup.

To add a page, create `src/app/<new-route>/page.tsx` and import or define the component. To change a URL, rename the folder and update all links, redirects, tests, and documentation. Search the repository for the old path before renaming.

Use `next/link` for declarative navigation and `useRouter().push()` or `replace()` for programmatic navigation. Use `redirect()` from `next/navigation` only in Server Components or route handlers.

Safe return URLs are validated with `safeRedirectPath()` from `src/lib/utils/url.ts`. Only same-origin relative paths starting with a single `/` are allowed. External URLs, protocol-relative URLs, and backslashes are rejected.

Protected pages use `useDashboardGuard(requiredRole)` or server-side `requireUser()` in API routes. Never trust a client-supplied role, user ID, or destination for authorization.
## 5. How to edit the home page

The home page is implemented in `src/features/home/HomeView.tsx`. The route wrapper is `src/app/page.tsx`.

Common changes:

- Heading/paragraph text: edit the JSX text in `HomeView.tsx`.
- Button label: edit the button text.
- Button destination: change the `href` on a `Link` or the router call in `checkAndGoToDashboard`.
- Add/remove a button: add a `Link` or `button` in the header or body.
- Spacing/alignment: adjust Tailwind classes such as `p-6`, `gap-4`, `items-center`, or `justify-center`.
- Background colors: use Tailwind tokens such as `bg-surface`, `bg-primary`, or `bg-white/80`.
- Add/remove an image: use `next/image` and place it in the appropriate section. Remove unused imports.
- Navigation/login entry: the login button links to `/login`; the "my account" button calls `checkAndGoToDashboard()`.
- Desktop/mobile layouts: use responsive Tailwind classes such as `md:`, `lg:`, and `flex-col md:flex-row`.

Content changes and layout changes should stay separate from authentication behavior. Do not change redirect logic while editing text or colors.

## 6. How to edit the frontend's visual design

Tailwind CSS v4 is configured through `src/app/globals.css`. The `@theme` block defines brand colors and fonts. Global base styles are in the same file.

Conventions:

- Colors: use tokens such as `primary`, `secondary`, `surface`, `on-surface`, `primary-fixed`.
- Spacing: Tailwind spacing utilities (`p-4`, `m-2`, `gap-6`).
- Radius: `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
- Shadows: `shadow`, `shadow-md`, `shadow-lg`, `shadow-sm`.
- Width constraints: `max-w-md`, `max-w-2xl`, `w-full`.
- Centered containers: `mx-auto`, `items-center`, `justify-center`.
- Responsive breakpoints: Tailwind defaults (`sm`, `md`, `lg`, `xl`).
- RTL: the document is `dir="rtl"` and `lang="ar"`; use logical thinking and test Arabic layouts.

To center a page, prefer a flex container:

```tsx
<main className="flex min-h-screen items-center justify-center p-6">
  <div className="w-full max-w-md">...</div>
</main>
```

Avoid arbitrary offsets, large margins, or `position: relative` hacks for centering. Fix the shared layout container instead of repeating small CSS overrides.

## 7. Right-to-left Arabic and multilingual support

The application is Arabic-first and uses RTL. `dir="rtl"` and `lang="ar"` are established at the document level. Text direction and layout direction are related but not identical.

Guidelines:

- Use logical properties where possible: `margin-inline`, `padding-inline`, `text-align: start`.
- Be careful with physical properties such as `left` and `right`; in RTL, `left` is the visual left, not the reading start.
- Keep form labels, inputs, validation messages, and buttons aligned consistently.
- Mixed English content should use `dir="ltr"` only on the specific input or element, for example phone numbers.
- Interface messages are written directly in Arabic in components and API routes.
- To add or edit an Arabic error message, update both the API route and the frontend fallback text consistently.
```
## 8. How React components work in this project

Components live in `src/features/` and `src/components/`. They are functional React components. State is managed with `useState`, `useEffect`, `useCallback`, and `useMemo`. Shared state uses Context.

To modify a component:

1. Find the route that renders it.
2. Inspect its props, state, hooks, and API calls.
3. Change the smallest relevant section.
4. Preserve accessibility, loading states, and error handling.

To add a reusable component, place it in `src/components/ui/` or the relevant feature folder. Pass data through props. Avoid duplicating logic that already exists in hooks or utilities.

## 9. How to edit forms and validation

Forms use React Hook Form with Zod resolvers. Validation schemas are in `src/lib/validation/registration.ts` and `src/lib/validation/forms.ts`.

Key locations:

- Input component classes are defined locally in each form file as `INPUT_CLASSES`.
- Form fields are declared with `register()` or `setValue()`.
- Default values come from `useRegistrationDraft()`.
- API payload schemas are in `src/lib/validation/registration.ts`.
- Field errors render below inputs with `errors.fieldName?.message`.
- Submit buttons use `LoadingButton` or local `disabled` state.

Example optional field: the specialist CV email on `/specialist/cv`. It is optional in the CV form and stored as `null` when empty by `src/app/api/specialist/profile/route.ts`. This is different from the email used for authentication and OTP. Do not confuse a CV contact email with an account email.

To add a required field:

1. Add it to the Zod schema.
2. Add the input and label.
3. Include it in the registration/API payload.
4. Update server-side validation and repository code.
5. Add tests.

To add an optional field:

1. Mark it optional in Zod.
2. Store `null` or `undefined` appropriately on the server.
3. Keep frontend and server behavior aligned.

Removing a field from the UI does not remove backend validation or database requirements. Check schemas, API routes, and repositories before removing anything.

## 10. How API requests work

Frontend components call local API routes with `fetch()`. Request functions are often inline in components or in feature service files such as `src/features/registration/registrationService.ts`.

Examples:

- Registration specialist: `POST /api/register/specialist`
- Registration organization: `POST /api/register/organization`
- Phone OTP request: `POST /api/session/phone-otp`
- Phone OTP verify: `POST /api/session/phone-verify`
- Email OTP request: `POST /api/session/otp`
- Email OTP verify: `POST /api/session/verify`
- Login: `POST /api/login`
- Session: `GET /api/session`
- CV update: `PATCH /api/specialist/profile`

Always check `response.ok` and parse JSON safely. Show user-friendly errors. Loading states should disable submit buttons to prevent duplicate submissions.

To trace a failing request, inspect the browser Network tab, response status, JSON body, and the Next.js terminal output. Distinguish frontend validation errors from server errors.

Never include secrets or credentials in client code or examples.
```
## 11. Authentication and role-specific pages

Authentication is Better Auth based. The trusted session comes from `/api/session`. The client `AuthProvider` hydrates `user`, `specialist`, and `organization`.

Login flow:

1. `src/app/login/page.tsx` posts credentials to `/api/login`.
2. On success it refreshes the session.
3. It reads a safe internal `next`/`returnTo`/`callbackUrl`/`redirect` parameter if present.
4. Otherwise it calls `checkAndGoToDashboard()`, which resolves specialist/organization profiles and redirects to `/specialist`, `/organization`, or `/waiting?role=...`.
5. Failed login shows an error and does not navigate.

Role-specific destinations:

- Specialist: `/specialist` or `/waiting?role=spec`.
- Organization: `/organization` or `/waiting?role=org`.
- Administrator: `/admin`.
- Incomplete account: `/waiting` or the incomplete registration workflow.

Authenticated users visiting `/login` are redirected away from login instead of being forced to log in again. Session loading is awaited before redirecting, preventing premature redirects to home.

Protected dashboard routes use `useDashboardGuard(requiredRole)`. Authorization is always server-side; client-supplied roles never grant access.

Password recovery and OTP verification:

- Phone OTP request: `/api/session/phone-otp`.
- Phone OTP verify: `/api/session/phone-verify`.
- Email OTP request: `/api/session/otp`.
- Email OTP verify: `/api/session/verify`.
- Password reset: `/api/password/forgot/request` and `/api/password/forgot/reset`.

Development OTP behavior:

- `DEV_OTP_CODE` defaults to `123456`.
- In development, phone and email OTP flows use the configured development code.
- In production, development OTP is disabled unless explicitly allowed by deployment configuration; production uses random codes and requires a real delivery provider.

## 12. How to work with images and other assets

Images are referenced directly in components, often through `next/image`. The home page previously used a remote Unsplash image as a background; that background image has been removed and replaced with a solid color and decorative blobs.

To find an image, search for `src=`, `Image`, or the asset filename. To replace an image, update the `src` and check sizing classes. To remove an image, remove the element and unused imports. Check that no other page uses the same asset before deleting it.

Remote images require Next.js image configuration if they are optimized. Prefer local assets in `public/` when possible.
```
## 13. How to add a new frontend feature

Recommended workflow:

1. Find the closest existing page or feature.
2. Inspect its components, hooks, routes, validation schemas, and API calls.
3. Reuse existing components and utilities.
4. Define the required UI and behavior.
5. Add or update components.
6. Implement validation and request handling.
7. Preserve authentication and authorization rules.
8. Update navigation and redirects.
9. Test at desktop and mobile sizes.
10. Run lint, type-check, tests, and build.
11. Update this documentation for genuine architectural changes.

A purely visual change should not require database or API changes. Backend changes are needed when data, validation, or authorization rules change.

## 14. Troubleshooting guide

- Login redirects to the wrong page: inspect `src/app/login/page.tsx`, `useDashboardEntry.ts`, and `dashboardRouting.ts`. Ensure session refresh completes before redirecting.
- Button appears unresponsive: check `loading` state, event handlers, and console errors.
- OTP always rejected: verify `DEV_OTP_CODE`, restart the dev server, and check phone-number normalization. Ensure the frontend and backend use the same endpoint.
- Development OTP differs from configured code: check `src/lib/auth/otp.ts` and `src/lib/auth/options.ts`.
- Form shifts to the right: inspect flex/grid alignment and `items-start`/`items-center` classes.
- Horizontal overflow: check fixed widths, padding, and viewport size.
- Field appears optional but fails server validation: check Zod schemas and API routes.
- Old content after code changes: restart dev server and clear browser cache.
- Failed API request: inspect Network tab and terminal logs.
- Build or TypeScript error: run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Broken image or route: search for stale paths and update references.
- Component loses form state during navigation: check `RegistrationProvider` draft persistence.

## 15. Recommended maintenance practices

- Reuse existing components and hooks.
- Keep layout separate from business logic where useful.
- Share validation rules and API helpers.
- Preserve keyboard navigation and visible focus.
- Test responsive behavior.
- Keep RTL layouts consistent.
- Remove obsolete code only after checking references.
- Avoid arbitrary CSS offsets and duplicated design rules.
- Run relevant tests after changes.
- Document genuine architectural changes.

## 16. Concrete modification examples

1. Change the home-page heading: edit the heading text in `src/features/home/HomeView.tsx`.
2. Add a button to the home page: add a `Link` or `button` in the header/body and style it with Tailwind.
3. Change a button's destination route: update its `href` or router call.
4. Center a registration form: change `items-start` to `items-center` and add `mx-auto` in the container in `src/features/registration/SpecialistRegistrationConsolidated.tsx`.
5. Change a registration page's maximum width: update `max-w-2xl` or `max-w-md`.
6. Change the home page background color: update `bg-surface` in the background wrapper or `body` in `src/app/globals.css`.
7. Add or remove a form field safely: update Zod schema, input, API payload, server validation, and tests.
8. Change a field label or error message: update the label text and Zod message.
9. Add a new frontend page: create `src/app/<route>/page.tsx`.
10. Add a loading or error state to a button: use `LoadingButton` or local `disabled`/error handling.
11. Update the login destination for a user role: update `useDashboardEntry.ts` and `dashboardRouting.ts`, not the login page alone.
12. Replace or remove an image asset: update the component, remove unused imports, and verify no other references remain.
```
```