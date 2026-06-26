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

// accept requests from the frontend port, parse incoming JSON requests
const app = express();
app.use(cors( {origin:"http://localhost:5173"} ));
app.use(express.json());


app.post("/api/generate-dialogue", async (req, res) => {
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


app.post("/api/evaluate-answer", async (req, res) => {
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
