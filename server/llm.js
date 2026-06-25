require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk")


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY});
const MODEL = "claude-haiku-4-5";


const LEVEL_GUIDES = {
  A1: {
    turns: 2,
    vocab: "very simple everyday words only",
    hints: "always include a large hint",
    feedback: "one warm encouraging sentence. Ignore capitalisation, punctuation, and politeness markers. Only mark incorrect if the meaning is completely wrong."
  },
  A2: {
    turns: 3,
    vocab: "basic vocabulary, short sentences",
    hints: "include a sentence starter hint",
    feedback: "two sentences. Start positive. Ignore capitalisation and punctuation entirely. Only note missing politeness like 'please' if the level guide specifically requires formal register. Mark partial only for genuine grammar errors, not stylistic choices."
  },
  B1: {
    turns: 4,
    vocab: "everyday vocabulary with connectors like because, so, but",
    hints: "small hint only if prompt is complex",
    feedback: "three sentences — acknowledge what worked, identify the specific grammar or vocabulary error, explain why it is wrong. Be direct. Mark as partial if incomplete or unnatural. Ignore capitalisation and punctuation errors, correct minor typos but don't let them affect the grading."
  },
  B2: {
    turns: 5,
    vocab: "natural idiomatic language",
    hints: "no hints",
    feedback: "be direct and precise. Identify every grammar, vocabulary, and naturalness issue. Ignore capitalization errors. Do not soften criticism. Partial means noticeable errors but core meaning conveyed. Incorrect means wrong, off-topic, or incomprehensible."
  },
};


async function generateDialogue({ scenario, level, language }) {
  const guide = LEVEL_GUIDES[level];

  const systemPrompt = `You are a language tutor creating dialogue practice for K-12 students.
Return ONLY valid JSON. No markdown, no explanation, no code fences.
Use this exact shape:
{
  "npcName": "string",
  "dialogue": [
    { "speaker": "npc", "line": "string" },
    { "speaker": "user", "prompt": "string", "hint": "string or null" }
  ]
}
Rules:
- "npcName": the name or role of the character the student is talking to. Match it to the scenario and context (e.g. "Classmate", "Teacher", "Receptionist", "Barista", "Friend"). Use a natural name or role, not a job title alone.
- Alternate between npc and user turns. Always start with npc.
- Include exactly ${guide.turns} user turns.
- Vocabulary: ${guide.vocab}.
- Hints: ${guide.hints}.
- Hints must never include pronunciation guides or syllable breakdowns. Only include example phrases or sentence starters.
- User prompts must give a single specific task with no open-ended options. Never say "order a drink and a food item" — instead say "order a green tea and a croissant". Name the specific items, actions, and details the student should use so the pre-scripted NPC response will match.
- User prompts must describe the task in plain English without including any target language words, phrases, or translations. Do not embed the answer in the prompt. Hints may include example phrases in ${language} as scaffolding, but never the complete answer.
- Keep content appropriate for school-age children.`;

  const userPrompt = `Scenario: "${scenario}" in ${language} at level ${level}.
Generate a short practice dialogue where the student plays the visitor.`;

  try {
    const message = await client.messages.create({
      model: language === "Turkish" || language === "Russian" ? "claude-sonnet-4-6" : MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const raw = message.content?.[0]?.text ?? "";
    return parseDialogueResponse(raw);
  } catch (err) {
    console.error("generateDialogue error:", err.message);
    return { ok: false, error: "Couldn't load your conversation. Please try again." };
  }
}


function parseDialogueResponse(raw) {
  try {
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.dialogue) || parsed.dialogue.length === 0) {
      throw new Error("dialogue array missing or empty");
    }
    for (const turn of parsed.dialogue) {
      if (!turn.speaker) throw new Error("turn missing speaker");
      if (turn.speaker === "npc" && !turn.line) throw new Error("npc turn missing line");
      if (turn.speaker === "user" && !turn.prompt) throw new Error("user turn missing prompt");
    }
    return { ok: true, dialogue: parsed.dialogue, npcName: parsed.npcName ?? "Speaker" };
  } catch (err) {
    console.error("parseDialogueResponse failed:", err.message, "| raw:", raw);
    return { ok: false, error: "The AI returned an unexpected response. Please try again." };
  }
}


async function evaluateAnswer({ scenario, level, language, prompt, userAnswer }) {
  const guide = LEVEL_GUIDES[level];

  const systemPrompt = `You are a language tutor for K-12 students.
Return ONLY valid JSON. No markdown, no explanation, no code fences.
Use this exact shape:
{
  "result": "correct" | "partial" | "incorrect",
  "feedback": "string",
  "betterAnswer": "string"
}
Rules:
- "correct": answer is natural, grammatically sound, and fulfills the prompt fully.
- "partial": answer shows understanding but has grammar errors, missing elements, or unnatural phrasing.
- "incorrect": answer is wrong, incomprehensible, or completely off-topic.
- "feedback": ${guide.feedback}. Always start with something positive.
- "betterAnswer": a natural model answer at ${level} level.
- All content must be appropriate for school-age children.`;

  const userPrompt = `Language: ${language}, Level: ${level}, Scenario: "${scenario}".
The student was asked to: "${prompt}"
The student answered: "${userAnswer}"
Evaluate their answer.`;

  try {
    const message = await client.messages.create({
      model: language === "Turkish" || language === "Russian" ? "claude-sonnet-4-6" : MODEL,
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
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    if (!["correct", "partial", "incorrect"].includes(parsed.result)) throw new Error("result field invalid");
    if (typeof parsed.feedback !== "string") throw new Error("feedback field missing");
    if (typeof parsed.betterAnswer !== "string") throw new Error("betterAnswer field missing");

    return {
      ok: true,
      result: parsed.result,
      feedback: parsed.feedback,
      betterAnswer: parsed.betterAnswer,
    };
  } catch (err) {
    console.error("parseEvaluationResponse failed:", err.message, "| raw:", raw);
    return {
      ok: true,
      result: "partial",
      feedback: "Good effort! Keep going.",
      betterAnswer: "",
    };
  }
}

module.exports = { generateDialogue, evaluateAnswer, parseDialogueResponse, parseEvaluationResponse };