# Phase 3: Group Classes + Pre-Recorded Courses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers earn from three revenue streams: 1-on-1 tutoring (Phase 2), group classes, and pre-recorded courses. Students can watch video lessons with progress tracking.

**Architecture:** Group classes reuse the `live_classes` table (format=group). Courses use `courses` + `lessons` tables. Video uploads go to Supabase Storage (Cloudflare Stream later). Lesson progress tracked in new `lesson_progress` table. Same bootstrap payment for all purchases.

**Tech Stack:** Supabase Storage for video, HTML5 video player, existing stack

**Project root:** `/mnt/c/Ecoleversity`
**Depends on:** Phase 2 complete (booking, payments, Jitsi, ratings)

---

## Task List

### Task 13: Group Class Creation + Catalog + Booking + Waitlist

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/classes/page.tsx` — teacher's classes list
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/classes/new/page.tsx` — create class
- Create: `src/components/teacher/group-class-form.tsx` — form (title, subject, grade, max students, price, datetime, duration, recurrence)
- Create: `src/app/api/classes/create/route.ts`
- Create: `src/app/[locale]/(marketplace)/classes/page.tsx` — catalog
- Create: `src/components/class/class-catalog.tsx` — filters + grid
- Create: `src/components/class/class-card.tsx` — spots remaining indicator
- Create: `src/app/[locale]/(marketplace)/classes/[id]/page.tsx` — detail + enroll
- Create: `src/components/class/enroll-form.tsx` — child selector + payment redirect
- Create: `src/app/api/classes/enroll/route.ts` — spots check, auto-waitlist
- Create: `src/components/class/waitlist-button.tsx` — join + position display
- Create: `src/app/api/classes/waitlist/route.ts` — POST/GET

- [ ] **Step 1:** Build group class form — title, description, subject (from teacher's), grade, max students (2-15), price (FCFA), datetime picker, duration (30/60/90), recurrence (one-time/weekly). Weekly auto-creates 4 sessions. API creates live_classes with format=group + jitsi_room_id.

- [ ] **Step 2:** Build teacher classes list — upcoming/past tabs, enrollment counts per class, edit/cancel actions.

- [ ] **Step 3:** Build class catalog — filters (subject, grade), results grid with class cards. Each card: title, teacher, date/time, price, spots bar ("3/10 places"), enroll button (or "Liste d'attente" if full).

- [ ] **Step 4:** Build class detail + enrollment — full class info, teacher link, child selector. API checks spots (enrollment count < max_students). If full: auto-waitlist (return position). If available: create enrollment + pending transaction → redirect to payment.

- [ ] **Step 5:** Build waitlist — join API, position display, 30s polling for spot availability. When spot opens: next person auto-enrolled or notified.

- [ ] **Step 6:** Add i18n under `groupClass.*`. Build, commit.

---

### Task 14: Pre-Recorded Course Creation + Lesson Management

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/courses/page.tsx` — courses list (draft/published/archived)
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/courses/new/page.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/teacher/courses/[id]/page.tsx` — edit + manage lessons
- Create: `src/components/teacher/course-form.tsx` — course metadata form
- Create: `src/components/teacher/lesson-manager.tsx` — add/edit/reorder lessons
- Create: `src/components/teacher/course-actions.tsx` — publish/archive/delete
- Create: `src/app/api/courses/create/route.ts`, `src/app/api/courses/[id]/route.ts`
- Create: `src/app/api/lessons/route.ts`, `src/app/api/lessons/reorder/route.ts`

- [ ] **Step 1:** Build course form — title, description, subject, grade, target exam (optional), language (fr/en), price, thumbnail upload (Supabase Storage). Starts as draft.

- [ ] **Step 2:** Build lesson manager — list lessons with up/down reorder. Add lesson: title, video upload (progress bar), PDF attachment (optional), is_preview checkbox. Videos to Supabase Storage "course-videos" bucket. Auto-detect duration from video metadata.

- [ ] **Step 3:** Build publish validation — requires: title, description, price, at least 1 lesson with video. Publish changes status to 'published'. Archive hides from catalog.

- [ ] **Step 4:** Build API routes — CRUD for courses and lessons, reorder endpoint updates sort_order.

- [ ] **Step 5:** Add i18n under `course.*`. Build, commit.

---

### Task 15: Course Catalog + Detail Page + Enrollment

**Files:**
- Create: `src/app/[locale]/(marketplace)/courses/page.tsx` — catalog
- Create: `src/components/course/course-catalog.tsx` — filters + sort + grid
- Create: `src/components/course/course-card.tsx` — thumbnail, rating, price, lesson count
- Create: `src/app/[locale]/(marketplace)/courses/[id]/page.tsx` — detail
- Create: `src/components/course/enroll-button.tsx` — child selector + payment redirect
- Create: `src/app/api/courses/enroll/route.ts`

- [ ] **Step 1:** Build course catalog — filters (subject, grade, exam type), sort (popularity, rating, price, newest), grid (1/2/3 cols). Course card: thumbnail (or gradient placeholder), title, teacher, badges, rating, price, lesson count, duration.

- [ ] **Step 2:** Build course detail — hero section, price sidebar with enroll button, description, lesson syllabus (numbered, with duration, preview badge), teacher card, reviews, stats. Preview lessons watchable without enrollment.

- [ ] **Step 3:** Build enrollment — child selector, create enrollment + transaction → redirect to payment. If already enrolled: show "Continuer le cours" button.

- [ ] **Step 4:** Add i18n under `courseCatalog.*`. Build, commit.

---

### Task 16: Video Player + Progress Tracking

**Files:**
- Create: `supabase/migrations/00004_lesson_progress.sql` — lesson_progress table
- Create: `src/app/[locale]/(learning)/course/[id]/page.tsx` — course player (redirect to last lesson)
- Create: `src/app/[locale]/(learning)/course/[id]/lesson/[lessonId]/page.tsx`
- Create: `src/components/course/course-player.tsx` — sidebar + video layout
- Create: `src/components/course/video-player.tsx` — HTML5 player with auto-complete
- Create: `src/components/course/lesson-sidebar.tsx` — lesson list with checkmarks
- Create: `src/app/api/courses/progress/route.ts`
- Create: `src/app/[locale]/(dashboard)/dashboard/parent/courses/page.tsx` — enrolled courses + progress

- [ ] **Step 1:** Create lesson_progress migration — enrollment_id + lesson_id (unique), completed boolean, watch_position_seconds, completed_at. RLS for parents and teachers.

- [ ] **Step 2:** Build video player — HTML5 `<video>` with native controls. Track progress: auto-mark complete at 90% duration. Save position to localStorage for resume. Signed URLs for Supabase Storage videos.

- [ ] **Step 3:** Build lesson sidebar — ordered list with numbers, titles, duration, completed checkmarks. Progress bar header. Current lesson highlighted. Certificate button at 100%.

- [ ] **Step 4:** Build course player layout — mobile: video top, sidebar bottom. Desktop: sidebar left, video right. Navigation: prev/next lesson buttons. Manual "Marquer comme terminée" button.

- [ ] **Step 5:** Build progress API — POST marks lesson complete, recalculates enrollment progress_pct, sets completed_at when 100%.

- [ ] **Step 6:** Build parent courses page — enrolled courses per child with progress bars, "Continuer" button.

- [ ] **Step 7:** Add i18n under `player.*`. Build, commit.

---

### Checkpoint: Phase 3 Complete
- [ ] All builds pass
- [ ] Group class creates, fills, runs on Jitsi with multiple students
- [ ] Pre-recorded course: create → upload video → publish → enroll → watch → progress tracked → complete
- [ ] Waitlist works when class full
