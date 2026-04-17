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

### Task 39: JaaS Migration + Session Recording Pipeline

**Goal:** Switch from free `meet.jit.si` to JaaS (Jitsi as a Service) with JWT auth and auto-recording. Recordings are stored on Cloudflare R2 and linked to sessions in the DB.

**Prerequisites (manual, before coding):**
1. Log in to [JaaS Console](https://jaas.8x8.vc/) — verify AppID `vpaas-magic-cookie-956edc4e1d074897b914d7ae7102d4b5`
2. Generate RSA key pair: `ssh-keygen -t rsa -b 4096 -m PEM -f jaas-private.key`
3. Upload public key to JaaS Console → API Keys → note the returned Key ID (kid)
4. Create Cloudflare R2 bucket `ecoleversity-recordings` + generate S3-compatible API credentials
5. Configure webhook in JaaS Console → target: `https://ecoleversity.vercel.app/api/jaas/recording-webhook` → events: `RECORDING_UPLOADED`
6. Add to `.env.local`:
   ```
   JAAS_PRIVATE_KEY=<paste RSA private key content, base64 or multiline>
   CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
   CLOUDFLARE_R2_BUCKET=ecoleversity-recordings
   CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   ```

**Files:**
- Modify: `src/lib/video/jitsi.ts` — add JaaS domain, room name format, JWT helpers
- Create: `src/app/api/jitsi/generate-token/route.ts` — server-side JWT generation (RS256)
- Modify: `src/components/session/jitsi-embed.tsx` — load JaaS script, fetch JWT, pass to API
- Modify: `src/components/session/session-room.tsx` — pass user ID/email/role for JWT
- Create: `src/app/api/jaas/recording-webhook/route.ts` — handle RECORDING_UPLOADED event
- Create: `src/lib/cloudflare/r2.ts` — upload recording to R2 via S3-compatible API
- Create: `supabase/migrations/00005_session_recordings.sql` — session_recordings table

- [ ] **Step 1:** Install dependencies: `npm install jsonwebtoken @aws-sdk/client-s3` + `npm install -D @types/jsonwebtoken`

- [ ] **Step 2:** Update `src/lib/video/jitsi.ts` — add JaaS functions:
  - `getJaaSDomain()` → returns `"8x8.vc"`
  - `getJaaSRoomName(roomId)` → returns `"${JAAS_APP_ID}/${roomId}"`
  - `getJaaSExternalApiUrl()` → returns `"https://8x8.vc/${JAAS_APP_ID}/external_api.js"`
  - Keep existing `getJitsiMeetUrl()` as mobile fallback

- [ ] **Step 3:** Create JWT generation API route (`src/app/api/jitsi/generate-token/route.ts`):
  - Auth check: only authenticated users can request tokens
  - JWT payload: `{ aud: "jitsi", iss: "chat", sub: JAAS_APP_ID, room, context.user, features.recording }`
  - Sign with RS256 using private key, `kid` = JAAS_API_KEY
  - Teachers get `affiliation: "owner"` + `features.recording: true`
  - Parents/students get `affiliation: "member"` + `features.recording: false`
  - Token expires in 1 hour

- [ ] **Step 4:** Update `session-room.tsx` — pass `userId`, `userEmail` props to `JitsiEmbed`. Update the session page to fetch and pass these values.

- [ ] **Step 5:** Update `jitsi-embed.tsx` — full JaaS migration:
  - Fetch JWT from `/api/jitsi/generate-token` before initializing
  - Load script from `getJaaSExternalApiUrl()` instead of `meet.jit.si`
  - Pass `jwt` and `roomName: getJaaSRoomName(roomId)` to `JitsiMeetExternalAPI("8x8.vc", {...})`
  - Mobile fallback: still use `getJitsiMeetUrl()` (free, no recording)

- [ ] **Step 6:** Create Supabase migration `00005_session_recordings.sql`:
  ```sql
  CREATE TABLE session_recordings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    live_class_id uuid NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    recording_session_id text UNIQUE NOT NULL,
    r2_url text NOT NULL,
    duration_seconds integer,
    started_at timestamptz,
    ended_at timestamptz,
    participants jsonb,
    idempotency_key text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX idx_session_recordings_class ON session_recordings(live_class_id);
  ```
  Also update `live_classes.recording_url` when a recording is saved.

- [ ] **Step 7:** Create R2 upload utility (`src/lib/cloudflare/r2.ts`):
  - Use `@aws-sdk/client-s3` with R2 endpoint
  - Upload to `recordings/YYYY/MM/session-id.mp4`
  - Return the R2 URL

- [ ] **Step 8:** Create recording webhook handler (`src/app/api/jaas/recording-webhook/route.ts`):
  - Verify webhook authenticity (check AppID matches)
  - Handle `RECORDING_UPLOADED`: download from `preAuthenticatedLink` → upload to R2 → insert into `session_recordings` → update `live_classes.recording_url`
  - Idempotency check with `idempotency_key`
  - Return 200 quickly (avoid webhook timeout)

- [ ] **Step 9:** Add recording playback to ended session UI — in `session-room.tsx` ENDED state, if `recordingUrl` exists, show "Revoir le cours" button linking to the video.

- [ ] **Step 10:** Test end-to-end: create session → join as teacher (moderator) → verify recording button appears → record → end call → verify webhook fires → verify R2 upload → verify DB entry → verify playback link.

- [ ] **Step 11:** Build, commit: "feat: migrate to JaaS with JWT auth + session recording pipeline (R2 storage)"

---

### Final Checkpoint: Launch Ready
- [ ] All builds pass
- [ ] Lighthouse scores: Performance > 80, Accessibility > 90
- [ ] RLS audit passed — no data leaks between families
- [ ] All API routes authenticated and validated
- [ ] SEO: sitemap, robots, Open Graph working
- [ ] Legal pages live
- [ ] AI moderation active
- [ ] JaaS video with recording operational
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
| JaaS free tier limit (25 MAU) | Medium | Sufficient for beta; upgrade to paid when needed |
| Recording webhook fails/delayed | Medium | Idempotency key prevents duplicates; 24h download window |
| Recording costs at scale | Medium | $0.01/min = ~$60/mo for 100 sessions; pass cost to users if needed |
