# Digital Teacher Twin — Architecture & Roadmap

**Status:** Data collection live (2026-04-22). Training + serving not yet built. Admin-only until founder says go.

---

## 1. What is a teacher twin?

A digital twin is an AI tutor that **imitates a specific human teacher** for a specific **subject + grade level**. When a learner chats with "Prof Ibrahim Diallo — Physique-Chimie 3ème", the twin should:

- Answer in Ibrahim's voice (tone, vocabulary, typical phrases)
- Teach the way Ibrahim teaches (scaffolding patterns, example types, encouragement style)
- Draw on what Ibrahim has actually taught in past sessions (his explanations, his analogies, his worked problems)
- Stay on topic — never wander outside the subject/grade combo it was trained for
- Hand off to a human when a question goes past its training data

**It is not a general AI chatbot.** A general chatbot pulls from the whole internet. A twin pulls from exactly one teacher's recorded sessions.

---

## 2. The data pipeline (what runs today)

```
Live session (LiveKit) → recording saved to Cloudflare R2
   ↓
LiveKit webhook (egress_ended)
   ↓
/api/recordings/post-process
   1. Download mp4 from R2
   2. Extract audio (ffmpeg → 64kbps mono mp3)
   3. Whisper transcribes (fr, verbose_json with timestamps)
   4. Claude structures the transcript:
      - segments (timestamped, speaker-labeled)
      - topics (e.g. "fractions", "équations du premier degré")
      - Q&A pairs extracted from the dialogue
      - teacher style signals (tone, vocab level, pedagogical patterns)
   5. Claude writes a parent-facing 4-section summary
   6. Email parents (if they have ai_services_enabled=true)
   7. Save everything:
      - transcript → ai_training_content.transcription
      - structured payload → ai_training_content.training_payload
      - summary → session_recordings.summary
      - twin row auto-created if missing (ai_teacher_twins)
```

**This runs on every recorded session, automatically.** The admin sees the results at `/dashboard/admin/ai-twins/[twinId]`.

### What each piece looks like

**Raw transcript** — the full text of what was said, in French, with punctuation. Example:
> "Bonjour. Comment ça va? Vous êtes prêt pour la classe? Ok, on va commencer le cours de mathématiques..."

**Structured training_payload (JSON)** — the same transcript but shaped for machine consumption:

```json
{
  "segments": [
    { "t": 0.0, "end": 28.8, "speaker": "teacher", "text": "Bonjour. Comment ça va?..." },
    { "t": 28.8, "end": 37.7, "speaker": "student", "text": "Bonjour monsieur..." }
  ],
  "topics": ["mathématiques troisième", "objectifs scolaires", "introduction"],
  "qAndA": [
    { "question": "Quelles sont les difficultés?", "answerSummary": "..." }
  ],
  "teacherStyleSignals": {
    "tone": ["bienveillant", "encourageant", "attentif"],
    "vocabularyLevel": "standard",
    "pedagogicalPatterns": [
      "établissement du rapport de confiance",
      "diagnostic initial des difficultés"
    ]
  }
}
```

**Parent summary** — four sections in French: Sujets abordés, Concepts clés, Progrès observé, Prochaines étapes.

---

## 3. How we'll turn this into a working twin (the training phase — not yet built)

Training a twin means producing two artifacts:

1. A **system prompt** that tells Claude "act like this teacher"
2. A **vector index** of transcript chunks the twin can retrieve during conversations (RAG — retrieval-augmented generation)

### Step 1: Aggregate the style profile

Every time we get a new `ai_training_content` row, we re-run a small aggregation job over all rows for the same twin:

- Count tone adjectives → the most frequent become the twin's personality markers
- Count pedagogical patterns → becomes the twin's teaching method
- Average vocabulary level → sets the twin's language register
- Count topics → becomes the twin's knowledge scope

Output: a single JSON in `ai_teacher_twins.teaching_style_profile`:

```json
{
  "persona": {
    "tone": ["bienveillant", "encourageant", "pragmatique"],
    "vocabularyLevel": "standard",
    "catchPhrases": ["Est-ce que c'est clair?", "Prenons un exemple"]
  },
  "teachingMethod": [
    "établissement du rapport de confiance",
    "diagnostic initial",
    "scaffolding progressif",
    "exemples concrets"
  ],
  "knowledgeScope": {
    "subject": "mathematiques",
    "gradeLevel": "3eme",
    "topicsSeen": ["fractions", "équations", "géométrie"],
    "topicsNotYetSeen": ["probabilités", "trigonométrie"]
  }
}
```

### Step 2: Build the system prompt

Template (French):

```
Tu es Prof {teacher.display_name}, professeur de {subject} pour la classe de {grade_level}. 
Tu enseignes sur écoleVersity.

## Ton profil
Tonalité : {tone.join(", ")}
Vocabulaire : {vocabularyLevel}
Phrases que tu utilises souvent : {catchPhrases.join(" / ")}

## Ta méthode pédagogique
{teachingMethod.map(p => "- " + p).join("\n")}

## Règles
- Tu ne parles que de {subject} niveau {grade_level}.
- Si l'élève demande autre chose, réponds : "C'est intéressant mais ce n'est pas ma matière. 
  Veux-tu qu'on revienne à {subject}?"
- Si la question dépasse ce que tu as enseigné (voir connaissances ci-dessous), réponds : 
  "Je ne suis pas certain sur ce point — je vais demander à mes collègues humains."
- Tu parles en français, sans emoji.
- Tu tutoies l'élève. Tu es patient·e.

## Ton savoir disponible
Tu peux répondre en utilisant ton expérience de cours passés. 
Voici les extraits pertinents de tes leçons précédentes :
{retrieved_chunks}
```

That template gets filled per twin at request time.

### Step 3: Build the vector index (RAG)

Why RAG? Stuffing every transcript into the system prompt is expensive (tokens) and hits context limits after ~10 sessions. Instead:

1. **Chunk** each `training_payload.segments` into ~500-character blocks, preserving speaker labels.
2. **Embed** each chunk (OpenAI `text-embedding-3-small`, ~€0.02 per 1M tokens — very cheap).
3. **Store** embeddings in pgvector (enable extension, add `embedding vector(1536)` column to `ai_training_content` or a new `twin_knowledge_chunks` table).
4. At conversation time, **retrieve** the top 5 chunks most similar to the learner's question and inject them into the `{retrieved_chunks}` slot above.

Effort: ~2 days once we have ~10 sessions of real content. Required: enable pgvector, write a chunking job, write the retrieval API.

### Step 4: Maturity levels

The twin passes through gates before it can serve learners:

| Level | Requirement | What it means |
|---|---|---|
| `level_0` | Default | Data collection only. No chat interface. |
| `level_1` | 10+ sessions, style profile populated | Internal test chat (admins only). |
| `level_2` | 25+ sessions, admin has read 5 conversations and approved | Beta: 5 parent families opt in. |
| `level_3` | 100+ sessions, NPS > 60 in beta | General availability, paid add-on. |

Today every twin is at `level_0`. Moving up a level is a manual admin action (we'll build the button on `/dashboard/admin/ai-twins/[twinId]`).

---

## 4. How learners actually chat with the twin (serving phase — not yet built)

Once a twin reaches `level_1+`:

### UI surfaces (all gated by `TWIN_PUBLIC_ACCESS=true` AND `twin.is_active=true`)

- **Learner home card**: "Continuer avec le jumeau de {teacher.display_name}" if they've had past sessions with that teacher
- **Chat page**: `/k/[learnerId]/twin/[twinId]` — conversation UI with message history
- **"Demander à l'AI" button** on any session detail page — pre-fills context ("J'ai une question sur la leçon du {date}")

### The conversation loop

```
Learner sends message
  ↓
Rate-limit check (5 msgs/min free, unlimited paid tier)
  ↓
Embed the message
  ↓
Vector search: find top-5 transcript chunks from this twin's training data
  ↓
Build prompt: system prompt (above) + chunks + conversation history (last 10 turns)
  ↓
Claude haiku-4.5 generates reply (max 400 tokens)
  ↓
Moderation: scan reply for PII, off-topic, unsafe content
  ↓
Save to ai_twin_sessions + return to learner
  ↓
On 5th message of session: insert a gentle "Should we talk to your real teacher?" prompt
```

### Safety rails (non-negotiable)

1. **No personal info exchanged** — same PII scanner we already use for live-class chat (phone/email/address).
2. **Subject lock** — twin refuses off-topic questions with a stock phrase.
3. **Confidence threshold** — if retrieval scores are low, twin says "Je ne suis pas sûr, demande à ton prof".
4. **Always escalate-able** — every twin conversation has a "Parler à un humain" button that opens Ama (support bot) or books a live session.
5. **Parent visible** — parents see a log of every twin conversation from the parent dashboard (same place as chat messages today).
6. **Logged for training** — conversations go to `ai_twin_sessions`, which feeds future twin retraining.

---

## 5. Business model (for reference)

- **Free tier**: learner gets 5 twin messages/day per teacher they've taken a class with. Primary purpose: homework help between live sessions.
- **Paid tier**: unlimited, priced as a monthly add-on (~2,500 FCFA/month suggested, TBD). Share with the teacher: teacher gets 50% of the twin revenue generated by their twin.
- **Teacher incentive**: the more they teach live, the better their twin becomes, the more passive income from the paid tier.
- **Platform incentive**: 50% of twin revenue is pure margin; no marginal content creation cost.

---

## 6. What I (admin) can do today

| Action | How |
|---|---|
| See which teachers have twins in training | `/dashboard/admin/ai-twins` |
| Read a specific twin's full transcripts | `/dashboard/admin/ai-twins/[twinId]` → expand "Transcription complète" |
| Read speaker-labeled segments | Same page → expand "Segments avec locuteurs" |
| See extracted Q&A pairs | Same page → expand "Questions/Réponses extraites" |
| See aggregated style profile | Top of the twin page |
| Download raw JSON for one session | "Télécharger le JSON brut" link under each session |
| Flip a teacher's pipeline on/off | `/dashboard/admin/ai-services` |
| Open the public gate (future) | Set `TWIN_PUBLIC_ACCESS=true` env var + flip `is_active=true` per twin |

---

## 7. What still needs to be built (ranked)

1. **Style profile aggregator job** — runs after each new `ai_training_content` row; updates `ai_teacher_twins.teaching_style_profile`. ~1 day.
2. **pgvector + chunking + embedding job** — infrastructure for RAG. ~2 days once we have enough content.
3. **Twin invocation API** — `/api/twins/[twinId]/chat`. ~2 days.
4. **Learner chat UI** — `/k/[learnerId]/twin/[twinId]`. ~3 days.
5. **Admin activation button** — promote twin level, approve conversations. ~0.5 day.
6. **Parent conversation log** — parent can see their child's twin chats. ~1 day.
7. **Paid-tier paywall** — subscription flow, revenue split to teacher. ~3 days.

Estimated total to v1 learner-facing twin: **~3 weeks of focused work**, after we have ~25 real sessions of content per teacher to train on.

---

## 8. Open questions (decide before going live)

- **Voice?** Text-only v1 is much cheaper. Voice output (ElevenLabs cloned from teacher's recordings) is a paid-tier upsell. Decide once we see engagement.
- **Image/math input?** Learners often photograph their homework. Supporting image upload → Claude vision → twin explanation is high-leverage. ~2 extra days.
- **Memory across sessions?** Should the twin remember "you struggled with fractions last time"? Yes, but only within a single learner-teacher pair. Already supported by `ai_twin_sessions` schema.
- **Parental consent flow?** COPPA-style explicit opt-in before a child interacts with AI. Low effort, high trust signal.
- **Retraining cadence?** Re-aggregate style profile every 10 sessions? Nightly? Weekly? Start with nightly during beta, drop to weekly at scale.
