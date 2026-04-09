# Phase 4: Communication + Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-app messaging with contact detection, WhatsApp + email + push notifications with cascade logic, notification preferences.

**Architecture:** Messaging uses `conversations` + `messages` tables with Supabase Realtime for live updates. Contact detection is regex-based (AI moderation added in Phase 5). Notification cascade: WhatsApp (360dialog) → email (Resend) → push (Web Push API). User preferences stored in `notification_preferences` table.

**Tech Stack:** Supabase Realtime, Resend, 360dialog WhatsApp API, Web Push (VAPID), existing stack

**Project root:** `/mnt/c/Ecoleversity`
**Depends on:** Phase 3 complete (group classes, courses, video player)

---

## Task List

### Task 17: In-App Messaging + Contact Detection

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/messages/page.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/messages/page.tsx`
- Create: `src/components/messaging/inbox.tsx` — split panel (conversation list + chat thread)
- Create: `src/components/messaging/conversation-list.tsx` — Supabase Realtime subscription
- Create: `src/components/messaging/chat-thread.tsx` — message bubbles + date separators
- Create: `src/components/messaging/message-input.tsx` — text + file (no images) + send
- Create: `src/components/messaging/send-message-button.tsx` — on teacher profile
- Create: `src/lib/contact-detector.ts` — regex detection
- Create: `src/app/api/conversations/route.ts` — GET list, POST create (teacher+parent only)
- Create: `src/app/api/messages/route.ts` — GET paginated, POST with contact detection

- [ ] **Step 1:** Build contact detector — regex patterns for: Ivorian phones (07/05/01 patterns, +225), international phones, 8+ digit sequences, email addresses, social media keywords (whatsapp/telegram/facebook/instagram), @handles, URLs, French phrases ("appelez-moi", "mon numéro"). Returns `{ isClean, flaggedPatterns, sanitizedContent }`.

- [ ] **Step 2:** Build conversation API — POST creates conversation enforcing teacher+parent invariant (reject same-role, reject learner profiles). Reuse existing conversation if found. GET lists conversations with last message + unread count.

- [ ] **Step 3:** Build message API — POST runs contact detection before saving. If flagged: set content_flagged=true, save sanitized content, return warning. GET returns paginated messages, marks as read.

- [ ] **Step 4:** Build inbox UI — split panel: conversation list (left/full on mobile) + chat thread (right/full on mobile). Supabase Realtime subscriptions on conversations and messages tables. File attachments: PDF/DOC/TXT only (no images — explicitly block). Upload to "message-attachments" bucket.

- [ ] **Step 5:** Add "Envoyer un message" button to teacher profile page — creates/opens conversation, redirects to inbox.

- [ ] **Step 6:** Add i18n under `messaging.*`. Build, commit.

---

### Task 18: Email + Push Notifications

**Files:**
- Create: `src/lib/notifications/types.ts` — 12 event types
- Create: `src/lib/notifications/service.ts` — central dispatcher
- Create: `src/lib/notifications/email.ts` — Resend client + templates
- Create: `src/lib/notifications/email-templates.ts` — 8 HTML email templates
- Create: `src/lib/notifications/push.ts` — Web Push with VAPID
- Create: `supabase/migrations/00005_push_subscriptions.sql`
- Create: `src/app/api/notifications/push/subscribe/route.ts`
- Create: `src/app/api/notifications/push/unsubscribe/route.ts`
- Create: `src/components/common/push-prompt.tsx` — opt-in banner
- Modify: `public/sw.js` — push + notificationclick handlers
- Modify: 5 existing API routes to fire notifications

- [ ] **Step 1:** Install `resend` and `web-push`. Create notification types (12 events: booking_confirmed, payment_confirmed, session_reminder_24h/15min, new_message, teacher_verified/rejected, new_enrollment, new_review, payout_processed, new_follower, new_class_from_followed).

- [ ] **Step 2:** Build email service — Resend client, 8 templates (booking, payment, reminder, new message, teacher verified/rejected, review, payout). French by default. Mobile-friendly HTML with emerald CTA buttons.

- [ ] **Step 3:** Build push service — Web Push with VAPID keys. Push subscriptions table + migration + RLS. Subscribe/unsubscribe API routes. Service worker handlers for push + notificationclick.

- [ ] **Step 4:** Build central dispatcher — `sendNotification(payload)` fires email + push in parallel. Async (never blocks API responses).

- [ ] **Step 5:** Build push opt-in prompt — banner on dashboard pages. Request permission on accept, save subscription. localStorage to not re-prompt.

- [ ] **Step 6:** Wire into existing API routes: sms-confirm (payment_confirmed), admin-confirm (payment_confirmed), verify-teacher (verified/rejected), messages POST (new_message), reviews POST (new_review).

- [ ] **Step 7:** Update .env.example with RESEND_API_KEY, VAPID keys. Add i18n under `notifications.*`. Build, commit.

---

### Task 19: WhatsApp + Notification Cascade + Preferences

**Files:**
- Create: `src/lib/notifications/whatsapp.ts` — 360dialog API integration
- Create: `src/lib/notifications/cascade.ts` — cascade logic + quiet hours
- Create: `supabase/migrations/00006_notification_preferences.sql`
- Create: `src/app/[locale]/(dashboard)/dashboard/settings/notifications/page.tsx`
- Create: `src/components/settings/notification-settings.tsx` — channel toggles + quiet hours
- Modify: `src/lib/notifications/service.ts` — add cascade logic

- [ ] **Step 1:** Build WhatsApp integration — 360dialog API (POST /messages with template messages). 7 templates: booking_confirmed, payment_confirmed, session_reminder, new_message, teacher_verified, payout_processed. Graceful fallback if API key not set.

- [ ] **Step 2:** Create notification_preferences migration — user preferences for channel toggles (whatsapp/email/push enabled), preferred_channel ('whatsapp'/'email'/'push'), quiet hours (start/end time). RLS for self-manage.

- [ ] **Step 3:** Build notification settings page — radio buttons for preferred channel, toggle switches for each channel, time pickers for quiet hours. Upsert to database.

- [ ] **Step 4:** Build cascade logic — `getUserPreferences()` (fetch or create defaults), `isInQuietHours()` (Africa/Abidjan timezone), `executeCascade()`: preferred channel first → fallback on failure → push always in parallel. Critical events (payment, session starting) bypass quiet hours.

- [ ] **Step 5:** Rewrite `sendNotification()` to use cascade: fetch prefs → check quiet hours → try preferred channel → fallback → push always.

- [ ] **Step 6:** Add settings link to all dashboard sidebars. Update .env.example with WHATSAPP_API_KEY. Add i18n under `settings.*`. Build, commit.

---

### Checkpoint: Phase 4 Complete
- [ ] All builds pass
- [ ] Messaging works with real-time updates, contact detection blocks phone numbers
- [ ] Email notifications sent for bookings, payments, messages
- [ ] Push notifications work on Android Chrome
- [ ] WhatsApp integration ready (works when API key configured)
- [ ] Notification preferences page saves and cascade respects them
