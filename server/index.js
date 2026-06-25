require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { generateDialogue, evaluateAnswer } = require("./llm");

// accept requests from the frontend port, parse incoming JSON requests
const app = express();
app.use(cors( {origin:"http://localhost:5173"} ));
app.use(express.json());


app.post("/api/generate-dialogue", async (req, res) => {
  const { scenario, level, language } = req.body;

  if (!scenario || !level || !language) {
    return res.status(400).json({ error: "scenario, level, and language are required." });
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