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
- **Hosting:** Vercel (frontend) + Supabase (backend) + Cloudflare Stream (video recordings)
- **Video calls:** Jitsi Meet (JaaS) — core product
- **Payments (MVP):** Bootstrap — personal Orange Money/Wave numbers + SMS scraping to confirm
- **Payments (Month 2+):** CinetPay API (single integration, all providers)
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
```

## Architecture

### Key Design Principles

1. **Tutoring-first** — Live sessions are the core product. Pre-recorded courses are secondary passive income for teachers.
2. **Mobile-first** — Every page designed for 375px Android Chrome first.
3. **Bootstrap payments** — SMS scraping confirms Orange Money/Wave payments. Admin manual confirmation as fallback. CinetPay API when volume justifies.
4. **Build everything** — No MVP mindset. Full platform with all features. Bootstrap only the payment layer.
5. **Low-bandwidth** — Pages <200KB, adaptive video quality, lazy loading everything.
6. **Money as integers** — All FCFA amounts stored as integers, never floats.
7. **RLS for authorization** — Supabase Row-Level Security on every table.
8. **Contact blocking** — Messages scanned for phone numbers, emails, social handles. No images in DMs. Teachers message parents only, never learner profiles.
9. **AI Twin architecture** — All live session recordings saved to Cloudflare Stream. Full schema supports twin training pipeline from day one.

### Core Transaction Loop

```
Parent finds teacher → Books session → Sends payment (Orange Money/Wave) →
  SMS scraping detects payment → Booking confirmed (WhatsApp + email + push) →
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

## Key Files

- `SPEC.md` — Full product specification (vision + MVP + roadmap)
- `supabase/migrations/` — Database schema (10 core tables)
- `src/i18n/messages/fr.json` — French translations (source of truth for UI text)
- `src/lib/payments/bootstrap.ts` — SMS scraping payment confirmation
- `src/lib/payments/confirm.ts` — Match payment to pending booking
- `src/lib/notifications/whatsapp.ts` — WhatsApp Business API (primary notifications)
- `src/lib/notifications/cascade.ts` — Notification cascade (WhatsApp → email → push)
- `src/lib/ai/support-bot.ts` — AI customer support chatbot "Ama"
