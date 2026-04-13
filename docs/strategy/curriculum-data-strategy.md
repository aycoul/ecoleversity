# Curriculum Data Strategy — Training AI Tutors on the CI National Curriculum

> **Date:** 2026-04-13
> **Status:** Strategic plan — to be executed in Phase 7 (AI Agents + AI Twins)
> **Owner:** Founder

## Vision

écoleVersity's AI tutors are trained on the actual Côte d'Ivoire national curriculum — not generic AI. They know what a 3ème student in Abidjan is studying THIS week, how to explain it the way CI teachers do, and what past exam questions look like.

## Data Sources (by availability)

### Tier 1: Freely Available Now (No Partnership Required)

| Source | Content | Location | Priority |
|--------|---------|----------|----------|
| Past CEPE papers | Exam questions + answers | men-deco.org, ffrfrancais-ci.net, aide-afrique.com | HIGH — seed exam_questions table |
| Past BEPC papers | Exam questions + answers | Same sources | HIGH |
| Past BAC papers | Exam questions + answers (all séries) | Same sources | HIGH |
| Concours 6ème papers | Entrance exam questions | Teacher networks | HIGH |
| Programmes officiels (syllabi) | What to teach per grade + subject | DPFC (dpfc.ci), teacher forums, circulating PDFs | HIGH — structure AI knowledge |
| Progressions annuelles | Week-by-week pacing guides | DPFC publications, teacher networks | MEDIUM — align to school calendar |
| Guides pédagogiques | How to teach each topic | DPFC, shared among teachers | MEDIUM — teach AI HOW to explain |
| Fiches de leçons | Detailed lesson plans | Teacher networks, Facebook groups | MEDIUM — reference for AI |

### Tier 2: Requires Lightweight Partnership

| Source | Content | Contact | Strategy |
|--------|---------|---------|----------|
| ecole-ci.org | Video lessons, exercises, curriculum-aligned content | Cabinet du Ministre / DVSP | Request endorsement letter + content access |
| DECO correction guides | Official answer keys for past exams | Direction des Examens et Concours | Formal request |
| DPFC digital resources | Updated curriculum documents | Direction de la Pédagogie | Partnership proposal |

### Tier 3: Do NOT Use Without Agreement

| Source | Why |
|--------|-----|
| NEI-CEDA textbooks | Private publisher — copyrighted |
| ecole-ci.org scraped content | Government platform — respect their terms |
| Any content behind a login wall | Violates terms of service |

## Legal Framework

- CI follows OAPI (Bangui Agreement) copyright law
- Government educational documents retain copyright BUT are produced for public use
- No enforcement history on curricula, exam papers, teacher guides
- **Practical reality:** All EdTech actors in the region use these materials freely
- **Our posture:** Use public materials as reference; seek partnership for anything behind login walls

## How Each Data Source Enriches Our AI

### Exam Papers → Exam Prep Engine
- Populate exam_questions table with real past exam questions
- Train AI to explain solutions step-by-step in French
- Generate similar practice questions based on patterns
- Track which question types students struggle with most

### Syllabi → Curriculum-Aware AI
- AI knows "In Terminale D, Chapter 3 of Maths covers logarithms"
- Recommendations: "Your child is in 3ème? Here's what they should be studying right now"
- Teacher matching: suggest teachers who specialize in what the student needs THIS month

### Progressions → Time-Aware Tutoring
- "It's November → 3ème students are on Chapter 5 of SVT"
- Session reminders: "BEPC is in 4 months — your child should focus on [weak subjects]"
- Proactive suggestions to parents based on school calendar

### Teacher Guides → AI Teaching Method
- AI learns the official recommended way to explain each concept
- "For fractions in CE2, the DPFC recommends starting with concrete objects"
- AI Twin adopts the teacher's style + the official methodology

### Live Session Recordings → Personal AI Twin
- Each teacher's recorded sessions become their twin's knowledge base
- Transcription + curriculum alignment = AI that teaches like the teacher
- Students access the twin 24/7 for revision

### Student Q&A Data → Continuous Improvement
- Ama chatbot logs show what students actually struggle with
- Feed back into exam prep: emphasize topics with high confusion rates
- Alert teachers: "Your students commonly ask about X — consider covering it"

## Partnership Approach

### Letter Template (for Ministry Contact)

**To:** Direction de la Veille et du Suivi des Programmes (DVSP) / Cabinet du Ministre de l'Éducation Nationale

**Subject:** Proposition de partenariat — écoleVersity, plateforme de tutorat en ligne

**Key points:**
1. écoleVersity is a free-to-try tutoring platform for CI students (CP1 to Terminale)
2. We align all our content to the official CI curriculum (programmes officiels)
3. We offer free exam prep for CEPE/BEPC/BAC
4. We request: (a) endorsement letter, (b) access to ecole-ci.org content for AI training
5. Value for MENA: more students engaging with official curriculum, data on learning gaps

**Precedents:** Etudesk, Qelasy both received ministry partnerships

## Execution Timeline

| When | What | Phase |
|------|------|-------|
| Now (Phase 6) | Collect 50+ past exam papers from public sources, seed exam_questions | Phase 6: Seed Data |
| Launch + 2 weeks | Send partnership letter to MENA | Post-launch |
| Phase 7 | Build curriculum scraper for public DPFC documents | Phase 7: AI Twins |
| Phase 7 | Structure syllabi into AI knowledge base | Phase 7: AI Twins |
| Phase 7 | Train AI tutors on exam patterns + teaching methods | Phase 7: AI Twins |
| Month 3+ | Integrate ecole-ci.org content (if partnership approved) | Growth |

## Competitive Moat

No other platform in CI has:
1. AI tutors trained on the ACTUAL CI curriculum
2. Per-teacher AI Twins that teach in the teacher's own style
3. Real-time awareness of what students should be studying THIS week
4. Exam prep based on REAL past CEPE/BEPC/BAC papers

This is the data moat. The more teachers record sessions, the more students ask questions, the smarter the AI gets. Competitors would need years of data to catch up.
