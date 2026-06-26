const db = require("./index");

const nowIso = () => new Date().toISOString();

// Insert all scripted turns for a freshly generated dialogue, in one transaction.
function insertTurns(chatId, turns) {
  const stmt = db.prepare(
    `INSERT INTO turns (chat_id, turn_id, ai_message, task, hint)
     VALUES (?, ?, ?, ?, ?)`
  );
  db.exec("BEGIN");
  try {
    turns.forEach((t, i) => {
      stmt.run(chatId, i, t.ai_message ?? null, t.task ?? null, t.hint ?? null);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function getTurns(chatId) {
  return db.prepare(`SELECT * FROM turns WHERE chat_id = ? ORDER BY turn_id`).all(chatId);
}

function getTurn(chatId, turnId) {
  return db.prepare(`SELECT * FROM turns WHERE chat_id = ? AND turn_id = ?`).get(chatId, turnId);
}

function recordAnswer(chatId, turnId, { studentResponse, result, score, feedback, betterAnswer, mistakeNote }) {
  db.prepare(
    `UPDATE turns
     SET student_response = ?, result = ?, score = ?, feedback = ?, better_answer = ?, mistake_note = ?, answered_at = ?
     WHERE chat_id = ? AND turn_id = ?`
  ).run(
    studentResponse,
    result,
    score,
    feedback,
    betterAnswer ?? null,
    mistakeNote ?? null,
    nowIso(),
    chatId,
    turnId
  );
}

// Lowest user turn (task present) that has not been answered yet, or null.
function findResumeTurnId(chatId) {
  const row = db
    .prepare(
      `SELECT MIN(turn_id) AS turnId FROM turns
       WHERE chat_id = ? AND task IS NOT NULL AND student_response IS NULL`
    )
    .get(chatId);
  return row && row.turnId !== null ? row.turnId : null;
}

function hasUnansweredTurns(chatId) {
  return findResumeTurnId(chatId) !== null;
}

module.exports = {
  insertTurns,
  getTurns,
  getTurn,
  recordAnswer,
  findResumeTurnId,
  hasUnansweredTurns,
};
