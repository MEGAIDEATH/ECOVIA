# Frontend Routes — ECOVIA

## Public / auth
| Path | Purpose | User | Access | Component | Entry | Notes |
|---|---|---|---|---|---|---|
| / | ECOVIA landing page (rebuilt from docs/ECOVIA_Project/index.html) | Public | Public | features/home/HomeView (server) + client islands | direct | Login/sign-up in header; privacy, terms, admin portal in footer |
| /login | Login | Public | Public | app/login/page | homepage | |
| /choose-role | Choose account type | Public/Auth | Public | features/auth/ChooseRoleView | homepage sign up | Entry to both registration flows |
| /register/specialist | Specialist registration | Public | Public | app/register/specialist | choose-role | |
| /register/organization | Organization registration | Public | Public | app/register/organization | choose-role | |
| /register/specialist/verify | Verification | Public | Public | existing | registration | |
| /register/organization/verify | Verification | Public | Public | existing | registration | |
| /forgot-password | Password recovery | Public | Public | existing | login | |
| /set-password | Password setup | Public | Public | existing | email link | |
| /waiting | Pending approval | Auth | Auth | existing | dashboard entry | |

## Organization (facility owner)
| Path | Purpose | User | Access | Component | Entry | Notes |
|---|---|---|---|---|---|---|
| /organization | Dashboard | org | Auth+approved | features/organizations/dashboard/OrganizationHome | login | |
| /organization/requests | Request list | org | Auth | features/organizations/requests/OrganizationRequests | nav | /api/service-requests |
| /organization/requests/new | Create environmental plan request | org | Auth | OrganizationRequestNew | dashboard/nav | POST /api/service-requests |
| /organization/requests/[id] | Request details | org | Auth | new page | list | Prototype |
| /organization/specialists | Specialist directory | org | Auth+approved | features/organizations/specialists/OrganizationSpecialists | nav | Filters |
| /organization/specialists/[id] | Specialist profile + CV document viewer + print | org | Auth+approved | SpecialistProfile | directory / dashboard / request | /api/directory, /api/files |
| /organization/messages | Messages | org | Auth | existing | nav | |

## Specialist
| Path | Purpose | User | Access | Component | Entry | Notes |
|---|---|---|---|---|---|---|
| /specialist | Dashboard | spec | Auth+approved | features/specialists/dashboard/SpecialistHome | login | |
| /specialist/requests | Incoming requests | spec | Auth | SpecialistRequests | nav/dashboard | /api/service-requests (pending) |
| /specialist/requests/[id] | Request details + accept/reject | spec | Auth | SpecialistRequestDetail | list | accept/reject endpoints |
| /specialist/services | الخدمات — the specialist's engagements (ongoing / previous) | spec | Auth | SpecialistServices | nav/dashboard | /specialist/projects redirects here |
| /specialist/projects/[id] | Legacy — redirects to /specialist/services | spec | Auth | redirect | — | |
| /specialist/cv | Profile/CV | spec | Auth | existing | nav | |
| /specialist/organizations | Legacy — "تقديم للمنشآت" removed; redirects to /specialist | spec | Auth | redirect | — | /api/applications + data kept |
| /specialist/messages | Messages | spec | Auth | existing | nav | |

## Admin
| Path | Purpose | User | Access | Component |
|---|---|---|---|---|
| /admin | Admin dashboard | admin | Auth | existing |
