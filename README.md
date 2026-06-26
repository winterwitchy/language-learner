# language learner, a language learning app

**language-learner** is a language learning app for K–12 students. Pick a real-life scenario, a language, and a CEFR level, then practise a short dialogue turn by turn with instant AI feedback.

Sessions are saved to SQLite, so a dialogue can be quit and resumed later. Each user (identified at a lightweight login) keeps their own history, and the app builds a per-language **review** summarising the student's recurring mistakes across their recent sessions.


## Quick start

### Prerequisites
- Node.js 22.5+ (the persistence layer uses the built-in `node:sqlite` module — no native build step)
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone the repo
```bash
git clone https://github.com/winterwitchy/language-learner.git
cd language-learner
```

### 2. Set up the server
```bash
cd server
npm install
cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY
```

### 3. Set up the client
```bash
cd ../client
npm install
```

### 4. Run both
Open two terminals:

**Terminal 1 — server:**
```bash
cd server
npm start
```

**Terminal 2 — client:**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Running tests
```bash
cd server
npm test
```

20 tests across two suites:

`tests/llm.test.js` (13) — JSON parsing and graceful failure:
- Valid JSON input → correct parsing
- Empty / malformed JSON → graceful failure
- Missing required fields / wrong field types → graceful failure
- Markdown code fences → stripped and parsed correctly
- Evaluation fallback → student can always continue even if evaluation fails

`tests/db.test.js` (7) — persistence layer against an in-memory database:
- Chat creation and defaults
- Turn insertion and ordering
- Resume-point logic (first unanswered user turn)
- Listing and status filtering
- Per-language learner-profile and session-report upserts

---

## Project structure

```
language-learner/
├── server/
│   ├── index.js                    # Express server + REST routes (chats, answers, report, profile)
│   ├── llm.js                      # Claude API calls, JSON parsers, report/profile builders
│   ├── db/
│   │   ├── index.js                # node:sqlite connection, pragmas, schema + migration
│   │   ├── schema.sql              # chats, turns, learner_profiles, session_reports
│   │   ├── chats.js                # chat repository
│   │   ├── turns.js                # turn repository (+ resume-point logic)
│   │   ├── profiles.js             # learner-profile repository
│   │   └── reports.js              # session-report cache repository
│   ├── .env.example
│   └── tests/
│       ├── llm.test.js
│       └── db.test.js
└── client/
    └── src/
        ├── App.jsx                 # Screen router + login gate
        ├── api.js                  # Fetch wrappers + user identity
        ├── hooks/
        │   └── useDialogue.js      # Session state, save/resume logic
        └── components/
            ├── LoginScreen.jsx
            ├── SetupScreen.jsx      # Setup, previous chats, per-language review
            ├── DialogueScreen.jsx
            ├── ResultsScreen.jsx
            ├── LoadingScreen.jsx
            └── ErrorScreen.jsx
```



## Key design decisions

### LLM: a task-based model split
The two API calls have different demands, so they use different models:

- **Dialogue generation → Claude Haiku (`claude-haiku-4-5`).** This is templated, low-judgment work and the bulk of the tokens, so the fast, cheap model fits.
- **Answer evaluation → Claude Sonnet (`claude-sonnet-4-6`).** Grading is the judgment-critical call (correct/partial/incorrect plus feedback). Haiku tended to over-penalise valid answers — faulting phrasing or surface form, or inventing grammar rules to justify a lower mark — so the stronger model goes exactly where quality matters. Evaluation calls are small (one per turn, ~512 tokens), so the cost impact is modest.

**Turkish and Russian use Sonnet for both calls.** Haiku made consistent morphological errors there (wrong case suffixes, consonant mutations, case declensions), so generation is upgraded too.

The principle: cheap model for the easy, high-volume call; strong model for the hard, judgment call. This keeps most of the cost savings while fixing grading quality at its source.

### Cost optimisation
- `max_tokens` for generation scales with conversation length (~512–4096); evaluation is capped at 512
- Two short API calls per session (one generation + one evaluation per user turn) rather than a long stateful conversation
- No streaming — we need the complete JSON object before we can do anything with it. Streaming a partial JSON string is unparseable, so it adds complexity with no UX benefit
- Full dialogue generated in one upfront call rather than turn by turn. Prompt engineering was used to ensure NPC lines flow naturally into user turn instructions.

### Structured output
The system prompt instructs Claude to return only valid JSON in a specific shape. The response is stripped of markdown fences (Claude sometimes wraps JSON in ```json blocks despite being told not to) then validated field by field before it reaches the frontend. A malformed or empty response never crashes the app — generation failures show the error screen, evaluation failures fall back to a generic encouraging message so the student can always continue.

### Input validation
Both routes in `index.js` validate `level`, `language`, and `scenario` against allowlists before any Claude call. `level` is the critical one: it's used as an object key (`LEVEL_GUIDES[level]`) and immediately dereferenced (`guide.turns`), so an invalid value would throw a `TypeError` *before* `llm.js`'s try/catch and crash the request. `language` and `scenario` are only interpolated into the prompt string, so a bad value wouldn't crash — but they're validated anyway so the API rejects off-list input with a clear 400 instead of paying for a Claude call that produces junk. The allowlists mirror the options offered in `SetupScreen.jsx`.

### Level differentiation
Level controls four concrete axes in every prompt:

| | A1 | A2 | B1 | B2 |
|--|--|--|--|--|
| User turns | 2 | 3 | 4 | 5 |
| Vocabulary | Everyday words only | Basic sentences | Connectors allowed | Idiomatic language |
| Hints | Always, large | Sentence starter | Only if complex | None |
| Feedback strictness | Warm, one sentence. Ignore capitalisation and punctuation. Only incorrect if meaning is completely wrong | Two sentences. Ignore capitalisation and punctuation. Partial only for genuine grammar errors | Three sentences, direct. Identify specific errors and explain why. Ignore capitalisation | Direct and precise. Identify every grammar, vocabulary, and naturalness issue. No softening |

### Three-way evaluation
Answers are evaluated as `correct`, `partial`, or `incorrect`. Partial answers score 0.5 points and show a yellow feedback card. This is more pedagogically honest than binary marking — a student who understands the task but has a grammar error deserves acknowledgement, not a flat fail or success.

Evaluation strictness scales with level — at A1 and A2, capitalisation, punctuation, and missing politeness markers are intentionally ignored. At B2, most grammar and naturalness issues are identified directly.

### Task prompt design
User prompts name specific items and actions rather than giving open-ended options ("order a green tea and a croissant" not "order a drink and a food item"). This ensures the pre-scripted NPC response always matches what the student was asked to say, avoiding the situation where the NPC ignores the student's actual choice.

### Framework: React + Vite + Express
No Next.js, no Remix — a bare Vite + React frontend and a minimal Express backend. The Vite dev proxy forwards `/api` requests to Express, eliminating CORS configuration in development. Simple to understand, simple to run.

### State: custom hook
All session logic lives in `useDialogue.js`. Components are purely presentational - they receive props and fire callbacks. This keeps logic testable and components simple.

### Persistence & data model (SQLite)
Sessions are stored in SQLite via Node's built-in `node:sqlite` (no native dependency, no build step). Four tables:

- **`chats`** — one row per session: owner (`user_id`), scenario, language, level, NPC name, status (`active` / `completed` / `abandoned`), timestamps.
- **`turns`** — one row per exchange, `PRIMARY KEY (chat_id, turn_id)`. Each row holds the NPC line, the student's task + hint, and (once answered) their response, result, score, feedback, and a free-text `mistake_note`. Because each turn is a row, conversation length is unbounded — a longer dialogue needs no schema change.
- **`learner_profiles`** — the cumulative review, keyed by `(user_id, language)`.
- **`session_reports`** — a cache of each completed session's recurring-mistake report, so re-opening it doesn't re-run the LLM.

`turns` and `session_reports` cascade-delete from `chats` (foreign keys on), so deleting a chat cleans up after itself. WAL mode is enabled for concurrent reads. A thin data-access layer (`server/db/*.js`) keeps SQL out of the routes, leaving the door open to swapping SQLite for Postgres at scale.

### Save & resume
A session is created and persisted up front, then each answer is saved as it's graded. Resuming is a single query: the first `turns` row that has a task but no `student_response` is where the student left off. The setup screen lists previous chats — split into **Continue** (resumable) and **Completed** (review), colour-coded by performance in the brand palette.

### Per-language review (windowed, self-healing)
After each completed session, the app rebuilds a cumulative review of the student's recurring mistakes — but only from the **most recent 10 completed sessions in that language**, so old, no-longer-relevant mistakes age out. Rather than a fixed taxonomy of error tags (which can't anticipate idiosyncratic habits like "keeps using 'the one' instead of 'the first'"), each evaluation emits a free-text `mistake_note`, and one LLM pass clusters them into recurring patterns. The rebuild never overwrites a good review with an empty/failed result, and it self-heals: if a review is missing but mistake notes exist, it rebuilds on demand.

### Accounts & row-level security
The app is multi-user. A lightweight login captures a user id (stored client-side, sent as the `X-User-Id` header); in a real deployment this would come from an authenticated session instead. Every data path is scoped to that identity: chats are stamped with and listed by their owner, and every chat/report/profile route checks ownership before returning anything — responding **404** (not 403) for resources the requester doesn't own, so chat ids can't be enumerated. Because the enforcement lives at every query boundary, swapping the demo header for real auth is a one-line change to `getUserId()`.



## AI tool usage

This project was built with Claude as an AI assistant throughout development.

### Accepted
- Two-route backend design and `useDialogue` state machine — both clean and defensible
- JSON shape for dialogue turns — maps naturally to the chat UI
- Level guide table — verified manually that A1 and B2 produce meaningfully different dialogues
- Unit test structure — error cases added manually after the initial draft

### Adjusted
- **System prompts** — tightened after testing revealed markdown fences, open-ended task prompts, and answers embedded in hint text
- **Graceful fallback** — evaluation parse failures return encouraging message instead of blocking the student
- **Model selection** — moved to a task-based split (Haiku for generation, Sonnet for evaluation; both Sonnet for Turkish/Russian) after grading proved to be the judgment-critical call
- **Three-way evaluation** — upgraded from binary after observing the binary system was too coarse for meaningful feedback
- **Feedback strictness** — iteratively recalibrated: minor surface errors (typos, punctuation, accents) never affect the grade, but keyword fragments that don't form a real utterance are marked incorrect, not partial

### Extended (beyond the original scope)
- **Persistence** — the first version kept session state ephemeral to stay minimal; SQLite persistence with save/resume was added later once those became requirements (see *Persistence & data model*)
- **Per-user accounts + row-level security** — added a lightweight login and scoped all data access to the requesting identity
- **Per-language windowed review** — cumulative recurring-mistake summaries, rebuilt from the most recent 10 completed sessions per language

### Rejected
- **Streaming** — generates a complete JSON object, not prose. Streaming a partial JSON string is unparseable and adds complexity with no UX benefit
- **Dynamic NPC responses** — attempted and reverted. The NPC line would be generated based on the student's actual answer, making the conversation reactive. The implementation introduced flickering, session completion bugs, incoherent prompt-response pairs, and increased cost. Reverted to pre-scripted dialogues. Noted as a future improvement
- **TypeScript** — small enough project that careful naming accomplishes the same goal within the time constraint



## Known limitations

- **NPC lines are pre-scripted** — the entire dialogue is generated upfront, so NPC responses don't react to what the student actually said. Designed so this can be added later: it's a new endpoint and a change to `advance()` in `useDialogue.js`
- **Authentication is a demo stand-in** — identity is a user id sent in a header, not a verified login. The row-level access control around it is real; only the identity source would change for production (a JWT/session)
- **Rate limiting is in-memory** — a simple per-IP fixed-window limiter guards the LLM routes, but it lives in process memory, so it resets on restart and isn't shared across instances. A multi-instance deployment would back it with Redis (or `express-rate-limit` + a store)
- **Very long dialogues** — generating up to 20 turns in a single upfront call can occasionally dip in quality at the high end; the token budget scales with length to avoid truncation
- **Validation allowlists are duplicated** — the valid languages and scenarios are listed in both `SetupScreen.jsx` (frontend) and `index.js` (backend). Adding a new option means updating both. This is a deliberate trade-off: the backend can't trust the client, so it validates independently. A shared constants module would remove the duplication in a larger project
