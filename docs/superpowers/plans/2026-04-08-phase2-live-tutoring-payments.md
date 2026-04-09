# Phase 2: Live Tutoring + Bootstrap Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The core transaction loop: teacher sets availability → parent finds teacher → books session → pays via Orange Money/Wave → joins Jitsi call → rates teacher → teacher sees earnings → admin processes payout.

**Architecture:** Teacher availability stored in dedicated table with day/time slots. Booking creates live_classes (format=one_on_one) + enrollment + pending transaction. Two payment paths: (1) Bootstrap mobile money — parent sends money to platform's personal Orange Money/Wave number, SMS scraping auto-confirms. (2) International credit card — Flutterwave inline checkout for diaspora parents in EUR/USD. Jitsi Meet for video calls. Rating recalculates teacher average.

**Tech Stack:** Supabase, Jitsi Meet External API, Flutterwave (flutterwave-react-v3), existing Next.js stack

**Project root:** `/mnt/c/Ecoleversity`
**Depends on:** Phase 1 complete (auth, schema, i18n, onboarding, admin dashboard)

---

## Task List

### Task 7: Teacher Availability + Public Profile Page

**Files:**
- Create: `supabase/migrations/00003_teacher_availability.sql` — availability table with day_of_week (0-6), start_time, end_time, RLS
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/availability/page.tsx`
- Create: `src/components/teacher/availability-grid.tsx` — interactive weekly grid (desktop: 7-col, mobile: day tabs)
- Create: `src/app/[locale]/(marketplace)/teachers/[id]/page.tsx` — public teacher profile
- Create: `src/components/teacher/teacher-profile-header.tsx` — avatar, name, badges, rating
- Create: `src/components/teacher/availability-display.tsx` — read-only weekly availability
- Create: `src/components/teacher/follow-button.tsx` — toggle follow/unfollow

- [ ] **Step 1:** Create teacher_availability migration — table with day_of_week (int 0-6), start_time, end_time (time type), is_active boolean, CHECK constraint (start < end), RLS for teacher self-manage + public read.

- [ ] **Step 2:** Build availability grid — interactive 30-min increments from 07:00-21:00 × 7 days. Click to toggle. Desktop: grid layout. Mobile: day tabs with time list. Batch save on "Enregistrer".

- [ ] **Step 3:** Build public teacher profile — server component fetching teacher + availability + reviews. Sections: header (avatar, name, verification badge, rating, follow button), bio, subjects/grades as badges, available slots for next 7 days, recent reviews, "Réserver un cours" CTA.

- [ ] **Step 4:** Build follow button — optimistic toggle, updates teacher_followers + follower_count.

- [ ] **Step 5:** Add i18n keys under `teacher.*` and `days.*`. Build, commit.

---

### Task 8: Teacher Catalog + Search

**Files:**
- Create: `src/app/[locale]/(marketplace)/teachers/page.tsx`
- Create: `src/components/teacher/teacher-catalog.tsx` — filters + grid
- Create: `src/components/teacher/teacher-card.tsx` — compact card
- Create: `src/app/api/teachers/search/route.ts`

- [ ] **Step 1:** Build API route — GET with query params (subject, grade, city, q). Query teacher_profiles joined with profiles, filter verified only, subjects array contains, city match, ilike text search. Order by rating_avg DESC.

- [ ] **Step 2:** Build catalog page — server component applies filters from searchParams. Client component renders filter panel (subject, grade, city dropdowns — Shadcn Select) + results grid (1/2/3 cols responsive). Mobile: filters in Sheet.

- [ ] **Step 3:** Build teacher card — avatar (initials fallback), name, city, verification badge, rating stars, first 3 subjects as badges, "Voir le profil" link.

- [ ] **Step 4:** Add i18n keys under `catalog.*`. Build, commit.

---

### Task 9: Session Booking Flow

**Files:**
- Create: `src/app/[locale]/(marketplace)/teachers/[id]/book/page.tsx`
- Create: `src/components/booking/booking-form.tsx` — 3-step form
- Create: `src/app/api/bookings/create/route.ts`
- Create: `src/lib/booking.ts` — helpers (payment reference, Jitsi room ID, price calc, commission)

- [ ] **Step 1:** Build booking helpers — `generatePaymentReference()` (EV-{timestamp36}-{random4}), `generateJitsiRoomId()` (ecoleversity-{uuid8}), `calculateSessionPrice()` (2000 FCFA/30min, 3500/60min), `calculateCommission()` (20% default).

- [ ] **Step 2:** Build booking form — 3 steps: (1) select date + time slot (next 7 days, filter available - booked conflicts), (2) session details (subject, child, duration 30/60, note), (3) confirm summary + price. On confirm: POST to API.

- [ ] **Step 3:** Build API route — validate teacher verified, slot available, learner belongs to parent. Create live_class (one_on_one, scheduled) + enrollment + transaction (pending). Return transactionId.

- [ ] **Step 4:** Redirect to payment page after booking. Add i18n under `booking.*`. Build, commit.

---

### Task 10: Payment System (Bootstrap Mobile Money + Flutterwave CC)

**Files:**
- Create: `src/app/[locale]/(marketplace)/payment/[transactionId]/page.tsx`
- Create: `src/components/payment/payment-instructions.tsx` — shows Orange Money/Wave numbers
- Create: `src/components/payment/flutterwave-checkout.tsx` — inline CC checkout for diaspora
- Create: `src/app/api/payments/status/[transactionId]/route.ts` — poll status
- Create: `src/app/api/payments/sms-confirm/route.ts` — SMS scraping webhook
- Create: `src/app/api/payments/flutterwave-webhook/route.ts` — Flutterwave webhook
- Create: `src/app/api/payments/admin-confirm/route.ts` — admin manual confirm
- Create: `src/app/[locale]/(dashboard)/dashboard/admin/payments/page.tsx`
- Create: `src/components/admin/pending-payments.tsx`
- Create: `src/lib/payments/bootstrap.ts` — SMS parsing for Orange Money/Wave
- Create: `src/lib/payments/flutterwave.ts` — Flutterwave API helpers

- [ ] **Step 1:** Build payment page with TWO payment paths displayed:
  - **Local (FCFA):** Orange Money + Wave numbers with copy-to-clipboard + reference code
  - **International (EUR/USD):** "Payer par carte bancaire" button → Flutterwave inline checkout
  - Auto-poll status every 15s. 2h expiry timer for bootstrap payments.

- [ ] **Step 2:** Build SMS parsing — regex for Orange Money ("Vous avez recu X FCFA de 07XXX") and Wave ("Transfert recu de X F de 05XXX"). Extract amount, sender, reference.

- [ ] **Step 3:** Build SMS confirm API — POST secured with X-SMS-Secret header. Match reference to pending transaction, verify amount, update to confirmed.

- [ ] **Step 4:** Install `flutterwave-react-v3`. Build Flutterwave inline checkout component — embeds Flutterwave payment widget. Supports EUR, USD, XOF. On success callback: verify with backend. On close: return to payment page.

- [ ] **Step 5:** Build Flutterwave webhook API — POST at `/api/payments/flutterwave-webhook`. Verify webhook signature using FLUTTERWAVE_SECRET_HASH. On success: update transaction to confirmed, convert amount to FCFA (EUR×655.957, USD at market rate), credit teacher balance, trigger notifications.

- [ ] **Step 6:** Build Flutterwave helpers — `verifyFlutterwavePayment(transactionId)` using Flutterwave verification API, `convertToXof(amount, currency)` for EUR/USD→FCFA conversion.

- [ ] **Step 7:** Build admin confirm API + admin pending payments page.

- [ ] **Step 8:** Update .env.example:
  ```
  NEXT_PUBLIC_ORANGE_MONEY_NUMBER=07XXXXXXXX
  NEXT_PUBLIC_WAVE_NUMBER=05XXXXXXXX
  SMS_WEBHOOK_SECRET=your-secret
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
  FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
  FLUTTERWAVE_SECRET_HASH=your-webhook-hash
  ```
  Add i18n under `payment.*` including `payment.payByCard`, `payment.internationalCard`, `payment.processingCard`. Build, commit.

---

### Task 11: Jitsi Integration + Session Page

**Files:**
- Create: `src/lib/video/jitsi.ts` — room URL + embed config
- Create: `src/app/[locale]/(learning)/session/[id]/page.tsx`
- Create: `src/components/session/session-room.tsx` — states: WAITING/READY/LIVE/ENDED
- Create: `src/components/session/jitsi-embed.tsx` — dynamic script load + iframe
- Create: `src/components/session/countdown-timer.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/sessions/page.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/sessions/page.tsx`

- [ ] **Step 1:** Build Jitsi helpers — `getJitsiMeetUrl(roomId)` using free meet.jit.si, embed config with French language, emerald background, curated toolbar.

- [ ] **Step 2:** Build countdown timer — target date prop, 1s interval, onReady callback at zero.

- [ ] **Step 3:** Build Jitsi embed — dynamically load external_api.js, initialize JitsiMeetExternalAPI. Desktop: embedded iframe. Mobile: "Ouvrir dans Jitsi Meet" link (better UX on small screens). Cleanup on unmount.

- [ ] **Step 4:** Build session room — 4 states. WAITING: session info + countdown. READY (within 15 min): join button active. LIVE: Jitsi embedded + elapsed timer. ENDED: completion message + rate prompt (parent) or summary (teacher). Access-gated: only teacher + enrolled parent.

- [ ] **Step 5:** Build parent/teacher upcoming sessions pages — list sessions with join buttons (enabled within 15 min of start). Add to sidebar nav.

- [ ] **Step 6:** Add i18n under `session.*`. Build, commit.

---

### Task 12: Post-Session Rating + Teacher Earnings + Payouts

**Files:**
- Create: `src/app/[locale]/(learning)/session/[id]/rate/page.tsx`
- Create: `src/components/session/rating-form.tsx` — 5-star + comment
- Create: `src/app/api/reviews/create/route.ts`
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/earnings/page.tsx`
- Create: `src/components/teacher/earnings-dashboard.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/admin/payouts/page.tsx`
- Create: `src/components/admin/payout-processor.tsx`
- Create: `src/app/api/admin/process-payout/route.ts`
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/payments/page.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/transactions/page.tsx`

- [ ] **Step 1:** Build rating form — 5 clickable star icons (lucide Star, filled amber on select), optional comment textarea. API validates: parent enrolled, class completed, no duplicate review. Recalculates teacher rating_avg: `new = ((old * count) + rating) / (count + 1)`.

- [ ] **Step 2:** Build teacher earnings dashboard — summary cards (total earned, this month, pending payout), commission note (20%), transaction history table (date, student, amount, status).

- [ ] **Step 3:** Build admin payout processor — list teachers with pending balance (confirmed transactions minus completed payouts). Show payout phone + provider. "Marquer comme payé" button creates teacher_payouts record.

- [ ] **Step 4:** Build parent payment history and teacher transaction history pages.

- [ ] **Step 5:** Add i18n under `rating.*`, `earnings.*`, `payout.*`. Build, commit.

---

### Checkpoint: Phase 2 Complete
- [ ] All builds pass
- [ ] Full loop (local): teacher availability → parent finds → books → pays via Orange Money/Wave → SMS scraping confirms → joins Jitsi → rates → teacher sees earnings → admin pays teacher
- [ ] Full loop (diaspora): parent pays via Flutterwave CC (EUR/USD) → webhook confirms → same flow
- [ ] Both payment paths visible on payment page
