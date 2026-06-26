require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk")


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY});
// Task-based model split: Haiku for templated generation, Sonnet for the
// judgment-critical evaluation. Turkish & Russian use Sonnet for both because
// Haiku makes consistent morphological errors there.
const MODEL = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";


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


async function generateDialogue({ scenario, level, language, turns }) {
  const guide = LEVEL_GUIDES[level];
  // Length defaults to the level's guide but can be overridden (1-20 user turns).
  const turnCount = Number.isInteger(turns) ? turns : guide.turns;

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
- Include exactly ${turnCount} user turns.
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
      // Generation: Haiku, except Turkish/Russian which need Sonnet.
      model: language === "Turkish" || language === "Russian" ? SONNET : MODEL,
      // Scale the token budget with length so long dialogues aren't truncated.
      max_tokens: Math.min(4096, 512 + turnCount * 180),
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
  "betterAnswer": "string",
  "mistakeNote": "string or null"
}
Rules:
- Judge the answer ONLY against what the task literally asks for. If the task is "tell the waiter there are two people", a grammatically sound answer that conveys that is fully correct.
- Do NOT require greetings, politeness markers (e.g. "please", "excuse me"), forms of address (e.g. "Waiter", "Sir"), or extra detail unless the task explicitly asks for them. A direct, correct answer is "correct" even if it could be more polite, longer, or more elaborate. Never lower the grade or suggest adding these.
- "correct": the answer conveys what the task asked, with sound grammar and vocabulary.
- "partial": a real, mostly-complete attempt that conveys the intended meaning and would be understood, but has grammar/vocabulary errors or is unnatural. Reserve it for answers that genuinely communicate the message.
- "incorrect": wrong meaning, off-topic, incomprehensible, OR just disconnected keywords/fragments that don't form the requested sentence or request. Listing the right nouns without a functional sentence is NOT partial credit — e.g. "can coffee muffin" for "order a coffee and a muffin" is incorrect, not partial.
- ACCEPT VALID ALTERNATIVES: if the answer accomplishes the task's communicative goal, is grammatical, and a native speaker would understand it, mark it "correct" even if a different phrasing would be more idiomatic, polite, or natural. Do not downgrade just because a "better" version exists, and do not claim the task was unfulfilled when it was. (e.g. "How can I get to the taxi rank?", "How do I go to the taxi rank?", and "Where is the taxi rank?" are ALL correct ways to ask for directions.) Only say a required element is missing if it is genuinely absent — never fault the student for something they actually included.
- MINOR ERRORS: completely ignore spelling typos, punctuation, capitalisation, and missing or incorrect accents or diacritics. Treat the answer as if these were already correct. They must NEVER affect the "result", the points, OR the "feedback" — do not comment on, mention, or correct them at all (no "remember to capitalise", no "add a question mark", etc.). Grade and give feedback only on meaning, grammar, vocabulary, and whether the task was fulfilled.
- NORMALISE FIRST: before judging grammar, mentally rewrite the answer with correct capitalisation and punctuation, then evaluate THAT version. A missing question mark or a lower-case first letter NEVER turns a question into a statement and is never a grammar error. Do not invent or re-label a punctuation/capitalisation issue as a grammar rule (e.g. claiming a correctly word-ordered question "is a statement" or "needs inversion") to justify a lower grade. If the word order is already a valid question, it is correct.
- "feedback": ${guide.feedback}. Always start with something positive. But when the result is "partial" or "incorrect", you MUST also name the specific problem and how to fix it (the missing words, the correct structure) — not just praise. Stay warm yet substantive; "Great effort, you used the keywords" alone is not acceptable feedback for a broken answer.
- "betterAnswer": a natural model answer at ${level} level.
- "mistakeNote": a short, specific, plain-English description of the main SUBSTANTIVE mistake, written so a repeated pattern could be spotted later (e.g. "Used 'the one' instead of the ordinal 'the first'." or "Dropped the verb 'to be'."). Use null if the answer is correct or only had the minor errors described above (never write a note about a typo, punctuation, or accent).
- All content must be appropriate for school-age children.`;

  const userPrompt = `Language: ${language}, Level: ${level}, Scenario: "${scenario}".
The student was asked to: "${prompt}"
The student answered: "${userAnswer}"
Evaluate their answer.`;

  try {
    const message = await client.messages.create({
      // Evaluation: always Sonnet — grading is the judgment-critical call.
      model: SONNET,
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

    const mistakeNote =
      typeof parsed.mistakeNote === "string" && parsed.mistakeNote.trim()
        ? parsed.mistakeNote.trim()
        : null;

    return {
      ok: true,
      result: parsed.result,
      feedback: parsed.feedback,
      betterAnswer: parsed.betterAnswer,
      mistakeNote,
    };
  } catch (err) {
    console.error("parseEvaluationResponse failed:", err.message, "| raw:", raw);
    return {
      ok: true,
      result: "partial",
      feedback: "Good effort! Keep going.",
      betterAnswer: "",
      mistakeNote: null,
    };
  }
}


// ---------------------------------------------------------------------------
// Weakness reporting
//
// We never store fixed "error tags" — instead each evaluation emits a free-text
// mistakeNote, and these two helpers run a single LLM pass to find recurring
// patterns (per session) and to maintain a rolling per-user profile. This keeps
// the report flexible (it can surface emergent habits like "keeps saying 'the
// one' instead of 'the first'") without any predefined taxonomy.
// ---------------------------------------------------------------------------

function parseReportResponse(raw) {
  try {
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const recurringPatterns = Array.isArray(parsed.recurringPatterns)
      ? parsed.recurringPatterns
          .filter((p) => p && typeof p.pattern === "string")
          .map((p) => ({
            pattern: p.pattern,
            count: Number.isFinite(p.count) ? p.count : null,
            examples: Array.isArray(p.examples) ? p.examples.slice(0, 5) : [],
          }))
      : [];
    return { ok: true, summary, recurringPatterns };
  } catch (err) {
    console.error("parseReportResponse failed:", err.message, "| raw:", raw);
    return { ok: false, summary: "", recurringPatterns: [] };
  }
}


// Summarise one session's mistakes into recurring patterns.
async function generateSessionReport({ mistakeNotes = [] }) {
  if (!mistakeNotes.length) {
    return { ok: true, summary: "No notable recurring issues this session — nice work!", recurringPatterns: [] };
  }

  const systemPrompt = `You analyse a language student's mistakes from ONE practice session.
Return ONLY valid JSON. No markdown, no code fences.
Use this exact shape:
{
  "summary": "string",
  "recurringPatterns": [
    { "pattern": "string", "examples": ["string"] }
  ]
}
Rules:
- "summary": 1-3 encouraging, specific sentences on how the student did overall.
- Group mistakes that share an underlying cause into ONE pattern.
- List only the important issues worth working on; omit minor or one-off slips.
- Keep it specific (name the actual habit) and appropriate for school-age children.`;

  const userPrompt = `Here are the student's mistake notes from this session:\n${mistakeNotes
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n")}\n\nIdentify recurring patterns.`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return parseReportResponse(message.content?.[0]?.text ?? "");
  } catch (err) {
    console.error("generateSessionReport error:", err.message);
    return { ok: false, summary: "", recurringPatterns: [] };
  }
}


// Build the cumulative review profile from a windowed list of recent mistake
// notes. Recomputed from the window each time (no incremental merge), so old
// sessions age out naturally.
async function updateLearnerProfile({ sessionNotes = [] }) {
  if (!sessionNotes.length) {
    return { ok: true, summary: "", recurringPatterns: [] };
  }

  const systemPrompt = `You build a learning profile from a language student's recent practice mistakes.
Return ONLY valid JSON. No markdown, no code fences.
Use this exact shape:
{
  "summary": "string",
  "recurringPatterns": [
    { "pattern": "string", "examples": ["string"] }
  ]
}
Rules:
- Group mistakes that share an underlying cause into ONE pattern.
- List only the important, recurring patterns — the things most worth working on, most significant first. Omit one-off or minor slips.
- "summary": a concise, encouraging overview of what the student should work on next, across their recent sessions.
- Keep it appropriate for school-age children.`;

  const userPrompt = `The student's mistakes across their recent sessions:\n${sessionNotes
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n")}\n\nReturn the profile.`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return parseReportResponse(message.content?.[0]?.text ?? "");
  } catch (err) {
    console.error("updateLearnerProfile error:", err.message);
    return { ok: false, summary: "", recurringPatterns: [] };
  }
}

module.exports = {
  generateDialogue,
  evaluateAnswer,
  parseDialogueResponse,
  parseEvaluationResponse,
  generateSessionReport,
  updateLearnerProfile,
  parseReportResponse,
};