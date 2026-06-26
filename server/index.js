require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { generateDialogue, evaluateAnswer } = require("./llm");

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


app.post("/api/generate-dialogue", llmLimiter, async (req, res) => {
  const { scenario, level, language } = req.body;

  if (!scenario || !level || !language) {
    return res.status(400).json({ error: "scenario, level, and language are required." });
  }

  if (!VALID_LEVELS.includes(level)) {
    return res.status(400).json({ error: `level must be one of: ${VALID_LEVELS.join(", ")}.` });
  }

  if (!VALID_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `language must be one of: ${VALID_LANGUAGES.join(", ")}.` });
  }

  if (!VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ error: `scenario must be one of: ${VALID_SCENARIOS.join(", ")}.` });
  }

  const result = await generateDialogue({ scenario, level, language });

  if (!result.ok) {
    return res.status(502).json({ error: result.error });
  }

  return res.json({ dialogue: result.dialogue, npcName: result.npcName });
});


app.post("/api/evaluate-answer", llmLimiter, async (req, res) => {
  const { scenario, level, language, prompt, userAnswer } = req.body;

  if (!scenario || !level || !language || !prompt || !userAnswer) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (!VALID_LEVELS.includes(level)) {
    return res.status(400).json({ error: `level must be one of: ${VALID_LEVELS.join(", ")}.` });
  }

  if (!VALID_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `language must be one of: ${VALID_LANGUAGES.join(", ")}.` });
  }

  if (!VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ error: `scenario must be one of: ${VALID_SCENARIOS.join(", ")}.` });
  }

  if (userAnswer.length > MAX_ANSWER_LENGTH) {
    return res.status(400).json({ error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` });
  }

  const result = await evaluateAnswer({ scenario, level, language, prompt, userAnswer });

  if (!result.ok) {
    return res.status(502).json({ error: result.error });
  }

  return res.json({
    result: result.result,
    feedback: result.feedback,
    betterAnswer: result.betterAnswer,
  });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
