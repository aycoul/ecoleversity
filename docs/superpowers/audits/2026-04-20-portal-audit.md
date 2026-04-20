# Portal Audit — 2026-04-20

Scope: every unauthenticated surface on ecoleversity.com. Ordered by what
a first-time visitor hits.

## Method

Crawled each public page with Playwright on production (commit 18d5abf).
For each page: screenshot, DOM inventory of every `<a>` + `<button>`,
console-error capture, 200/302/404 probe for deep links.

## Pages status

| Page | HTTP | Renders | Notes |
|------|------|---------|-------|
| `/fr` (home) | 200 | ✅ | 8 sections render; issues in hero + popular-courses |
| `/fr/teachers` | 200 | ✅ | 2 teachers shown with real filters |
| `/fr/teachers/[id]` | 200 | ✅ | Deep link works |
| `/fr/classes` | 200 | 🔴 | Shows "Aucun cours" despite 1 real group class in DB |
| `/fr/classes/[id]` | 200 | ✅ | Deep link works |
| `/fr/courses` | 200 | ✅ | Empty, as expected — no pre-recorded courses seeded |
| `/fr/exams` | 200 | ✅ | 4 national + international cards render |
| `/fr/exams/[type]` | 302 | ✅ | Redirects as intended |
| `/fr/login` | 200 | ✅ | WhatsApp + Email OTP paths both render |
| `/fr/register` | 200 | ✅ | Parent/teacher role selector renders |
| `/fr/forgot-password` | 200 | ✅ | |
| `/fr/verify` | 200 | ✅ | |
| `/fr/about` | 200 | ✅ | |
| `/fr/help` | 200 | ✅ | |
| `/fr/support` | 200 | ✅ | |
| `/fr/institutions` | 200 | ✅ | |
| `/fr/terms` | 200 | ✅ | |
| `/fr/privacy` | 200 | ✅ | |

## Findings

### 🔴 Broken

**1. `/fr/classes` hides classes that have already started but are still running.**
The query `scheduled_at > now()` drops the weekly group class whose start
time is 3h in the past even though the class runs on a recurring weekly
cadence. Parents visiting the catalog get "Aucun cours de groupe
disponible" when a real class is bookable.

**2. Home hero "Voir tous les cours" links to `/fr/teachers`.**
Button labeled "cours" (courses) sends user to the teacher directory,
not the course/class catalog. Misroute.

**3. Home popular-courses section: 4 sample cards all link to `/fr/teachers`.**
Users see "Maths — Préparation BEPC" or "Français — Rédaction CE2-CM2"
and expect to land on that course. Instead they land on the generic
teacher list.

**4. Footer social links are placeholders.**
`https://facebook.com`, `https://instagram.com`, `https://wa.me` —
bare root domains, not EcoleVersity profiles. Either remove for now or
point at real accounts.

### 🟡 Awkward

**5. Popular-courses section uses hardcoded French-name mock data.**
"M. Diallo Moussa", "Mme Koné Aminata" aren't real teachers. If a
visitor searches for them later nothing comes up. Medium-term: wire
this section to real popular classes. Short-term: label the section as
"Exemples de cours" so users don't think these are live offerings.

**6. `/fr/teachers` subject tags inconsistent case.**
Prof Koffi shows `mathematics / physics` (lowercase English) while
Prof Test E2E shows `Mathématiques / Physique-Chimie` (French). Data
hygiene — normalize at write time.

**7. Home hero search submits to `/fr/teachers` without the query.**
The "Rechercher" button links to a fixed href, dropping whatever the
user typed.

### 🟢 UX wins (later)

**8. Home has no "Reçu 30 jours gratuit" confirmation after registration.**
The promise appears 4× on the marketing page but never resurfaces in
the onboarding/dashboard flow.

**9. No mobile hamburger menu opens from the top-right `Menu` button.**
Button exists in the nav but clicking does nothing on desktop-rendered
test. Verify on a real 375px viewport.

**10. Locale toggle (FR/EN) in footer is clickable but there's no
translated content for many pages yet.** Consider hiding EN until
translations land.

## Resolutions

<!-- Populated as each 🔴 ships -->
