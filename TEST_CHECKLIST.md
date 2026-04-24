# EcoleVersity — Live Session Test Checklist

**Date built:** 2026-04-24
**Features covered:** All classroom features shipped through today (Zoom-style speaker view, whiteboard, chat, raise hand, polls, slides, breakout rooms, live captions, recording, transcription).

---

## Part A — Setup

### Accounts

| Role | Email | Password | Where |
|---|---|---|---|
| **Admin** (you, observer) | `aycoul@gmail.com` | `zmYg6fZaHSmh0X` | Any browser |
| **Teacher** (Laptop A — you) | `test-teacher-e2e@ecoleversity.dev` | `teacher2026` | Your laptop |
| **Parent** (Laptop B — friend) | `test-parent-e2e@ecoleversity.dev` | `parent2026` | Friend's device |

Login URL (all three): **https://ecoleversity.com/fr/login → Email tab**

### Test class URLs

Both classes are scheduled to start "now" — you can join immediately.

| Class | URL |
|---|---|
| **1-on-1** (simplest — start here) | https://ecoleversity.com/fr/session/bcb50450-1deb-4f1d-a86a-3082037a7f27 |
| **Group** (for multi-participant features) | https://ecoleversity.com/fr/session/1569efa8-1fd6-457d-8478-6cf589b0980a |

### Recommended device setup

- **Laptop A (you — Teacher):** Chrome or Edge on a desktop/laptop. **Must be Chrome/Edge for captions + blur to work.**
- **Laptop B (friend — Parent):** any modern browser. Can be a phone/tablet — will help you notice mobile UX issues.
- **Both:** allow camera + microphone permissions when asked. Good lighting + earbuds prevent audio feedback.

---

## Part B — Pre-flight (5 min)

Do these BEFORE you call your friend. If any fail, stop and ping me.

- [ ] 1. Go to `https://ecoleversity.com` → tab icon in browser is a **happy sun** (not a Vercel triangle or Next.js "N")
- [ ] 2. Log in as teacher → you land on the teacher dashboard with a back button and the logo top-left
- [ ] 3. Click the écoleVersity logo → you return to the homepage
- [ ] 4. Back to dashboard → avatar menu top-right → sections labelled "Compte parent" / "Mode enfant" (if parent account) or just the role card (if teacher/admin)
- [ ] 5. Click "Mes cours en direct" → you see the two test classes ("Test E2E — …" and "Test E2E groupe — …")

---

## Part C — Joining the session (Laptop A first, then Laptop B)

### Teacher (Laptop A)

- [ ] 6. Open the **1-on-1** test class URL → page loads without errors
- [ ] 7. Click **"Rejoindre"** → browser asks for camera + mic → **allow both**
- [ ] 8. You land directly in the video room (no waiting room for teacher)
- [ ] 9. You see your own video tile; your name shows "Prof Test E2E"

### Parent (Laptop B — your friend)

- [ ] 10. Friend logs in with parent credentials → goes to "Mes cours à venir" → clicks the 1-on-1 class → **Rejoindre**
- [ ] 11. Before you (teacher) join, parent should see an **amber "Salle d'attente"** screen
- [ ] 12. Once you (teacher) are in the room, parent auto-advances within ~5 seconds
- [ ] 13. You (teacher) can see the parent's video tile; parent can see yours

---

## Part D — Feature tests

Work through these roughly in order. Each test should take under 2 minutes.

### D1 — Layout (Speaker view + thumbnails) ✨ new

- [ ] 14. Default view should be **Speaker view** (1 big tile + the other as a thumbnail strip on right)
- [ ] 15. Click a thumbnail → an amber ring appears around it; it becomes the big tile
- [ ] 16. Click again on the (now-big) tile's **"Désépingler"** button top-right → auto-focus returns
- [ ] 17. Click **"Masquer"** at top of thumbnail strip → strip collapses to a small amber chevron on the right edge
- [ ] 18. Click the chevron → strip reopens
- [ ] 19. Click **"Grille"** in the control bar → layout switches to equal-sized tiles
- [ ] 20. Click **"Intervenant"** → back to speaker view

### D2 — Screen share auto-focus ✨ new

- [ ] 21. Teacher: click the screen-share button in the built-in control bar → pick a window or tab
- [ ] 22. Layout auto-switches to Speaker view with the shared screen filling the main tile
- [ ] 23. Stop screen share → layout reverts to what it was before

### D3 — Raise hand ✨ new

- [ ] 24. Parent: click **"Lever la main"** in the control bar → button turns amber
- [ ] 25. Teacher should see: (a) a **toast notification** "✋ Test Parent lève la main" (lasts 6s) AND (b) a pulsing amber **pill banner** at the top of the video area
- [ ] 26. Parent: click **"Main levée"** again to lower → teacher's pill banner disappears

### D4 — Moderated chat ✨ existing

- [ ] 27. Teacher: click **Discussion** → panel opens on the right
- [ ] 28. Both type a normal message → messages appear for both sides
- [ ] 29. Close the chat panel → reopen → **messages still there** (regression test)
- [ ] 30. Parent types a phone number: `my number is 0205554488` → **message blocked** with a "informations personnelles détectées" warning
- [ ] 31. Parent types `instagram @profkoffi` → also blocked (social handle)

### D5 — Whiteboard ✨ existing

- [ ] 32. Teacher: click **"Tableau"** → whiteboard overlay appears over the video area (control bar still visible below)
- [ ] 33. Teacher draws with pen → parent sees it mirror in real time
- [ ] 34. Try eraser, try different colors, adjust stroke width → all reflect on parent's side
- [ ] 35. Click the X at top-right of whiteboard → closes for teacher; parent still sees whiteboard until they close or teacher clicks Tableau again

### D6 — Device picker ✨ new

- [ ] 36. Click **"Périphériques"** in control bar → popover shows Camera / Microphone / Speaker sections
- [ ] 37. Each section lists your devices, active one has an amber dot
- [ ] 38. If you have multiple cameras (e.g. laptop + external webcam), switch → video tile updates to the new source
- [ ] 39. Click outside the popover → it closes

### D7 — Background blur ✨ new

- [ ] 40. Click **"Flou"** in control bar (Chrome/Edge only — will show "non supporté" on Safari mobile)
- [ ] 41. After ~2-3 seconds, your background should blur behind your face
- [ ] 42. Click again → blur turns off
- [ ] 43. Blur is **per-participant**: parent's blur doesn't affect teacher's view

### D8 — Polls / quick quiz ✨ new

- [ ] 44. Teacher: click **"Sondage"** → composer modal opens
- [ ] 45. Enter question (e.g. "Combien font 2 + 3 ?") + 3 options (e.g. "4", "5", "6") → click **Démarrer**
- [ ] 46. Parent side: a vote modal appears at the bottom with the question and options
- [ ] 47. Parent picks one option → it turns green with a checkmark; "En attente des résultats…" text appears
- [ ] 48. Teacher side: a **live tally panel** appears bottom-right showing 0%/100%/0% bars updating as votes come in
- [ ] 49. Teacher clicks **"Terminer"** → panel closes for teacher; parent's vote modal disappears

### D9 — Mute all (teacher only) ✨ new

- [ ] 50. Parent: make sure your mic is on (green indicator)
- [ ] 51. Teacher: click **"Tout couper"** → button changes to red "Confirmer" + "Annuler"
- [ ] 52. Teacher: click **"Confirmer"** → parent's mic icon should switch to red/muted; toast shows "1 micro(s) coupé(s)"
- [ ] 53. Parent can click their own mic icon to unmute themselves again (intentional — it's "hush the class," not a permanent gag)

### D10 — Slides mode (PDF share) ✨ new

**Prep:** Have a test PDF ready on Laptop A. Any 3-5 page PDF is fine.

- [ ] 54. Teacher: click **"Diapos"** → upload modal opens
- [ ] 55. Click "Choisir un fichier PDF" → pick your test PDF → upload ("Envoi en cours…" then "PDF partagé")
- [ ] 56. PDF appears full-screen over the video area for **both** teacher and parent
- [ ] 57. Teacher: press **→ (right arrow key)** → both sides advance one page
- [ ] 58. Press **← (left arrow key)** → both go back
- [ ] 59. Teacher: click **"Terminer"** → both return to normal video view

### D11 — Live captions ✨ new (Chrome/Edge recommended)

- [ ] 60. Teacher: click **"Sous-titres"** → button turns green
- [ ] 61. Teacher: speak a simple French sentence (e.g. "Bonjour, comment ça va ?")
- [ ] 62. Parent should see a **translucent black caption bar** at the bottom of the video with your name + the text (French)
- [ ] 63. Captions fade out ~6 seconds after the last spoken word
- [ ] 64. Parent can also turn on captions on their side — teacher then sees parent's speech as captions
- [ ] 65. Click **"Sous-titres"** again to turn off

**Note:** Accuracy varies a LOT by microphone quality and background noise. Rough mismatches are normal for v1. Safari + mobile may miss words. Firefox may not work at all.

### D12 — Breakout rooms ✨ new (needs 2+ students)

⚠️ **This test won't work with just 1 parent.** To test properly you'd need two enrolled students. If you have time and another person/device:
- [ ] 66. Skip if you only have 1 parent. (I can seed a second learner under test-parent if you want.)

If you **do** have 2 students:
- [ ] 67. Teacher: click **"Ateliers"** → picker appears → pick "2 élèves par groupe" → click **"Lancer"**
- [ ] 68. Both students get disconnected from the main room and reconnected into their breakout room (session may blink for 1-2s)
- [ ] 69. Each breakout shows a blue **"Atelier 1"** banner at the top with member names
- [ ] 70. Teacher clicks **"Revenir en groupe"** → everyone returns to the main room

### D13 — Recording + transcription ✨ existing

- [ ] 71. Toward the end of your test, speak some identifiable sentences (e.g. "Ceci est le test numéro X, on vérifie le son")
- [ ] 72. Teacher: click the red leave button in the control bar → session ends
- [ ] 73. Wait **~2 minutes** for the post-process pipeline (egress upload + Whisper + Claude summary)
- [ ] 74. Parent: go to `/dashboard/parent/recordings` → you should see the test session with a "Revoir" button
- [ ] 75. Expand **"Résumé du cours"** → AI-generated summary in French should reference what was actually discussed

---

## Part E — What to check AFTER the session

### Quick SQL verification (I'll do this for you — just ping me "check stats")

I can query the DB and confirm:
- [ ] Recording row created with `status=completed`, `ai_status=done`
- [ ] `parent_email_sent_at` — will be `null` because the test parent's email is `.dev` (fake domain). Real parents WILL get emails.
- [ ] `engagement_json` populated with speaking-time per participant
- [ ] Chat messages logged with `blocked=true` for the PII you tested
- [ ] Poll votes (N/A — not persisted by design in v1)

### What to report back to me

Use this template for each bug or oddity:

```
BUG: <one-line description>
WHERE: which test step # (e.g. "step 47")
DEVICE: Chrome on Windows / Safari on iPad / etc.
WHAT HAPPENED: <actual behaviour>
EXPECTED: <what should have happened>
```

Also note anything that "works but is ugly" — the control bar is now heavy with buttons, and on narrow screens it may wrap oddly. I want to know if the layout falls apart somewhere.

---

## Known limitations (don't report as bugs)

These are v1 scoping decisions, not bugs:

- Poll **results are not shown to students** after the poll ends — only the teacher sees final tallies.
- **Engagement UI** isn't in the dashboard yet — data is in the DB but no parent-facing view.
- **Slides annotations / laser pointer** — students see the same page as teacher but no drawing over slides (workaround: open whiteboard on top).
- **Teacher can't jump between breakouts** — teacher lands in group 1 by default.
- **Captions in Firefox** — browser doesn't support the Web Speech API reliably; use Chrome/Edge/Safari.
- **Late chat history** — if you leave and rejoin the session, earlier chat messages don't reappear (they come from the LiveKit data channel, not DB). Persistence across rejoin is v2.
- **Test parent doesn't receive email** — `.dev` fake domain bounces. Real parents will get the summary email.

---

## Timing estimate

- Part A (setup): 5 min
- Part B (pre-flight): 5 min
- Part C (join): 5 min
- Part D (features): 45-60 min with two people
- Part E (verify): 10 min

**Total:** ~1 hour 15 min for a thorough pass. Rushed version: 30 min hitting D1/D3/D4/D5/D8/D10.

Bonne session de test ! 🎒
