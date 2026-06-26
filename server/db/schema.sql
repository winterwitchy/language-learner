-- Schema for saved dialogue sessions. All statements are idempotent so this can
-- run on every boot. Conversation length is unbounded: each exchange is one row
-- in `turns`, so longer dialogues never require a schema change.

CREATE TABLE IF NOT EXISTS chats (
  chat_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL DEFAULT '000000',   -- integration seam for a future login system
  scenario   TEXT NOT NULL,
  language   TEXT NOT NULL,
  level      TEXT NOT NULL,
  npc_name   TEXT,
  status     TEXT NOT NULL DEFAULT 'active',    -- active | completed | abandoned
  created_at TEXT NOT NULL,                      -- ISO-8601
  updated_at TEXT NOT NULL                       -- ISO-8601
);

-- Lists a user's sessions newest-first for the "previous chats" screen.
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats (user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS turns (
  chat_id          INTEGER NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  turn_id          INTEGER NOT NULL,             -- 0-based order within the chat
  ai_message       TEXT,                          -- the NPC line
  task             TEXT,                          -- student instruction; NULL on AI-only lines
  hint             TEXT,
  student_response TEXT,                          -- NULL until answered -> resume marker
  result           TEXT,                          -- correct | partial | incorrect
  score            REAL,                          -- 1 / 0.5 / 0
  feedback         TEXT,                          -- human-readable (may mention minor slips)
  better_answer    TEXT,
  mistake_note     TEXT,                          -- free-form; NULL if clean or only minor slips
  answered_at      TEXT,                          -- ISO-8601
  PRIMARY KEY (chat_id, turn_id)
);

-- Rolling cumulative weakness profile per user (reporting only).
CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id            TEXT NOT NULL,
  language           TEXT NOT NULL,
  summary            TEXT,
  recurring_patterns TEXT,                        -- JSON: [{ pattern, count, examples }]
  sessions_count     INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT,
  PRIMARY KEY (user_id, language)                 -- review is kept separately per language
);

-- Cache so re-opening a finished session does not re-run the LLM.
CREATE TABLE IF NOT EXISTS session_reports (
  chat_id            INTEGER PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
  summary            TEXT,
  recurring_patterns TEXT,                        -- JSON
  score_correct      REAL,
  score_total        REAL,
  generated_at       TEXT
);
