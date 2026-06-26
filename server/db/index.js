const path = require("path");
const fs = require("fs");
// node:sqlite is built into Node 22.5+ (no native compilation, no dependency).
// It emits an "experimental" warning at startup, which is harmless.
const { DatabaseSync } = require("node:sqlite");

// DB_PATH lets tests use an in-memory database (":memory:"). In normal use the
// file lives in server/data/, which is gitignored.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.db");

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// WAL = concurrent reads alongside a writer; foreign_keys enforces cascades;
// busy_timeout avoids immediate "database is locked" errors under contention.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

// Apply schema (every statement is CREATE ... IF NOT EXISTS, so this is safe to
// run on every startup). PRAGMA user_version is reserved for future migrations.
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// One-off migration: learner_profiles became per-language. An older DB still has
// the single-key table; drop it and recreate from schema (the profile is derived
// data and regenerates as sessions complete).
const profileCols = db.prepare(`PRAGMA table_info(learner_profiles)`).all();
if (!profileCols.some((c) => c.name === "language")) {
  db.exec(`DROP TABLE IF EXISTS learner_profiles;`);
  db.exec(schema);
}

module.exports = db;
