require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  generateDialogue,
  evaluateAnswer,
  generateSessionReport,
  updateLearnerProfile,
} = require("./llm");
const chatsRepo = require("./db/chats");
const turnsRepo = require("./db/turns");
const profilesRepo = require("./db/profiles");
const reportsRepo = require("./db/reports");

// Allowed setup values, mirroring the options the frontend (SetupScreen.jsx)
// offers. We validate against these at the route boundary so unexpected input
// is rejected with a clear 400 instead of producing junk output or, in the
// case of level, crashing: LEVEL_GUIDES[level] would be undefined and throw
// before llm.js's try/catch.
const VALID_LEVELS = ["A1", "A2", "B1", "B2"];
const VALID_LANGUAGES = ["English", "French", "Spanish", "German", "Italian", "Turkish", "Russian"];
const VALID_SCENARIOS = ["cafe", "restaurant", "hotel", "bookshop", "grocery", "directions", "shop", "school", "park", "pharmacy", "airport", "doctor"];

// Longest student answer we will evaluate. Mirrors MAX_ANSWER_LENGTH on the
// client (DialogueScreen.jsx); enforced here too since the client cap can be
// bypassed and each evaluation is a paid API call.
const MAX_ANSWER_LENGTH = 280;

// Max user turns per side. Length defaults to the level but can be overridden.
const MAX_TURNS = 20;

const DEFAULT_USER_ID = "000000";

// Simple in-memory, per-IP fixed-window rate limiter — no external dependency.
// Caps how often a client can hit the costly LLM routes, cutting API spend and
// blocking runaway retries. For a multi-instance deployment, swap this for
// express-rate-limit backed by a shared store (e.g. Redis).
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";

    // Bound memory: occasionally drop expired entries.
    if (hits.size > 10000) {
      for (const [key, val] of hits) if (now > val.resetAt) hits.delete(key);
    }

    let entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: `Too many requests. Please wait ${retryAfter}s and try again.` });
    }
    next();
  };
}

// 30 LLM requests per minute per IP: generous for normal play (a full session is
// only a handful of calls) but stops abuse and runaway loops.
const llmLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

// accept requests from the frontend port, parse incoming JSON requests
const app = express();
app.use(cors( {origin:"http://localhost:5173"} ));
app.use(express.json());


// --- helpers ---------------------------------------------------------------

// Map a result string to points.
const RESULT_SCORE = { correct: 1, partial: 0.5, incorrect: 0 };
function resultToScore(result) {
  return RESULT_SCORE[result] ?? 0;
}

// Convert llm.js's alternating npc/user dialogue into merged turn rows: each
// user turn carries the NPC line that precedes it. A trailing NPC line with no
// following user turn becomes an AI-only row (task = null).
function dialogueToTurns(dialogue) {
  const turns = [];
  let pendingAi = null;
  for (const entry of dialogue) {
    if (entry.speaker === "npc") {
      if (pendingAi !== null) turns.push({ ai_message: pendingAi, task: null, hint: null });
      pendingAi = entry.line;
    } else if (entry.speaker === "user") {
      turns.push({ ai_message: pendingAi, task: entry.prompt, hint: entry.hint ?? null });
      pendingAi = null;
    }
  }
  if (pendingAi !== null) turns.push({ ai_message: pendingAi, task: null, hint: null });
  return turns;
}

// Shape a turn row for the client (camelCase; mistake_note stays server-side).
function serializeTurn(t) {
  return {
    turnId: t.turn_id,
    aiMessage: t.ai_message,
    task: t.task,
    hint: t.hint,
    studentResponse: t.student_response,
    result: t.result,
    score: t.score,
    feedback: t.feedback,
    betterAnswer: t.better_answer,
  };
}

function serializeChat(c) {
  return {
    chatId: c.chat_id,
    userId: c.user_id,
    scenario: c.scenario,
    language: c.language,
    level: c.level,
    npcName: c.npc_name,
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// Earned / available points for a chat's turns.
function scoreFromTurns(turns) {
  let correct = 0;
  let total = 0;
  for (const t of turns) {
    if (t.task != null) {
      total += 1;
      correct += t.score ?? 0;
    }
  }
  return { correct, total };
}

// Only the most recent N completed sessions feed the cumulative review, so old,
// no-longer-relevant mistakes age out instead of lingering forever.
const PROFILE_SESSION_WINDOW = 20;

// Recompute a user's review profile for one language from the windowed mistake
// notes. Used after a session completes and to self-heal an empty profile.
async function refreshLearnerProfile(userId, language) {
  const notes = profilesRepo.recentCompletedNotes(userId, language, PROFILE_SESSION_WINDOW);
  const sessionsConsidered = profilesRepo.completedCount(userId, language, PROFILE_SESSION_WINDOW);
  // Build fresh from the window (no merge with the old profile — it was itself
  // derived from a now-shifted window).
  const built = await updateLearnerProfile({ sessionNotes: notes });

  // Don't clobber an existing review if the rebuild failed (a transient LLM
  // error returns empty) — only persist a successful result.
  if (!built.ok) return;

  profilesRepo.upsertProfile(userId, language, {
    summary: built.summary,
    recurringPatterns: built.recurringPatterns,
    sessionsCount: sessionsConsidered,
  });
}

function validateSetup({ scenario, level, language }, res) {
  if (!scenario || !level || !language) {
    res.status(400).json({ error: "scenario, level, and language are required." });
    return false;
  }
  if (!VALID_LEVELS.includes(level)) {
    res.status(400).json({ error: `level must be one of: ${VALID_LEVELS.join(", ")}.` });
    return false;
  }
  if (!VALID_LANGUAGES.includes(language)) {
    res.status(400).json({ error: `language must be one of: ${VALID_LANGUAGES.join(", ")}.` });
    return false;
  }
  if (!VALID_SCENARIOS.includes(scenario)) {
    res.status(400).json({ error: `scenario must be one of: ${VALID_SCENARIOS.join(", ")}.` });
    return false;
  }
  return true;
}


// --- routes ----------------------------------------------------------------

// Create a new chat: generate the dialogue, persist it as turn rows, return state.
app.post("/api/chats", llmLimiter, async (req, res) => {
  const { scenario, level, language, userId, turns } = req.body;
  if (!validateSetup({ scenario, level, language }, res)) return;

  if (turns !== undefined && turns !== null && (!Number.isInteger(turns) || turns < 1 || turns > MAX_TURNS)) {
    return res.status(400).json({ error: `turns must be a whole number between 1 and ${MAX_TURNS}.` });
  }

  const result = await generateDialogue({ scenario, level, language, turns });
  if (!result.ok) {
    return res.status(502).json({ error: result.error });
  }

  const chatId = chatsRepo.createChat({
    userId: userId || DEFAULT_USER_ID,
    scenario,
    language,
    level,
    npcName: result.npcName,
  });
  turnsRepo.insertTurns(chatId, dialogueToTurns(result.dialogue));

  const savedTurns = turnsRepo.getTurns(chatId);
  return res.json({
    chatId,
    npcName: result.npcName,
    status: "active",
    turns: savedTurns.map(serializeTurn),
    resumeTurnId: turnsRepo.findResumeTurnId(chatId),
  });
});


// List a user's previous chats (for the "previous chats" wrapper). Paginated.
app.get("/api/chats", (req, res) => {
  const userId = req.query.userId || DEFAULT_USER_ID;
  const status = req.query.status || null;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const rows = chatsRepo.listChats({ userId, status, limit, offset });
  const chats = rows.map((c) => {
    const score = scoreFromTurns(turnsRepo.getTurns(c.chat_id));
    return { ...serializeChat(c), score };
  });
  return res.json({ chats });
});


// Full state for one chat, used to resume a quit session.
app.get("/api/chats/:chatId", (req, res) => {
  const chatId = Number(req.params.chatId);
  const chat = chatsRepo.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });

  const turns = turnsRepo.getTurns(chatId);
  return res.json({
    ...serializeChat(chat),
    turns: turns.map(serializeTurn),
    resumeTurnId: turnsRepo.findResumeTurnId(chatId),
    score: scoreFromTurns(turns),
  });
});


// Update a chat's status (e.g. mark 'abandoned' when the student leaves mid-session).
app.patch("/api/chats/:chatId", (req, res) => {
  const chatId = Number(req.params.chatId);
  const { status } = req.body;
  if (!["active", "completed", "abandoned"].includes(status)) {
    return res.status(400).json({ error: "status must be active, completed, or abandoned." });
  }
  const chat = chatsRepo.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });

  // Don't downgrade a finished session.
  if (chat.status !== "completed") chatsRepo.setStatus(chatId, status);
  return res.json({ chatId, status: chatsRepo.getChat(chatId).status });
});


// Delete a chat (its turns and report cascade away).
app.delete("/api/chats/:chatId", (req, res) => {
  const chatId = Number(req.params.chatId);
  const chat = chatsRepo.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });

  chatsRepo.deleteChat(chatId);
  return res.json({ chatId, deleted: true });
});


// Submit + evaluate the student's answer for one turn, then persist it.
app.post("/api/chats/:chatId/turns/:turnId/answer", llmLimiter, async (req, res) => {
  const chatId = Number(req.params.chatId);
  const turnId = Number(req.params.turnId);
  const { answer } = req.body;

  const chat = chatsRepo.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });

  const turn = turnsRepo.getTurn(chatId, turnId);
  if (!turn || turn.task == null) {
    return res.status(404).json({ error: "No answerable turn at that position." });
  }

  // Idempotent: a re-submitted turn returns the stored evaluation, no double call.
  if (turn.student_response != null) {
    return res.json({
      result: turn.result,
      feedback: turn.feedback,
      betterAnswer: turn.better_answer,
      score: turn.score,
      alreadyAnswered: true,
      sessionComplete: !turnsRepo.hasUnansweredTurns(chatId),
    });
  }

  if (!answer || !answer.trim()) {
    return res.status(400).json({ error: "answer is required." });
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return res.status(400).json({ error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` });
  }

  const evaluation = await evaluateAnswer({
    scenario: chat.scenario,
    level: chat.level,
    language: chat.language,
    prompt: turn.task,
    userAnswer: answer,
  });
  if (!evaluation.ok) {
    return res.status(502).json({ error: evaluation.error });
  }

  const score = resultToScore(evaluation.result);
  turnsRepo.recordAnswer(chatId, turnId, {
    studentResponse: answer,
    result: evaluation.result,
    score,
    feedback: evaluation.feedback,
    betterAnswer: evaluation.betterAnswer,
    mistakeNote: evaluation.mistakeNote,
  });
  chatsRepo.touch(chatId);

  const sessionComplete = !turnsRepo.hasUnansweredTurns(chatId);
  if (sessionComplete) chatsRepo.setStatus(chatId, "completed");

  res.json({
    result: evaluation.result,
    feedback: evaluation.feedback,
    betterAnswer: evaluation.betterAnswer,
    score,
    sessionComplete,
  });

  // After responding (so the last answer stays snappy), refresh the cumulative
  // profile in the background so the main-screen review reflects this session.
  if (sessionComplete) {
    refreshLearnerProfile(chat.user_id, chat.language).catch((err) => console.error("profile refresh error:", err.message));
  }
});


// Session report — recurring patterns from this session's mistakes. Cached; the
// LLM only runs the first time, and the cumulative learner profile is refreshed
// at the same moment.
app.get("/api/chats/:chatId/report", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const chat = chatsRepo.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });

  let report = reportsRepo.getReport(chatId);
  if (!report) {
    if (chat.status !== "completed") {
      return res.status(409).json({ error: "Session is not complete yet." });
    }

    const turns = turnsRepo.getTurns(chatId);
    const notes = turns.map((t) => t.mistake_note).filter(Boolean);
    const score = scoreFromTurns(turns);

    const gen = await generateSessionReport({ mistakeNotes: notes });
    reportsRepo.upsertReport(chatId, {
      summary: gen.summary,
      recurringPatterns: gen.recurringPatterns,
      scoreCorrect: score.correct,
      scoreTotal: score.total,
    });

    report = reportsRepo.getReport(chatId);
  }

  return res.json({
    chatId,
    summary: report.summary,
    recurringPatterns: JSON.parse(report.recurring_patterns || "[]"),
    score: { correct: report.score_correct, total: report.score_total },
    generatedAt: report.generated_at,
  });
});


// Cumulative learner profile for a user in one language.
app.get("/api/users/:userId/profile", async (req, res) => {
  const userId = req.params.userId;
  const language = req.query.language;
  const empty = { userId, language: language ?? null, summary: "", recurringPatterns: [], sessionsCount: 0 };
  if (!language) return res.json(empty);

  let row = profilesRepo.getProfile(userId, language);

  // Self-heal: if there's no review (missing, or previously wiped to empty) but
  // the user has mistake notes in completed sessions, rebuild it now from those.
  const rowEmpty = !row || (!row.summary && JSON.parse(row.recurring_patterns || "[]").length === 0);
  if (rowEmpty && profilesRepo.recentCompletedNotes(userId, language, PROFILE_SESSION_WINDOW).length > 0) {
    await refreshLearnerProfile(userId, language);
    row = profilesRepo.getProfile(userId, language);
  }

  if (!row) return res.json(empty);

  return res.json({
    userId: row.user_id,
    language: row.language,
    summary: row.summary,
    recurringPatterns: JSON.parse(row.recurring_patterns || "[]"),
    sessionsCount: row.sessions_count,
    updatedAt: row.updated_at,
  });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
