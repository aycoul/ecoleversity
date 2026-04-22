# EcoleVersity — UI/UX Audit & Recommendations

> Date: 2026-04-21 | Scope: All user roles, all surface areas | Based on code review + Vercel Web Interface Guidelines

---

## Executive Summary

The EcoleVersity UI is **functionally solid and well-architected** — clean component hierarchy, good use of shadcn/ui + Tailwind v4, and thoughtful mobile adaptations (bottom nav for dashboards, app-shell gating). However, there are **systematic UX gaps** that will hurt conversion, retention, and trust — especially on low-bandwidth Android devices in Côte d'Ivoire.

**Top 5 priorities:**
1. Fix mobile viewport collapse from bottom nav + sticky header
2. Add empty-state illustrations and clearer CTAs across dashboards
3. Unify color semantics and reduce visual noise
4. Improve auth form UX (input modes, error placement, loading states)
5. Add critical accessibility fixes (focus management, ARIA, reduced motion)

---

## 1. Global / Cross-Cutting Issues

### 1.1 Mobile Viewport is Crushed
**Files:** `dashboard-shell.tsx`, `header.tsx`, `app-chrome.tsx`

- **Problem:** On mobile dashboards, the sticky header (`h-16`) + bottom tab bar (`~56px`) consume **~112px** of vertical space. On a 720px-tall phone, that's **15% of the screen** gone before any content.
- **Problem:** Kid mode (`/k/`) also shows the **public marketing header** because `AppChrome` strips header for `/dashboard`, `/k/`, `/session/`, etc. — but `/k/` pages inherit the root layout. Actually, `AppChrome` *does* strip it for `/k/`. Verify the `isAppShell` check works with locale prefix.
- **Recommendation:**
  - On app-shell routes, **remove or shrink the top header entirely** — the sidebar/bottom-nav is sufficient navigation.
  - If header must stay, make it `h-12` on mobile and hide the logo image (show text-only brand).
  - Add `pb-16` (bottom padding) to `<main>` globally so content isn't hidden behind the bottom nav. Currently `DashboardShell` does not add this.

### 1.2 No Loading States / Skeletons
**Files:** All `page.tsx` (server components), `layout.tsx`

- **Problem:** Every page is a Server Component that fetches from Supabase. On slow 3G, users see a blank white screen for 2–5 seconds.
- **Recommendation:**
  - Add `loading.tsx` files in each route segment (`(dashboard)/loading.tsx`, `(marketplace)/loading.tsx`).
  - Use simple skeleton blocks matching the stat-card / list layouts. Example:
    ```tsx
    // src/app/[locale]/(dashboard)/loading.tsx
    export default function DashboardLoading() {
      return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      );
    }
    ```

### 1.3 Color Palette Inconsistency
**Files:** `globals.css`, various pages

- **Problem:** You mix three semantic systems:
  - Custom `--ev-blue`, `--ev-amber`, `--ev-green`
  - Tailwind oklch semantic colors (`--primary`, `--secondary`, etc.)
  - Arbitrary Tailwind utilities (`text-amber-900`, `bg-emerald-50`, `border-rose-200`)
- **Impact:** Amber buttons on admin cards use different shades than hero CTAs. Green success states vary between `var(--ev-green)` and `emerald-*`.
- **Recommendation:**
  - Map **every** semantic color to your EV tokens:
    | Semantic | Token | Tailwind fallback |
    |----------|-------|-------------------|
    | Primary | `--ev-blue` | `blue-700` |
    | CTA / Accent | `--ev-amber` | `amber-500` |
    | Success | `--ev-green` | `emerald-500` |
    | Warning | `--ev-amber` | `amber-500` |
    | Danger | `--ev-rose` *(add)* | `rose-600` |
  - Add `--ev-rose` and `--ev-rose-50` to `globals.css`.
  - Audit all `bg-rose-50`, `text-amber-900`, etc. and replace with tokens.

### 1.4 Too Many Rounded Corners
- **Problem:** `radius: 0.625rem` (10px) + `rounded-2xl` (16px) + `rounded-full` creates a "pill overdose." The search bar, CTAs, and featured cards all fight for attention.
- **Recommendation:** Establish a radius scale:
  - **Small:** buttons, inputs, badges → `rounded-lg` (8px)
  - **Medium:** cards, tiles → `rounded-xl` (12px)
  - **Large:** hero images, banners → `rounded-2xl` (16px)
  - **Pill:** only primary CTAs on dark backgrounds

### 1.5 Scroll-to-Top on Route Change Missing
**Files:** `app-chrome.tsx`, root layout

- **Problem:** Soft navigation via Next.js keeps scroll position. A parent clicking from "Overview" to "Children" lands mid-page.
- **Recommendation:** Add a scroll-to-top effect in the root layout or use `useEffect` on pathname change in a client component wrapper.

---

## 2. Landing Page (`page.tsx`)

### 2.1 Hero Search Bar is Non-Functional
**Line 258–274**

- **Problem:** The search input has `readOnly` and just links to `/teachers`. Users type, nothing happens, then they must click the button.
- **Impact:** Feels broken. Users on slow connections may not realize it's a link.
- **Recommendation:**
  - **Option A (better):** Make it a real input that filters subjects/teachers inline or redirects to `/teachers?q=...` on Enter.
  - **Option B:** Remove the input styling and make it a clear button: `<Link href="/teachers" className="...">Rechercher un enseignant <Search /></Link>`

### 2.2 Hero Image Missing `alt`
**Line 309–316**

- **Problem:** `alt=""` on the hero illustration.
- **Recommendation:** Add descriptive alt: `alt="Élève ivoirien suivant un cours en ligne avec un enseignant"`

### 2.3 Featured Cards: Image `alt=""` Everywhere
**Lines 353–359**

- **Problem:** All card images have empty alt text.
- **Recommendation:** Use `alt={card.title}` or `alt={card.badge}` for screen readers.

### 2.4 Services Section: 6 Cards is Too Many
**Lines 420–453**

- **Problem:** 6 service cards create cognitive overload. The grid breaks to 2→3 columns, but on mobile it's a long scroll.
- **Recommendation:**
  - Collapse to **4 core services** (Live Tutoring, Group Class, Exam Prep, On-Demand).
  - Move Courses and Homework Help to a secondary "Et aussi..." section.

### 2.5 Testimonials: Only 2, Hardcoded
**Lines 566–602**

- **Problem:** Only 2 testimonials, both hardcoded. No photos — just initials.
- **Recommendation:**
  - If real testimonials don't exist yet, replace with a **trust bar**: logos of partner schools, student count, teacher count.
  - If keeping quotes, add small circular photos (even stock) — faces build trust.

### 2.6 Missing Social Proof Above the Fold
- **Problem:** No immediate trust signal in the hero ("500+ enseignants vérifiés", "10 000+ familles").
- **Recommendation:** Add a micro-trust bar under the hero CTAs:
  ```
  ⭐ 4.8/5 · 500+ enseignants · Paiement sécurisé
  ```

---

## 3. Auth / Login (`login-form.tsx`)

### 3.1 Phone Input: No Visual Validation
**Lines 220–241**

- **Problem:** Users can type letters into the phone field (only filtered on change). The country code input accepts any length.
- **Recommendation:**
  - Use `inputMode="tel"` ✅ (already done)
  - Add `pattern="[0-9]*"`
  - Show inline validation: red border + message if < 8 digits
  - Format as Ivorian number automatically: `07 XX XX XX XX`

### 3.2 OTP Input: No Auto-Advance
**Lines 272–282**

- **Problem:** 6-digit OTP is a single input. Users on mobile must tap, type 6 digits, then tap the verify button.
- **Recommendation:**
  - Use 6 separate inputs (one per digit) with auto-focus advance. Much faster on mobile.
  - Or keep single input but auto-submit when 6 digits reached.

### 3.3 Loading State Replaces Button Content
**Lines 288–291**

- **Problem:** Spinner replaces text, causing button width to jump.
- **Recommendation:** Use an overlay spinner or keep text visible + opacity reduction:
  ```tsx
  <Button disabled={loading}>
    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
    {t("verifyOtp")}
  </Button>
  ```

### 3.4 WhatsApp Handshake is Confusing
**Lines 255–262**

- **Problem:** "Handshake" step requires users to message you on WhatsApp first. This is a major friction point.
- **Recommendation:**
  - Add a **deep link** to open WhatsApp directly: `https://wa.me/NUM?text=CODE`
  - Show a clear visual: "1. Ouvrez WhatsApp → 2. Envoyez le code → 3. Revenez ici"
  - Consider removing this step once Business Verification is done (per your code comment).

### 3.5 No "Back" Button on OTP Stage
- **Problem:** Users who enter wrong phone number must click small "Changer de numéro" text link.
- **Recommendation:** Make it a prominent secondary button.

### 3.6 Missing `autocomplete="one-time-code"`
**Line 272**

- **Recommendation:** Add `autoComplete="one-time-code"` so mobile OS suggests the OTP from SMS/WhatsApp.

---

## 4. Parent Dashboard (`parent/overview/page.tsx`)

### 4.1 Overview Redirects Immediately
**File:** `dashboard/parent/page.tsx`

- **Problem:** Parent landing at `/dashboard/parent` redirects to `/overview`. This adds a navigation hop.
- **Recommendation:** Render the overview content directly at `/dashboard/parent` and remove the redirect.

### 4.2 Empty States Are Too Minimal
**Lines 256–266**

- **Problem:** "No children" empty state is just text + small link. No illustration, no emotional hook.
- **Recommendation:** Add a friendly illustration (even a simple SVG) and a larger, more obvious CTA:
  ```
  [Illustration of parent + child]
  "Commencez par ajouter votre enfant"
  [+ Ajouter mon enfant] — large amber button
  ```

### 4.3 Continue Watching Rail is Hidden When Empty
**Line 312**

- **Problem:** If no courses in progress, the section simply disappears. Parents don't know the feature exists.
- **Recommendation:** Show a teaser: "Aucun cours en cours — explorez le catalogue" with a link to `/courses`.

### 4.4 Learner Cards Lack Quick Actions
**File:** `dashboard/parent/children/page.tsx` (inferred from `LearnerCard`)

- **Problem:** From a child card, parent must click "Manage" then navigate to enrollments.
- **Recommendation:** Add contextual quick actions on each `LearnerCard`:
  - "Voir le planning" (if enrolled)
  - "Inscrire à un cours" (if not enrolled)

### 4.5 Pending Payment Banner Could Be More Urgent
**Lines 230–252**

- **Problem:** Amber banner is good, but the "Finaliser →" text is small.
- **Recommendation:** Add a progress-bar feel ("Expire dans 1h 23min") or make the entire banner a large tappable card.

---

## 5. Kid Dashboard (`k/[learner_id]/page.tsx`)

### 5.1 Greeting is Too Formal
**Line 150–151**

- **Problem:** "Bonjour Koffi" in large bold text feels like a parent dashboard, not a kid space.
- **Recommendation:**
  - Use a friendlier tone: "Salut Koffi! 👋"
  - Add a fun avatar or emoji reaction
  - Reduce heading size to `text-2xl` max

### 5.2 Kid Mode Missing Visual Delight
- **Problem:** The kid dashboard uses the same white/blue/slate palette as the parent view. No differentiation.
- **Recommendation:**
  - Add a subtle **kid mode theme**: slightly more rounded corners, brighter accent colors, maybe a mascot character.
  - Use larger tap targets (min 48px) for all kid-facing buttons.

### 5.3 Achievements Section is Just a Link
**Lines 213–227**

- **Problem:** "Mes réussites" is a text link in a card. Kids need visual feedback.
- **Recommendation:** Show actual badges inline (even if locked/greyed): "🔒 Premier cours", "🔒 5 jours d'affilée", etc.

---

## 6. Teacher Dashboard (`dashboard/teacher/page.tsx`)

### 6.1 Stats Cards are Clickable but Don't Look It
**Lines 332–372**

- **Problem:** `StatCard` wraps in `<Link>` but has no hover arrow or underline. Users may not realize they can click.
- **Recommendation:** Add `group` hover with arrow icon:
  ```tsx
  <Link href={href} className="group ...">
    ...
    <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
  </Link>
  ```

### 6.2 Imminent Session Banner is Easy to Miss
**Lines 162–182**

- **Problem:** Amber banner blends with other amber accents on the page.
- **Recommendation:**
  - Make it **sticky** at top of content area when active.
  - Add a pulsing dot indicator: `animate-pulse` on a red/green status circle.
  - Show countdown timer: "Commence dans 12 min"

### 6.3 No Earnings Chart
- **Problem:** Teachers see "180,000 FCFA this month" as text only.
- **Recommendation:** Add a simple bar chart (even CSS-based) showing daily earnings for the last 7 days. Builds trust and motivates.

### 6.4 Rating Card Shows "—" When Empty
**Lines 204–209**

- **Problem:** New teachers see "—" for rating. Demotivating.
- **Recommendation:** Change to: "Nouveau — obtenez votre premier avis!" with a link to share profile.

---

## 7. Admin Dashboard (`dashboard/admin/page.tsx`)

### 7.1 Excellent Attention-Card Pattern ✅
**Lines 200–259**

- **Strength:** Showing only cards with `count > 0` is smart — reduces noise.
- **Strength:** "All clear" state with green check is reassuring.

### 7.2 Snapshot Tiles Should Auto-Refresh
- **Problem:** Today's revenue, signups, etc. are server-rendered and stale after page load.
- **Recommendation:** Add a client-side `useEffect` polling every 60 seconds for the snapshot data, or show a "Refresh" button with `router.refresh()`.

### 7.3 Agent Escalations Need Priority Colors
**Lines 341–366**

- **Problem:** All escalations use `bg-amber-50`. A payment issue and a content moderation issue have the same visual weight.
- **Recommendation:** Color-code by agent type:
  - Payment → red/rose
  - Moderation → orange
  - Support → blue
  - Verification → green

---

## 8. Marketplace (Courses, Teachers, Classes)

### 8.1 Course Catalog: Filters Don't Sync to URL
**File:** `course-catalog.tsx`, lines 48–53

- **Problem:** Filters are `useState` only. Refreshing the page loses filter state. Can't share filtered URLs.
- **Recommendation:** Sync filters to query params using `nuqs` or manual `router.push`:
  ```tsx
  // When filter changes:
  const params = new URLSearchParams(searchParams);
  params.set("subject", subject);
  router.push(`?${params.toString()}`);
  ```

### 8.2 No Lazy Loading on Course Grid
**File:** `course-catalog.tsx`, line 218–222

- **Problem:** All course cards render at once. If 100 courses, that's 100 images.
- **Recommendation:**
  - Add `loading="lazy"` to all `<Image>` components in `CourseCard`.
  - Consider pagination or "Load more" after 24 items.

### 8.3 Teacher Profile Missing Availability Preview
**File:** `teachers/[id]/page.tsx` (inferred)

- **Problem:** Parents must click "Book" to see when a teacher is free.
- **Recommendation:** Show a mini weekly availability grid inline on the profile (read-only, clickable slots jump to booking).

### 8.4 Class Cards Missing Urgency Signals
- **Problem:** A class starting in 2 hours looks identical to one next week.
- **Recommendation:** Add badges:
  - "Commence bientôt" (orange) if < 24h
  - "Presque complet" (red) if enrollment > 80% capacity

---

## 9. Mobile Experience

### 9.1 Bottom Nav Shows Only 5 Items
**File:** `dashboard-shell.tsx`, lines 185–218

- **Problem:** If a role has 6+ nav items, the 6th+ is completely inaccessible on mobile.
- **Recommendation:**
  - Add a "More" overflow item that opens a sheet/menu.
  - Or move less-used items (Settings, Help) into a profile menu.

### 9.2 Mobile Filter Sheet Uses `side="bottom"`
**File:** `course-catalog.tsx`, line 198

- **Problem:** Bottom sheet for filters on a small phone covers 80% of the screen.
- **Recommendation:** Use `side="right"` (drawer pattern) so users can still see results update.

### 9.3 Touch Targets Too Small in Places
- **Problem:** Session list join buttons use `px-4 py-2 text-xs` — okay, but the surrounding row has no tap padding.
- **Recommendation:** Ensure all interactive rows have at least `py-3` on mobile.

---

## 10. Accessibility

### 10.1 Missing `aria-current="page"` on Navigation
**File:** `dashboard-shell.tsx`, lines 108–132

- **Problem:** Active nav link uses visual styling but no ARIA state.
- **Fix:**
  ```tsx
  <Link aria-current={isActive ? "page" : undefined} ... />
  ```

### 10.2 Custom Dropdowns Lack ARIA
**File:** `avatar-switcher.tsx`, `mobile-nav.tsx`

- **Problem:** Custom dropdowns use `<button>` + `<div>` without `aria-expanded`, `aria-haspopup`, or roving tabindex.
- **Recommendation:** Use shadcn's `DropdownMenu` primitive instead of custom implementations.

### 10.3 No Skip Link
**File:** root layout

- **Problem:** Keyboard users must tab through the entire header/sidebar to reach main content.
- **Fix:** Add a visually-hidden skip link:
  ```tsx
  <a href="#main" className="sr-only focus:not-sr-only">Aller au contenu</a>
  <main id="main">...</main>
  ```

### 10.4 Reduced Motion Not Respected
**File:** `globals.css`, animation definitions

- **Problem:** `animate-fade-in`, `animate-fade-in-up` run regardless of user preference.
- **Fix:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in, .animate-fade-in-up {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
  ```

### 10.5 Form Errors Not Focused on Submit
**File:** `login-form.tsx`

- **Problem:** On failed login, error toast appears but focus stays on the submit button.
- **Recommendation:** Focus the first invalid field or an error summary alert.

---

## 11. Performance / Polish

### 11.1 Image Optimization Gaps
- **Problem:** Many `<Image>` components lack `sizes` prop, causing Next.js to serve full-resolution images.
- **Recommendation:** Add `sizes` to all responsive images:
  ```tsx
  <Image sizes="(max-width: 768px) 100vw, 400px" ... />
  ```

### 11.2 Font Loading
- **Problem:** Nunito + Nunito Sans are likely loaded via `next/font` but verify `font-display: swap` is active.
- **Recommendation:** Ensure `display: 'swap'` is in the `next/font` config to prevent FOIT.

### 11.3 Console Noise from Playwright MCP
**Folder:** `.playwright-mcp/`

- **Problem:** Console logs are piling up. Not a UI issue but indicates debug code may be leaking.
- **Recommendation:** Add `.playwright-mcp/` to `.gitignore` if not already.

---

## 12. Quick Wins (Do This Week)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1 | Add `pb-20` to main content on mobile dashboards | `dashboard-shell.tsx` | 5 min |
| 2 | Add `loading.tsx` to `(dashboard)` and `(marketplace)` | new files | 20 min |
| 3 | Make hero search functional or restyle as button | `page.tsx` | 15 min |
| 4 | Add `aria-current="page"` to sidebar nav | `dashboard-shell.tsx` | 5 min |
| 5 | Fix empty states with illustrations + larger CTAs | `parent/overview`, `kid/home`, `teacher/dashboard` | 1 hr |
| 6 | Add `autoComplete="one-time-code"` to OTP input | `login-form.tsx` | 2 min |
| 7 | Color-code admin escalation cards by agent type | `admin/page.tsx` | 10 min |
| 8 | Add "More" overflow to mobile bottom nav | `dashboard-shell.tsx` | 30 min |
| 9 | Sync course filters to URL query params | `course-catalog.tsx` | 30 min |
| 10 | Add reduced-motion media query | `globals.css` | 5 min |

---

## 13. Strategic Recommendations (Next Sprint)

1. **Design a true Kid Mode theme** — Brighter colors, larger type, mascot/avatar. Consider it a separate CSS theme applied via `data-theme="kid"`.
2. **Add a universal search** — Command+k style (use `cmdk` or similar) to search teachers, courses, and help articles from anywhere.
3. **Teacher onboarding checklist** — Visual progress bar on first login: "Étape 2/5: Vérifier votre identité".
4. **Parent weekly digest email** — Summary of upcoming classes, progress, and recommended courses. Builds habit.
5. **PWA install prompt** — Add a custom install banner (not just the browser default) since offline mode is a core value prop.

---

*End of audit. Priority order: Quick Wins → Mobile fixes → Accessibility → Strategic.*
