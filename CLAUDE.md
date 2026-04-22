# CLAUDE.md

This file provides guidance to Claude Code when working with the EcoleVersity codebase.

## Project Overview

EcoleVersity is an online tutoring platform that digitizes the "maître de maison" (home tutor) model for K-12 students in Côte d'Ivoire. Parents find vetted teachers, book live tutoring sessions, and their children learn remotely via Jitsi video calls.

**Core product:** Live tutoring (1-on-1 and group classes). Pre-recorded courses are secondary.

**Business model:** 20-25% commission on tutoring sessions. Solo founder + AI (Claude Code) engineering team.

**MVP target:** May 8, 2026 (30-day sprint from April 8, 2026).

**Bootstrap strategy:** Start informal (no business registration). Personal Orange Money/Wave SIM cards for payments via SMS scraping. Formalize when profitable.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Next.js API Routes + Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Hosting:** Vercel (frontend, project: `aycouls-projects/ecoleversity`) + Supabase (backend, project ID: `vhivhqfhpwhrlinjjfwa`, region: eu-west-3) + Cloudflare Stream (video recordings)
- **Video calls:** Jitsi Meet (JaaS) — core product
- **Payments (local):** Bootstrap — personal Orange Money/Wave numbers + SMS scraping to confirm
- **Payments (international):** Flutterwave inline checkout — diaspora EUR/USD credit cards (3.8% fee, no business registration)
- **Payments (growth):** CinetPay API (single integration, all mobile money providers)
- **WhatsApp:** WhatsApp Business API (360dialog) — primary notifications
- **Email:** Resend — receipts, weekly summaries
- **i18n:** next-intl (French primary, English secondary)
- **AI:** Claude API (content moderation, support chatbot "Ama", recommendations, AI teacher twins)

## Commands

```bash
# Setup
npm install
cp .env.example .env.local        # Then edit with real credentials

# Development
npm run dev                        # Next.js dev server on :3000

# Database
npx supabase start                 # Local Supabase
npx supabase db push               # Push migrations
npx supabase gen types typescript --local > src/lib/supabase/types.ts

# Tests
npm run test                       # Vitest unit tests
npm run test:e2e                   # Playwright E2E

# Build & Deploy
npm run build                      # Production build
npm run lint                       # ESLint
npm run type-check                 # TypeScript check
vercel --prod                      # Deploy to production

# Infrastructure
# Supabase: project vhivhqfhpwhrlinjjfwa (eu-west-3 Paris)
# Vercel: aycouls-projects/ecoleversity
# GitHub: github.com/aycoul/ecoleversity
```

## Architecture

### Key Design Principles

1. **Tutoring-first** — Live sessions are the core product. Pre-recorded courses are secondary passive income for teachers.
2. **Mobile-first** — Every page designed for 375px Android Chrome first.
3. **Dual payment paths** — Local: SMS scraping confirms Orange Money/Wave payments. International: Flutterwave inline checkout for diaspora EUR/USD credit cards. Admin manual confirmation as fallback.
4. **Build everything** — No MVP mindset. Full platform with all features. Bootstrap only the payment layer.
5. **Low-bandwidth** — Pages <200KB, adaptive video quality, lazy loading everything.
6. **Money as integers** — All FCFA amounts stored as integers, never floats.
7. **RLS for authorization** — Supabase Row-Level Security on every table.
8. **Contact blocking** — Messages scanned for phone numbers, emails, social handles. No images in DMs. Teachers message parents only, never learner profiles.
9. **AI Twin architecture** — All live session recordings saved to Cloudflare Stream. Full schema supports twin training pipeline from day one.
10. **AI Operations Team** — 6 AI agents run on VPS (Payment, Verification, Moderation, Support, Analytics, CEO). CEO Agent ("Le Patron") oversees the entire business — monitors all agents, tracks revenue/growth/churn, sends daily WhatsApp reports to founder. Confidence-gated: auto-act above threshold, escalate via WhatsApp below. Human override always available. All decisions logged to `agent_audit_log`.
11. **Portable backend** — VPS services are self-contained (PM2 + env-only config + Docker-ready). Easy to move to a dedicated VPS later.

### Core Transaction Loop

```
Parent finds teacher → Books session → Pays (Orange Money/Wave OR Flutterwave CC) →
  SMS scraping or Flutterwave webhook confirms → Booking confirmed (WhatsApp + email + push) →
  Student joins Jitsi call → Teacher teaches → Session recorded →
  Parent rates teacher → Teacher gets paid (manual weekly payout)
```

### Directory Structure

```
src/
├── app/[locale]/          # Next.js App Router (French only at MVP)
│   ├── (auth)/            # Login, register, verify
│   ├── (marketplace)/     # Teachers, classes, courses, search
│   ├── (learning)/        # Live class room (Jitsi), course player
│   └── (dashboard)/       # Parent, teacher, admin dashboards
├── components/            # React components by domain
├── lib/                   # Business logic
│   ├── payments/          # bootstrap.ts (SMS scraping), confirm.ts, provider.ts
│   ├── notifications/     # whatsapp.ts, email.ts, push.ts, cascade.ts
│   ├── video/             # jitsi.ts (room management)
│   └── ai/                # moderation.ts, support-bot.ts ("Ama"), twin/
├── hooks/                 # React hooks
├── types/                 # TypeScript type definitions
└── i18n/                  # Internationalization (French)

agents/                    # VPS service — AI operations team (separate deploy)
├── src/
│   ├── framework/         # Shared: event router, confidence scoring, escalation, audit
│   ├── agents/            # payment.ts, verification.ts, moderation.ts, support.ts, analytics.ts, ceo.ts
│   └── index.ts           # Entry point — starts all agents
├── ecosystem.config.cjs   # PM2 config
├── Dockerfile             # For VPS migration
├── .env.example
└── scripts/deploy.sh      # Single deploy script
```

## Conventions

- **Code language:** English for all code, comments, variable names
- **UI text:** French via i18n — never hardcode French strings in components
- **TypeScript:** Strict mode, `type` over `interface`, Zod at API boundaries
- **Components:** React Server Components by default, `"use client"` only when needed
- **Naming:** `PascalCase` components, `camelCase` hooks/utils, `kebab-case` files
- **Git:** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **API responses:** `{ data, error, message }` shape, proper HTTP status codes
- **Database:** All timestamps `timestamptz` (UTC), money as integers (FCFA). 10 core tables at MVP, add tables as features are built.

## Security — Non-Negotiable

- Never expose API keys in client code
- Never commit `.env.local` or credentials
- Always validate user input server-side with Zod
- RLS on every active Supabase table — no exceptions
- Student data (minors) gets extra protection
- Teacher verification (CNI + diploma + video) required before appearing in catalog
- Contact info detection and blocking in messages (regex for MVP, AI later)
- Teachers can only message parent accounts, NEVER learner profiles directly
- No image attachments in direct messages (prevents photo-based contact sharing)

## Development Workflow — MANDATORY

This project follows a strict 7-command lifecycle. **WORKFLOW.md is the single source of truth for current progress.** Read it at the start of EVERY session.

| Step | Command | Principle | When to Use |
|------|---------|-----------|-------------|
| 1 | `/spec` | Spec before code | Define what to build — requirements, acceptance criteria |
| 2 | `/plan` | Small, atomic tasks | Break spec into implementable tasks with dependencies |
| 3 | `/build` | One slice at a time | Implement one task, test it, commit, move to next |
| 4 | `/test` | Tests are proof | Prove each feature works — unit, integration, E2E |
| 5 | `/review` | Improve code health | Review before merge — correctness, security, performance |
| 6 | `/code-simplify` | Clarity over cleverness | Simplify after it works — remove unnecessary complexity |
| 7 | `/ship` | Faster is safer | Deploy with confidence — monitoring, rollback plan |

### Session Start Protocol
1. **Read `WORKFLOW.md`** — find the current phase and active step
2. **Announce:** "We are on Phase X, step Y. The next action is /command."
3. **Guide the user** to run the right slash command
4. **After completing a step:** update WORKFLOW.md (mark [x], move NEXT pointer)
5. **When a phase completes:** announce "Phase X complete! Next: Phase Y, step /build"

### Rules
- **NEVER skip a step** — the workflow catches problems early
- **NEVER start coding without checking WORKFLOW.md** — know where you are
- **ALWAYS update WORKFLOW.md** after completing a step
- Each command activates the right skills automatically
- Plans live in `docs/superpowers/plans/`
- Specs live in `SPEC.md` (single source of truth)
- Progress tracked in `WORKFLOW.md` (read every session)

## Key Files

- `SPEC.md` — Full product specification (vision + roadmap)
- `docs/superpowers/plans/` — Implementation plans per phase (6 phases, 38 tasks)
- `supabase/migrations/` — Database schema
- `src/i18n/messages/fr.json` — French translations (source of truth for UI text)
- `src/lib/payments/bootstrap.ts` — SMS scraping payment confirmation
- `src/lib/payments/confirm.ts` — Match payment to pending booking
- `src/lib/notifications/whatsapp.ts` — WhatsApp Business API (primary notifications)
- `src/lib/notifications/cascade.ts` — Notification cascade (WhatsApp → email → push)
- `src/lib/ai/support-bot.ts` — AI customer support chatbot "Ama"

## UI/UX Changes Log (2026-04-21)

The following UI/UX improvements were applied during the audit. **Preserve these patterns** when building new pages.

### Design System — LOCKED
- **Colors:** Keep the existing EV palette exactly as defined in `globals.css`:
  - `--ev-blue: #1E40AF`, `--ev-blue-light: #2563EB`, `--ev-blue-dark: #1E3A8A`, `--ev-blue-50: #EFF6FF`
  - `--ev-amber: #F59E0B`, `--ev-amber-light: #FBBF24`, `--ev-amber-dark: #D97706`, `--ev-amber-50: #FFFBEB`
  - `--ev-green: #10B981`, `--ev-green-light: #34D399`, `--ev-green-dark: #059669`, `--ev-green-50: #ECFDF5`
- **Typography:** Nunito (headings) + Nunito Sans (body). Do not change fonts.
- **Radius scale:** Buttons/inputs `rounded-lg` (8px), cards `rounded-xl` (12px), heroes/banners `rounded-2xl` (16px). Reserve `rounded-full` for primary CTAs on dark backgrounds only.

### Implemented Improvements
1. **Mobile viewport fix** — `pb-24` added to `<main>` in `dashboard-shell.tsx` so content isn't hidden behind the bottom nav.
2. **Loading skeletons** — Added `loading.tsx` to `(dashboard)` and `(marketplace)` route groups.
3. **Accessibility** — `aria-current="page"` on active sidebar links, skip link (`#main-content`) in root layout, `prefers-reduced-motion` media query in `globals.css`.
4. **Empty states** — All dashboards now use styled empty states with EV-blue tinted backgrounds (`bg-[var(--ev-blue-50)]`), white icon circles, and prominent amber CTAs.
5. **Teacher stat cards** — Added hover arrow (`group-hover:opacity-100`) to indicate clickability.
6. **Admin escalation colors** — Color-coded by agent type using the existing palette + semantic rose/violet.
7. **Mobile bottom nav overflow** — When nav has >5 items, shows first 4 + "Plus" sheet with remaining links.
8. **Hero search bar** — Converted from fake `readOnly` input to a real form that submits to `/teachers?q=...`.
9. **Image alt text** — Added descriptive alt text to all images on the landing page (hero, featured cards, services, testimonials, CTA).
10. **Auth form UX** — OTP input now has `autoComplete="one-time-code"` and auto-submits when 6 digits are entered.
11. **Teacher imminent session banner** — Added pulsing amber dot indicator and restyled with EV color tokens.
12. **Course catalog filter sync** — Client-side filters now sync to URL query params (`?subject=...&grade=...`) so filtered views are shareable and bookmarkable.
13. **Image lazy loading** — Added `loading="lazy"` to all `<img>` tags in `CourseCard` (thumbnail + teacher avatar).
14. **React purity fixes** — Replaced all `Date.now()` calls in Server Components with `new Date().getTime()` to comply with React 19 compiler rules.
15. **Onboarding prop fix** — Renamed `children` prop to `childList` in `AddChildStep` and `RecommendationsStep` to resolve ESLint `react/no-children-prop` error.

### Remaining UI/UX Items (Priority Order)
1. **Course card Next.js Image** — Replace native `<img>` with Next.js `<Image>` for automatic optimization. Requires adding Supabase/Cloudflare domains to `next.config.ts`.
2. **Real-time search data** — Command palette currently uses static nav links. Connect to API for live teacher/course search.
3. **Kid mode SVG mascot** — Add a friendly mascot character to kid empty states and dashboard.
4. **PWA offline page** — Add a custom offline fallback page for the service worker.

### Files Modified in This Session
- `src/components/admin/dashboard-shell.tsx` — Mobile padding, aria-current, bottom nav overflow
- `src/app/[locale]/(dashboard)/loading.tsx` — New
- `src/app/[locale]/(marketplace)/loading.tsx` — New
- `src/app/globals.css` — Reduced motion support + kid mode theme overrides
- `src/app/[locale]/layout.tsx` — Skip link + PWA install prompt
- `src/components/layout/app-chrome.tsx` — `#main-content` id
- `src/components/layout/header.tsx` — CommandMenu button
- `src/app/[locale]/(dashboard)/dashboard/parent/overview/page.tsx` — Empty states, Date.now() fixes
- `src/app/[locale]/(dashboard)/dashboard/parent/sessions/page.tsx` — Date.now() fixes
- `src/app/[locale]/(dashboard)/dashboard/teacher/page.tsx` — Empty state + hover arrow + pulsing dot banner
- `src/app/[locale]/(dashboard)/dashboard/teacher/sessions/page.tsx` — Date.now() fixes
- `src/app/[locale]/(dashboard)/dashboard/teacher/earnings/page.tsx` — 7-day earnings query
- `src/app/[locale]/(dashboard)/dashboard/admin/page.tsx` — Agent color coding
- `src/app/[locale]/k/[learner_id]/page.tsx` — Kid empty state + Date.now() fixes
- `src/app/[locale]/k/[learner_id]/layout.tsx` — `data-theme="kid"` wrapper
- `src/app/[locale]/page.tsx` — Functional hero search + image alt text + Date.now() fixes
- `src/app/[locale]/(marketplace)/classes/page.tsx` — Date.now() fixes
- `src/components/auth/login-form.tsx` — OTP autoComplete + auto-submit + phone formatting
- `src/components/course/course-catalog.tsx` — URL filter sync
- `src/components/course/course-card.tsx` — Image lazy loading + alt text
- `src/components/teacher/earnings-dashboard.tsx` — 7-day bar chart
- `src/components/onboarding/parent/add-child-step.tsx` — Renamed `children` prop to `childList`
- `src/components/onboarding/parent/recommendations-step.tsx` — Renamed `children` prop to `childList`
- `src/app/[locale]/onboarding/parent/page.tsx` — Updated prop names for child step components
- `src/components/common/empty-state-illustrations.tsx` — New: 6 inline SVG empty state illustrations
- `src/components/common/pwa-install-prompt.tsx` — New: PWA install banner with beforeinstallprompt
- `src/components/common/command-menu.tsx` — New: Cmd+K command palette with cmdk
- `src/components/dashboard/upcoming-session-list.tsx` — Empty state + CTA
- `src/app/[locale]/page.tsx` — Functional hero search + image alt text + Date.now() fixes
- `src/app/[locale]/(marketplace)/classes/page.tsx` — Date.now() fixes
- `src/components/auth/login-form.tsx` — OTP autoComplete + auto-submit
- `src/components/course/course-catalog.tsx` — URL filter sync
- `src/components/course/course-card.tsx` — Image lazy loading + alt text
- `src/components/onboarding/parent/add-child-step.tsx` — Renamed `children` prop to `childList`
- `src/components/onboarding/parent/recommendations-step.tsx` — Renamed `children` prop to `childList`
- `src/app/[locale]/onboarding/parent/page.tsx` — Updated prop names for child step components
