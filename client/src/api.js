const BASE = "/api";

export async function generateDialogue({ scenario, level, language }) {
  try {
    const res = await fetch(`${BASE}/generate-dialogue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, level, language }),
    });

    const data = await res.json();

    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong." };
    return { ok: true, dialogue: data.dialogue };
  } catch {
    return { ok: false, error: "Could not connect to the server. Is it running?" };
  }
}

export async function evaluateAnswer({ scenario, level, language, prompt, userAnswer }) {
  try {
    const res = await fetch(`${BASE}/evaluate-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, level, language, prompt, userAnswer }),
    });

    const data = await res.json();

    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong." };
    return { ok: true, correct: data.correct, feedback: data.feedback, betterAnswer: data.betterAnswer };
  } catch {
    return { ok: false, error: "Could not connect to the server. Is it running?" };
  }
}