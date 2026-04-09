# EcoleVersity — Development Workflow Tracker

> **This file is the single source of truth for where we are in the build.**
> Updated after every step completion. Read this at the start of every session.

## Current Status

**Active Phase:** Phase 1 — Foundation
**Active Step:** `/build` (plans written, ready to build)
**Last Updated:** 2026-04-08

---

## Workflow Steps (per phase)

Each phase follows the 7-step lifecycle in order. Mark completed with [x].

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship
```

When a step completes, the NEXT step becomes active. When all 7 steps complete for a phase, move to the next phase and start at `/spec` (or `/plan` if spec already covers it).

---

## Phase Progress

### Phase 1: Foundation
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 1 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase1-foundation.md` (12 tasks) |
| `/build` | [ ] **NEXT** | Start here — rebuild using /build skill with phase1 plan |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | Ship = phase complete, move to Phase 2 |

### Phase 2: Live Tutoring + Bootstrap Payments + Flutterwave CC
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 2 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase2-live-tutoring-payments.md` (6 tasks) |
| `/build` | [ ] Pending | |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | |

### Phase 3: Group Classes + Pre-Recorded Courses
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 3 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase3-group-classes-courses.md` (4 tasks) |
| `/build` | [ ] Pending | |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | |

### Phase 4: Communication + Notifications
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 4 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase4-communication-notifications.md` (3 tasks) |
| `/build` | [ ] Pending | |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | |

### Phase 5: Engagement + Trust
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 5 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase5-engagement-trust.md` (7 tasks) |
| `/build` | [ ] Pending | |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | |

### Phase 6: Polish + Launch
| Step | Status | Notes |
|------|--------|-------|
| `/spec` | [x] Done | SPEC.md v3.0 — Section 9, Phase 6 |
| `/plan` | [x] Done | `docs/superpowers/plans/2026-04-08-phase6-polish-launch.md` (6 tasks) |
| `/build` | [ ] Pending | |
| `/test` | [ ] Pending | |
| `/review` | [ ] Pending | |
| `/code-simplify` | [ ] Pending | |
| `/ship` | [ ] Pending | PLATFORM GOES LIVE |

---

## How to Use This File

**At the start of every session:**
1. Read this file first
2. Find the **NEXT** step
3. Run the corresponding slash command
4. When the step completes, update this file (mark [x], move NEXT pointer)

**Transition rules:**
- `/build` done → run `/test`
- `/test` passes → run `/review`
- `/review` approved → run `/code-simplify`
- `/code-simplify` done → run `/ship` (for that phase)
- `/ship` done → move to next phase, start at `/build` (spec and plan already done)

**Never skip a step.** The workflow exists to catch problems early.
