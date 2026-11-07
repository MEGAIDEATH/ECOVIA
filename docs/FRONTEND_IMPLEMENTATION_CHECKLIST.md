# Frontend Implementation Checklist — ECOVIA

## Homepage and authentication navigation
- [x] Homepage has two primary actions: Sign Up and Log In (role cards retained for account creation)
- [x] /choose-role page for account type selection
- [x] Login preserves existing flow
- [x] Role resolution preserved (useDashboardEntry)
- [ ] Role selection only for accounts without resolved profile (existing behavior)
- [x] /waiting approval flow preserved

## Route cleanup
- [x] Route inventory documented in docs/FRONTEND_ROUTES.md
- [x] Organization navigation updated with requests
- [x] Specialist navigation updated with requests and projects
- [x] Compatibility redirects preserved

## Visual redesign
- [x] Shared tokens reused
- [x] Page headers/breadcrumbs added on new pages
- [ ] Full DGA polish across all pages (partial)

## Server/Client boundaries
- [x] New pages keep client boundaries low (client components only for interactivity)

## Accessibility and responsive
- [x] New forms use labels and validation
- [x] Responsive grids

## User Story A: Organization requests Environmental Management Plan
- [x] Entry point from organization dashboard
- [x] Dedicated form page /organization/requests/new
- [x] Activity details step
- [x] Location selection step
- [x] Review step
- [x] Step indicator
- [x] Back navigation preserves data
- [x] Final review with submit button
- [x] Validation, loading, error, success, duplicate protection
- [x] Connected to existing API if available (NOT available — documented)
- [x] Confirmation state (honest: backend not supported)
- [x] Responsive/accessible
- [x] Documented backend dependency

## User Story B: Browse and filter verified specialists
- [x] Directory at existing route
- [x] Verified only via server-side eligibility
- [x] City filtering (documented as unavailable in data model)
- [x] Years-of-experience filtering
- [x] Filters change results
- [x] Combined filters where supported
- [x] Search field
- [x] Visible selected filters + clear
- [x] Empty state
- [x] Real profile fields
- [x] Navigation to profile/detail
- [x] Loading/error/responsive
- [x] Reusable filtering logic
- [x] No fake ratings

## User Story C: Specialists receive service requests
- [x] Incoming request page /specialist/requests
- [x] Visible from dashboard
- [x] List view summaries
- [x] Detail page /specialist/requests/[id]
- [x] Facility/org details (where available)
- [x] Service + location/activity details
- [x] Status display
- [x] Accept button
- [x] Reject button
- [x] Confirmation before consequential actions
- [x] Loading + duplicate protection
- [x] Success/failure messages
- [x] Reflect resulting state
- [x] Communication entry point after acceptance (prototype)
- [x] Reuse messaging
- [x] Empty/loading/error states
- [x] Documented backend dependencies

## User Story D: Specialist dashboard
- [x] Redesigned dashboard with hierarchy
- [x] New requests section
- [x] Active projects section
- [x] Project statuses (قيد التنفيذ / مكتمل) where supported
- [x] Request summaries/statuses
- [x] Notification counter (real count where possible)
- [x] Notification indicators link
- [x] Quick actions
- [x] Navigable cards
- [x] Accurate counts
- [x] Empty states
- [x] Consistent status badges
- [x] Mobile readable
- [x] No fake stats
- [x] Role-aware access preserved
- [x] Documented missing API support

## Automated tests and build
- [ ] npm run lint
- [ ] npx tsc --noEmit
- [ ] npm test
- [ ] npm run build
- [ ] npm run test:e2e

## Unresolved backend dependencies
- Environmental plan request persistence (no API/table)
- Incoming service request persistence/acceptance/rejection (no API/table)
- Projects persistence (no API/table)
- City field on specialist (no data model field)
- Notification system (no persistent store)
- Ratings (not implemented — intentionally omitted)
