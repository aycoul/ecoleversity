# EcoleVersity: Built vs. Spec Gap Analysis

## ✅ ALREADY BUILT (MVP Complete)

### Auth & Profiles
| Feature | Status |
|---------|--------|
| Email/password registration | ✅ |
| Role selection (learner/parent/tutor/admin) | ✅ |
| Parent adds multiple child profiles | ✅ |
| Tutor profile (photo, bio, subjects, ratings, verification) | ✅ |
| Email verification | ✅ |

### Class Listings & Discovery
| Feature | Status |
|---------|--------|
| Class creation with title, desc, subject, age, format, price | ✅ |
| Class thumbnail | ✅ |
| Max students / capacity enforcement | ✅ |
| Homepage with featured classes | ✅ |
| Search bar + filters (subject, age, price, format) | ✅ |
| Subject taxonomy (Maths, SVT, Français, BEPC/BAC prep, etc.) | ✅ |
| Tutor listing with ratings | ✅ |

### Booking & Enrollment
| Feature | Status |
|---------|--------|
| Availability calendar per tutor | ✅ |
| Enrollment + confirmation | ✅ |
| Waitlist for full classes | ✅ |
| Booking confirmation emails | ✅ |

### Payments
| Feature | Status |
|---------|--------|
| Orange Money, Wave, MTN MoMo | ✅ |
| PayPal (diaspora) | ✅ |
| All amounts in XOF | ✅ |
| 20% platform commission | ✅ |
| Tutor payout request + admin approval | ✅ |
| Payment history (parent + tutor) | ✅ |
| Wallet system | ✅ |

### Live Sessions
| Feature | Status |
|---------|--------|
| LiveKit video (embedded) | ✅ |
| Session link sent (email/WhatsApp/push) | ✅ |
| Text chat | ✅ |
| Screen sharing | ✅ |
| Recording | ✅ |
| Session status flow (scheduled→live→completed) | ✅ |

### Notifications
| Feature | Status |
|---------|--------|
| In-app messaging | ✅ |
| Email notifications (Resend) | ✅ |
| Web push notifications | ✅ |
| WhatsApp notifications (AILead) | ✅ |
| Session reminders (5-min cron) | ✅ |

### Reviews
| Feature | Status |
|---------|--------|
| Post-session ratings (1-5 stars) | ✅ |
| Written reviews | ✅ |
| Average rating on tutor profile | ✅ |

### Dashboards
| Feature | Status |
|---------|--------|
| Tutor: sessions, classes, earnings, payouts, messages | ✅ |
| Parent: enrolled classes, sessions, payments, children | ✅ |
| Admin: verification, payouts, reports, tickets, analytics | ✅ |
| Kid mode (switch to learner view) | ✅ |

### Admin Panel
| Feature | Status |
|---------|--------|
| Tutor application review | ✅ |
| Class moderation | ✅ |
| User management | ✅ |
| Payout management | ✅ |
| Support tickets | ✅ |
| Platform analytics | ✅ |
| AI twins / AI settings | ✅ |
| Role-based access (admin_scope) | ✅ |

---

## ❌ MISSING — Priority 1 (High Impact, Low Effort)

| # | Feature | Why It Matters | Est. Effort |
|---|---------|---------------|-------------|
| 1 | **Google OAuth login** | Reduces signup friction; most users prefer OAuth | 2-3h |
| 2 | **Trial session option** | Critical conversion driver — Outschool's #1 growth tactic | 3-4h |
| 3 | **Wishlist / saved classes** | Increases re-engagement and booking rate | 2-3h |
| 4 | **Tutor reply to reviews** | Builds trust, allows tutors to address feedback | 1-2h |
| 5 | **Refund policy engine** | Required for dispute resolution and trust | 4-6h |
| 6 | **Raise hand in video** | Basic classroom interaction | 2-3h |
| 7 | **Waiting room (tutor admits)** | Prevents zoom-bombing, professional control | 3-4h |
| 8 | **Auto-close room after duration + 10min** | Saves LiveKit costs, prevents idle rooms | 1-2h |

## ❌ MISSING — Priority 2 (High Impact, Medium Effort)

| # | Feature | Why It Matters | Est. Effort |
|---|---------|---------------|-------------|
| 9 | **Interactive whiteboard** (tldraw/Excalidraw) | Essential for math/science tutoring | 1-2 days |
| 10 | **Breakout rooms** | Enables group activities, differentiation from competitors | 2-3 days |
| 11 | **Dispute resolution workflow** | Required as transaction volume grows | 1-2 days |
| 12 | **Recording playback UI** | Parents review sessions, missed classes catch up | 1 day |
| 13 | **Self-paced / recorded course LMS** | Passive revenue stream, learn-anytime | 3-5 days |
| 14 | **Featured tutor listings** (paid promotion) | First monetization lever beyond commission | 1-2 days |
| 15 | **SMS OTP for auth** | More secure than email in West Africa where SMS is trusted | 2-3h |

## ❌ MISSING — Priority 3 (Strategic, Higher Effort)

| # | Feature | Why It Matters | Est. Effort |
|---|---------|---------------|-------------|
| 16 | **AI-powered tutor recommendations** | Personalizes discovery, increases enrollment | 3-5 days |
| 17 | **Subscription / credit bundles** | Predictable revenue, learner retention | 2-3 days |
| 18 | **Full referral/affiliate program** | Viral growth channel | 2-3 days |
| 19 | **B2B school packages** | Institutional revenue, largest contract sizes | 1 week |
| 20 | **Native mobile app** (React Native) | 70%+ of users on mobile; PWA is stopgap | 2-3 weeks |
| 21 | **Facebook OAuth** | Secondary auth option | 1-2h |

---

## 🎯 RECOMMENDED NEXT 3 BUILDS

### Build 1: Conversion & Trust (This Week)
1. **Google OAuth** — biggest signup friction reducer
2. **Trial session option** — Outschool's core growth mechanic
3. **Wishlist** — keeps users returning

### Build 2: Classroom Experience (Next Week)
4. **Interactive whiteboard** — essential for core subjects
5. **Waiting room + raise hand** — professional video experience
6. **Auto-close rooms** — cost optimization

### Build 3: Monetization & Retention (Week 3)
7. **Refund policy engine** — required for scale
8. **Recording playback UI** — value-add for parents
9. **Featured tutor listings** — first new revenue stream

---

*Generated from full spec comparison against live codebase (April 23, 2026)*
