# Frontend Routes — ECOVIA

## Public / auth
| Path | Purpose | User | Access | Component | Entry | Notes |
|---|---|---|---|---|---|---|
| / | Homepage (two primary actions) | Public | Public | features/home/HomeView | direct | |
| /login | Login | Public | Public | app/login/page | homepage | |
| /choose-role | Choose account type | Public/Auth | Public | app/choose-role | homepage sign up | |
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
| /organization/requests | Request list | org | Auth | new page | nav | Prototype (backend missing) |
| /organization/requests/new | Create environmental plan request | org | Auth | new page | dashboard/nav | Prototype (backend missing) |
| /organization/requests/[id] | Request details | org | Auth | new page | list | Prototype |
| /organization/specialists | Specialist directory | org | Auth+approved | features/organizations/specialists/OrganizationSpecialists | nav | Filters |
| /organization/messages | Messages | org | Auth | existing | nav | |

## Specialist
| Path | Purpose | User | Access | Component | Entry | Notes |
|---|---|---|---|---|---|---|
| /specialist | Dashboard | spec | Auth+approved | features/specialists/dashboard/SpecialistHome | login | |
| /specialist/requests | Incoming requests | spec | Auth | new page | nav/dashboard | Prototype |
| /specialist/requests/[id] | Request details | spec | Auth | new page | list | Prototype |
| /specialist/projects | Projects | spec | Auth | new page | nav/dashboard | Prototype |
| /specialist/projects/[id] | Project details | spec | Auth | new page | list | Prototype |
| /specialist/cv | Profile/CV | spec | Auth | existing | nav | |
| /specialist/organizations | Browse organizations | spec | Auth | existing | nav | |
| /specialist/messages | Messages | spec | Auth | existing | nav | |

## Admin
| Path | Purpose | User | Access | Component |
|---|---|---|---|---|
| /admin | Admin dashboard | admin | Auth | existing |
