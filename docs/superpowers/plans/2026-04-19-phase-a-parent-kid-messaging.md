# Phase A — Parent + Kid mode + Triad messaging

**Date:** 2026-04-19
**Spec:** `docs/superpowers/specs/2026-04-19-dashboards-design.md`
**Target completion:** 2026-04-26 (Week 1 of remaining MVP sprint)
**MVP gate:** required before May 8 launch

---

## Goal

Ship the parent-and-kid dual-mode UX (Outschool-style) and the triad messaging system in one coordinated release. After this phase:

- A parent can switch between their own mode and each kid's mode via a top-right avatar dropdown
- Each kid has a dedicated, content-scoped surface (`/k/[learner_id]/*`) that hides parent-only controls
- Kids, parents, and teachers share one thread per relationship; all messages triad-visible
- Every message passes server-side regex moderation; PII/attachments blocked
- Parent inbox groups threads by kid; teacher inbox groups by student
- Every moderation block is logged for admin review

---

## Non-goals (stay out of Phase A)

- LLM-based message moderation (Phase 7 — regex only for now)
- Session recording moderation (Phase D — different pipeline)
- Teacher schedule / earnings / students pages (Phase B)
- Admin dashboard pages (Phase C)
- School admin dashboard (post-MVP)
- Kid-to-kid or parent-to-parent messaging
- Voice notes, attachments, link previews
- Feature flags (launch to all parents at once)

---

## Task inventory (14 tasks, 4 blocks)

### Block 1 — Foundation (sequential, blocks everything else)

#### A-1 · DB migration: mode + messaging schema

**File:** `supabase/migrations/00015_phase_a_mode_and_messaging.sql`

Single migration with:
- `profiles.active_learner_id uuid references learner_profiles(id) on delete set null`
- `message_threads.learner_id uuid references learner_profiles(id)` (makes threads triad-aware)
- `messages.moderation_status text default 'clean' check (in 'clean'|'blocked'|'flagged')`
- `messages.blocked_reason text`
- New table `message_moderation_log` (sender, thread, attempted_body, block_reason, matched_pattern, created_at)
- RLS update on `message_threads`: select if `parent_id = auth.uid() OR teacher_id = auth.uid()` (same for messages)
- Index: `message_threads(parent_id, learner_id)`, `message_moderation_log(created_at desc)`

**Acceptance:**
- Migration applies cleanly to prod via Management API
- Backfill: existing `message_threads` rows get `learner_id = NULL` (no break)
- Postgres logs show zero errors during migration

**Effort:** 45 min

---

#### A-2 · Profile switcher API + cookie

**Files:**
- `src/app/api/profile/switch/route.ts` (new)
- `src/lib/auth/active-learner.ts` (new — server helper)
- `src/lib/auth/active-learner-client.ts` (new — client helper)

`POST /api/profile/switch` accepts `{ learner_id: string | null }`. Server:
1. Verify learner belongs to caller (parent RLS check)
2. Set cookie `ev_active_learner_id` (httpOnly, sameSite=lax, 30d)
3. Update `profiles.active_learner_id` (durable mirror)
4. Return `{ active_learner_id, active_learner: { first_name, grade_level, ... } | null }`

Server helper `getActiveLearner(supabase)` returns the parent-verified active learner (or null for parent mode).

Client helper `useActiveLearner()` hook reads cookie via server component rerun trigger.

**Acceptance:**
- `POST /api/profile/switch { learner_id: "<valid uuid>" }` → 200, cookie set
- `POST /api/profile/switch { learner_id: "<someone else's kid>" }` → 403
- `POST /api/profile/switch { learner_id: null }` → 200, cookie cleared
- Unit test with mocked Supabase: 3 cases above pass

**Effort:** 1.5 hr

---

#### A-3 · Middleware for mode routing + route guards

**File:** `middleware.ts` (root — create or update)

Responsibilities:
1. On every `/dashboard/*` and `/k/*` request, resolve active user + role + active learner
2. If path starts with `/k/[learner_id]` and active_learner_id doesn't match (or user isn't that kid's parent) → redirect to `/dashboard/parent/overview`
3. If path starts with `/dashboard/admin` and role ≠ admin → redirect to role-appropriate home
4. If path starts with `/dashboard/teacher` and role ≠ teacher → redirect
5. If path starts with `/dashboard/school` and role ≠ school_admin → redirect

**Acceptance:**
- Logged-out user on `/dashboard/*` → redirected to `/login`
- Parent on `/k/[other-parent's-kid]` → redirected with toast
- Teacher on `/dashboard/admin/*` → redirected to `/dashboard/teacher/overview`
- Parent on `/dashboard/teacher/courses` → redirected
- Parent with active_learner cookie on `/dashboard/parent/overview` → NO redirect (still valid, parent can access their own dashboard from any mode)

**Effort:** 2 hr

---

### Block 2 — Parent home rebuild (depends on A-1..A-3)

#### A-4 · New shared components

**Files:**
- `src/components/nav/avatar-switcher.tsx` (new — client component, uses useActiveLearner)
- `src/components/dashboard/learner-card.tsx` (new)
- `src/components/dashboard/upcoming-session-list.tsx` (new)
- `src/components/dashboard/continue-watching-rail.tsx` (new)

Props and behavior:
- `AvatarSwitcher` — opens dropdown with kids + admin links, POSTs to switcher API on click
- `LearnerCard` — `{ learner, nextSession?, progressPct? }` — renders avatar + grade + CTA "Voir le profil" → navigates to `/k/[id]`
- `UpcomingSessionList` — `{ sessions, mode: 'parent' | 'kid' | 'teacher' }` — changes "Join" button wording per mode
- `ContinueWatchingRail` — `{ progressRows }` — horizontal scroll of course-in-progress cards with "Continuer" CTA

Style: match existing Shadcn + Tailwind tokens (`--ev-blue`, `--ev-green`, etc.).

**Acceptance:**
- Storybook / isolated render for each component (no backend required)
- TypeScript strict, no any
- Mobile-first responsive (375px first)

**Effort:** 3 hr

---

#### A-5 · Refactor parent overview to use new components

**File:** `src/app/[locale]/(dashboard)/dashboard/parent/overview/page.tsx`

Replace existing layout with:
- Greeting banner (existing pattern OK)
- `<LearnerCard>` grid per kid
- `<UpcomingSessionList mode="parent" />`
- Teacher recommendations placeholder (data later)
- Announcements placeholder

Data fetching: consolidate existing queries, add `learner_profiles → enrollments → live_classes` join for next session per kid.

**Acceptance:**
- Existing test parent with 3 kids sees 3 LearnerCards
- Each LearnerCard shows correct grade + next session time
- Clicking a LearnerCard triggers POST to switcher API + navigates to `/k/[id]`
- No console errors

**Effort:** 2 hr

---

#### A-6 · Parent children CRUD page

**File:** `src/app/[locale]/(dashboard)/dashboard/parent/children/page.tsx` (new)

- Lists all `learner_profiles` for current parent
- Each row: avatar + name + grade + target_exam + "Modifier" / "Supprimer" actions
- Top button "Ajouter un enfant" → inline form (name, grade combo, target_exam combo)
- Reuses existing `AddChildStep` logic, adapted for dashboard layout

**Acceptance:**
- Parent can view, add, edit, delete children
- Delete triggers confirmation modal
- Soft-delete preferred (add `deleted_at`) OR hard-delete with cascade — **decision needed**: go with hard-delete + cascade (simpler, children unenroll automatically)

**Effort:** 2 hr

---

### Block 3 — Kid mode (depends on A-1..A-3, parallel with Block 2)

#### A-7 · Kid routes scaffold

**Files:**
- `src/app/[locale]/k/layout.tsx` (new — kid-mode chrome: sidebar, nav)
- `src/app/[locale]/k/[learner_id]/page.tsx` (new — home)
- `src/app/[locale]/k/[learner_id]/classes/page.tsx` (new)
- `src/app/[locale]/k/[learner_id]/courses/page.tsx` (new)
- `src/app/[locale]/k/[learner_id]/achievements/page.tsx` (new)

Layout has a kid-mode sidebar (simpler than parent sidebar) + "Retour au mode parent" button in top-right (resets cookie via switcher API).

**Acceptance:**
- All routes render with proper layout wrapper
- Middleware enforces learner_id ownership
- Layout uses kid-friendly visual hierarchy (bigger text, bigger buttons, fewer options)

**Effort:** 1.5 hr

---

#### A-8 · Kid home page

**File:** `src/app/[locale]/k/[learner_id]/page.tsx`

Layout:
1. `Salut {first_name} ! 👋` banner with kid's avatar
2. "Cours d'aujourd'hui" — any `live_classes` enrolled + scheduled in next 24h
3. "Continue d'apprendre" — `<ContinueWatchingRail>` filtered by `learner_id`
4. "Mes classes" — grid of enrolled classes
5. "Mes succès" — `/achievements` link card

Data fetched server-side with `active_learner_id` filter.

**Acceptance:**
- Kid Aya sees ONLY Aya's enrollments (confirmed via Playwright with 2 kids)
- Kid switching via avatar: content updates
- No parent-controls anywhere on page

**Effort:** 1.5 hr

---

#### A-9 · Kid classes + courses pages

**Files:**
- `src/app/[locale]/k/[learner_id]/classes/page.tsx`
- `src/app/[locale]/k/[learner_id]/courses/page.tsx`

Each shows the active learner's enrollments filtered to the respective type. No book/enroll buttons — read-only. Links to existing player routes.

**Acceptance:**
- Kid can click a class → goes to `/k/[id]/class/[id]/room` (LiveKit)
- Kid can click a course → goes to `/k/[id]/course/[id]` (player)
- Player pages inherit kid layout

**Effort:** 1.5 hr

---

#### A-10 · Kid course player + LiveKit room wiring

**Files:**
- `src/app/[locale]/k/[learner_id]/course/[id]/page.tsx` (new — wraps existing course player)
- `src/app/[locale]/k/[learner_id]/course/[id]/lesson/[lessonId]/page.tsx` (new — wraps existing lesson player)
- `src/app/[locale]/k/[learner_id]/class/[id]/room/page.tsx` (new — wraps LiveKit room)

These are thin wrappers that import the existing parent-mode player components and pass `participant_name = learner.first_name` instead of `parent.display_name`.

**Acceptance:**
- LiveKit shows "Aya" as participant name, not parent's full name (kid privacy)
- Course progress writes to `enrollments` row keyed by `learner_id`
- Exit button returns to `/k/[learner_id]` (not parent dashboard)

**Effort:** 2 hr

---

### Block 4 — Messaging triad (parallel with Blocks 2-3)

#### A-11 · Message regex moderation module

**Files:**
- `src/lib/moderation/pii-detector.ts` (new — pure function, testable)
- `src/lib/moderation/pii-detector.test.ts` (new — Vitest)

Exports:
```ts
export type ModerationResult = {
  allowed: boolean;
  blockReason?: 'phone' | 'email' | 'social_handle' | 'whatsapp_link' | 'external_url' | 'other';
  matchedPattern?: string;
};
export function detectPII(body: string): ModerationResult;
```

Regex suite covers:
- CI phone formats: `+225XXXXXXXXXX`, `07 XX XX XX XX`, `05 XX XX XX XX`, `01 XX XX XX XX`
- International phone: `+[1-9]\d{1,14}`
- Spelled-out digits (French): "zéro sept...", "zero un deux..."
- Emails: standard RFC 5322 regex simplified
- Social handles: `@[a-z0-9._]+`, `instagram.com/*`, `tiktok.com/*`, `facebook.com/*`, `snapchat.com/*`
- WhatsApp: `wa.me/*`, `whatsapp\s+\+?\d`
- External URLs: `https?://[^\s]+`, `[a-z0-9-]+\.(com|net|org|fr|ci)(/[^\s]*)?`

**Acceptance:**
- 20+ unit tests covering positive (should block) + negative (benign messages that should pass) cases
- French + English + nouchi examples in test corpus
- Test coverage ≥95%

**Effort:** 3 hr

---

#### A-12 · Messages API: triad enforcement + moderation

**Files:**
- `src/app/api/messages/send/route.ts` (update or new)
- `src/app/api/messages/threads/route.ts` (update or new)
- `src/lib/messaging/thread.ts` (update — helpers for triad thread resolution)

On POST `/api/messages/send`:
1. Validate body (zod)
2. Resolve thread (parent_id + teacher_id + learner_id unique)
3. Verify sender is one of the 3 parties (else 403)
4. Call `detectPII(body)`:
   - If blocked: insert into `message_moderation_log`, return 422 with `{ error: 'pii_blocked', reason }`
   - If allowed: insert into `messages` with `moderation_status='clean'`
5. Insert system message if this was a moderation block (visible to parent + admin)
6. Return `{ message }` or `{ error }`

GET `/api/messages/threads`:
- Parent mode: returns all threads where `parent_id = auth.uid()`, grouped by learner
- Teacher mode: returns all threads where `teacher_id = auth.uid()`, grouped by learner
- Kid mode: returns only threads where `parent_id = auth.uid() AND learner_id = active_learner_id`

**Acceptance:**
- E2E: kid tries to send "Mon numéro c'est 07 12 34 56 78" → 422 blocked, logged
- E2E: teacher replies to thread → parent + kid both see the new message
- Unit tests: triad resolution, 403 on outsider, system message on block
- RLS prevents cross-tenant access (tested via SQL)

**Effort:** 3 hr

---

#### A-13 · Messages UI: triad inbox + thread view

**Files:**
- `src/app/[locale]/(dashboard)/dashboard/parent/messages/page.tsx` (refactor)
- `src/app/[locale]/k/[learner_id]/messages/page.tsx` (new)
- `src/app/[locale]/(dashboard)/dashboard/teacher/messages/page.tsx` (refactor)
- `src/components/messaging/thread-list.tsx` (new)
- `src/components/messaging/thread-view.tsx` (refactor)
- `src/components/messaging/message-bubble.tsx` (new — sender-labeled)

Each mode's inbox shows thread list with different grouping:
- Parent: collapsed by kid, with unread badge per group
- Kid: single list (all threads with all teachers — usually 1-3)
- Teacher: collapsed by student, with unread badge per student

Thread view is shared:
- Header: other party's name + role
- Messages with bubbles, sender label + timestamp
- Bubble color coding: parent = blue, kid = green, teacher = gold, system = grey
- Compose area with live PII detector client-side warning (pre-send) + server block (hard)

**Acceptance:**
- Parent inbox shows 3 kids → expanding shows threads per kid
- Kid inbox shows only their threads
- Teacher inbox shows students grouped, each thread with kid+parent visible
- Typing "07 12 34" into compose triggers warning banner before submit
- Submit still blocked server-side if client warning bypassed

**Effort:** 4 hr

---

### Verification

#### A-14 · E2E verification pass

**Files:**
- `tests/e2e/parent-kid-switch.spec.ts` (new)
- `tests/e2e/messaging-triad.spec.ts` (new)
- Manual Playwright runs per spec

Automated tests:
- Parent logs in, switches to Aya, sees only Aya's data
- Parent switches back, sees all kids
- Middleware: parent on `/k/[different-parent's-kid]` redirects
- Kid cannot reach `/dashboard/parent/wallet` directly
- Message with phone number gets 422 + log row
- Teacher message visible to parent AND kid in same thread

Manual:
- Send real messages in Playwright, verify bubble colors + sender labels
- Switch mid-conversation, verify unread counts update

**Acceptance:**
- All E2E pass on production deploy
- Windows test runner fix needed first? (Pre-existing issue — may need to run on Linux CI or fix rolldown binding)

**Effort:** 3 hr

---

## Dependency graph

```
A-1 (DB) ──┬──> A-2 (API) ──> A-3 (middleware) ──┬──> A-4 (components) ──> A-5 (parent home) ──> A-6 (children CRUD)
           │                                     ├──> A-7 (kid scaffold) ──> A-8 (kid home) ──> A-9 (kid classes/courses) ──> A-10 (kid player)
           │                                     └──> A-11 (regex) ──> A-12 (messages API) ──> A-13 (messages UI)
           │
           └──> A-14 (E2E verification after A-5, A-10, A-13)
```

Critical path: A-1 → A-2 → A-3 → (parallel A-5 / A-10 / A-13) → A-14.

Minimum wall-clock: ~18 hr sequential, ~10 hr with 2-lane parallelization.

---

## Risk + mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Middleware interferes with existing routes | Medium | High | Guard with explicit pathname matching; test non-dashboard routes stay unaffected |
| Regex false-positives block legitimate messages | High | Medium | Start with conservative patterns; log ALL blocks (not just actions) so we can tune from data |
| Existing `message_threads` rows break when `learner_id` added | Medium | High | Nullable column + backfill later; never hard-require immediately |
| LiveKit `participant_name` change breaks existing recording metadata | Low | Medium | Keep parent's name as room-level metadata, only participant_name changes |
| Parent home rebuild breaks existing dashboard users | Medium | High | Feature flag via env var — default to new UI, fallback query param `?classic=1` for debugging |
| Kid Route Group naming conflict with `/k/*` pattern | Low | Medium | Verify no existing `/k` route before starting A-7 |
| RLS policy drift during migration | Medium | High | Migration runs in transaction; rollback prepared; test policies with real user JWT before committing |

---

## Open decisions needing user input

1. **Soft-delete vs hard-delete for children (A-6)**: hard-delete cascades enrollments. Soft-delete preserves history. **My recommendation: hard-delete** — MVP simplicity, children can be re-added.

2. **Moderation client-side warning vs server-only block (A-13)**: client-side warning adds code but better UX. **My recommendation: client warning + server enforce** — defense in depth.

3. **Parent children CRUD or just add/remove?**: full CRUD = edit name + grade + exam. **My recommendation: full CRUD** — kids change grades each school year.

4. **Keep `/onboarding/parent` → parent home redirect when kids exist?**: currently the wizard is always-accessible. **Recommendation: keep accessible** — parents can re-add kids via dashboard OR onboarding.

---

## Rollout

1. Work on feature branch `phase-a-parent-kid-messaging`
2. Deploy to Vercel preview at each block boundary
3. Manual smoke test on preview before merge to main
4. Merge to main when all 14 tasks + A-14 pass
5. Watch Vercel runtime logs + Supabase auth logs for 1 hr post-merge
6. Announce in CLAUDE.md update: "Phase A live; parent+kid+messaging operational"

---

## Acceptance criteria (phase-level)

From the design spec (§ Acceptance Criteria), Phase A delivers:

- [ ] Parent can switch to kid mode in ≤2 clicks (A-4, A-5, A-7)
- [ ] Kid mode blocks all parent-only routes (A-3)
- [ ] Messaging blocks phone/email/social attempts from kid AND parent AND teacher (A-11, A-12)
- [ ] Messages moderation logs every block attempt for admin review (A-12)
- [ ] No attachments possible in DMs (A-12 — reject at API)

Remaining acceptance items (session moderation, Phase-level i18n, teacher block on violation) roll forward to Phases D and later.

---

## After Phase A

- Phase B: Teacher dashboard (overview, schedule, students, earnings link)
- Phase C: Admin dashboard (overview, users, moderation queue, analytics)
- Phase D: Session recording moderation pipeline
- Post-MVP: School admin dashboard, LLM message moderation, attachments

Separate plan files per phase will be created when we start each.

---

## Ready to execute?

If approved, proceed in order: A-1 → A-2 → A-3 → then parallel work. Commit per task, PR at end of each block.
