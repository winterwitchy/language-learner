require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk")


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY});
const MODEL = "claude-haiku-4-5";


const LEVEL_GUIDES = {
    A1: { turns: 2, vocab: "very simple everyday words only", hints: "always include a large hint", feedback: "one sentence, very encouraging" },
    A2: { turns: 3, vocab: "basic vocabulary, short sentences", hints: "include a sentence starter hint", feedback: "two sentences, encouraging" },
    B1: { turns: 4, vocab: "everyday vocabulary with connectors like because, so, but", hints: "small hint only if prompt is complex", feedback: "two to three sentences, note what to improve" },
    B2: { turns: 5, vocab: "natural idiomatic language", hints: "no hints", feedback: "detailed feedback on grammar and naturalness" },
};


async function generateDialogue({ scenario, level, language }) {
    const guide = LEVEL_GUIDES[level];
}


function parseDialogueResponse(raw) {
  try {
    const parsed = JSON.parse(raw.trim());
    if (!Array.isArray(parsed.dialogue) || parsed.dialogue.length === 0) {
      throw new Error("dialogue array missing or empty");
    }
    for (const turn of parsed.dialogue) {
      if (!turn.speaker) throw new Error("turn missing speaker");
      if (turn.speaker === "npc" && !turn.line) throw new Error("npc turn missing line");
      if (turn.speaker === "user" && !turn.prompt) throw new Error("user turn missing prompt");
    }
    return { ok: true, dialogue: parsed.dialogue };
  } catch (err) {
    console.error("parseDialogueResponse failed:", err.message, "| raw:", raw);
    return { ok: false, error: "The AI returned an unexpected response. Please try again." };
  }
}


async function evaluateAnswer({ scenario, level, language, prompt, userAnswer }) {
  const guide = LEVEL_GUIDES[level];

  const systemPrompt = `You are a kind, encouraging language tutor for K-12 students.
Return ONLY valid JSON. No markdown, no explanation, no code fences.
Use this exact shape:
{
  "correct": boolean,
  "feedback": "string",
  "betterAnswer": "string"
}
Rules:
- "correct" is true if the answer is a reasonable attempt. Be generous with young learners.
- "feedback": ${guide.feedback}. Always start with something positive.
- "betterAnswer": a natural model answer at ${level} level.
- All content must be appropriate for school-age children.`;

  const userPrompt = `Language: ${language}, Level: ${level}, Scenario: "${scenario}".
The student was asked to: "${prompt}"
The student answered: "${userAnswer}"
Evaluate their answer.`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content?.[0]?.text ?? "";
    return parseEvaluationResponse(raw);
  } catch (err) {
    console.error("evaluateAnswer error:", err.message);
    return { ok: false, error: "Could not evaluate your answer. Please try again." };
  }
}


function parseEvaluationResponse(raw) {
  try {
    const parsed = JSON.parse(raw.trim());

    if (typeof parsed.correct !== "boolean") throw new Error("correct field missing");
    if (typeof parsed.feedback !== "string") throw new Error("feedback field missing");
    if (typeof parsed.betterAnswer !== "string") throw new Error("betterAnswer field missing");

    return {
      ok: true,
      correct: parsed.correct,
      feedback: parsed.feedback,
      betterAnswer: parsed.betterAnswer,
    };
  } catch (err) {
    console.error("parseEvaluationResponse failed:", err.message, "| raw:", raw);
    return {
      ok: true,
      correct: true,
      feedback: "Good effort! Keep going.",
      betterAnswer: "",
    };
  }
}


const systemPrompt = `You are a language tutor creating dialogue practice for K-12 students.
Return ONLY valid JSON. No markdown, no explanation, no code fences.
Use this exact shape:
{
  "dialogue": [
    { "speaker": "npc", "line": "string" },
    { "speaker": "user", "prompt": "string", "hint": "string or null" }
  ]
}
Rules:
- Alternate between npc and user turns. Always start with npc.
- Include exactly ${guide.turns} user turns.
- Vocabulary: ${guide.vocab}.
- Hints: ${guide.hints}.
- Keep content appropriate for school-age children.`;


const userPrompt = `Scenario: "${scenario}" in ${language} at level ${level}.
Generate a short practice dialogue where the student plays the visitor.`;


try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const raw = message.content?.[0]?.text ?? "";
    return parseDialogueResponse(raw);
  } catch (err) {
    console.error("generateDialogue error:", err.message);
    return { ok: false, error: "Could not reach the AI service. Please try again." };
  }


  module.exports = { generateDialogue, evaluateAnswer, parseDialogueResponse, parseEvaluationResponse };