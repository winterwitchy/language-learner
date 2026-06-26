// Use an in-memory database so tests never touch the real file. Must be set
// before the db modules are required (they open the connection on import).
process.env.DB_PATH = ":memory:";

const chatsRepo = require("../db/chats");
const turnsRepo = require("../db/turns");
const profilesRepo = require("../db/profiles");
const reportsRepo = require("../db/reports");

describe("chats + turns persistence", () => {
  test("creates a chat with sane defaults", () => {
    const id = chatsRepo.createChat({ scenario: "cafe", language: "English", level: "A2", npcName: "Barista" });
    expect(typeof id).toBe("number");
    const chat = chatsRepo.getChat(id);
    expect(chat.scenario).toBe("cafe");
    expect(chat.status).toBe("active");
    expect(chat.user_id).toBe("000000");
  });

  test("inserts turns and reads them back in order", () => {
    const id = chatsRepo.createChat({ scenario: "cafe", language: "English", level: "A2" });
    turnsRepo.insertTurns(id, [
      { ai_message: "Hello!", task: "Greet back", hint: "Say hi" },
      { ai_message: "Anything else?", task: "Order tea", hint: null },
      { ai_message: "Have a nice day!", task: null, hint: null },
    ]);
    const turns = turnsRepo.getTurns(id);
    expect(turns).toHaveLength(3);
    expect(turns[0].turn_id).toBe(0);
    expect(turns[2].task).toBeNull();
  });

  test("resume point is the first unanswered user turn", () => {
    const id = chatsRepo.createChat({ scenario: "cafe", language: "English", level: "A2" });
    turnsRepo.insertTurns(id, [
      { ai_message: "Hi", task: "Greet", hint: null },
      { ai_message: "Next", task: "Order", hint: null },
    ]);
    expect(turnsRepo.findResumeTurnId(id)).toBe(0);

    turnsRepo.recordAnswer(id, 0, { studentResponse: "Hi there", result: "correct", score: 1, feedback: "Good", betterAnswer: "Hi!", mistakeNote: null });
    expect(turnsRepo.findResumeTurnId(id)).toBe(1);

    turnsRepo.recordAnswer(id, 1, { studentResponse: "Tea please", result: "correct", score: 1, feedback: "Nice", betterAnswer: "Tea, please", mistakeNote: null });
    expect(turnsRepo.findResumeTurnId(id)).toBeNull();
    expect(turnsRepo.hasUnansweredTurns(id)).toBe(false);
  });

  test("AI-only trailing line is not counted as answerable", () => {
    const id = chatsRepo.createChat({ scenario: "cafe", language: "English", level: "A1" });
    turnsRepo.insertTurns(id, [
      { ai_message: "Hi", task: "Greet", hint: null },
      { ai_message: "Bye!", task: null, hint: null },
    ]);
    turnsRepo.recordAnswer(id, 0, { studentResponse: "Hello", result: "correct", score: 1, feedback: "Good", betterAnswer: "Hello", mistakeNote: null });
    expect(turnsRepo.hasUnansweredTurns(id)).toBe(false);
  });

  test("lists a user's chats and filters by status", () => {
    const u = "list-test-user";
    chatsRepo.createChat({ userId: u, scenario: "cafe", language: "English", level: "A2" });
    const b = chatsRepo.createChat({ userId: u, scenario: "hotel", language: "French", level: "A1" });
    chatsRepo.setStatus(b, "completed");

    expect(chatsRepo.listChats({ userId: u }).length).toBe(2);
    const completed = chatsRepo.listChats({ userId: u, status: "completed" });
    expect(completed.length).toBe(1);
    expect(completed[0].chat_id).toBe(b);
  });
});

describe("profiles + reports", () => {
  test("upserts and updates a learner profile, kept separate per language", () => {
    profilesRepo.upsertProfile("u-prof", "English", {
      summary: "Works on tenses",
      recurringPatterns: [{ pattern: "past tense", count: 2, examples: [] }],
      sessionsCount: 1,
    });
    const p = profilesRepo.getProfile("u-prof", "English");
    expect(p.summary).toBe("Works on tenses");
    expect(JSON.parse(p.recurring_patterns)[0].pattern).toBe("past tense");

    profilesRepo.upsertProfile("u-prof", "English", { summary: "Updated", recurringPatterns: [], sessionsCount: 2 });
    expect(profilesRepo.getProfile("u-prof", "English").sessions_count).toBe(2);

    // A different language is an independent profile.
    profilesRepo.upsertProfile("u-prof", "Turkish", { summary: "Cases", recurringPatterns: [], sessionsCount: 1 });
    expect(profilesRepo.getProfile("u-prof", "Turkish").summary).toBe("Cases");
    expect(profilesRepo.getProfile("u-prof", "English").summary).toBe("Updated");
  });

  test("caches a session report", () => {
    const id = chatsRepo.createChat({ scenario: "cafe", language: "English", level: "A2" });
    reportsRepo.upsertReport(id, { summary: "Nice", recurringPatterns: [], scoreCorrect: 2, scoreTotal: 3 });
    const r = reportsRepo.getReport(id);
    expect(r.summary).toBe("Nice");
    expect(r.score_total).toBe(3);
  });
});
