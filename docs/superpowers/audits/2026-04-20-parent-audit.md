# Parent Dashboard Audit — 2026-04-20

Tester: signed in as `test-parent-e2e@ecoleversity.dev` with learner "Awa" (CM1)
enrolled in 4 classes including one with a completed recording.

## Pages status

| Page | HTTP | Renders | Notes |
|------|------|---------|-------|
| `/fr/dashboard/parent` | 302 | ✅ | Redirects to learners root |
| `/fr/dashboard/parent/overview` | 200 | ✅ | Greeting + 1 enfant + 2 upcoming sessions + Rejoindre |
| `/fr/dashboard/parent/children` | 200 | ✅ | Awa card + edit/delete + "Ajouter" |
| `/fr/dashboard/parent/sessions` | 200 | ✅ | Upcoming + Séances passées (recording playback works) |
| `/fr/dashboard/parent/courses` | 200 | ✅ | Empty state (no pre-recorded course enrollments) |
| `/fr/dashboard/parent/messages` | 200 | ✅ | 2 conversations listed, right panel copy inaccurate |
| `/fr/dashboard/parent/payments` | 200 | ✅ | — |
| `/fr/dashboard/parent/spending` | 200 | ✅ | — |
| `/fr/dashboard/parent/wallet` | 200 | ✅ | Balance + referral code (unreachable from sidebar) |
| `/fr/dashboard/settings/notifications` | 200 | ✅ | — |
| `/fr/k/[learner_id]` | 200 | ✅ | "Salut Awa" + Cours du jour + 3 shortcuts |
| `/fr/k/[learner_id]/classes` | 200 | ✅ | — |
| `/fr/k/[learner_id]/courses` | 200 | ✅ | — |
| `/fr/k/[learner_id]/achievements` | 200 | ✅ | — |

## Findings

### 🔴 Broken

**1. Wallet page not reachable from the sidebar.**
`/fr/dashboard/parent/wallet` renders balance + referral code + "Partager
sur WhatsApp" — but the parent sidebar has no link to it. A parent who
never gets a direct URL will never find their own wallet or referrals.
→ **Fixed** by adding a Portefeuille entry to the parent nav.

**2. Sidebar label "Cours enregistrés" is ambiguous in French.**
`"Cours enregistrés"` reads as "recorded courses" — users expect past
session recordings. The page actually shows pre-recorded video courses
the learner is enrolled in (separate product). Past session recordings
live on /sessions under "Séances passées".
→ **Fixed** by renaming the sidebar label to "Cours vidéo" / "Video courses".

### 🟡 Awkward

**3. Messages empty state says "Aucune conversation" when conversations exist.**
Left pane lists 2 conversations, right pane reads "Aucune conversation"
if none is selected. The copy should say "Sélectionnez une conversation".
→ **Fixed** by adding a distinct i18n key `selectConversation` and using
it only when conversations exist but none is open.

**4. Icon collision: "Dépenses" and "Portefeuille" both wanted the wallet icon.**
Swapped Dépenses to `trending-up` (stacked bar feel) — added to the
iconMap in dashboard-shell.tsx.

### 🟢 UX wins (logged, not shipping this pass)

**5. Kid-mode page keeps the public top nav ("Trouver un prof", "Nos cours",
"Examens", "Enseigner"). A K-12 learner shouldn't see those recruiting
links — they belong to the marketing surface. Ship a separate `kidLayout`
wrapper when we touch the layout next.

**6. Parent overview could surface a 1-sentence pitch for the wallet
("Partagez votre code: recevez 1 000 FCFA par inscription") — currently
referrals are invisible until the parent hits the Portefeuille tab.

**7. Empty states across /courses, /payments, /spending, /wallet could each
get a single-line CTA pointing to the next useful action (browse courses,
pay pending invoice, etc.). Right now they just say "Rien ici."

## Resolutions

- 🔴 #1 + #2 + 🟡 #3 + #4 — commit pending (see below).
