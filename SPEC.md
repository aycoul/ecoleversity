# EcoleVersity — Product Specification

> K-12 online education marketplace for Côte d'Ivoire and francophone West Africa.
> Built by a solo founder with AI (Claude Code) as the engineering team.

**Version:** 2.0
**Date:** 2026-04-08
**MVP Target:** May 8, 2026 (30-day sprint)
**Status:** ✅ v3.0 — Full platform build. Bootstrap payments. Tutoring-first. No corners cut.

---

## Table of Contents

1. [Objective](#1-objective)
2. [User Personas](#2-user-personas)
3. [Core Features](#3-core-features)
4. [Technical Architecture](#4-technical-architecture)
5. [Project Structure](#5-project-structure)
6. [Code Style & Conventions](#6-code-style--conventions)
7. [Testing Strategy](#7-testing-strategy)
8. [Boundaries](#8-boundaries)
9. [MVP Scope & Phasing](#9-mvp-scope--phasing)
10. [Payment Architecture](#10-payment-architecture)
11. [Infrastructure & Performance](#11-infrastructure--performance)
12. [Security & Trust](#12-security--trust)
13. [Growth & Expansion](#13-growth--expansion)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Objective

### What
EcoleVersity is an online tutoring platform that digitizes the "maître de maison" (home tutor) model for K-12 students in Côte d'Ivoire. Parents find vetted teachers, book live tutoring sessions, and their children learn remotely — regardless of location. The platform also supports group classes and pre-recorded courses, but **live tutoring is the core product from day one.**

### Why
- 633,000+ BEPC candidates and 343,000+ BAC candidates annually need affordable, accessible tutoring
- Quality teachers are concentrated in Abidjan — rural students have limited access
- No dominant francophone edtech platform exists for West Africa
- Mobile money penetration is high (Wave ~70% market share) but edtech adoption is low

### Success Metrics (Year 1)
| Metric | Target |
|--------|--------|
| Registered students | 10,000 |
| Active teachers | 500 |
| Monthly active users | 3,000 |
| Classes completed | 5,000 |
| Teacher payout total | 25M FCFA |
| App store rating | 4.5+ |
| Countries | 1 (CI), preparing Senegal |

### Business Model
- **Commission:** 20-25% on every tutoring session/class/course purchase
- **MVP Payments (Bootstrap):** Personal Orange Money + Wave SIM cards. Parent sends payment to platform number. SMS scraping detects incoming payments and auto-confirms bookings. Manual teacher payouts.
- **Phase 2 Payments:** CinetPay aggregator API (single integration, all providers) — when transaction volume justifies it
- **Phase 3 Payments:** Direct provider APIs (Orange Money, Wave, MTN MoMo) — when fee savings matter at scale
- **Currencies:** XOF (FCFA) only at launch. EUR/USD for diaspora later.
- **Future:** Premium family subscription, institutional/school plans

### Bootstrap Strategy — Start Informal, Formalize When Profitable
- **No business registration at MVP.** Côte d'Ivoire taxation on registered businesses is aggressive. Start informal, prove the model, register when revenue justifies it.
- **Personal mobile money accounts for payments.** No API needed. Parent sends money → SMS received → platform confirms → session unlocked.
- **Spend money on infrastructure, not paperwork.** Cloud credits, tool subscriptions, teacher recruitment > business registration fees.
- **Formalization triggers:** Register business (RCCM) when monthly revenue exceeds 500,000 FCFA or when API integration requires it. Apply for ARTCI data protection declaration at the same time.
- **Risk accepted:** Operating informally means no formal payment API access, no business banking. This is a conscious tradeoff for speed.

---

## 2. User Personas

### Parent (Primary Buyer)
- **Profile:** 28-45 years old, mobile-first, uses WhatsApp daily, pays with Orange Money/Wave
- **Goals:** Find quality teachers for their children, track progress, manage multiple kids from one account
- **Pain points:** Can't assess teacher quality remotely, expensive private tutors, unreliable internet
- **Device:** Android phone (70%), tablet (15%), desktop (15%)

### Student (K-12 Learner)
- **Profile:** 6-18 years old, uses parent's phone or shared tablet
- **Goals:** Pass exams (CEPE/BEPC/BAC), understand difficult subjects, study at own pace
- **Pain points:** No internet at night, shared devices, boring content
- **Key need:** Offline access to downloaded lessons

### Teacher (Supply Side)
- **Profile:** 22-55 years old, certified teacher or experienced tutor, wants supplemental income
- **Goals:** Earn money teaching online, build reputation, reach students beyond their city
- **Pain points:** No platform to find students, irregular income, tech-unfriendly tools
- **Key need:** Simple class creation, reliable payouts, student management

### School/Institution
- **Profile:** Private schools, tutoring centers, exam prep academies
- **Goals:** List their teachers, offer courses online, expand reach
- **Pain points:** No digital presence, manual enrollment, no analytics

---

## 3. Core Features

### 3.1 Content & Classes

#### Pre-Recorded Courses (Content-First — MVP Priority)
- Teachers upload video lessons (max 15 min per segment for bandwidth)
- Automatic transcoding to multiple quality levels (240p, 360p, 480p, 720p)
- **Offline download** — students download lessons on Wi-Fi, watch anytime
- Progress tracking per lesson/module
- Quizzes and exercises embedded in courses
- PDF attachments (worksheets, past exam papers)

#### Live Group Classes
- Powered by **Jitsi Meet** (self-hosted or JaaS — Jitsi as a Service)
- Small groups: 5-15 students max
- Interactive whiteboard (built into Jitsi)
- **Auto-recording** — absent students can rewatch
- Scheduled with timezone support (GMT/WAT)
- Bandwidth-adaptive: auto-downgrades to audio-only on slow connections

#### 1-on-1 Tutoring
- Teacher sets available time slots
- Parent books and pays upfront
- Video call via Jitsi with recording option
- Reschedule/cancel policy (24h minimum)

#### Exam Preparation
- Dedicated exam prep sections: CEPE, BEPC, BAC, Concours 6ème
- Past exam papers with solutions
- Timed practice tests with scoring
- Subject-by-subject study plans
- Progress analytics: strengths/weaknesses by topic

### 3.2 User Accounts

#### Family Account (Parent)
- One parent account manages multiple children (learner profiles)
- Per-child progress dashboard
- Unified payment — pay for all children from one wallet
- Notification preferences per child
- Parental controls: approve classes, set screen time

#### Learner Profile
- Age-appropriate interface
- Personal schedule and enrolled classes
- Bookmarked lessons and favorites
- Achievement badges and streaks
- Study reminders

#### Teacher Profile
- Public profile: photo, bio, qualifications, subjects, ratings
- Verification badges (ID verified, diploma verified)
- Class catalog management
- Earnings dashboard and payout history
- Student analytics

#### School/Institution Profile
- Organization page with listed teachers
- Bulk course management
- Revenue split configuration (school ↔ teacher)
- Analytics dashboard

### 3.3 Marketplace & Discovery

#### Search & Browse
- Filter by: subject, grade level, exam type, price range, language, format (live/recorded), rating, availability
- Sort by: relevance, rating, price, popularity, newest
- Subject categories aligned with CI curriculum:
  - **Primaire:** Français, Mathématiques, Sciences, Histoire-Géographie, Éducation civique
  - **Collège:** + Anglais, Physique-Chimie, SVT, Technologie
  - **Lycée:** + Philosophie, Économie, Comptabilité, series-specific subjects
  - **Enrichment:** Coding, Art, Music, Sports, Life Skills, Languages

#### Teacher Ratings & Reviews
- 5-star rating after each class
- Written reviews (moderated)
- Response time badge
- Completion rate badge
- "Top Teacher" designation for 4.8+ with 20+ reviews

#### AI-Powered Recommendations
- "Recommended for you" based on grade, subjects, past activity
- "Students also took" collaborative filtering
- Exam-prep paths based on target exam date
- Teacher matching based on learning style preferences

### 3.4 Communication

#### In-App Messaging (Critical — No Off-Platform Deals)
- Parent ↔ Teacher messaging within platform only
- Pre-class questions and post-class feedback
- File sharing (homework, corrections)
- **Automated detection** of phone numbers, emails, social media handles — flagged and blocked
- All messages archived for dispute resolution

#### Notifications (Priority: WhatsApp → Email → SMS)
- **WhatsApp** (PRIMARY) via WhatsApp Business API (360dialog) — rich messages with buttons, links, images. Class reminders, payment confirmations, progress updates. ~90%+ reach in CI.
- **Email** (SECONDARY) via Resend — weekly progress summaries, payment receipts (PDF), teacher verification updates. Used when user has email and WhatsApp unavailable.
- **SMS** (FALLBACK) via Africa's Talking — critical alerts only (class starting in 5 min, payment confirmed, account security). Used only when WhatsApp and email unavailable.
- **Push notifications** (PWA) — always sent in addition to the primary channel. Free, instant, no per-message cost.
- Notification cascade: system checks WhatsApp first → falls back to email → falls back to SMS
- User chooses preferred channel per notification type (override cascade)

### 3.5 AI Teacher Digital Twins (Phase 2 — Design Now, Build Post-MVP)

#### Concept: Teachers Get Amplified, Not Replaced
Every live class recording and pre-recorded course becomes training data for an AI "digital twin" of that teacher. The AI twin learns the teacher's style, examples, pacing, and explanations. It then delivers interactive lessons to students who can't afford or access the live teacher — while the **human teacher earns revenue from every AI twin session**.

#### How It Works — End to End

```
TRAINING PIPELINE (background, automatic — no teacher action needed):

Day 1: M. Koné teaches a live class on "Fractions" to 12 students
  → Jitsi records the class automatically (already in MVP)
  → Recording saved to Cloudflare Stream

Night 1: Background job runs (Supabase Edge Function, cron)
  → Deepgram transcribes audio to text (French, ~$0.007/min)
  → Claude API extracts:
     • Topics covered: ["addition de fractions", "dénominateur commun"]
     • Key explanations: "M. Koné says: Pour additionner 1/3 + 1/4..."
     • Examples used: "Si tu coupes un gâteau en 3 parts..."
     • Exercises given: ["1/2 + 1/3 = ?", "2/5 + 3/10 = ?"]
     • Teaching style notes: "Uses food analogies, patient pace"
  → Stored in M. Koné's knowledge base (pgvector embeddings in Supabase)

Day 2: A student in Bouaké opens "Fractions avec M. Koné (IA)"
  → System loads M. Koné's knowledge base for "Fractions"
  → Claude API starts session with teacher-specific system prompt:
     "Tu es l'assistant pédagogique IA basé sur l'enseignement de
      M. Koné, professeur de mathématiques. Tu enseignes les fractions
      exactement comme lui:
      - Tu utilises des analogies avec la nourriture
      - Tu es patient et encourageant
      - Tu poses des questions avant de donner la réponse
      Voici ses explications sur ce sujet: [RAG content]
      L'élève est en classe de 5ème."
  → Student chats with AI twin, does exercises, gets graded
  → Session saved, mastery updated, teacher notified of earnings
```

#### Student UX — What They Actually See on Their Phone

```
┌─────────────────────────────────────┐
│  📱 Maths 3ème                      │
│  avec M. Koné (IA)                  │
│─────────────────────────────────────│
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📹 Video clip (30 sec)      │  │
│  │  M. Koné explaining           │  │
│  │  "Les équations du 2nd degré" │  │
│  │  [extracted from his live     │  │
│  │   class recording]            │  │
│  └───────────────────────────────┘  │
│                                     │
│  🤖 IA de M. Koné:                 │
│  "Bien! Maintenant que tu as vu    │
│   la méthode de M. Koné, essayons  │
│   ensemble. Résous: x² + 5x + 6=0 │
│   Quelle est la première étape?"   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ○ Calculer le discriminant    │  │
│  │ ○ Factoriser directement      │  │
│  │ ○ Diviser par x               │  │
│  └───────────────────────────────┘  │
│                                     │
│  [📩 Poser la question au vrai     │
│   M. Koné — 24h de réponse]        │
│                                     │
│  💬 Tape ta réponse...          📎 │
└─────────────────────────────────────┘
```

#### 3 Interaction Modes (Cheapest to Richest)

| Mode | Student Sees | Cost/Session | Tech | Offline? |
|------|-------------|-------------|------|----------|
| **Text Chat** (default) | Chat with AI twin + math notation + images | ~$0.01 | Claude API | Yes (cached KB) |
| **Video Clips + Chat** | Short clips from real recordings + AI chat between clips | ~$0.02 | CF Stream + Claude API | Partial (clips downloadable) |
| **Interactive Whiteboard** | AI draws/explains on canvas step-by-step | ~$0.03 | Excalidraw + Claude API | No |

Text Chat is the MVP for twins — works offline, costs almost nothing, usable on any phone with slow internet. Video Clips mode is the upgrade when bandwidth allows.

#### Teacher's "Face" — No Avatar Needed

**No deepfake. No 3D avatar. No video generation.** Just the teacher's real photo with an AI badge:

```
┌──────────────┐
│  [Photo of   │  M. Koné — Mathématiques
│   real       │  ⭐ 4.8 (142 avis) · 🤖 Double IA
│   M. Koné]   │  "Apprenez avec mon IA — 300 FCFA/session"
│  🤖 badge    │  14 cours analysés · Niveau 2
└──────────────┘
```

Why text-first beats avatar-first:
- **Bandwidth:** 3D avatar streams burn data. Text works on 2G.
- **Cost:** Avatar generation APIs cost $0.10-0.50/min. Text costs $0.01/session.
- **Offline:** Text chat works offline. Avatar video cannot.
- **Trust:** A realistic avatar feels deceptive. A clear "IA de M. Koné" label feels honest.
- **What matters is the KNOWLEDGE, not the face.**

Future option (Phase 3+): ReadyPlayerMe cartoon avatar from teacher photo (free) or D-ID talking head ($0.10/min) — only if user research shows demand.

#### Teacher Dashboard — "Mon Double IA"

```
┌─────────────────────────────────────────┐
│  🤖 Mon Double IA                       │
│─────────────────────────────────────────│
│                                         │
│  Statut: Niveau 2 — Leçons guidées ✅   │
│  Cours analysés: 14 enregistrements     │
│  ████████████████░░░░ 14/30 → Niveau 3  │
│                                         │
│  📊 Cette semaine:                      │
│  • 47 élèves ont appris avec votre IA   │
│  • 156 sessions complétées              │
│  • Note moyenne: 4.6/5 ⭐               │
│  • Revenus IA: 23,400 FCFA             │
│                                         │
│  💰 Revenus totaux ce mois:            │
│  • Cours en direct: 180,000 FCFA       │
│  • Cours enregistrés: 95,000 FCFA      │
│  • Double IA: 78,000 FCFA  🤖          │
│  • Total: 353,000 FCFA                  │
│                                         │
│  [Voir les sessions] [Corriger l'IA]    │
│  [⏸️ Mettre en pause mon double]       │
└─────────────────────────────────────────┘
```

#### AI Twin Maturity Levels

| Level | Trigger | Capabilities | Unlocks |
|-------|---------|-------------|---------|
| **Level 0: No Twin** | Teacher just joined | No AI twin | — |
| **Level 1: Basic Q&A** | 3+ lessons transcribed | Answers questions about covered topics | Listed as "IA disponible bientôt" |
| **Level 2: Guided Lessons** | 10+ lessons + exercises extracted | Delivers structured lessons with exercises | Students can book AI sessions |
| **Level 3: Full Twin** | 30+ lessons + student feedback | Full courses, adapts per student, generates exercises | Twin promoted on homepage |

Teachers see their maturity progress bar and are incentivized to record more (more recordings = higher level = more passive income).

#### Revenue Model for AI Twins

```
AI Twin session price: 200-500 FCFA (vs 2,000-5,000 for live human)

Revenue split per AI session:
├── Teacher: 50% (passive income — they sleep, their twin teaches)
├── Platform: 30% (margin after AI costs)
└── AI costs: 20% (Claude API ~$0.01-0.03, Deepgram amortized)

Example: Teacher with Level 3 twin
├── Twin serves 100 students/day × 300 FCFA avg = 30,000 FCFA/day
├── Teacher earns: 15,000 FCFA/day passively = 450,000 FCFA/month (~$700)
└── On top of their live class earnings
```

#### Teacher Incentives — "Votre Double Travaille Pendant Que Vous Dormez"
- Teachers **opt-in** to digital twin creation (consent required)
- Teachers can **review and correct** their twin's answers
- Teachers see a **real-time dashboard** of twin activity and earnings
- Twin is always labeled: "IA de M. Koné" — never pretends to be human
- Teacher can **pause or disable** their twin at any time
- **Top teachers' twins become the free tier** — massive student acquisition engine

#### Technical Architecture

```
Recording Pipeline (background, per-recording):
Jitsi/CF Stream recording (audio)
  → Deepgram API (French transcription, ~$0.007/min, ~$0.25 per 35-min class)
  → Claude API (content extraction — topics, explanations, exercises, style)
  → pgvector (Supabase) — vector embeddings for RAG retrieval
  → Teacher's knowledge base grows automatically

AI Twin Engine (per-session, real-time):
Student starts session
  → Load teacher's system prompt (generated from style profile)
  → RAG: retrieve relevant lesson segments from teacher's KB
  → Claude API conversation with streaming response
  → Optional: surface video clips from original recordings at key moments
  → Track exercises attempted, correct, mastery score
  → Session saved for teacher review + twin improvement

Cost per session (estimated):
  → Claude API (Haiku for chat, Sonnet for grading): $0.005-0.02
  → Deepgram transcription (amortized across students): $0.001
  → Supabase pgvector query: negligible
  → Total: ~$0.01-0.03 per session
```

#### Safety & Ethics
- AI twin always clearly labeled: "Leçon IA basée sur l'enseignement de M. Koné"
- Teacher must consent and can opt out or pause anytime
- Student and parent must acknowledge they're interacting with AI before first session
- AI twin never handles sensitive topics (counseling, discipline, personal issues)
- Human teacher escalation: "Voulez-vous poser cette question directement à M. Koné?" button always visible
- Quality audits: admin spot-checks twin accuracy against teacher's actual teaching
- Student can rate AI sessions — low ratings trigger teacher review
- Twin paused automatically if rating drops below 3.5/5

### 3.6 Referral Program
- Parents earn 1,000 FCFA credit per referred parent who books a class
- Teachers earn 500 FCFA bonus per referred teacher who completes first class
- Unique referral codes and shareable links
- Referral dashboard with tracking

### 3.7 Certificate Generation
- Auto-generated PDF certificates on course completion
- Customizable with teacher name, course name, student name, date
- QR code for verification
- Shareable on social media

### 3.8 AI Customer Support — "Ama" (Assistante Maline d'Apprentissage)

The platform's customer support is fully AI-powered with human escalation for complex cases.

#### Support Chatbot — Always Available
```
┌─────────────────────────────────────┐
│  💬 Aide — Ama                      │
│─────────────────────────────────────│
│                                     │
│  🤖 Ama:                           │
│  "Bonjour! Je suis Ama, votre      │
│   assistante EcoleVersity. Comment  │
│   puis-je vous aider?"             │
│                                     │
│  Suggestions rapides:               │
│  [💳 Problème de paiement]          │
│  [👨‍🏫 Trouver un cours]              │
│  [🔑 Problème de connexion]         │
│  [📱 Comment ça marche?]            │
│                                     │
│  💬 Décrivez votre problème...      │
└─────────────────────────────────────┘
```

#### How Ama Works
- **Claude API** with EcoleVersity knowledge base (FAQs, policies, how-to guides)
- Speaks fluent French (primary) and English
- Context-aware: knows the user's role (parent/teacher/student), recent activity, enrolled classes
- Can perform actions: issue wallet refund, resend verification email, reset password, escalate to admin
- **Escalation path:** If Ama can't resolve in 3 exchanges → creates a support ticket → admin reviews within 24h
- Available 24/7 — no support staff needed

#### Built-in Help Center (Searchable)
- **For Parents:** "Comment inscrire mon enfant", "Comment payer avec Orange Money", "Politique de remboursement"
- **For Teachers:** "Comment créer un cours", "Comment recevoir mes paiements", "Utiliser la visioconférence"
- **For Students:** "Comment regarder un cours hors ligne", "Comment poser une question au professeur"
- Articles written in French, auto-translated to English
- Searchable via Supabase full-text search
- Ama references help articles in answers and links directly to them
- Admin can add/edit articles from dashboard

#### Support Ticket System
- Created automatically when Ama escalates
- Created manually via "Contacter le support" button
- Categories: Payment, Technical, Teacher dispute, Account, Other
- Priority: Low (48h), Medium (24h), High (4h — payment issues)
- Admin dashboard shows open tickets, SLA compliance, resolution rate
- Resolution sent back through Ama (or WhatsApp/email for offline users)

### 3.9 Onboarding Flows

#### Teacher Onboarding — Interactive Guided Setup

Teachers are the supply side — if they can't create courses easily, the platform fails. Onboarding must be hands-on and encouraging.

```
TEACHER ONBOARDING FLOW (7 steps, ~20 minutes):

Step 1: "Bienvenue sur EcoleVersity" — Welcome video (60 sec)
  → What EcoleVersity is, how teachers earn money, success stories

Step 2: "Complétez votre profil" — Guided profile setup
  → Photo upload, bio, subjects, grade levels, city
  → Progress bar: "Votre profil est à 40%"

Step 3: "Vérification" — Upload documents
  → CNI (national ID) + diploma + 60-sec video intro
  → Clear instructions with examples of good vs bad uploads
  → "Vérification en cours — nous vous notifions dans 24-48h"

Step 4: "Votre premier cours" — Interactive course creation tutorial
  → Walks teacher through creating a draft course step by step
  → Pre-filled example: "Mathématiques 3ème — Les équations"
  → Video upload guide: recording tips, lighting, audio quality
  → "Publiez quand vous êtes prêt — votre premier cours est gratuit à créer"

Step 5: "La visioconférence" — Jitsi tutorial
  → Test call with themselves (camera, mic, screen share, whiteboard)
  → "Comment animer un cours en direct" — 3-min video guide
  → Tips: student management, muting, recording

Step 6: "Les paiements" — How earnings work
  → Commission explained visually (you get 80%, we keep 20%)
  → Mobile money payout setup (enter your Orange/Wave/MTN number)
  → "Votre premier paiement arrive le dimanche suivant votre premier cours"

Step 7: "Vous êtes prêt!" — Dashboard overview
  → Quick tour of: My Courses, My Classes, Messages, Earnings
  → Checklist: ☑ Profile ☑ Verified ☑ First course created ☑ Payout setup
  → CTA: "Publiez votre premier cours maintenant"
```

#### Teacher Tools Quick Reference
- **In-app tooltips:** First time on each page → contextual tooltip explaining the feature
- **"Comment faire?" button:** On every dashboard page, links to relevant help article
- **Video guides library:** 5-8 short videos: "Comment filmer un bon cours", "Comment utiliser le tableau blanc", "Comment gérer les élèves en direct"
- **Teacher WhatsApp group invite:** Community of EcoleVersity teachers for peer support

#### Parent Onboarding — Simple & Fast

Parents need to find and book a class in under 3 minutes.

```
PARENT ONBOARDING FLOW (4 steps, ~5 minutes):

Step 1: "Bienvenue" — Register with phone number (OTP)
  → Single screen: name, phone, password
  → Or: "Se connecter avec Google"

Step 2: "Ajoutez votre enfant" — Create learner profile
  → First name, classe (dropdown: CP1 → Terminale)
  → Optional: target exam (CEPE/BEPC/BAC)
  → "Vous pouvez ajouter d'autres enfants plus tard"

Step 3: "Trouvez un cours" — Personalized recommendations
  → Based on child's grade + exam target
  → "Cours recommandés pour [Prénom] en [Classe]"
  → Show 3-5 popular courses with "Voir" and "S'inscrire" buttons

Step 4: "C'est parti!" — Dashboard overview
  → Quick tour: "Voici le tableau de bord de votre famille"
  → Point to: Children, Progress, Messages, Payments
  → CTA: "Inscrivez [Prénom] à son premier cours"
```

#### Student Onboarding — Age-Appropriate

```
STUDENT EXPERIENCE (accessed through parent's phone or own device):

First login:
  → "Salut [Prénom]! 👋 Bienvenue sur EcoleVersity"
  → Show enrolled courses with big, colorful cards
  → "Appuie sur un cours pour commencer à apprendre"
  → Simple interface: no clutter, big buttons, clear icons

No separate onboarding flow — students learn by doing.
Interface adapts by age:
  → 6-10 (Primaire): large icons, minimal text, colorful
  → 11-14 (Collège): standard interface with guidance
  → 15-18 (Lycée): full interface, exam prep prominent
```

### 3.10 Teacher Tools & Class Management

#### Homework & Assignments
- Teacher creates assignments within a course or after a live class
- Students submit text answers, photo of handwritten work, or file upload
- Teacher grades and provides feedback (text or voice note)
- Deadline tracking with reminders
- AI auto-grading option for multiple choice and math exercises

#### Teacher Coupons & Promotions
- Teachers create discount codes for their own classes (e.g., "RENTREE2026" = 20% off)
- Limited uses and expiry dates
- Share via WhatsApp, social media, or in-app
- Track usage and conversion on teacher dashboard

#### Teacher Following
- Parents tap "Suivre" on a teacher's profile
- Get notified (WhatsApp/push) when teacher publishes new courses or schedules classes
- Teachers see follower count and can send announcements to followers

#### Waitlist System
- When a live class is full, parents join a waitlist
- Auto-notified if a spot opens (cancellation)
- Teacher can see waitlist size → incentive to open additional sections
- Waitlist count visible on class card ("3 en liste d'attente")

#### Calendar Integration
- Students/parents can sync enrolled classes to Google Calendar or Apple Calendar
- `.ics` download per class or calendar feed URL (auto-updates)
- Timezone auto-detection from browser + manual override
- Class reminders: 24h before + 15 min before (via WhatsApp + push)

#### Away Mode for Teachers
- Teacher sets "absent" with return date
- Auto-response to messages: "M. Koné est absent jusqu'au 15 avril. Il vous répondra à son retour."
- Doesn't affect teacher rating
- Classes during away period: teacher must cancel or find substitute (handled manually)

### 3.11 Trust & Safety System

#### Teacher Strike System (3 Strikes)
| Strike | Trigger | Consequence |
|--------|---------|------------|
| **Warning** | Minor issue: late to class, slow response | Notification + coaching tips |
| **Strike 1** | Missed class without notice, inappropriate content | 7-day restriction on new listings, mandatory policy review |
| **Strike 2** | Repeated offense, confirmed complaint | 30-day restriction, admin review required to reinstate |
| **Strike 3** | Serious violation, safety concern | Permanent ban, all classes cancelled, students refunded |

Strikes expire after 6 months of clean record.

#### Content Reporting
- "Signaler" button on every class, message, review, and teacher profile
- Report categories: Inappropriate content, Safety concern, Spam, Off-platform contact attempt, Other
- Reports go to admin queue → 24h review SLA
- Anonymous reporting option for parents
- Teacher sees report count on dashboard (transparency)

#### Satisfaction Guarantee — "Promesse EcoleVersity"
Beyond the standard refund policy:
- If a parent is unsatisfied after completing a course (not just cancelling), they can request a **wallet credit** equal to 50% of the course price
- Limited to 2x per year per family
- Requires written explanation (helps improve teacher quality)
- Teacher is notified and can respond (dispute resolution)

### 3.12 Accessibility & Connectivity

#### PWA / Offline Mode
- Full Progressive Web App — installable on Android/iOS home screen
- Service worker caches: navigation shell, previously viewed pages, downloaded lessons
- Offline queue: quiz answers, messages submitted when back online
- Background sync for uploads

#### Low-Bandwidth Optimization
- Adaptive image loading (WebP, lazy load, blur placeholder)
- Video quality auto-adjustment (240p default on slow connections)
- Text-first design — pages functional without images loaded
- Compressed API responses (gzip/brotli)
- Total page weight target: <200KB for core pages (excluding video)

#### SMS/USSD Access (Phase 2)
- USSD menu (*123#) for: browse classes by subject, check schedule, confirm booking
- SMS commands: "COURS MATHS 3EME" → returns top 3 classes with booking codes
- Partner with Orange CI or MTN for shortcode

#### Multi-Language Support
- **French** (primary — all UI, content categories, system messages)
- **English** (secondary — full UI translation, content in English where available)
- **Baoulé, Dioula, Bété** (Phase 2 — UI labels, not full content)
- i18n from day one using `next-intl`

---

## 4. Technical Architecture

### Stack Decision

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14+ (App Router) | SSR for SEO, RSC for performance, PWA support |
| **Styling** | Tailwind CSS + Shadcn/ui | Rapid UI dev, consistent design system |
| **Backend** | Next.js API Routes + Supabase | Serverless, no server management |
| **Database** | Supabase (PostgreSQL) | Auth, DB, storage, realtime — all-in-one |
| **Auth** | Supabase Auth | Email, phone (OTP), social login |
| **Storage** | Supabase Storage + Cloudflare R2 | Videos on R2 (cheap bandwidth), images on Supabase |
| **Video** | Jitsi Meet (JaaS) | Open source, low-bandwidth mode, free tier |
| **Video Processing** | Cloudflare Stream or Mux | Adaptive bitrate, HLS, download support |
| **Payments** | Direct APIs: Orange Money, Wave, MTN MoMo | Direct integration — lower fees than aggregators (CinetPay/Flutterwave) |
| **WhatsApp** | WhatsApp Business API (via 360dialog) | PRIMARY notifications — official API, template messages |
| **Email** | Resend | SECONDARY notifications — simple, cheap, good deliverability |
| **SMS** | Africa's Talking | FALLBACK only — best francophone Africa coverage |
| **Search** | Supabase Full-Text Search → Meilisearch (Phase 2) | Start simple, upgrade when needed |
| **AI/ML** | Claude API (Anthropic) | Content moderation, recommendations, support chatbot |
| **Analytics** | PostHog (self-hosted or cloud) | Open source, privacy-first, event tracking |
| **Hosting** | Vercel (frontend) + Supabase (backend) | Zero-ops, auto-scaling, edge network |
| **CDN** | Cloudflare | Free tier, African PoPs (Lagos, Johannesburg) |
| **i18n** | next-intl | Type-safe, SSR-compatible, ICU message format |
| **Monitoring** | Sentry (errors) + Vercel Analytics (perf) | Free tiers sufficient for MVP |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  📱 PWA (Android/iOS)  💻 Web Browser  📟 USSD/WhatsApp/SMS │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌────────────────────────────┐
│   Vercel Edge Network   │  │  WhatsApp Business API     │
│   (Next.js App Router)  │  │  Africa's Talking (SMS)    │
│   - SSR/RSC pages       │  └────────────────────────────┘
│   - API routes          │
│   - Service Worker       │
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Auth   │ │ Postgres │ │ Storage  │ │ Realtime  │  │
│  │  (OTP,   │ │  (RLS,   │ │ (images, │ │ (chat,    │  │
│  │  email,  │ │  full-   │ │  docs)   │ │  presence)│  │
│  │  social) │ │  text)   │ │          │ │           │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
              │
   ┌──────────┴──────────────────────┐
   ▼                                 ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│  Cloudflare R2   │  │         External Services        │
│  (video storage) │  │  - Orange Money API (payments)    │
│                  │  │  - Wave API (payments)            │
│                  │  │  - MTN MoMo API (payments)        │
│  + CF Stream     │  │  - Jitsi JaaS (video calls)      │
│  (transcoding)   │  │  - Claude API (AI features)      │
│                  │  │  - Resend (email)                 │
│                  │  │  - PostHog (analytics)            │
└──────────────────┘  └──────────────────────────────────┘
```

### Data Model (Core Entities)

```
users
├── id (uuid, PK)
├── email / phone
├── role (parent | teacher | admin | school_admin)
├── language_preference (fr | en)
├── created_at
└── verified (boolean)

profiles (extends users)
├── user_id (FK → users)
├── display_name
├── avatar_url
├── bio
├── city, country
└── phone_verified (boolean)

learner_profiles (children)
├── id (uuid, PK)
├── parent_id (FK → users)
├── first_name
├── birth_year
├── grade_level (CP1..Terminale)
├── target_exam (CEPE | BEPC | BAC | CONCOURS_6EME | null)
└── avatar_url

teacher_profiles
├── user_id (FK → users)
├── subjects (text[])
├── grade_levels (text[])
├── verification_status (pending | id_verified | diploma_verified | fully_verified)
├── id_document_url
├── diploma_url
├── video_intro_url
├── commission_rate (decimal, default 0.20)
├── rating_avg (decimal)
├── rating_count (int)
├── school_id (FK → schools, nullable)
└── payout_phone (mobile money number)

schools
├── id (uuid, PK)
├── name
├── type (private_school | tutoring_center | academy)
├── city, country
├── verification_status
├── admin_user_id (FK → users)
└── revenue_split (decimal — school's share)

courses (pre-recorded)
├── id (uuid, PK)
├── teacher_id (FK → users)
├── title, description
├── subject, grade_level
├── exam_type (nullable)
├── language (fr | en)
├── price_xof (integer — in FCFA)
├── price_eur, price_usd (nullable)
├── status (draft | published | archived)
├── thumbnail_url
├── total_duration_minutes
├── enrollment_count
└── rating_avg, rating_count

lessons (within courses)
├── id (uuid, PK)
├── course_id (FK → courses)
├── title
├── video_url (Cloudflare Stream)
├── video_duration_seconds
├── pdf_attachment_url
├── sort_order
└── is_preview (boolean — free preview)

live_classes
├── id (uuid, PK)
├── teacher_id (FK → users)
├── title, description
├── subject, grade_level
├── format (group | one_on_one)
├── max_students (int)
├── price_xof
├── scheduled_at (timestamptz)
├── duration_minutes
├── recurrence (one_time | weekly | custom)
├── jitsi_room_id
├── recording_url (nullable — after class)
├── status (scheduled | live | completed | cancelled)
└── rating_avg, rating_count

enrollments
├── id (uuid, PK)
├── learner_id (FK → learner_profiles)
├── course_id or live_class_id
├── enrolled_at
├── progress_pct (for courses)
├── completed_at (nullable)
└── certificate_url (nullable)

transactions
├── id (uuid, PK)
├── parent_id (FK → users)
├── teacher_id (FK → users)
├── type (course_purchase | class_booking | refund | payout)
├── amount_xof (integer)
├── currency (XOF | EUR | USD)
├── commission_amount
├── teacher_amount
├── payment_provider (orange_money | wave | mtn_momo)
├── payment_reference
├── status (pending | completed | failed | refunded)
└── created_at

teacher_payouts
├── id (uuid, PK)
├── teacher_id (FK → users)
├── amount_xof
├── payout_phone
├── provider (orange_money | mtn_momo | wave)
├── status (pending | processing | completed | failed)
├── period_start, period_end
└── processed_at

messages
├── id (uuid, PK)
├── conversation_id
├── sender_id (FK → users)
├── content (text)
├── content_flagged (boolean — contact info detected)
├── attachments (jsonb)
├── read_at (nullable)
└── created_at

reviews
├── id (uuid, PK)
├── reviewer_id (FK → users — parent)
├── teacher_id (FK → users)
├── course_id or live_class_id
├── rating (1-5)
├── comment (text)
├── moderation_status (pending | approved | rejected)
└── created_at

referrals
├── id (uuid, PK)
├── referrer_id (FK → users)
├── referred_id (FK → users)
├── type (parent | teacher)
├── credit_amount_xof
├── status (pending | credited)
└── created_at

help_articles
├── id (uuid, PK)
├── title_fr, title_en
├── content_fr, content_en (markdown)
├── category (parent | teacher | student | payment | technical)
├── slug (text, unique)
├── search_vector (tsvector — for full-text search)
├── sort_order (int)
├── published (boolean)
└── updated_at

support_tickets
├── id (uuid, PK)
├── user_id (FK → users)
├── category (payment | technical | dispute | account | other)
├── priority (low | medium | high)
├── subject (text)
├── conversation (jsonb — [{role, content, timestamp}])
├── status (open | in_progress | resolved | closed)
├── escalated_from_ama (boolean)
├── resolved_at (nullable)
└── created_at

teacher_strikes
├── id (uuid, PK)
├── teacher_id (FK → users)
├── strike_level (warning | strike_1 | strike_2 | strike_3)
├── reason (text)
├── evidence (jsonb — report IDs, screenshots)
├── issued_by (FK → users — admin)
├── expires_at (timestamptz — 6 months from issue)
├── status (active | expired | appealed | overturned)
└── created_at

content_reports
├── id (uuid, PK)
├── reporter_id (FK → users)
├── reported_type (class | course | message | review | teacher)
├── reported_id (uuid — polymorphic)
├── category (inappropriate | safety | spam | off_platform | other)
├── description (text)
├── status (pending | reviewed | action_taken | dismissed)
├── admin_notes (text, nullable)
└── created_at

assignments
├── id (uuid, PK)
├── teacher_id (FK → users)
├── course_id or live_class_id
├── title, instructions (text)
├── due_at (timestamptz, nullable)
├── attachments (jsonb)
└── created_at

assignment_submissions
├── id (uuid, PK)
├── assignment_id (FK → assignments)
├── learner_id (FK → learner_profiles)
├── content (text — answer)
├── attachments (jsonb — photos, files)
├── grade (text, nullable — teacher feedback)
├── grade_score (int, nullable — 0-100)
├── submitted_at
└── graded_at (nullable)

teacher_coupons
├── id (uuid, PK)
├── teacher_id (FK → users)
├── code (text, unique)
├── discount_pct (int — 5-50%)
├── max_uses (int)
├── uses_count (int, default 0)
├── expires_at (timestamptz)
├── applies_to (all | course_id | live_class_id)
└── created_at

teacher_followers
├── id (uuid, PK)
├── parent_id (FK → users)
├── teacher_id (FK → users)
├── created_at
└── UNIQUE(parent_id, teacher_id)

waitlists
├── id (uuid, PK)
├── live_class_id (FK → live_classes)
├── parent_id (FK → users)
├── learner_id (FK → learner_profiles)
├── position (int)
├── notified (boolean, default false)
├── created_at
└── UNIQUE(live_class_id, learner_id)

platform_wallet
├── id (uuid, PK)
├── user_id (FK → users)
├── balance_xof (integer, default 0)
├── updated_at

wallet_transactions
├── id (uuid, PK)
├── wallet_id (FK → platform_wallet)
├── type (refund_credit | purchase_debit | referral_credit | guarantee_credit)
├── amount_xof (integer)
├── reference (text — what triggered this)
└── created_at

ai_teacher_twins (Phase 2 — schema designed now)
├── id (uuid, PK)
├── teacher_id (FK → users — the human teacher)
├── subject
├── grade_level
├── maturity_level (0 | 1 | 2 | 3)
├── total_recordings_processed (int)
├── teaching_style_profile (jsonb — pace, analogies, personality traits)
├── system_prompt (text — generated from teacher's style)
├── is_active (boolean — teacher can pause/disable)
├── price_xof (integer — per session, 200-500 FCFA)
├── total_sessions_served (int)
├── rating_avg, rating_count
├── created_at
└── last_trained_at

ai_training_content (per-recording extracted content)
├── id (uuid, PK)
├── twin_id (FK → ai_teacher_twins)
├── source_type (live_class_recording | pre_recorded_course | uploaded_material)
├── source_id (FK → live_classes or lessons)
├── transcription (text — full transcript)
├── extracted_topics (jsonb — [{topic, explanation, examples, exercises}])
├── embedding_ids (text[] — pgvector references)
├── processing_status (pending | transcribing | extracting | ready | failed)
└── created_at

ai_twin_sessions (student interaction logs)
├── id (uuid, PK)
├── twin_id (FK → ai_teacher_twins)
├── learner_id (FK → learner_profiles)
├── topic
├── conversation (jsonb — full session transcript)
├── exercises_attempted (int)
├── exercises_correct (int)
├── mastery_score (0-100)
├── duration_seconds (int)
├── tokens_used (int — for cost tracking)
├── escalated_to_human (boolean)
└── created_at
```

### Row-Level Security (RLS) Strategy

```
- Parents: read own data + children + enrolled content + public courses/teachers
- Teachers: read/write own courses/classes + enrolled students' progress
- Students: read enrolled courses + own progress (via parent's RLS)
- Admin: full access
- School admins: read/write their school's teachers and courses
- Messages: only conversation participants can read/write
- Transactions: only involved parent/teacher + admin
```

---

## 5. Project Structure

```
ecoleversity/
├── .env.local                    # Local secrets (never commit)
├── .env.example                  # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md                     # Project instructions for Claude Code
├── SPEC.md                       # This file
│
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── icons/                    # App icons (192, 512)
│   └── locales/
│       ├── fr/                   # French translations
│       └── en/                   # English translations
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── [locale]/             # i18n dynamic segment
│   │   │   ├── layout.tsx        # Root layout with locale
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── verify/
│   │   │   ├── (marketplace)/
│   │   │   │   ├── courses/      # Browse courses
│   │   │   │   ├── classes/      # Browse live classes
│   │   │   │   ├── teachers/     # Browse teachers
│   │   │   │   ├── exams/        # Exam prep hub
│   │   │   │   └── search/       # Search results
│   │   │   ├── (learning)/
│   │   │   │   ├── course/[id]/  # Course player (video + quiz)
│   │   │   │   ├── class/[id]/   # Live class room (Jitsi)
│   │   │   │   └── schedule/     # Student schedule
│   │   │   ├── (dashboard)/
│   │   │   │   ├── parent/       # Parent dashboard
│   │   │   │   │   ├── children/
│   │   │   │   │   ├── progress/
│   │   │   │   │   ├── payments/
│   │   │   │   │   └── messages/
│   │   │   │   ├── teacher/      # Teacher dashboard
│   │   │   │   │   ├── courses/
│   │   │   │   │   ├── classes/
│   │   │   │   │   ├── students/
│   │   │   │   │   ├── earnings/
│   │   │   │   │   └── messages/
│   │   │   │   ├── school/       # School admin dashboard
│   │   │   │   └── admin/        # Platform admin
│   │   │   ├── (onboarding)/
│   │   │   │   ├── teacher/      # 7-step teacher onboarding wizard
│   │   │   │   └── parent/       # 4-step parent onboarding wizard
│   │   │   └── (static)/
│   │   │       ├── about/
│   │   │       ├── help/         # Help center (searchable articles)
│   │   │       ├── support/      # AI chatbot "Ama" + ticket system
│   │   │       └── terms/
│   │   └── api/                  # API routes
│   │       ├── auth/
│   │       ├── courses/
│   │       ├── classes/
│   │       ├── payments/
│   │       │   ├── initiate/     # Orange Money / Wave / MTN MoMo
│   │       │   ├── webhook/      # Payment callbacks (per provider)
│   │       │   └── payouts/      # Teacher payouts (direct mobile money)
│   │       ├── messages/
│   │       ├── reviews/
│   │       ├── upload/           # Video/file upload
│   │       ├── notifications/    # WhatsApp/Email/SMS/push
│   │       ├── referrals/
│   │       └── admin/
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui components
│   │   ├── layout/               # Header, Footer, Sidebar, MobileNav
│   │   ├── course/               # CourseCard, CoursePlayer, LessonList
│   │   ├── class/                # ClassCard, JitsiRoom, Schedule
│   │   ├── teacher/              # TeacherCard, TeacherProfile, VerificationBadge
│   │   ├── student/              # ProgressBar, QuizWidget, Certificate
│   │   ├── payment/              # PaymentModal, MobileMoneyForm, PriceTag
│   │   ├── messaging/            # ChatWindow, ConversationList, ContactDetector
│   │   ├── search/               # SearchBar, FilterPanel, ResultsGrid
│   │   ├── onboarding/            # StepWizard, ProgressBar, WelcomeVideo, ProfileSetup
│   │   ├── support/              # ChatWidget, HelpArticle, TicketForm, AmaBot
│   │   └── common/               # LoadingSpinner, OfflineBanner, LowBandwidthImage
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   ├── server.ts         # Server Supabase client
│   │   │   ├── admin.ts          # Service role client (admin ops)
│   │   │   └── types.ts          # Generated DB types
│   │   ├── payments/
│   │   │   ├── bootstrap.ts      # MVP: SMS scraping + manual confirmation logic
│   │   │   ├── confirm.ts        # Match incoming payment to pending booking
│   │   │   └── provider.ts       # Future: CinetPay/direct API abstraction
│   │   ├── notifications/
│   │   │   ├── whatsapp.ts       # WhatsApp Business API (PRIMARY)
│   │   │   ├── email.ts          # Resend (SECONDARY — receipts, summaries)
│   │   │   ├── push.ts           # Web push notifications (always in parallel)
│   │   │   └── cascade.ts        # Notification cascade logic (WhatsApp → email)
│   │   ├── video/
│   │   │   ├── jitsi.ts          # Jitsi room management
│   │   │   ├── upload.ts         # Video upload to R2/Stream
│   │   │   └── transcode.ts      # Quality variants
│   │   ├── ai/
│   │   │   ├── moderation.ts     # Content & message moderation
│   │   │   ├── recommendations.ts
│   │   │   ├── support-bot.ts    # AI customer support chatbot "Ama"
│   │   │   ├── help-center.ts   # Help article search and retrieval
│   │   │   └── twin/             # AI Teacher Digital Twins (Phase 2)
│   │   │       ├── engine.ts     # Core twin conversation engine (Claude API + RAG)
│   │   │       ├── trainer.ts    # Background pipeline: recording → transcription → extraction
│   │   │       ├── transcribe.ts # Deepgram/Whisper integration for French audio
│   │   │       ├── extractor.ts  # Claude API: extract topics, examples, exercises from transcript
│   │   │       ├── profile.ts    # Teaching style profiler (pace, analogies, personality)
│   │   │       └── session.ts    # Student session management, mastery tracking
│   │   ├── contact-detector.ts   # Regex + AI detection of personal info in messages
│   │   ├── offline.ts            # Service worker registration, sync
│   │   └── utils.ts              # Shared utilities
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-offline.ts
│   │   ├── use-bandwidth.ts      # Detect connection speed
│   │   └── use-locale.ts
│   │
│   ├── types/
│   │   ├── database.ts           # Supabase generated types
│   │   ├── api.ts                # API request/response types
│   │   └── domain.ts             # Business domain types
│   │
│   └── i18n/
│       ├── config.ts
│       ├── request.ts
│       └── messages/
│           ├── fr.json
│           └── en.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/               # SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   └── seed.sql                  # Demo data
│
├── scripts/
│   ├── generate-types.sh         # supabase gen types
│   └── seed-demo-data.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 6. Code Style & Conventions

### Language Rules
- **Code, comments, variable names:** English
- **UI text, labels, placeholders:** French (primary) via i18n files
- **User-facing content (courses, descriptions):** Teacher's choice (fr/en)

### TypeScript
- Strict mode (`"strict": true`)
- Use `type` over `interface` unless extending
- Zod for runtime validation at API boundaries
- Functional patterns: `map`, `filter`, `reduce` over imperative loops
- No `any` — use `unknown` + type narrowing

### Components
- React Server Components by default — `"use client"` only when needed
- Shadcn/ui for all base components — never build from scratch what Shadcn provides
- Component files: one component per file, colocated with its types
- Naming: `PascalCase` for components, `camelCase` for hooks/utils, `kebab-case` for files

### Database
- All queries through Supabase client — never raw SQL in application code
- RLS policies enforce authorization — no manual permission checks in API routes
- Timestamps always `timestamptz` (UTC)
- Money always stored as integers (FCFA centimes or just FCFA since no centimes)

### API Routes
- Zod validation on every request body
- Consistent response shape: `{ data, error, message }`
- HTTP status codes: 200 (success), 201 (created), 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (server error)

### Git
- Branch naming: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Never commit `.env.local`, credentials, or API keys
- PR per feature slice

---

## 7. Testing Strategy

### Unit Tests (Vitest)
- All business logic in `lib/` — pure functions, easy to test
- Payment amount calculations, commission splits
- Contact detection regex
- Currency conversion
- Exam scoring logic

### Integration Tests (Vitest + Supabase Local)
- API routes with Supabase local instance
- RLS policy verification — ensure parents can't see other families' data
- Payment webhook processing
- Notification dispatch

### E2E Tests (Playwright)
- Critical user flows:
  1. Parent registers → adds child → searches courses → enrolls → pays
  2. Teacher registers → uploads verification → creates course → publishes
  3. Student watches lesson → completes quiz → gets certificate
  4. Parent books 1-on-1 → pays → joins Jitsi call
  5. Message exchange (verify contact detection blocks phone numbers)
- Mobile viewport (375px) is primary test target
- Offline mode: test with network throttling

### Performance Tests
- Core page load: <3s on 3G (Lighthouse simulated)
- Video player start: <5s on 3G
- Search results: <2s response time
- PWA install prompt: functional on Chrome Android

---

## 8. Boundaries

### Always Do
- Mobile-first design — every page designed for 375px first
- French as default language — all UI, all errors, all notifications
- Validate all user input server-side with Zod
- Store money as integers (FCFA) — never floating point
- Use RLS for authorization — defense in depth
- Compress images and optimize for slow connections
- Block personal contact information in messages
- Log all payment events for audit trail
- Auto-save progress for course viewing

### Ask First
- Before adding a new external service/API
- Before changing the data model schema
- Before modifying the payment flow
- Before changing commission rates or pricing logic
- Before deploying to production
- Before sending bulk WhatsApp/SMS (cost implications)
- Before adding a new language

### Never Do
- Never store passwords in plain text (Supabase Auth handles this)
- Never expose API keys in client-side code
- Never allow off-platform communication (block contact sharing)
- Never process payments without webhook verification
- Never delete user data without soft-delete first
- Never serve uncompressed video
- Never assume stable internet — always handle offline gracefully
- Never charge in currencies other than what the user selected
- Never expose student data to non-parent users
- Never skip teacher verification before publishing classes
- Never commit `.env.local` or any credentials

---

## 9. MVP Scope & Phasing

### Build Philosophy

Build everything. Build it right. Build it now. No "MVP mindset" — this is the full platform.

The only concession to reality: **bootstrap payments first** (personal Orange Money/Wave SIM cards + SMS scraping), because API access requires business registration which triggers aggressive taxation in Côte d'Ivoire. Formalize when the business is profitable.

Build each phase. Test every feature before moving on. One phase at a time, but nothing gets cut.

---

### Phase 1: Foundation (Days 1-5)
**Goal:** App shell, auth, database, all tables, onboarding flows.

- [ ] Next.js project setup: TypeScript, Tailwind, Shadcn/ui
- [ ] Supabase project: **full schema** (all tables from data model), RLS policies, auth
- [ ] i18n setup: French (primary) + English
- [ ] Auth: phone OTP (Supabase Auth) + email + Google OAuth
- [ ] PWA manifest + service worker skeleton
- [ ] Landing page: hero, how it works, features, CTA
- [ ] Teacher registration + 7-step onboarding wizard
- [ ] Parent registration + 4-step onboarding wizard
- [ ] Admin dashboard: teacher verification queue (approve/reject)
- [ ] Mobile-first responsive layout (375px primary)

**Test:** Teacher signs up → onboarding → verified by admin. Parent signs up → adds child. Both see a polished, mobile-first experience.

### Phase 2: Live Tutoring + Bootstrap Payments (Days 6-12)
**Goal:** The core transaction loop works. Teachers teach, parents pay, money flows.

- [ ] Teacher: set weekly availability (time slots), create profile page
- [ ] Teacher catalog: browse, filter by subject/grade/city/rating
- [ ] Teacher profile page: photo, bio, subjects, availability, ratings, "Suivre" button
- [ ] Parent: browse available teachers + time slots, book a session
- [ ] **Bootstrap payment flow:**
  - [ ] Booking page: "Envoyez X FCFA à ce numéro Orange Money / Wave"
  - [ ] Platform phone numbers displayed (one per provider)
  - [ ] Parent sends money from their phone
  - [ ] **SMS scraping service** (Node.js script): monitors incoming SMS, parses payment confirmations
  - [ ] Auto-match payment to pending booking (by amount + reference) → confirm → notify
  - [ ] Admin fallback: manually confirm payment from dashboard
- [ ] Jitsi integration: create room per session, join links, auto-recording
- [ ] Session page: countdown, "Rejoindre le cours" button, Jitsi embed
- [ ] Post-session: parent rates teacher (1-5 stars + comment)
- [ ] Teacher earnings dashboard: sessions, amounts, pending payouts
- [ ] Manual teacher payouts: admin processes weekly from dashboard
- [ ] Commission tracking (20-25%)
- [ ] Transaction history for parents and teachers

**Test:** Full loop — parent books, pays via Orange Money, joins Jitsi call with teacher, rates afterward. Teacher sees earnings.

### Phase 3: Group Classes + Pre-Recorded Courses (Days 13-18)
**Goal:** Both class formats live. Teachers earn from live AND passive content.

- [ ] Teacher: create group class (title, subject, grade, max students, price, schedule)
- [ ] Group class catalog: browse, filter, search by subject/grade/exam
- [ ] Group class booking + bootstrap payment
- [ ] Jitsi group room: teacher + up to 15 students
- [ ] Waitlist: when class full → join waitlist → auto-notify on opening
- [ ] Teacher: create pre-recorded course (title, description, subject, grade, price)
- [ ] Teacher: upload video lessons (Cloudflare Stream — adaptive bitrate)
- [ ] Teacher: add quizzes and PDF attachments to lessons
- [ ] Course catalog: browse, filter, search
- [ ] Course detail page: preview, syllabus, teacher info
- [ ] Student: video player with progress tracking
- [ ] Student: enroll + bootstrap payment
- [ ] Auto-recording of live sessions → saved to Cloudflare Stream

**Test:** Group class fills up, runs smoothly. Pre-recorded course purchased and watched with progress saved.

### Phase 4: Communication + Notifications (Days 19-23)
**Goal:** All communication channels live. In-app messaging. WhatsApp + email + push notifications.

- [ ] In-app messaging: parent ↔ teacher
- [ ] Contact detection: regex blocking of phone numbers, emails, social handles
- [ ] Message attachments: files only in DMs (no images — blocks photo-based contact sharing)
- [ ] Messaging invariant: teachers message parent accounts only, never learner profiles
- [ ] **WhatsApp notifications** (360dialog Business API): booking confirmation, session reminders (24h + 15min), payment receipt, new message alert, progress updates
- [ ] **Email notifications** (Resend): receipts, weekly progress summaries, verification updates
- [ ] **Push notifications** (PWA): always sent in parallel — session starting, new message, new booking
- [ ] Notification preferences: user chooses preferred channel, cascade logic (WhatsApp → email fallback)
- [ ] Teacher following: parents follow teachers → notified of new classes/courses

**Test:** Book a session → get WhatsApp confirmation + email receipt + push notification. Message a teacher → contact detection blocks phone numbers.

### Phase 5: Engagement + Trust (Days 24-28)
**Goal:** Exam prep, referrals, support, safety, certificates — everything that builds trust and retention.

- [ ] Exam prep hub: CEPE, BEPC, BAC, Concours 6ème sections
- [ ] Practice tests with timer and scoring
- [ ] Homework/assignment system: teacher creates, student submits, teacher grades
- [ ] Referral program: parent invites parent → both get 1,000 FCFA credit (wallet)
- [ ] Platform wallet: balance tracking, refund credits, referral credits, purchase debits
- [ ] AI customer support chatbot "Ama" (Claude API + knowledge base)
- [ ] Help center: 20+ searchable FAQ articles in French
- [ ] Support ticket system: auto-created by Ama or manual, SLA tracking
- [ ] Certificate generation (PDF): auto on course completion
- [ ] Teacher coupons: discount codes for own classes
- [ ] Teacher away mode: auto-response when unavailable
- [ ] Teacher strike system: warning → strike 1 → strike 2 → ban (6-month expiry)
- [ ] Content reporting: "Signaler" button everywhere, admin review queue
- [ ] Satisfaction guarantee: "Promesse EcoleVersity" (50% wallet credit, 2x/year)
- [ ] Calendar integration: .ics download + Google/Apple Calendar feed
- [ ] Parental progress dashboard: all children, sessions, spending, progress

**Test:** Full trust loop — report content, get support from Ama, earn referral credit, use wallet to book, get certificate.

### Phase 6: Polish + Launch (Days 29-30)
**Goal:** Real-device testing, performance, security, go live.

- [ ] Performance audit: Lighthouse on real Android (375px, 3G throttle)
- [ ] Jitsi call quality test on slow connection
- [ ] Security audit: RLS policies, data isolation between families, payment flow
- [ ] SEO: meta tags, Open Graph, sitemap
- [ ] Terms of service + privacy policy (French)
- [ ] Teacher onboarding video guides (5 short videos: how to create course, use Jitsi, etc.)
- [ ] Seed: 10-20 pre-recruited teachers with completed profiles + real content
- [ ] Soft launch with 50 parents from teacher networks
- [ ] AI content moderation active on reviews and messages

**Test:** 10 real tutoring sessions in one day. Platform doesn't break. Payments confirmed. Teachers paid.

---

### Post-Launch Roadmap (Month 2+)

| When | What | Trigger |
|------|------|---------|
| **Month 2** | CinetPay payment API (automate payments) | >50 transactions/week |
| **Month 2** | Offline video download (PWA + IndexedDB) | User feedback confirms demand |
| **Month 2** | SMS notifications (Africa's Talking — fallback) | Users without WhatsApp identified |
| **Month 3** | AI Teacher Digital Twins (Phase 7) | >30 recorded sessions per top teacher |
| **Month 3** | USSD access for feature phones | Rural user research |
| **Month 3** | Local languages (Baoulé, Dioula, Bété) | Expansion beyond Abidjan |
| **Month 4** | School/institution accounts | First school partnership |
| **Month 6** | Business registration (RCCM) + ARTCI | Revenue > 500K FCFA/month |
| **Month 6** | Direct payment APIs | Fee savings justify engineering |
| **Month 6** | Senegal expansion | CI model proven |

### Phase 6: AI Teacher Digital Twins (Post-MVP — Month 2-3)
**Goal:** Turn every teacher into an AI-amplified educator

**6A: Training Pipeline (Week 1-2)**
- [ ] Deepgram integration for French audio transcription
- [ ] Background job: auto-transcribe every live class recording
- [ ] Claude API extraction: topics, explanations, examples, exercises from transcripts
- [ ] Per-teacher knowledge base with pgvector embeddings
- [ ] Teacher dashboard: twin maturity level, recordings processed, opt-in/out toggle

**6B: AI Twin Engine (Week 3-4)**
- [ ] Twin conversation engine: Claude API + teacher-specific RAG
- [ ] System prompt generation from teaching style profile
- [ ] Interactive lesson flow: explain → check understanding → practice → review
- [ ] Exercise generation adapted to student level
- [ ] Mastery tracking per topic per student

**6C: Student Experience (Week 5-6)**
- [ ] AI twin lesson page: "Maths 3ème avec M. Koné (IA)"
- [ ] Clear AI labeling throughout (never pretend to be human)
- [ ] Session history and progress tracking
- [ ] "Ask the real teacher" escalation button
- [ ] Offline mode: cached lesson content for text-based learning without internet

**6D: Monetization & Teacher Dashboard (Week 7-8)**
- [ ] AI twin pricing (200-500 FCFA per session)
- [ ] Revenue split: 50% teacher / 30% platform / 20% AI infra
- [ ] Teacher earnings dashboard for twin sessions
- [ ] Teacher review interface: correct twin's responses
- [ ] Quality audit system: spot-check twin accuracy

---

## 10. Payment Architecture

### Payment Evolution — 3 Stages

#### Stage 1: Bootstrap (MVP — Days 1-30)
**No API. No business registration. Personal mobile money accounts.**

```
Parent books a tutoring session (2,000 FCFA)
  → Booking page shows:
     "Pour confirmer, envoyez 2,000 FCFA à:"
     📱 Orange Money: 07 XX XX XX XX
     📱 Wave: 05 XX XX XX XX
     Référence: EV-2026-00042 (include in transfer message)

  → Parent opens Orange Money / Wave on their phone
  → Sends 2,000 FCFA to the platform number with reference

  → SMS SCRAPING SERVICE (runs on founder's phone or cheap Android):
     - Monitors incoming SMS from Orange Money / Wave
     - Parses: amount, sender number, reference, timestamp
     - Calls EcoleVersity API: POST /api/payments/confirm
     - API matches to pending booking → status: CONFIRMED
     - Parent gets email: "Paiement reçu! Votre cours est confirmé."
     - Teacher gets email: "Nouveau cours confirmé pour [date]"

  → FALLBACK: Admin dashboard shows pending bookings
     - Admin can manually confirm payment (saw it in mobile money history)
     - "Confirmer le paiement" button

  → TEACHER PAYOUT (manual, weekly):
     - Admin dashboard shows: "Teachers to pay this week"
     - Founder manually sends Orange Money / Wave to each teacher
     - Marks payout as completed in admin dashboard
```

**Why this works:** Every tutoring center in Abidjan already operates this way. Parents are used to sending money via Orange Money. No new behavior required. The platform just organizes the matching and scheduling.

**SMS Scraping Script (Technical Detail):**
```typescript
// Runs on Android phone with Termux, or a $5/month Tasker automation
// Orange Money SMS format: "Vous avez recu 2000 FCFA de 07XXXXXXXX. Ref: EV-2026-00042"
// Wave SMS format: "Transfert recu: 2 000 F de 05XXXXXXXX"

// Script parses incoming SMS → extracts amount + sender + reference
// Calls: POST https://ecoleversity.com/api/payments/sms-confirm
// Body: { amount, senderPhone, reference, provider, rawSms }
// API matches reference to pending transaction → confirms booking
```

#### Stage 2: CinetPay API (Month 2 — when volume > 50 transactions/week)
```
Parent books session → "Payer" button → CinetPay checkout
  → Choose: Orange Money | Wave | MTN MoMo (single API handles all)
  → USSD push or in-app redirect
  → CinetPay webhook → our API → auto-confirm → auto-notify
  → Teacher balance auto-credited
  → Weekly automated payouts via CinetPay disbursement
```

#### Stage 3: Direct Provider APIs (Month 6+ — when fee savings > engineering cost)
Direct integration with Orange Money, Wave, MTN MoMo for lower fees (~1-2% vs 2.5-3.5%).

### Commission Logic

```typescript
const COMMISSION_RATE = 0.20; // 20% platform fee

function calculateSplit(priceXof: number): { platform: number; teacher: number } {
  const platform = Math.round(priceXof * COMMISSION_RATE);
  const teacher = priceXof - platform;
  return { platform, teacher };
}
// Session at 2,000 FCFA: platform keeps 400, teacher gets 1,600
```

### Refund Policy (MVP — Simple)
- **Before session:** Full refund (admin sends money back manually)
- **After session:** No refund (dispute resolution via admin)
- **Stage 2+:** Wallet credits for refunds, real money refunds as option

---

## 11. Infrastructure & Performance

### Performance Budgets

| Metric | Target | Rationale |
|--------|--------|-----------|
| First Contentful Paint | <2s on 4G | Mobile users on mid-range Android |
| Largest Contentful Paint | <4s on 3G | Worst-case rural connection |
| Total page weight (no video) | <200KB | Data costs matter |
| Video start time | <5s on 3G | Buffer enough to start playing |
| API response time | <500ms p95 | Supabase edge functions |
| Offline → Online sync | <10s | Background sync on reconnect |

### Bandwidth Optimization Strategies

1. **Adaptive images:** `next/image` with `sizes` prop, WebP format, blur placeholder
2. **Lazy loading:** Below-fold content, images, non-critical JS
3. **Video quality tiers:** 240p (default mobile), 360p, 480p, 720p — user or auto-select
4. **API pagination:** 20 items per page, cursor-based
5. **Compression:** Brotli for text, gzip fallback
6. **Service worker caching:** App shell, static assets, viewed course pages
7. **Prefetch:** Next.js link prefetching for likely navigation targets

### Hosting Architecture

```
Vercel (Free → Pro at scale)
├── Edge Network: SSR + ISR for course catalog pages
├── Serverless Functions: API routes
└── Edge Middleware: locale detection, auth redirect

Supabase (Free → Pro at scale)
├── PostgreSQL: all data
├── Auth: email, phone OTP, Google
├── Storage: images, PDFs, teacher documents
├── Realtime: chat messages, presence
└── Edge Functions: webhooks, cron jobs

Cloudflare (Free tier)
├── R2: video storage (no egress fees)
├── Stream: video transcoding + adaptive playback
└── CDN: static assets, African PoPs
```

### Cost Estimates (MVP / Month)

| Service | Free Tier | Estimated Cost |
|---------|-----------|---------------|
| Vercel | 100GB bandwidth | $0 (MVP) → $20/mo |
| Supabase | 500MB DB, 1GB storage | $0 (MVP) → $25/mo |
| Cloudflare R2 | 10GB storage, 10M reads | $0 (MVP) → $5/mo |
| Cloudflare Stream | — | $5/mo + $1/1000 min |
| Orange Money API | — | Direct transaction fees (~1-2%) |
| Wave API | — | Direct transaction fees (~1%) |
| MTN MoMo API | — | Direct transaction fees (~1-2%) |
| WhatsApp Business API (360dialog) | — | ~$0.005-0.03/msg (template) |
| Africa's Talking SMS (fallback only) | — | ~3 FCFA/SMS (~$0.005) |
| Resend | 3000 emails/mo | $0 (MVP) |
| PostHog | 1M events/mo | $0 (MVP) |
| **Total MVP** | | **~$10-30/month** |

---

## 12. Security & Trust

### Authentication
- Supabase Auth: email + password, phone OTP (primary for CI users), Google OAuth
- Phone OTP is critical — most CI users don't have email-first habits
- Session management: Supabase JWT, refresh tokens, 7-day expiry
- Rate limiting on auth endpoints (5 attempts/15 min)

### Authorization (RLS)
- Every table has RLS enabled — no exceptions
- Parents see only their family's data
- Teachers see only their courses/classes and enrolled students
- Admin role for platform operations
- School admins see only their institution's data

### Contact Information Blocking
```
Detection layers:
1. Regex: phone patterns (XX XX XX XX XX, +225XXXXXXXXXX, 07/05/01 patterns)
2. Regex: email patterns, social media handles (@, facebook, whatsapp, telegram)
3. AI moderation: Claude API for subtle attempts ("call me at seven zero...")
4. Messages with detected contacts: blocked, sender warned, incident logged
5. Repeat offenders: account suspension
```

### Payment Security
- Per-provider webhook signature verification on every callback (Orange, Wave, MTN)
- Idempotency keys on payment creation (prevent double charges)
- All transaction logs immutable (append-only)
- Teacher payouts require admin approval above 500,000 FCFA
- Fraud detection: unusual patterns flagged for review

### Data Privacy
- GDPR-aligned (French data protection principles apply)
- Student data (minors): extra protection, no marketing, parent consent required
- Teacher documents (ID, diploma): encrypted at rest in Supabase Storage
- Right to deletion: soft delete → hard delete after 30 days
- No data sold to third parties — ever

### Teacher Verification
```
Verification flow:
1. Teacher registers → status: PENDING
2. Upload CNI (national ID) → status: ID_SUBMITTED
3. Upload diploma/certificate → status: DIPLOMA_SUBMITTED
4. Record 60-second video introduction → status: VIDEO_SUBMITTED
5. Admin reviews all three → status: FULLY_VERIFIED or REJECTED
6. Only FULLY_VERIFIED teachers can publish courses/classes

Future: automated ID verification via AI, background check integration
```

---

## 13. Growth & Expansion

### Phase 1: Côte d'Ivoire (Months 1-6)
- Launch in Abidjan, expand to Bouaké, Yamoussoukro, San-Pédro
- Partner with 3-5 exam prep academies
- Target: 500 teachers, 5,000 students

### Phase 2: Senegal (Months 6-12)
- Same FCFA currency zone (UEMOA) — no currency changes needed
- Adapt for Senegalese exam system (BFEM, BAC)
- Orange Money and Wave already operate in Senegal — same direct APIs
- Target: 200 teachers, 2,000 students

### Phase 3: Francophone West Africa (Year 2)
- Mali, Burkina Faso, Togo, Benin, Guinea, Cameroon
- Each country: localize exam prep, add local languages
- Country-specific landing pages and SEO

### Marketing Channels
- **WhatsApp groups:** Parents' groups for schools — viral distribution
- **Teacher referrals:** Teachers invite their existing students
- **Facebook/Instagram:** Most-used social platforms in CI
- **Radio partnerships:** Local FM stations for rural awareness
- **School partnerships:** Bulk deals for schools using the platform
- **Exam season campaigns:** Targeted ads before BEPC/BAC periods

---

## 14. Acceptance Criteria

The MVP is ready to ship when:

### Launch Criteria — Platform Ships When ALL of These Work

#### Core (Phase 1-2)
- [ ] Teacher registers → 7-step onboarding → verified by admin → appears in catalog
- [ ] Parent registers → 4-step onboarding → adds child → browses teachers
- [ ] Parent books live tutoring session → pays via Orange Money/Wave → SMS scraping auto-confirms
- [ ] Admin can manually confirm payments as fallback
- [ ] Jitsi video call: teacher and student join, session auto-recorded
- [ ] Post-session: parent rates teacher (1-5 stars + comment)
- [ ] Teacher earnings dashboard + admin processes manual weekly payouts
- [ ] i18n: French primary, English secondary

#### Classes & Content (Phase 3)
- [ ] Group classes via Jitsi (up to 15 students) with waitlist
- [ ] Pre-recorded courses: upload, browse, purchase, watch with progress tracking
- [ ] Video lessons on Cloudflare Stream (adaptive bitrate)
- [ ] Course quizzes and PDF attachments

#### Communication (Phase 4)
- [ ] In-app messaging with contact detection (regex blocking)
- [ ] No images in DMs (prevents photo-based contact sharing)
- [ ] Teachers can only message parent accounts, never learner profiles
- [ ] WhatsApp notifications: booking, reminders, payments, progress
- [ ] Email notifications: receipts, weekly summaries
- [ ] Push notifications (PWA): session starting, new message
- [ ] Teacher following with new content notifications

#### Engagement & Trust (Phase 5)
- [ ] Exam prep: CEPE, BEPC, BAC, Concours 6ème with practice tests
- [ ] Homework/assignment system (create, submit, grade)
- [ ] Referral program with wallet credits
- [ ] Platform wallet: refunds, referrals, purchases
- [ ] AI chatbot "Ama" for customer support
- [ ] Help center: 20+ FAQ articles in French
- [ ] Support ticket system with SLA
- [ ] Certificate generation (PDF)
- [ ] Teacher coupons, away mode, strike system
- [ ] Content reporting on all user-generated content
- [ ] Satisfaction guarantee ("Promesse EcoleVersity")
- [ ] Calendar sync (Google/Apple)
- [ ] Parental progress dashboard (all children)

#### Quality (Phase 6)
- [ ] Works on Android Chrome (375px, 3G)
- [ ] PWA installable with offline shell
- [ ] RLS security audit passed
- [ ] AI content moderation active
- [ ] 10+ real tutoring sessions completed without issues

### Post-Launch Features
- [ ] AI Teacher Digital Twins (Month 3)
- [ ] Offline video download (Month 2)
- [ ] SMS/USSD access (Month 3)
- [ ] Local languages: Baoulé, Dioula, Bété (Month 3)
- [ ] School/institution accounts (Month 4)
- [ ] CinetPay API → Direct APIs (Month 2 → Month 6)
- [ ] Business registration when profitable (Month 6)

---

## Decisions Log (Resolved)

> Previously "Open Questions" — all resolved on 2026-04-08.

### 1. Video Hosting — Cloudflare Stream (MVP)
**Decision:** Start with Cloudflare Stream ($5/mo + $1/1,000 min viewed). Simple, no ops burden, adaptive bitrate out of the box.
**Revisit trigger:** At ~1,000 videos or when costs exceed $50/mo, evaluate self-hosted HLS with FFmpeg on a VPS.

### 2. Jitsi Hosting — JaaS Free Tier (MVP)
**Decision:** Start with JaaS (Jitsi as a Service) free tier (25 users/month). Sufficient for beta and early growth.
**Revisit trigger:** When live class usage exceeds free tier limits, migrate to self-hosted Jitsi on a VPS (~$10/mo, unlimited users).

### 3. Notification Strategy — WhatsApp First, SMS Last
**Decision:** Notification priority cascade: WhatsApp (primary) → Email (secondary) → SMS (fallback for critical alerts only). Push notifications (PWA) always sent in parallel.
**Rationale:** WhatsApp reaches 90%+ of CI smartphone users, supports rich messages, and costs 5-10x less than SMS at scale. At 10,000 users × 5 notifications/week: WhatsApp ~$100-600/mo vs SMS ~$1,000/mo.

### 4. Teacher Content Quality — Hybrid Review
**Decision:** Three-layer quality assurance:
1. **Automated minimum requirements:** Video ≥480p resolution, ≥2 min duration, ≤15 min per segment, audio clarity check
2. **AI quality review:** Claude API checks content relevance, audio quality, language appropriateness
3. **Manual admin review:** Required for first 3 uploads per teacher
4. **Auto-publish unlock:** After 3 approved uploads + 4.5+ average rating → teacher can self-publish (spot-checked by admin)

### 5. Dispute Resolution & Refund Policy
**Decision:** Refunds credited to **platform wallet** (not back to mobile money — avoids reversal fees of 1-3%).

| Scenario | Refund Policy |
|----------|--------------|
| **Pre-recorded course** — cancelled within 48h AND <20% watched | 100% refund to wallet |
| **Pre-recorded course** — >48h or >20% watched | No refund |
| **Live group class** — cancelled 24h+ before start | 100% refund to wallet |
| **Live group class** — cancelled <24h before start | 50% refund to wallet |
| **Live group class** — attended | No refund |
| **1-on-1 tutoring** — cancelled 24h+ before | 100% refund to wallet |
| **1-on-1 tutoring** — cancelled <24h or no-show | No refund |

Wallet credit can be used for any future purchase. No expiry on wallet balance.

---

## Founder Vision

**Inspiration:** Medvi by Matthew Gallagher — solo founder who built a $1.8B telehealth company with $20K and AI tools, outsourcing compliance and fulfillment while using AI to run operations, marketing, customer service, and analytics.

**EcoleVersity applies the same model to education:**
- **Founder = orchestrator** — product vision, growth strategy, partnerships
- **Claude Code = entire engineering team** — builds and maintains the platform
- **Teachers = supply side** — create content, deliver classes (outsourced expertise)
- **AI Digital Twins = scalable supply** — teachers' knowledge cloned and available 24/7 to unlimited students
- **Payment providers = financial infrastructure** — Orange Money, Wave, MTN MoMo APIs handle money directly
- **Telecoms = communication layer** — WhatsApp, SMS, voice via APIs

**The AI Twin Flywheel:**
```
Teachers record classes → AI learns their style → Twin teaches students 24/7
  → Teacher earns passive income → Motivated to record more → Twin improves
  → More students access affordable education → Platform grows → More teachers join
```

**Goal:** Build a one-person, AI-powered education company that serves millions across francophone West Africa. Start Côte d'Ivoire → Senegal → UEMOA zone → all francophone Africa.

---

*This spec is a living document. Update it as decisions are made and requirements evolve.*
