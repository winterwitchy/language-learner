const { parseDialogueResponse, parseEvaluationResponse } = require("../llm");
describe("parseDialogueResponse", () => {

  test("returns ok:true for valid dialogue JSON", () => {
    const input = JSON.stringify({
      dialogue: [
        { speaker: "npc", line: "Hello! What would you like?" },
        { speaker: "user", prompt: "Order a coffee.", hint: "Try: I'd like..." },
      ],
    });

    const result = parseDialogueResponse(input);
    expect(result.ok).toBe(true);
    expect(result.dialogue).toHaveLength(2);
  });
  test("returns ok:false for empty string", () => {
    const result = parseDialogueResponse("");
    expect(result.ok).toBe(false);
  });

  test("returns ok:false for malformed JSON", () => {
    const result = parseDialogueResponse("{ not valid json }");
    expect(result.ok).toBe(false);
  });

  test("returns ok:false when dialogue array is missing", () => {
    const result = parseDialogueResponse(JSON.stringify({ scenario: "cafe" }));
    expect(result.ok).toBe(false);
  });

  test("returns ok:false when dialogue array is empty", () => {
    const result = parseDialogueResponse(JSON.stringify({ dialogue: [] }));
    expect(result.ok).toBe(false);
  });

  test("returns ok:false when npc turn is missing line", () => {
    const result = parseDialogueResponse(JSON.stringify({
      dialogue: [{ speaker: "npc" }]
    }));
    expect(result.ok).toBe(false);
  });

  test("returns ok:false when user turn is missing prompt", () => {
    const result = parseDialogueResponse(JSON.stringify({
      dialogue: [{ speaker: "user", hint: "some hint" }]
    }));
    expect(result.ok).toBe(false);
  });

  test("handles JSON wrapped in markdown code fences", () => {
    const input = "```json\n" + JSON.stringify({
      dialogue: [
        { speaker: "npc", line: "Hello!" },
        { speaker: "user", prompt: "Respond.", hint: null },
      ]
    }) + "\n```";
    const result = parseDialogueResponse(input);
    expect(result.ok).toBe(true);
  });

});


describe("parseEvaluationResponse", () => {

  test("returns ok:true for valid evaluation JSON", () => {
    const input = JSON.stringify({
      correct: true,
      feedback: "Great job!",
      betterAnswer: "I'd like a coffee, please.",
    });

    const result = parseEvaluationResponse(input);
    expect(result.ok).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.feedback).toBe("Great job!");
  });

  test("returns ok:true with correct:false for wrong answer", () => {
    const input = JSON.stringify({
      correct: false,
      feedback: "Good try! Remember to say please.",
      betterAnswer: "Can I have a coffee, please?",
    });

    const result = parseEvaluationResponse(input);
    expect(result.ok).toBe(true);
    expect(result.correct).toBe(false);
  });

  test("returns graceful fallback for empty string", () => {
    const result = parseEvaluationResponse("");
    expect(result.ok).toBe(true);
    expect(result.feedback).toBeDefined();
  });

  test("returns graceful fallback for malformed JSON", () => {
    const result = parseEvaluationResponse("oops");
    expect(result.ok).toBe(true);
    expect(result.feedback).toBeDefined();
  });

  test("returns graceful fallback when correct field is not boolean", () => {
    const input = JSON.stringify({
      correct: "yes",
      feedback: "Good!",
      betterAnswer: "...",
    });
    const result = parseEvaluationResponse(input);
    expect(result.ok).toBe(true);
  });

});