# Full User-Flow Test Report — 2026-04-21

**Tester:** Claude Code (Playwright MCP against https://ecoleversity.com)
**Accounts used:** aycoul@gmail.com (admin/founder · `zmYg6fZaHSmh0X`), test-parent-e2e@ecoleversity.dev · `TestParent!2026`, test-teacher-e2e@ecoleversity.dev · `TestTeacher!2026`.

Legend: ✅ pass · ⚠️ minor/UX · ❌ broken → must-fix

---

## Scope walked

| Surface | Pages hit |
|---|---|
| Public | `/` → `/en`, `/fr`, `/fr/teachers`, `/fr/teachers/[id]`, `/fr/teachers/[id]/book`, `/fr/login` |
| Parent | overview, sessions, courses, messages, payments, spending, wallet, settings/notifications, `/fr/payment/[id]` (pending + expired + confirmed) |
| Kid | `/fr/k/[lid]`, `/classes`, pre-class `/class/[id]/room` (live + ended) |
| Teacher | dashboard, availability, sessions, classes, courses, earnings, transactions, messages |
| Admin | overview, verification, payments, payouts, reports, strikes, tickets, agents, analytics |

## Green (working well)

- ✅ Auth (email/password) lands on correct role dashboard for parent/teacher/admin.
- ✅ Parent dashboard sidebar with new **Trouver un enseignant** link, Paiements badge count, avatar switcher with learners.
- ✅ Teacher marketplace: 6 teachers, filters (subject/grade/city/search), per-teacher profile, book-a-session wizard renders 7-day date picker.
- ✅ Payment page: Orange Money + Wave numbers, 2 QR codes, copy-number & copy-reference buttons, EUR equivalent + PayPal iframe, expiry countdown, polling.
- ✅ PayPal capture → DB flip → UI confirmed (prior session — re-verified via direct URL auto-redirect).
- ✅ Admin manual confirm: **Confirmer le paiement** button flips `transactions.status` `pending → confirmed` (verified twice against `EV-QRTEST-001` and `EV-ADMIN-MARK-163018`).
- ✅ Kid mode: `/fr/k/[lid]` renders own sidebar (Accueil, Mes classes, Mes cours, Messages, Mes succès) + **Retour en mode parent** button (one-tap switch, verified).
- ✅ Pre-class session page (kid side) now keeps sidebar, shows live countdown + Rejoindre CTA (this was a previous complaint — resolved by FIX-28).
- ✅ Teacher dashboard: full financial stats (total, MTD, en attente de versement), 1 upcoming session, 9 sidebar entries all reachable.
- ✅ Admin founder view: 10 sidebar entries, stats (640 FCFA net revenue, 3 200 FCFA GMV today), escalations area, AI agent panel with 6 agents listed (Patron + 5 lieutenants).
- ✅ Admin payouts: 1 teacher pending (2 560 FCFA Orange Money), Mark-as-Paid CTA visible.

## Fixed during this pass (commits `d324c72`, `b8ebf61`)

| # | Issue | Fix |
|---|---|---|
| A | Parent had no link to browse teachers from dashboard | Added `Trouver un enseignant` sidebar entry (`search` icon) → `/fr/teachers` |
| B | `/fr/payment/[id]` expired-state CTA redirected to `/dashboard` → 404 | Redirect to `/fr/dashboard/parent/overview` in `payment-instructions.tsx` (both confirmed + expired branches) |
| C | React hydration error #418 on `/fr/dashboard/admin/payments` | `formatDate` was `toLocaleDateString("fr-CI", …)` — pinned to `fr-FR` + `timeZone: "Africa/Abidjan"` in `pending-payments.tsx` |
| D | Parent overview card + Paiements badge kept surfacing pending rows that the UI already treats as expired (2h cutoff) — "Finaliser" CTA dead-ended | Mirror the 2h window in badge count (`layout.tsx`) + overview card query (`overview/page.tsx`) |
| E | Session title rendered raw enum slug `mathematiques` | `bookings/create/route.ts` now passes `subject` through `SUBJECT_LABELS` before interpolation; existing 2 bad rows normalized via SQL |

## Still open (logged as tasks)

| # | Severity | Issue |
|---|---|---|
| 118 | ⚠️ | `/` auto-redirects to `/en`; spec says FR is primary. Adjust next-intl locale negotiation so accept-language + fallback default to FR. |
| — | ⚠️ | `/en` keeps French `<title>` tag while body is English — missing EN title translation. |
| — | ⚠️ | `/fr/teachers` still shows `mathematics` / `physics` raw tags on `Prof Koffi (test)` — teacher_subjects contains non-enum values. Data clean-up only; no code change needed. |
| — | ⚠️ | Parent "Top avatar" link in global nav targets `/fr/dashboard/parent/overview` (itself) rather than a profile page. |
| — | ⚠️ | Some dashboard cards use non-localized `/dashboard/...` hrefs (no `/fr` prefix) — Next handles it but breaks locale switching on those links. |
| 85 | ⚠️ | CYCLE-13 Imminent-session banner still pending on both parent + teacher overview. |

## Evidence

- Prod URL: https://ecoleversity.com
- Supabase project: `vhivhqfhpwhrlinjjfwa` (eu-west-3)
- Transactions touched during test (all cleaned into `confirmed` state):
  - `3e87695e-d61f-4c4b-a9e0-4d427c7079c8` (EV-QRTEST-001)
  - `ec7c5e59-ac60-458b-a8b2-b36fe2da3df9` (EV-LIVEFLOW-161947)
  - `4158b477-f3d7-4bc1-a08f-de71ea490f99` (EV-ADMIN-MARK-163018)
- Live-class rows normalized: `8cc5c5ad…`, `239b723b…` (bad subject/title).

## Verdict

**Platform is in usable end-to-end condition** for the canonical flow: parent login → find teacher → book → pay (QR/PayPal/Mark-as-Paid) → session shows up on both dashboards → kid can switch and see countdown. Admin founder view lets the operator clear the pending payment queue in one click per row.

The 5 fixes landed during this pass close all the blocking issues found on prod. Remaining items are UX-polish, not functionality.
