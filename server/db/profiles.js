const db = require("./index");

const nowIso = () => new Date().toISOString();

function getProfile(userId, language) {
  return db
    .prepare(`SELECT * FROM learner_profiles WHERE user_id = ? AND language = ?`)
    .get(userId, language);
}

// Mistake notes from a user's most recent `sessionLimit` completed sessions in a
// given language. Older sessions fall out of this window so the profile stays
// current, and languages are kept separate.
function recentCompletedNotes(userId, language, sessionLimit) {
  const rows = db
    .prepare(
      `SELECT t.mistake_note AS note
       FROM turns t
       JOIN (
         SELECT chat_id FROM chats
         WHERE user_id = ? AND language = ? AND status = 'completed'
         ORDER BY updated_at DESC
         LIMIT ?
       ) recent ON t.chat_id = recent.chat_id
       WHERE t.mistake_note IS NOT NULL`
    )
    .all(userId, language, sessionLimit);
  return rows.map((r) => r.note);
}

// Number of completed sessions in a language, capped at `cap` (the window size).
function completedCount(userId, language, cap) {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM chats WHERE user_id = ? AND language = ? AND status = 'completed'`)
    .get(userId, language);
  const n = row?.n ?? 0;
  return cap ? Math.min(n, cap) : n;
}

function upsertProfile(userId, language, { summary, recurringPatterns, sessionsCount }) {
  db.prepare(
    `INSERT INTO learner_profiles (user_id, language, summary, recurring_patterns, sessions_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, language) DO UPDATE SET
       summary = excluded.summary,
       recurring_patterns = excluded.recurring_patterns,
       sessions_count = excluded.sessions_count,
       updated_at = excluded.updated_at`
  ).run(
    userId,
    language,
    summary ?? null,
    JSON.stringify(recurringPatterns ?? []),
    sessionsCount ?? 0,
    nowIso()
  );
}

module.exports = { getProfile, upsertProfile, recentCompletedNotes, completedCount };
