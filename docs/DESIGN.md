# ECOVIA — Design System (v1)

> **Source of truth:** ECOVIA's approved brand color-board (not the old app palette). Lightweight rules for AI coding agents and developers. **Style:** modern, calm, minimal, intuitive, trustworthy. Consistent components, not identical page layouts.

## 1. Colors

**Official brand colors — use these exact HEX values:**

| Token | HEX | Use |
|---|---|---|
| `primary` | `#0F3D36` | Brand, primary buttons, dark sections |
| `secondary` | `#2E7D73` | Links, accents, active controls |
| `mint` | `#8FBFAF` | Soft highlights, illustrations |
| `mint-subtle` | `#E6EFEA` | Selected items, subtle backgrounds |
| `sand` | `#D9D1C0` | Occasional warm accent only |
| `gray` | `#A7ADA7` | Secondary details, muted borders |
| `surface` | `#F5F7F6` | App/page background |
| `text` | `#1A2421` | Main text |

Use `#FFFFFF` for cards and primary content surfaces. `text-muted`: `#1A2421` at ~65% opacity (verify contrast). `border`: `#A7ADA7` at ~45% opacity. Prefer `primary` text on mint backgrounds; white text on `primary` or `secondary`. **Never use white text on mint, pale mint, sand, or gray.** Use no new decorative greens.

Semantic states (functional exceptions to brand palette): **success** `#166534`, **warning** `#92400E`, **error** `#B42318`, **info** `#175CD3`. Use pale tints for their backgrounds, and always pair color with readable text/icon.

## 2. Foundations

- **Language:** Arabic first; `dir="rtl"`. Isolate Latin text, emails, numbers and URLs with correct direction when needed.
- **Font:** `IBM Plex Sans Arabic`; `Manrope` fallback for Latin. Weights 400/500/600/700.
- **Type:** body `16px/1.7`; small `14px`; caption `12px`; section title `20–24px`; page title `28–32px`. Clear hierarchy, no excessive bold.
- **Spacing:** 4px base; use `4 / 8 / 12 / 16 / 24 / 32 / 48`px. Prefer whitespace over decoration.
- **Radius:** controls `10px`; buttons `12px`; cards `16px`; dialogs `20px`; pills `999px`.
- **Borders:** `1px` subtle; no heavy outlines except visible keyboard focus.
- **Shadow:** cards `0 2px 8px rgba(15,61,54,.06)`; floating panels `0 8px 24px rgba(15,61,54,.10)`. Avoid dramatic shadows.
- **Layout:** max content width `1200px`; page gutters `16px` mobile / `24–32px` desktop; gap `16–24px`; responsive grids (1 column mobile, 2 tablet, up to 3 desktop). Never cause horizontal scrolling.

## 3. Components

| Component | Defaults |
|---|---|
| **Primary button** | `primary` background, white text, `44–48px` min-height, `12px` radius; clear hover, loading and disabled states |
| **Secondary button** | White/transparent, `primary` text, subtle border; same height |
| **Input / select** | `48px` min-height, white, `10px` radius, subtle border; visible label and help/error text |
| **Card** | White, `16px` radius, `16px` mobile / `24px` desktop padding; subtle border or soft shadow (not both prominently) |
| **Card sizing** | Width follows grid; **height auto by content**. Compact metric cards ~`112px` minimum; content cards no fixed height |
| **Modal / dialog** | White, `20px` radius, `24px` padding, `560px` max-width (or narrower); responsive with accessible focus/close behavior |
| **Toast / alert** | Short message + status icon/label; optional action; non-blocking unless critical; distinct success/warning/error/info styles |
| **Tabs / badges** | Quiet neutral default, clear `secondary` active state; no excessive colorful badges |
| **Tables** | Clear headers, light dividers, comfortable row padding; adapt on mobile without clipped controls |

## 4. Interaction & accessibility

- Design **default, hover, focus, disabled, loading, empty, success, error** states for every interactive flow.
- Keyboard focus: visible `2px` `secondary` outline with offset; support keyboard and screen readers.
- Target WCAG 2.2 AA: normal text ≥ 4.5:1 contrast; touch targets preferably ≥ `44×44px`.
- Confirm irreversible actions; show actionable errors; preserve entered form data after recoverable failures.
- Motion: subtle `150–200ms` transitions; respect reduced-motion preferences. No decorative motion in core workflows.
- Use concise Arabic labels, predictable navigation, one dominant action per section, and meaningful feedback after user events.

## 5. Visual direction

- Clean SaaS experience with generous breathing room, calm environmental character and strong trust cues.
- **No** glassmorphism, oversized gradients, saturated neon, busy backgrounds, heavy shadows or decoration-only cards.
- Reserve rich gradients for the **official logo/artwork** or rare editorial hero accents; never redraw/reinvent the logo.
- Public landing pages may be more expressive; specialist/organization dashboards should be functional and calm. Reuse the same tokens and interaction patterns everywhere.

## 6. Instructions for AI coding agents

1. Read this file and inspect relevant existing components **before** editing.
2. Design tokens live in **`src/styles/tokens.css`** (Tailwind v4 `@theme`, the single source of truth); shared classes (`btn`, `field-input`, `card`, `badge`, `alert`, `data-table`, `icon-tile`, `kicker`) in `src/styles/components.css`; both imported by `src/app/globals.css`. Reuse `src/components/ui/` (`Field`, `StatusBadge`, `PageHeader`, `DetailList`, `Modal`, Feedback states) and `src/components/layout/` (`AuthShell`, `DashboardHeader`); map statuses through `src/lib/status.ts`. **This document alone does not change the UI.**
3. For new pages: apply this system automatically; for existing pages: make scoped changes and preserve working behavior.
4. Do not change auth, business rules, contracts, payments, APIs or database code for a visual-only request.
5. Avoid one-off HEX values, duplicate UI components, new libraries or full rewrites unless justified and approved.
6. Verify mobile + desktop, RTL, contrast, all interaction states, and tests affected by the change. Report changed files and any limitations.

**If unspecified:** choose the simplest accessible design consistent with these rules. Ask only when a decision affects product behavior, safety or a major irreversible change.
