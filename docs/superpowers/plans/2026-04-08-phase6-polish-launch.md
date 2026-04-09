# Phase 6: Polish + Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Performance optimization, security audit, SEO, legal pages, seed content, and soft launch. Platform goes live.

**Architecture:** No new features — this phase hardens and polishes everything built in Phases 1-5.

**Project root:** `/mnt/c/Ecoleversity`

---

## Task List

### Task 33: Performance Optimization

**Files:**
- Modify: `next.config.ts` — image optimization, compression
- Modify: `src/app/[locale]/layout.tsx` — font optimization, preconnect
- Create: `src/components/common/optimized-image.tsx` — lazy loading wrapper
- Modify: various page components — add loading states, Suspense boundaries

- [ ] **Step 1:** Add `loading.tsx` skeletons for all major routes (dashboard, catalog, course player, messaging). Use Shadcn Skeleton component.

- [ ] **Step 2:** Add Suspense boundaries around data-fetching sections. Stream server components where possible.

- [ ] **Step 3:** Optimize images — ensure all `<img>` tags use `next/image` with `sizes` prop, WebP format, blur placeholder. Create reusable `OptimizedImage` component for lazy loading with placeholder.

- [ ] **Step 4:** Add `preconnect` hints for Supabase, Cloudflare, Jitsi domains in layout head.

- [ ] **Step 5:** Verify page weight targets: core pages < 200KB (excluding video). Check with `npm run build` output.

- [ ] **Step 6:** Run Lighthouse audit (simulate 3G throttle, 375px mobile). Target scores: Performance > 80, Accessibility > 90, Best Practices > 90, SEO > 90. Fix any critical issues.

- [ ] **Step 7:** Build, commit: "perf: add loading states, Suspense boundaries, image optimization"

---

### Task 34: Security Audit

**Files:**
- Modify: `supabase/migrations/00002_rls_policies.sql` — fix any gaps found
- Create: `tests/security/rls-audit.test.ts` — RLS verification tests
- Modify: `src/app/api/` routes — add rate limiting, input sanitization

- [ ] **Step 1:** Audit all API routes — verify every route checks authentication, validates input with Zod, returns proper error codes. List any gaps.

- [ ] **Step 2:** Verify RLS isolation: write test scenarios confirming:
  - Parent A cannot see Parent B's children
  - Parent A cannot see Parent B's transactions
  - Teacher cannot see another teacher's earnings
  - Non-admin cannot access admin routes
  - Unauthenticated users only see published content

- [ ] **Step 3:** Audit contact detection — test with edge cases: phone numbers with spaces, spelled-out numbers ("zero sept"), numbers in images (acknowledged gap — log for future OCR), email variations.

- [ ] **Step 4:** Add rate limiting to sensitive routes: auth (5 attempts/15min), payment confirm (10/min), message send (30/min). Use in-memory rate limiter or Supabase edge function rate limits.

- [ ] **Step 5:** Verify webhook security — SMS confirm endpoint requires `X-SMS-Secret` header. Admin endpoints verify admin role.

- [ ] **Step 6:** Build, commit: "security: audit RLS, add rate limiting, verify API auth"

---

### Task 35: SEO + Meta Tags

**Files:**
- Modify: `src/app/[locale]/layout.tsx` — global metadata
- Create: `src/app/sitemap.ts` — dynamic sitemap
- Create: `src/app/robots.ts` — robots.txt
- Modify: page components — add per-page metadata

- [ ] **Step 1:** Add global metadata: title template "EcoleVersity | {page}", description, Open Graph (og:image, og:title, og:description), Twitter card. Set og:locale to fr_CI.

- [ ] **Step 2:** Add per-page `generateMetadata()` for: landing, teacher catalog, teacher profiles (dynamic: "M. Koné — Maths 3ème"), course catalog, course detail (dynamic), class catalog.

- [ ] **Step 3:** Create dynamic sitemap.ts — list all public pages, published courses, verified teacher profiles, group classes. Set changeFrequency and priority.

- [ ] **Step 4:** Create robots.ts — allow all public pages, disallow dashboard, API, admin routes.

- [ ] **Step 5:** Add JSON-LD structured data for teacher profiles (Person + EducationalOrganization) and courses (Course schema).

- [ ] **Step 6:** Build, commit: "seo: add meta tags, Open Graph, sitemap, robots, structured data"

---

### Task 36: Legal Pages + Terms

**Files:**
- Create: `src/app/[locale]/(static)/terms/page.tsx` — Terms of service
- Create: `src/app/[locale]/(static)/privacy/page.tsx` — Privacy policy
- Create: `src/app/[locale]/(static)/about/page.tsx` — About page

- [ ] **Step 1:** Write Terms of Service in French — covering: platform usage, user responsibilities, payment terms, refund policy (from spec), teacher obligations, content ownership, contact blocking policy, dispute resolution, account termination.

- [ ] **Step 2:** Write Privacy Policy in French — covering: data collected (profile, children info, payment data, usage analytics), data storage (Supabase), third parties (Resend, 360dialog, Jitsi), user rights (access, modify, delete), children's data protection, cookie policy.

- [ ] **Step 3:** Write About page — EcoleVersity mission, how it works, team (founder), contact info.

- [ ] **Step 4:** Add links to footer and registration page (checkbox: "J'accepte les conditions d'utilisation et la politique de confidentialité").

- [ ] **Step 5:** Build, commit: "docs: add terms of service, privacy policy, and about page in French"

---

### Task 37: AI Content Moderation

**Files:**
- Create: `src/lib/ai/moderation.ts` — Claude-based content moderation
- Modify: `src/app/api/reviews/create/route.ts` — add moderation check
- Modify: `src/app/api/messages/route.ts` — add moderation layer

- [ ] **Step 1:** Build moderation service — uses Claude Haiku to check if content is appropriate for an education platform. Checks: profanity, harassment, spam, inappropriate content for minors. Returns: `{ isClean: boolean, reason?: string }`.

- [ ] **Step 2:** Wire into review creation — moderate review comment before saving. If flagged: set `moderation_status = 'pending'` instead of 'approved', create content_report for admin.

- [ ] **Step 3:** Wire into messaging — moderate messages in addition to contact detection. If flagged: block message, warn sender.

- [ ] **Step 4:** Add to teacher verification — moderate teacher bio and video intro description.

- [ ] **Step 5:** Build, commit: "feat: add AI content moderation for reviews, messages, and profiles"

---

### Task 38: Seed Data + Soft Launch Preparation

**Files:**
- Create: `supabase/seed.sql` — demo data
- Create: `scripts/seed-demo-data.ts` — seed script
- Create: `scripts/create-admin.ts` — create admin user

- [ ] **Step 1:** Create admin user script — creates a Supabase auth user with role='admin'. Run once to set up the founder's admin account.

- [ ] **Step 2:** Seed 20+ help articles (from Task 28 migration, verify they're present).

- [ ] **Step 3:** Seed 10 demo exam questions per exam type (CEPE/BEPC/BAC) for core subjects (maths, français, sciences).

- [ ] **Step 4:** Create soft launch checklist page — internal dashboard showing: total teachers, verified teachers, total courses, total classes, total parents, pending payments, system health.

- [ ] **Step 5:** Prepare launch email template (Resend) — invite parents and teachers to join.

- [ ] **Step 6:** Build, commit: "chore: add seed data, admin script, and launch preparation"

---

### Final Checkpoint: Launch Ready
- [ ] All builds pass
- [ ] Lighthouse scores: Performance > 80, Accessibility > 90
- [ ] RLS audit passed — no data leaks between families
- [ ] All API routes authenticated and validated
- [ ] SEO: sitemap, robots, Open Graph working
- [ ] Legal pages live
- [ ] AI moderation active
- [ ] Admin account created
- [ ] Help articles seeded
- [ ] Exam questions seeded
- [ ] Ready for 10-20 teachers + 50 parents

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lighthouse score below 80 on 3G | High | Defer non-critical JS, add loading skeletons, compress |
| RLS policy gaps | Critical | Write explicit test cases for cross-family data access |
| AI moderation false positives | Medium | Start lenient, tighten over time; admin can override |
| Seed exam questions quality | Medium | Keep questions simple; admin interface to add more later |
