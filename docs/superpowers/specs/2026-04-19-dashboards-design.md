# EcoleVersity — Dashboards & Role/Mode Model Design

**Date:** 2026-04-19
**Status:** Approved — ready for implementation planning
**Reference:** Outschool (adapted for CI market, French-primary, mobile-first, bootstrap)

---

## 0. Mental model

- **Role** is permanent: `parent` | `teacher` | `admin` | `school_admin`.
- **Mode** is a session-level view filter a role can switch between:
  - `parent` role → `parent` mode or `kid` mode (per learner)
  - other roles → single mode each

The switcher is a cookie `ev_active_learner_id` (+ DB mirror on `profiles.active_learner_id` for durability).

Kid mode is **UX filtering**, not a security boundary. RLS always evaluates as the underlying parent role. Parent-scoped queries stay parent-scoped; kid-mode pages filter client/server by `active_learner_id`.

---

## 1. Navigation architecture

### Top nav (shared)

```
[Logo]  [Role-aware primary nav]  [🔔 notifications]  [Avatar switcher]
```

### Avatar switcher (parents only — Outschool pattern)

Dropdown structure:
- Current user name — click = parent mode
- Separator
- One row per learner — click = kid mode for that learner
- Separator
- "Ajouter un enfant" → `/onboarding/parent` step 2
- "Paramètres"
- "Se déconnecter"

Teachers / admins / school admins: dropdown has only settings + logout (no learner list).

### Mode-sensitive sidebar

**Parent mode**: Tableau de bord · Mes enfants · Cours enregistrés · Prochains cours · Messages · Dépenses · Portefeuille · Avis donnés · Paramètres

**Kid mode**: Mes cours du jour · Mes cours enregistrés · Mon calendrier · Mes succès · (no messages / wallet / settings)

**Teacher mode**: Tableau de bord · Mes cours · Mes classes live · Mon calendrier · Revenus · Messages · Avis · Coupons · Paramètres

**Admin mode**: Tableau de bord · Vérification · Paiements · Utilisateurs · Modération · Transactions · Annonces · Analytics

**School admin mode**: Tableau de bord · Nos enseignants · Nos classes · Nos élèves · Facturation · Paramètres

---

## 2. Parent dashboard (parent mode)

### `/dashboard/parent` → redirects to `/dashboard/parent/overview` (already shipped)

### `/dashboard/parent/overview` layout (mobile-first)

1. **Greeting banner** — `Bonjour [name]` + quick stats row (kids count, sessions this week, wallet balance)
2. **Kid cards strip** — one card per child: avatar, grade, next class time, progress bar, "Voir le profil" CTA (enters kid mode)
3. **Upcoming sessions** — next 5 sessions across all kids, with "Rejoindre" button when imminent
4. **Recommended teachers** — AI-picked based on kids' grade + subjects (Phase 7 hook point)
5. **Announcements** — admin-broadcast messages

### Subpages

| Route | Purpose | Status |
|---|---|---|
| `/dashboard/parent/overview` | Home | ✅ Exists |
| `/dashboard/parent/children` | Manage children CRUD | ❌ New |
| `/dashboard/parent/courses` | Enrolled VOD courses | ✅ Exists |
| `/dashboard/parent/sessions` | All upcoming live classes | ⚠️ Audit |
| `/dashboard/parent/messages` | Triad threads (grouped by kid) | ✅ Exists — update for triad |
| `/dashboard/parent/spending` | Transaction history | ✅ Just built |
| `/dashboard/parent/wallet` | Balance + top-up | ⚠️ Audit |
| `/dashboard/parent/reviews` | Reviews I've written | ❌ New |
| `/dashboard/parent/settings` | Profile, notifications, language | ⚠️ Partial |

---

## 3. Kid mode (learner view)

### Route prefix: `/k/[learner_id]/*`

Middleware rewrites parent-origin requests to kid routes when cookie set.

### `/k/[learner_id]` layout

1. Hello banner — `Salut [first_name] ! 👋` + today's date in friendly format
2. **Cours d'aujourd'hui** — sessions in next 24h, giant "REJOINDRE" for imminent
3. **Continue d'apprendre** — VOD in-progress, one-tap resume
4. **Mes classes** — grid of enrolled live classes with teacher avatars
5. **Mes succès** — badges, streaks, certificates (Phase 5 engagement features)

### Kid-accessible routes

| Route | Purpose |
|---|---|
| `/k/[learner_id]` | Home |
| `/k/[learner_id]/classes` | All enrolled live classes |
| `/k/[learner_id]/courses` | All enrolled VOD courses |
| `/k/[learner_id]/course/[id]` | Course player |
| `/k/[learner_id]/course/[id]/lesson/[lesson_id]` | Lesson player |
| `/k/[learner_id]/class/[id]/room` | LiveKit room (participant_name = learner first_name) |
| `/k/[learner_id]/achievements` | Certificates + badges |
| `/k/[learner_id]/messages` | Messages with their teachers (triad; see §3B) |

### What kid CANNOT access (middleware redirects to `/k/[active_learner_id]`)

- `/dashboard/parent/*` (except messages triad view)
- `/teachers` catalog, booking flow, payment pages
- `/dashboard/parent/wallet`, `/settings`, `/reviews`

---

## 3B. Messaging model (triad)

### Principles

- Every parent↔kid↔teacher relationship has **one logical thread**.
- Parent sees every thread of their kids (unified inbox).
- Teacher sees threads grouped by student.
- Kid sees only their own thread with the teacher.
- No sub-threads, no private backchannels.

### Hard bans (blocked at send)

| Pattern | Detection |
|---|---|
| Phone numbers | Regex for CI/international formats + spelled-out digits |
| Email addresses | Regex |
| Social handles | `@\w+`, `instagram.com/*`, `tiktok.com/*`, `fb.com/*` |
| WhatsApp bypass | `wa.me/*`, "whatsapp" + digits |
| External URLs | `https?://`, `\.com`, `\.net`, `bit.ly/*` (MVP: strip + warn) |
| Attachments | Images, files, voice notes — not allowed in MVP DMs |
| Off-platform payment | Phase 2 soft warn: "Orange Money", "Wave", "virement direct" + name of other platform |

### Rules

- Text-only, 2000 chars max.
- Rate limit: 20 msg/min per user.
- Kid ↔ teacher allowed only if kid is enrolled in at least one of teacher's courses/classes.
- Teacher cannot cold-DM a learner.
- System messages appear when moderation blocks: `"⚠️ Un message a été bloqué (coordonnées personnelles détectées)"`

### Detection pipeline

1. **Regex layer** (MVP) — fires on send, 80% coverage, zero API cost.
2. **Claude Haiku layer** (Phase 7) — catches creative bypasses like "zéro sept un…".
3. **Audit log**: `message_moderation_log` table captures every block attempt.

### Schema additions

```sql
alter table messages add column if not exists moderation_status text
  default 'clean' check (moderation_status in ('clean', 'blocked', 'flagged'));
alter table messages add column if not exists blocked_reason text;

create table if not exists message_moderation_log (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id),
  thread_id uuid not null references message_threads(id),
  attempted_body text not null,
  block_reason text not null,
  matched_pattern text,
  created_at timestamptz not null default now()
);

alter table message_threads add column if not exists learner_id uuid references learner_profiles(id);
```

### RLS

Messages visible if `thread.parent_id = auth.uid()` OR `thread.teacher_id = auth.uid()`. Kid-mode filters client-side by `active_learner_id → thread.learner_id`.

---

## 4. Teacher dashboard

### `/dashboard/teacher/overview` layout

1. Metrics strip — active students, sessions this week, pending earnings, rating
2. Next session card — join button + student list preview
3. Recent enrollments — last 7 days
4. Unread messages — count + inline previews
5. Weekly earnings bar chart

### Subpages

| Route | Purpose | Status |
|---|---|---|
| `/dashboard/teacher/overview` | Home | ❌ New |
| `/dashboard/teacher/courses` | CRUD VOD | ✅ Exists |
| `/dashboard/teacher/classes` | CRUD live classes + sessions | ✅ Exists |
| `/dashboard/teacher/schedule` | Calendar + availability | ❌ New |
| `/dashboard/teacher/earnings` | Paid / pending / method | ✅ Exists (payouts) |
| `/dashboard/teacher/students` | Enrolled students per class/course | ❌ New |
| `/dashboard/teacher/messages` | Triad threads grouped by student | ✅ Exists — update |
| `/dashboard/teacher/reviews` | Reviews received + response | ✅ Exists |
| `/dashboard/teacher/coupons` | Promo codes | ✅ Exists |
| `/dashboard/teacher/settings` | Bio, subjects, availability, payout | ⚠️ Partial |

---

## 5. Admin dashboard

### `/dashboard/admin/overview` layout

1. Platform metrics — total users, WAU, GMV, commission earned
2. Verification queue snippet
3. Pending payouts count
4. Moderation queue count (open `moderation_events`)
5. DAU chart (30d)

### Subpages

| Route | Purpose | Status |
|---|---|---|
| `/dashboard/admin/overview` | Home | ❌ New |
| `/dashboard/admin/verification` | Teacher verification queue | ✅ Exists |
| `/dashboard/admin/payouts` | Payout processing | ✅ Exists |
| `/dashboard/admin/users` | Search, role changes, ban | ❌ New |
| `/dashboard/admin/moderation` | Message + session violation queue | ❌ New |
| `/dashboard/admin/transactions` | Reconciliation (SMS / Flutterwave) | ❌ New |
| `/dashboard/admin/broadcasts` | WhatsApp announcements via AILead | ❌ New |
| `/dashboard/admin/analytics` | GMV, retention, conversion | ❌ New |

**Access control**: `profiles.role = 'admin'` gate via middleware.

---

## 6. School admin dashboard

**Deferred post-MVP.** Target: Phase 8 once we have 1-2 school customers to shadow.

Skeleton routes planned (not built):
- `/dashboard/school/overview`, `/teachers`, `/classes`, `/students`, `/billing`, `/settings`
- Access: `role = 'school_admin'` AND `schools.admin_user_id = auth.uid()`

---

## 7. Component inventory

| Component | Used by | Status |
|---|---|---|
| `AvatarSwitcher` | Parent nav | New |
| `RoleSidebar` (mode-aware) | All | Refactor |
| `LearnerCard` | Parent overview | New |
| `UpcomingSessionList` | Parent + Teacher + Kid | New |
| `ContinueWatchingRail` | Parent + Kid | New |
| `MetricsStrip` | Teacher + Admin + School | New |
| `EarningsChart` | Teacher + Admin | New |
| `VerificationQueueItem` | Admin | Exists |
| `TransactionRow` | Parent spending + Admin | Exists (just built) |
| `KidModeGate` (middleware helper) | Kid routes | New |
| `ModerationEventCard` | Admin moderation | New |
| `ThreadBubble` (with sender label) | Triad messaging | Refactor |
| `ViolationBadge` | Teacher dashboard | New |

---

## 8. Data model additions

### New columns / tables (aggregate of sections)

```sql
-- Active learner selection (durable fallback to cookie)
alter table profiles add column if not exists active_learner_id
  uuid references learner_profiles(id) on delete set null;

-- Announcements
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  target_role user_role, -- null = all
  published_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Messaging moderation (see §3B)
alter table messages add column if not exists moderation_status text
  default 'clean' check (moderation_status in ('clean', 'blocked', 'flagged'));
alter table messages add column if not exists blocked_reason text;

create table if not exists message_moderation_log (...);
alter table message_threads add column if not exists learner_id uuid
  references learner_profiles(id);

-- Session moderation (see §10)
create table session_moderation (...);
create table moderation_events (...);
```

### Middleware additions

Single `middleware.ts` handles:

1. `role === 'parent'` and `ev_active_learner_id` cookie set → rewrite `/dashboard/parent/*` to `/k/[learner_id]/*` equivalents where applicable.
2. `role !== 'admin'` and path starts with `/dashboard/admin` → redirect to `/dashboard/<actual-role>`.
3. Similar gates for `/dashboard/school/*` and `/dashboard/teacher/*`.
4. Kid routes check `active_learner_id` belongs to current user's kids.

---

## 9. Phased build order

### Phase A — Parent + Kid + Messaging (MVP critical)
Week 1 scope:
- `AvatarSwitcher` + profile switcher API (`POST /api/profile/switch`)
- `active_learner_id` column + RLS
- Middleware for mode switching
- Kid routes `/k/[learner_id]/*`
- Parent home rebuild using new components (LearnerCard, UpcomingSessionList, ContinueWatchingRail)
- Messages triad model + regex moderation + `message_moderation_log`
- Parent children CRUD page

### Phase B — Teacher dashboard (fill gaps)
Week 2:
- `/dashboard/teacher/overview` (home)
- `/dashboard/teacher/schedule` (calendar + availability)
- `/dashboard/teacher/students` (per-class roster)
- Connect earnings to real transaction data

### Phase C — Admin dashboard
Week 3:
- `/dashboard/admin/overview` (home + metrics)
- `/dashboard/admin/users` (search, role change, ban)
- `/dashboard/admin/moderation` (§10 queue UI)
- `/dashboard/admin/analytics` (GMV, retention)

### Phase D — Session moderation pipeline (§10)
Week 3-4 (parallel to Phase C):
- `session_moderation` + `moderation_events` tables
- Vercel cron `/api/moderation/process-queue` every 5 min
- Whisper API integration
- Claude Haiku regex + semantic analysis
- Parent + teacher + admin notifications
- Auto-suspend logic for Tier 1

### Phase E — School admin (post-MVP)
Phase 8+, deferred.

---

## 10. Live session moderation

### Approach: post-session analysis (cost + latency justify over real-time)

Pipeline: LiveKit egress webhook → R2 recording → Vercel cron picks up unprocessed → Whisper transcription → regex + Claude Haiku analysis → `session_moderation` + `moderation_events` → notifications + auto-actions.

### Violation tiers

**Tier 1 (auto-suspend teacher pending admin review):**
- Contact info shared (spoken or written in-session chat)
- Personal meeting suggested
- Off-platform payment redirect
- Social handle shared

**Tier 2 (parent + admin notified, manual review):**
- Profanity
- Sexual content
- Harassment / intimidation
- Discrimination

**Tier 3 (informational — teacher quality metrics):**
- Excessive off-topic
- Long silences
- Student early-leave

### Notifications

- Parent: Tier 1 → urgent WhatsApp + email. Tier 2 → WhatsApp + email. Tier 3 → not surfaced.
- Teacher: any Tier 1 or 2 → dashboard banner + session start disabled until review clears.
- Admin: Tier 1 → urgent WhatsApp + dashboard badge. Tier 2 → dashboard badge.

### Admin UI (`/dashboard/admin/moderation`)

- Queue sorted by tier/severity
- Per-event: waveform scrubber at `timestamp_sec`, inline excerpt player, full transcript expandable, Claude analysis, action dropdown (dismiss / warning / suspend / escalate / refund)

### Tech stack

- Transcription: OpenAI Whisper API (`whisper-1`) — $0.006/min. Self-host whisper.cpp at 1000+ min/day threshold.
- Diarization: Whisper v3 turbo or `pyannote-audio` post-processing.
- Regex: shared module with chat moderation (single source of truth).
- LLM: Claude Haiku 4.5 (`ANTHROPIC_API_KEY` already configured).
- Queue: Supabase table polling via Vercel Cron. Graduate to Vercel Queues at volume.

### MVP cost

- ~$0.27 per 45-min session (Whisper + Claude).
- At 100 sessions/day: $27/day, $810/month.
- ~10% of gross margin — acceptable for trust-building MVP.

---

## Acceptance criteria (all phases)

- [ ] Parent can switch to kid mode in ≤2 clicks
- [ ] Kid mode blocks all parent-only routes (redirect with toast)
- [ ] Messaging blocks phone/email/social attempts from kid AND parent AND teacher
- [ ] Messages moderation logs every block attempt for admin review
- [ ] Session recording triggers moderation within 10 min of end
- [ ] Parent receives notification for any Tier 1/2 session violation
- [ ] Teacher cannot start new sessions while flagged Tier 1 session is pending admin review
- [ ] Admin can dismiss / warn / suspend from a single moderation queue page
- [ ] No attachments possible in DMs (upload rejected at API boundary)
- [ ] All i18n strings exist in both `fr.json` and `en.json` — no hardcoded French

---

## Out of scope (explicit)

- Real-time audio moderation during live classes
- Video frame analysis for inappropriate visuals
- ML-based teacher quality score
- Kid-to-kid messaging
- Parent-to-parent messaging
- Self-service school admin signup
- Automated teacher suspension appeal UI (manual email workflow for MVP)
- Voice notes in DMs (text-only MVP)
- External link previews
- Group chats / class forums

---

## References

- Outschool learner mode: https://support.outschool.com/en/articles/learner-accounts
- Outschool messaging rules: https://support.outschool.com/en/articles/messaging
- LiveKit egress + recording: https://docs.livekit.io/egress/
- Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- CLAUDE.md principle 8 (contact blocking) + principle 9 (AI twin recording pipeline)
