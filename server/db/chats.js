const db = require("./index");

const nowIso = () => new Date().toISOString();

function createChat({ userId = "000000", scenario, language, level, npcName = null }) {
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO chats (user_id, scenario, language, level, npc_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .run(userId, scenario, language, level, npcName, ts, ts);
  return Number(info.lastInsertRowid);
}

function getChat(chatId) {
  return db.prepare(`SELECT * FROM chats WHERE chat_id = ?`).get(chatId);
}

function listChats({ userId = "000000", status = null, limit = 20, offset = 0 }) {
  // "incomplete" groups active + abandoned (everything that isn't completed).
  if (status === "incomplete") {
    return db
      .prepare(
        `SELECT * FROM chats WHERE user_id = ? AND status != 'completed'
         ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(userId, limit, offset);
  }
  if (status) {
    return db
      .prepare(
        `SELECT * FROM chats WHERE user_id = ? AND status = ?
         ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(userId, status, limit, offset);
  }
  return db
    .prepare(
      `SELECT * FROM chats WHERE user_id = ?
       ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    )
    .all(userId, limit, offset);
}

function setStatus(chatId, status) {
  db.prepare(`UPDATE chats SET status = ?, updated_at = ? WHERE chat_id = ?`).run(
    status,
    nowIso(),
    chatId
  );
}

function touch(chatId) {
  db.prepare(`UPDATE chats SET updated_at = ? WHERE chat_id = ?`).run(nowIso(), chatId);
}

// Deletes a chat. Its turns and session report cascade away via foreign keys.
function deleteChat(chatId) {
  db.prepare(`DELETE FROM chats WHERE chat_id = ?`).run(chatId);
}

module.exports = { createChat, getChat, listChats, setStatus, touch, deleteChat };
