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

### Task 39: LiveKit Migration + Session Recording Pipeline

**Why LiveKit over JaaS:** JaaS paid tier costs $99/mo for 300 users (minimum). LiveKit Cloud free tier covers 100 MAU + 1,000 min/mo — enough for our entire soft launch. Pay-as-you-go scales with revenue ($0.003/min video, $0.004/min recording). LiveKit also supports AI agents joining rooms as participants, which unlocks Phase 7 AI Twins without a separate architecture.

**Goal:** Replace the free `meet.jit.si` embed with LiveKit, add token-based auth, auto-record sessions to Cloudflare R2, and link recordings to sessions in the DB.

**Architecture:**
- Live video: **LiveKit Cloud** (free tier first, then pay-as-you-go)
- Session recording: LiveKit Egress → **Cloudflare R2** (S3-compatible storage, $0.015/GB, no egress fees)
- Recording playback: **Cloudflare Stream** (adaptive bitrate for watch-later)
- Pre-recorded courses (Phase 3): still **Cloudflare Stream** (unchanged)

**Prerequisites (manual, before coding):**
1. Sign up at [LiveKit Cloud](https://cloud.livekit.io) — free tier
2. Create a project: `ecoleversity`
3. From Project Settings → copy **API Key**, **API Secret**, and **WebSocket URL** (format: `wss://ecoleversity-xxxx.livekit.cloud`)
4. Create Cloudflare R2 bucket `ecoleversity-recordings` + generate S3-compatible API credentials
5. Configure LiveKit webhook endpoint in LiveKit Cloud Console → Webhooks → URL: `https://ecoleversity.vercel.app/api/livekit/webhook` → subscribe to `egress_ended` event
6. Add to `.env.local`:
   ```
   LIVEKIT_API_KEY=APIxxxxxxxxx
   LIVEKIT_API_SECRET=secretxxxxxxxxx
   LIVEKIT_URL=wss://ecoleversity-xxxx.livekit.cloud
   NEXT_PUBLIC_LIVEKIT_URL=wss://ecoleversity-xxxx.livekit.cloud
   LIVEKIT_WEBHOOK_KEY=webhook-signing-key-from-livekit-dashboard
   CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
   CLOUDFLARE_R2_BUCKET=ecoleversity-recordings
   CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   CLOUDFLARE_R2_REGION=auto
   ```

**Files:**
- Delete/replace: `src/lib/video/jitsi.ts` → rename to `src/lib/video/livekit.ts`
- Create: `src/app/api/livekit/token/route.ts` — server-side access token generation
- Create: `src/app/api/livekit/start-recording/route.ts` — trigger Egress when teacher joins
- Create: `src/app/api/livekit/webhook/route.ts` — handle `egress_ended` event
- Replace: `src/components/session/jitsi-embed.tsx` → `src/components/session/livekit-room.tsx`
- Modify: `src/components/session/session-room.tsx` — use new LiveKit component
- Modify: `src/app/[locale]/(learning)/session/[id]/page.tsx` — pass user ID/email/role
- Create: `src/lib/cloudflare/r2.ts` — configure Egress to write directly to R2
- Create: `supabase/migrations/00005_session_recordings.sql` — session_recordings table

- [ ] **Step 1:** Install dependencies: `npm install livekit-client @livekit/components-react @livekit/components-styles livekit-server-sdk @aws-sdk/client-s3`

- [ ] **Step 2:** Create `src/lib/video/livekit.ts` with helpers:
  - `getLiveKitUrl()` → returns `process.env.NEXT_PUBLIC_LIVEKIT_URL`
  - `getRoomName(liveClassId)` → returns `"session-${liveClassId}"` (stable room name per class)
  - Delete old `src/lib/video/jitsi.ts` (no longer used)

- [ ] **Step 3:** Create access token API route (`src/app/api/livekit/token/route.ts`):
  - Auth check: verify Supabase session, load user profile
  - Verify user is enrolled in this class OR is the teacher
  - Generate token using `AccessToken` from `livekit-server-sdk`:
    - `identity`: user ID
    - `name`: display name
    - `metadata`: JSON with `{ role: "teacher" | "parent", email }`
    - `grants.room`: room name, `roomJoin: true`, `canPublish: true`, `canSubscribe: true`
    - Teachers get `canPublishData: true` + `roomAdmin: true`
    - Token TTL: 1 hour
  - Return `{ token, url }` to client

- [ ] **Step 4:** Create recording trigger API route (`src/app/api/livekit/start-recording/route.ts`):
  - Only teachers can trigger (auth check + role check)
  - Use `EgressClient` from `livekit-server-sdk`
  - Start `RoomCompositeEgress` with:
    - `roomName`: matches live class
    - S3 output: Cloudflare R2 credentials, bucket, key = `recordings/${liveClassId}/${Date.now()}.mp4`
    - Layout: `speaker` (or `grid` for group classes)
  - Save `egress_id` to `session_recordings` table (status: `starting`)
  - Return `{ egressId }`

- [ ] **Step 5:** Replace `jitsi-embed.tsx` with `src/components/session/livekit-room.tsx`:
  - Use `LiveKitRoom`, `VideoConference`, `RoomAudioRenderer` from `@livekit/components-react`
  - Fetch token from `/api/livekit/token` on mount
  - On teacher join: auto-fire `/api/livekit/start-recording` (if not already recording)
  - Import `@livekit/components-styles` for default UI
  - Handle `onDisconnected` → call `onClose` prop (same contract as old JitsiEmbed)
  - Keep mobile responsive: LiveKit's `VideoConference` handles mobile natively

- [ ] **Step 6:** Update `session-room.tsx` + session page — pass `userId`, `userEmail`, `userRole` down to `LiveKitRoom` component. Replace all `JitsiEmbed` references with new component.

- [ ] **Step 7:** Create Supabase migration `00005_session_recordings.sql`:
  ```sql
  CREATE TABLE session_recordings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    live_class_id uuid NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    egress_id text UNIQUE NOT NULL,
    r2_url text,
    cloudflare_stream_id text,
    duration_seconds integer,
    file_size_bytes bigint,
    started_at timestamptz,
    ended_at timestamptz,
    status text NOT NULL DEFAULT 'starting',
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX idx_session_recordings_class ON session_recordings(live_class_id);
  CREATE INDEX idx_session_recordings_egress ON session_recordings(egress_id);

  -- RLS: only the teacher and enrolled parents can view
  ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Teacher sees own recordings" ON session_recordings FOR SELECT
    USING (EXISTS (SELECT 1 FROM live_classes WHERE id = live_class_id AND teacher_id = auth.uid()));
  CREATE POLICY "Enrolled parents see recordings" ON session_recordings FOR SELECT
    USING (EXISTS (SELECT 1 FROM enrollments WHERE live_class_id = session_recordings.live_class_id AND parent_id = auth.uid()));
  ```

- [ ] **Step 8:** Create webhook handler (`src/app/api/livekit/webhook/route.ts`):
  - Verify webhook signature using `WebhookReceiver` from `livekit-server-sdk` with `LIVEKIT_WEBHOOK_KEY`
  - Handle `egress_ended` event:
    - Find `session_recordings` row by `egress_id`
    - Update with: `r2_url` (from egress output), `duration_seconds`, `file_size_bytes`, `ended_at`, `status = 'completed'`
    - Also update `live_classes.recording_url`
  - Return 200 quickly
  - Note: Because egress writes directly to R2, we don't need to download/re-upload — unlike JaaS this is a one-step pipeline

- [ ] **Step 9:** Add recording playback to ended session UI — in `session-room.tsx` ENDED state, if `recordingUrl` exists, show "Revoir le cours" button. Playback uses native `<video>` tag with R2 URL (or Cloudflare Stream if we transcode later).

- [ ] **Step 10:** Test end-to-end:
  - Create a test session in the DB
  - Join as teacher → token generated → connected to LiveKit room → recording auto-starts
  - Join as parent (second browser) → both see each other
  - Teacher ends session → LiveKit egress finalizes → webhook fires → DB updates → R2 has the MP4
  - Reload session page → "Revoir le cours" button appears → clicks → video plays

- [ ] **Step 11:** Build, commit: "feat: migrate video to LiveKit with auto-recording to R2"

---

### Final Checkpoint: Launch Ready
- [ ] All builds pass
- [ ] Lighthouse scores: Performance > 80, Accessibility > 90
- [ ] RLS audit passed — no data leaks between families
- [ ] All API routes authenticated and validated
- [ ] SEO: sitemap, robots, Open Graph working
- [ ] Legal pages live
- [ ] AI moderation active
- [ ] LiveKit video with auto-recording operational (recordings in R2, playback works)
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
| LiveKit free tier limit (100 MAU, 1000 min) | Low | Sufficient for entire soft launch; pay-as-you-go after |
| Recording webhook fails | Medium | Egress writes directly to R2, so recording exists even if webhook fails; re-sync script can backfill DB |
| R2 storage costs at scale | Low | $0.015/GB = ~$1/mo for 100 recordings (1hr each at 500MB); no egress fees |
| LiveKit pricing at scale | Medium | $0.003/min video + $0.004/min egress = ~$50/mo for 12,000 min; cheaper than JaaS |
