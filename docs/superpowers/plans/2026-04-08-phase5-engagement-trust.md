# Phase 5: Engagement + Trust — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exam prep, referrals, AI chatbot support, help center, certificates, teacher tools (coupons, away mode, strike system), content reporting, satisfaction guarantee, calendar sync, and parental progress dashboard. Everything that builds trust and retention.

**Architecture:** All features integrate with existing Supabase schema (tables already created in Phase 1). AI chatbot "Ama" uses Claude API with RAG over help articles. Certificate generation uses server-side PDF rendering. Wallet system enables referral credits and refund credits.

**Tech Stack:** Claude API (Anthropic SDK), @react-pdf/renderer or jspdf for certificates, ics (npm) for calendar feeds, existing Supabase + Next.js stack.

**Project root:** `/mnt/c/Ecoleversity`

---

## Task List

### Task 26: Exam Prep Hub + Practice Tests

**Files:**
- Create: `src/app/[locale]/(marketplace)/exams/page.tsx` — Exam prep landing page
- Create: `src/app/[locale]/(marketplace)/exams/[examType]/page.tsx` — Per-exam page (CEPE/BEPC/BAC/CONCOURS_6EME)
- Create: `src/components/exam/exam-hub.tsx` — Exam selection cards
- Create: `src/components/exam/practice-test.tsx` — Timed quiz component
- Create: `src/app/api/exams/questions/route.ts` — Fetch questions
- Create: `src/app/api/exams/submit/route.ts` — Score submission
- Create: `supabase/migrations/00007_exam_prep.sql` — exam_questions, exam_attempts tables

- [ ] **Step 1:** Create migration for exam_questions (id, exam_type, subject, question_text, options jsonb, correct_answer, explanation, difficulty, created_at) and exam_attempts (id, learner_id, exam_type, subject, score, total_questions, duration_seconds, answers jsonb, created_at). Add RLS.

- [ ] **Step 2:** Build exam hub page — 4 exam cards (CEPE, BEPC, BAC, Concours 6ème) with descriptions, icons, subject lists per exam. Link to per-exam page.

- [ ] **Step 3:** Build per-exam page — shows subjects available for that exam, past attempts with scores, "Commencer un test" button per subject.

- [ ] **Step 4:** Build practice test component — timer (configurable duration), multiple-choice questions, progress indicator, submit button. On submit: score calculation, show results with correct answers + explanations, save attempt.

- [ ] **Step 5:** Build API routes for fetching random questions (by exam + subject, limit 20) and submitting scored attempts.

- [ ] **Step 6:** Add i18n keys under `exam.*` namespace. Build, commit.

### Checkpoint: After Task 26
- [ ] Build passes
- [ ] Exam hub shows 4 exams, practice test runs with timer

---

### Task 27: Platform Wallet + Referral Program

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/wallet/page.tsx`
- Create: `src/components/wallet/wallet-dashboard.tsx`
- Create: `src/components/wallet/referral-card.tsx`
- Create: `src/app/api/wallet/route.ts` — GET balance, POST debit
- Create: `src/app/api/referrals/route.ts` — create referral, check code, credit
- Create: `src/lib/referral.ts` — generate referral codes, validation

- [ ] **Step 1:** Build wallet dashboard — shows balance, transaction history (refund credits, referral credits, purchase debits). Auto-create wallet on first visit if not exists.

- [ ] **Step 2:** Build referral system — each user gets a unique referral code (stored in profiles or generated from user ID). Share link: `ecoleversity.com/r/CODE`. When referred user registers + books first class, both get 1,000 FCFA wallet credit.

- [ ] **Step 3:** Build referral card component — shows user's referral code, copy button, share via WhatsApp button, count of successful referrals, total earned.

- [ ] **Step 4:** Update booking/enrollment payment flow — check wallet balance first, allow partial payment from wallet (reduce amount owed).

- [ ] **Step 5:** Add i18n keys under `wallet.*` and `referral.*`. Build, commit.

---

### Task 28: AI Chatbot "Ama" + Help Center

**Files:**
- Create: `src/app/[locale]/(static)/help/page.tsx` — Help center
- Create: `src/app/[locale]/(static)/support/page.tsx` — Ama chatbot page
- Create: `src/components/support/ama-chatbot.tsx` — Chat widget
- Create: `src/components/support/help-article-list.tsx`
- Create: `src/components/support/help-article.tsx`
- Create: `src/app/api/support/chat/route.ts` — Ama conversation API
- Create: `src/app/api/support/tickets/route.ts` — Ticket CRUD
- Create: `src/app/api/help/route.ts` — Search help articles
- Create: `src/lib/ai/support-bot.ts` — Claude API integration for Ama
- Create: `supabase/migrations/00008_seed_help_articles.sql` — 20+ FAQ articles

- [ ] **Step 1:** Seed 20+ help articles in French (10 parent, 10 teacher) covering: registration, payment with Orange Money/Wave, booking sessions, using Jitsi, receiving payouts, refund policy, safety, reporting. Insert via migration.

- [ ] **Step 2:** Build help center page — searchable article list (Supabase full-text search on `search_vector`), category filter tabs (parent/teacher/payment/technical). Article detail view with markdown rendering.

- [ ] **Step 3:** Build Ama chatbot — Claude API with system prompt: "Tu es Ama, l'assistante d'EcoleVersity. Tu aides les parents et enseignants en français. Tu connais les politiques de la plateforme." RAG: fetch relevant help articles based on user question, include in context. Conversation UI: chat bubbles, quick-reply suggestions, typing indicator.

- [ ] **Step 4:** Build escalation: after 3 exchanges without resolution, Ama offers "Créer un ticket de support". Creates support_ticket with conversation history. Admin sees tickets in dashboard.

- [ ] **Step 5:** Build admin ticket management — `src/app/[locale]/(dashboard)/dashboard/admin/tickets/page.tsx`. List open tickets with priority badges, SLA timers, resolve/close buttons. Add to admin sidebar.

- [ ] **Step 6:** Build floating Ama widget — small chat bubble icon fixed bottom-right on all pages. Opens Ama in a slide-up panel. Available to logged-in users.

- [ ] **Step 7:** Add i18n keys under `help.*`, `ama.*`, `ticket.*`. Install `@anthropic-ai/sdk`. Build, commit.

---

### Task 29: Certificate Generation

**Files:**
- Create: `src/app/api/certificates/generate/route.ts`
- Create: `src/lib/certificate.ts` — PDF generation
- Create: `src/components/course/certificate-button.tsx`

- [ ] **Step 1:** Install `jspdf` for server-side PDF generation.

- [ ] **Step 2:** Build certificate template — landscape A4 PDF with: EcoleVersity logo (text), "Certificat de réussite", student name, course title, teacher name, completion date, QR code (URL to verify: `/verify/CERT-ID`), decorative border.

- [ ] **Step 3:** Build API route — generates PDF, uploads to Supabase Storage, saves URL to `enrollments.certificate_url`, returns download URL.

- [ ] **Step 4:** Add certificate button to course player (visible when progress = 100%). Add i18n. Build, commit.

---

### Task 30: Teacher Coupons + Away Mode

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/coupons/page.tsx`
- Create: `src/components/teacher/coupon-manager.tsx`
- Create: `src/components/teacher/away-mode-toggle.tsx`
- Create: `src/app/api/coupons/route.ts`

- [ ] **Step 1:** Build coupon management — teacher creates coupons (code, discount %, max uses, expiry, applies to all or specific course/class). List active coupons with usage stats. Delete expired.

- [ ] **Step 2:** Wire coupons into enrollment/booking — input field "Code promo" on payment page. Validate coupon, apply discount, show new price.

- [ ] **Step 3:** Build away mode — toggle on teacher dashboard. Sets `is_away=true`, `away_until` date, `away_message`. Auto-response in messaging when teacher is away. Badge on teacher profile: "Absent jusqu'au X".

- [ ] **Step 4:** Add i18n. Build, commit.

---

### Task 31: Content Reporting + Strike System

**Files:**
- Create: `src/components/common/report-button.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/admin/reports/page.tsx`
- Create: `src/components/admin/report-queue.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/admin/strikes/page.tsx`
- Create: `src/components/admin/strike-manager.tsx`
- Create: `src/app/api/reports/route.ts`
- Create: `src/app/api/admin/strikes/route.ts`

- [ ] **Step 1:** Build report button — "Signaler" dropdown with categories (inappropriate, safety, spam, off-platform, other). Optional description textarea. Creates content_report record. Reusable: add to teacher profiles, class cards, course pages, reviews, messages.

- [ ] **Step 2:** Build admin report queue — list pending reports with reporter info, reported content preview, category badge, timestamp. Actions: review (mark as reviewed), take action (issue strike, remove content), dismiss.

- [ ] **Step 3:** Build strike manager — issue strikes to teachers (warning/strike1/strike2/strike3). Show teacher's strike history. Strike consequences enforced: strike1 = 7-day restriction (can't create new classes), strike2 = 30-day restriction, strike3 = permanent ban. Auto-expire after 6 months.

- [ ] **Step 4:** Build satisfaction guarantee — "Promesse EcoleVersity" page. Parent can request 50% wallet credit if unsatisfied (2x/year limit). Creates support ticket for admin review.

- [ ] **Step 5:** Add i18n. Build, commit.

---

### Task 32: Calendar Integration + Parental Dashboard

**Files:**
- Create: `src/app/api/calendar/feed/route.ts` — iCal feed
- Create: `src/components/common/calendar-sync.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/overview/page.tsx`
- Create: `src/components/parent/progress-overview.tsx`

- [ ] **Step 1:** Install `ics` npm package. Build calendar feed API — generates .ics file with all user's upcoming sessions/classes. Dynamic URL per user with auth token. Works with Google Calendar and Apple Calendar subscription.

- [ ] **Step 2:** Build calendar sync component — "Synchroniser avec mon calendrier" button. Shows Google Calendar add link and .ics download. Add to session and class pages.

- [ ] **Step 3:** Build parental overview dashboard — comprehensive view of ALL children: per-child cards with enrolled courses (progress bars), upcoming sessions, recent grades on assignments, spending this month. Make this the default parent dashboard landing.

- [ ] **Step 4:** Add i18n. Build, commit.

---

### Checkpoint: After Tasks 26-32
- [ ] All builds pass
- [ ] Exam prep hub with practice tests
- [ ] Wallet + referral system working
- [ ] Ama chatbot answering questions in French
- [ ] Certificates generate on course completion
- [ ] Teacher coupons apply at checkout
- [ ] Report button visible on all content
- [ ] Calendar feed subscribable
- [ ] Parental dashboard shows all children

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API costs for Ama | Medium | Use Haiku model for chat, limit to 10 turns per session |
| PDF generation in serverless | Low | jspdf works in Node.js serverless; keep PDFs simple |
| Calendar feed auth | Medium | Use signed URL with user-specific token (not session-based) |
| Exam questions content | High | Seed with 20 questions per exam/subject; admin can add more later |
| Strike system abuse | Medium | Strikes require admin action, not automated; appeals supported |
