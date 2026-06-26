const db = require("./index");

const nowIso = () => new Date().toISOString();

function getReport(chatId) {
  return db.prepare(`SELECT * FROM session_reports WHERE chat_id = ?`).get(chatId);
}

function upsertReport(chatId, { summary, recurringPatterns, scoreCorrect, scoreTotal }) {
  db.prepare(
    `INSERT INTO session_reports (chat_id, summary, recurring_patterns, score_correct, score_total, generated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET
       summary = excluded.summary,
       recurring_patterns = excluded.recurring_patterns,
       score_correct = excluded.score_correct,
       score_total = excluded.score_total,
       generated_at = excluded.generated_at`
  ).run(
    chatId,
    summary ?? null,
    JSON.stringify(recurringPatterns ?? []),
    scoreCorrect ?? 0,
    scoreTotal ?? 0,
    nowIso()
  );
}

module.exports = { getReport, upsertReport };
