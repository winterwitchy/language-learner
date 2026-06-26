import React, { useState, useEffect } from "react";
import { listChats, getProfile, deleteChat } from "../api";

// Colours for the previous-chats list: completed = green, quit = yellow.
const CHAT_STATUS_META = {
  completed: { label: "Completed", color: "#3DBD8A" },
  abandoned: { label: "Quit", color: "#F5A623" },
  active: { label: "In progress", color: "#E8823C" },
};

// Default number of user turns per level (mirrors LEVEL_GUIDES on the server).
// The length is auto-set from the level but the student can override it.
const LEVEL_TURNS = { A1: 2, A2: 3, B1: 4, B2: 5 };
const MIN_TURNS = 1;
const MAX_TURNS = 20;

// How many previous chats to show before the "Show all" toggle.
const COLLAPSED_COUNT = 4;

// Row accent in the brand palette (no red/yellow/green). Shade = intensity:
//   light orange = quit / in-progress (just unfinished)
//   dark orange  = completed but weak (<50%) -> review
//   purple       = completed okay (50-74%)
//   dark purple  = completed strongly (>=75%)
function chatAccent(chat) {
  if (chat.status !== "completed") return "#EDA45E"; // quit / in-progress -> light orange
  const pct = chat.score?.total ? chat.score.correct / chat.score.total : 0;
  if (pct >= 0.75) return "#5135A8"; // strong -> dark purple
  if (pct >= 0.5) return "#6B4FD0"; // okay -> purple
  return "#C76A22"; // unsuccessful -> dark orange
}

const SCENARIOS = [
  { id: "cafe", label: "☕ At a Café", description: "Order drinks and snacks" },
  { id: "restaurant", label: "🍽️ At a Restaurant", description: "Order a meal and ask for the bill" },
  { id: "hotel", label: "🏨 At a Hotel", description: "Check in and ask about facilities" },
  { id: "bookshop", label: "📚 At a Bookshop", description: "Find a book with some help" },
  { id: "grocery", label: "🛒 At a Grocery Store", description: "Find items and pay at the till" },
  { id: "directions", label: "🗺️ Asking Directions", description: "Find your way around town" },
  { id: "shop", label: "🛍️ At a Shop", description: "Buy something at a store" },
  { id: "school", label: "🏫 At School", description: "Talk to a classmate or teacher" },
  { id: "park", label: "🌳 At the Park", description: "Meet someone new outside" },
  { id: "pharmacy", label: "💊 At a Pharmacy", description: "Ask for medicine or advice" },
  { id: "airport", label: "✈️ At the Airport", description: "Check in and find your gate" },
  { id: "doctor", label: "🏥 At the Doctor", description: "Describe how you feel" },
];

const LANGUAGES = ["English", "French", "Spanish", "German", "Italian", "Turkish", "Russian"];
const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_LABELS = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
};

export default function SetupScreen({ onStart, onResume }) {
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("A2");
  const [scenario, setScenario] = useState(null);
  const [turns, setTurns] = useState(LEVEL_TURNS["A2"]);
  const [previousChats, setPreviousChats] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showAllResume, setShowAllResume] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    listChats().then((res) => {
      if (res.ok) setPreviousChats(res.chats ?? []);
    });
  }, []);

  // Review is per-language: refetch whenever the selected language changes.
  useEffect(() => {
    getProfile(language).then((res) => {
      if (res.ok) setProfile(res);
    });
  }, [language]);

  const canStart = scenario !== null;
  const scenarioLabel = (id) => SCENARIOS.find((s) => s.id === id)?.label ?? id;

  // Incomplete (resumable) vs completed, shown in separate cards so a quit chat
  // is never confused with a completed-but-weak one.
  const resumableChats = previousChats.filter((c) => c.status !== "completed");
  const completedChats = previousChats.filter((c) => c.status === "completed");
  const visibleResume = showAllResume ? resumableChats : resumableChats.slice(0, COLLAPSED_COUNT);
  const visibleDone = showAllDone ? completedChats : completedChats.slice(0, COLLAPSED_COUNT);

  const handleDelete = async (chatId) => {
    const res = await deleteChat(chatId);
    if (res.ok) setPreviousChats((prev) => prev.filter((c) => c.chatId !== chatId));
    setConfirmingId(null);
  };

  const renderChatRow = (c, deletable = false) => {
    const meta = CHAT_STATUS_META[c.status] ?? CHAT_STATUS_META.active;
    const accent = chatAccent(c);
    return (
      <div key={c.chatId} style={styles.rowWrapper}>
        <button
          onClick={() => onResume?.(c.chatId)}
          style={{ ...styles.prevItem, borderLeft: `4px solid ${accent}` }}
        >
          <span style={{ ...styles.statusDot, background: accent }} />
          <span style={styles.prevItemMain}>
            <span style={styles.prevItemTitle}>{scenarioLabel(c.scenario)}</span>
            <span style={styles.prevItemSub}>
              {c.language} · {c.level} · {meta.label}
            </span>
          </span>
          <span style={{ ...styles.prevItemScore, color: accent }}>
            {c.score?.correct ?? 0}/{c.score?.total ?? 0}
          </span>
        </button>
        {deletable &&
          (confirmingId === c.chatId ? (
            <div style={styles.confirmBox}>
              <button
                onClick={() => handleDelete(c.chatId)}
                style={styles.confirmYes}
                title="Confirm delete"
                aria-label="Confirm delete"
              >
                ✓
              </button>
              <button
                onClick={() => setConfirmingId(null)}
                style={styles.confirmNo}
                title="Cancel"
                aria-label="Cancel delete"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingId(c.chatId)}
              style={styles.deleteBtn}
              title="Delete dialogue"
              aria-label="Delete dialogue"
            >
              ×
            </button>
          ))}
      </div>
    );
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>Dialogue Practice</h1>
        <p style={styles.subtitle}>Pick a situation and start a real conversation!</p>
      </header>

      {profile && (profile.summary || profile.recurringPatterns?.length > 0) && (
        <div style={styles.reviewCard}>
          <div style={styles.reviewHeading}>🧭 Your review · {language}</div>
          {profile.summary && <p style={styles.reviewSummary}>{profile.summary}</p>}
          {profile.recurringPatterns?.length > 0 && (
            <div style={styles.reviewList}>
              {profile.recurringPatterns.slice(0, 4).map((p, i) => (
                <div key={i} style={styles.reviewItem}>
                  <span style={styles.reviewDot} />
                  <span style={styles.reviewText}>
                    {p.pattern}{p.count ? ` (${p.count}×)` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {resumableChats.length > 0 && (
        <div style={styles.prevCard}>
          <div style={styles.prevHeading}>↩️ Continue</div>
          <div style={styles.prevList}>{visibleResume.map((c) => renderChatRow(c, true))}</div>
          {resumableChats.length > COLLAPSED_COUNT && (
            <button onClick={() => setShowAllResume((s) => !s)} style={styles.showMoreBtn}>
              {showAllResume ? "Show less" : `Show all ${resumableChats.length}`}
            </button>
          )}
        </div>
      )}

      {completedChats.length > 0 && (
        <div style={styles.prevCard}>
          <div style={styles.prevHeading}>✓ Completed</div>
          <div style={styles.prevList}>{visibleDone.map((c) => renderChatRow(c, false))}</div>
          {completedChats.length > COLLAPSED_COUNT && (
            <button onClick={() => setShowAllDone((s) => !s)} style={styles.showMoreBtn}>
              {showAllDone ? "Show less" : `Show all ${completedChats.length}`}
            </button>
          )}
        </div>
      )}

      <div style={styles.card}>

        <section style={styles.section}>
          <label style={styles.sectionLabel}>🌍 Language</label>
          <div style={styles.row}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  ...styles.pill,
                  border: language === lang ? "2px solid #E8823C" : "2px solid transparent",
                  background: language === lang ? "#FBF0E6" : "#F6F2EC",
                  color: language === lang ? "#C76A22" : "#2B2630",
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <label style={styles.sectionLabel}>📊 Level</label>
          <div style={styles.row}>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setLevel(lvl); setTurns(LEVEL_TURNS[lvl]); }}
                style={{
                  ...styles.pill,
                  border: level === lvl ? "2px solid #E8823C" : "2px solid transparent",
                  background: level === lvl ? "#FBF0E6" : "#F6F2EC",
                  color: level === lvl ? "#C76A22" : "#2B2630",
                }}
              >
                <span style={{ fontWeight: 800 }}>{lvl}</span>
                <span style={{ fontSize: "0.75rem", display: "block" }}>
                  {LEVEL_LABELS[lvl]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <label style={styles.sectionLabel}>💬 Conversation length</label>
          <div style={styles.stepperRow}>
            <button
              type="button"
              onClick={() => setTurns((t) => Math.max(MIN_TURNS, t - 1))}
              disabled={turns <= MIN_TURNS}
              style={styles.stepperBtn}
            >
              −
            </button>
            <div style={styles.stepperValue}>
              <span style={styles.stepperNumber}>{turns}</span>
              <span style={styles.stepperUnit}>turns each</span>
            </div>
            <button
              type="button"
              onClick={() => setTurns((t) => Math.min(MAX_TURNS, t + 1))}
              disabled={turns >= MAX_TURNS}
              style={styles.stepperBtn}
            >
              +
            </button>
            {turns === LEVEL_TURNS[level] && (
              <span style={styles.stepperHint}>default for {level}</span>
            )}
          </div>
        </section>

        <section style={styles.section}>
          <label style={styles.sectionLabel}>🎭 Choose a Scenario</label>
          <div style={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                style={{
                  ...styles.scenarioCard,
                  border: scenario === s.id ? "2px solid #E8823C" : "2px solid transparent",
                  background: scenario === s.id ? "#FBF0E6" : "#F6F2EC",
                }}
              >
                <div style={styles.scenarioLabel}>{s.label}</div>
                <div style={styles.scenarioDesc}>{s.description}</div>
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => onStart({ language, level, scenario, turns })}
          disabled={!canStart}
          style={styles.startBtn}
        >
          Start Conversation →
        </button>

      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 840,
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  logo: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "2.2rem",
    color: "#2B2630",
    marginBottom: "0.4rem",
  },
  subtitle: {
    color: "#4A5568",
    fontSize: "1.1rem",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(200, 120, 60, 0.13)",
  },
  section: {
    marginBottom: "1.8rem",
  },
  sectionLabel: {
    display: "block",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#2B2630",
    marginBottom: "0.8rem",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  pill: {
    padding: "0.5rem 1rem",
    background: "#F6F2EC",
    color: "#2B2630",
    borderRadius: 30,
    fontSize: "0.9rem",
    border: "2px solid transparent",
    lineHeight: 1.3,
  },
  pillActive: {
    background: "#FBF0E6",
    borderColor: "#E8823C",
    color: "#C76A22",
  },
  scenarioGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "0.75rem",
  },
  scenarioCard: {
    padding: "1rem",
    background: "#F6F2EC",
    borderRadius: 14,
    textAlign: "left",
    border: "2px solid transparent",
    lineHeight: 1.4,
  },
  scenarioActive: {
    background: "#FBF0E6",
    borderColor: "#E8823C",
  },
  scenarioLabel: {
    fontWeight: 700,
    fontSize: "0.95rem",
    marginBottom: "0.25rem",
  },
  scenarioDesc: {
    fontSize: "0.8rem",
    color: "#4A5568",
  },
  startBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "1.1rem",
    borderRadius: 12,
    marginTop: "0.5rem",
  },
  stepperRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#F6F2EC",
    color: "#C76A22",
    fontSize: "1.4rem",
    fontWeight: 800,
    border: "2px solid #E7E1D7",
    lineHeight: 1,
  },
  stepperValue: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 70,
  },
  stepperNumber: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#2B2630",
  },
  stepperUnit: {
    fontSize: "0.7rem",
    color: "#4A5568",
  },
  stepperHint: {
    fontSize: "0.78rem",
    color: "#4A5568",
    fontStyle: "italic",
  },
  reviewCard: {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: "1.2rem 1.4rem",
    boxShadow: "0 4px 20px rgba(107, 79, 208, 0.13)",
    borderLeft: "5px solid #6B4FD0",
    marginBottom: "1.2rem",
  },
  reviewHeading: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#2B2630",
    marginBottom: "0.6rem",
  },
  reviewSummary: {
    fontSize: "0.88rem",
    color: "#2B2630",
    lineHeight: 1.5,
    marginBottom: "0.6rem",
  },
  reviewList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  reviewItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  reviewDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#6B4FD0",
    flexShrink: 0,
  },
  reviewText: {
    fontSize: "0.85rem",
    color: "#2B2630",
  },
  showMoreBtn: {
    marginTop: "0.7rem",
    width: "100%",
    padding: "0.5rem",
    background: "transparent",
    color: "#C76A22",
    fontSize: "0.85rem",
    fontWeight: 700,
    border: "none",
  },
  prevCard: {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: "1.2rem 1.4rem",
    boxShadow: "0 4px 20px rgba(200, 120, 60, 0.13)",
    marginBottom: "1.2rem",
  },
  prevHeading: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#2B2630",
    marginBottom: "0.8rem",
  },
  prevList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  rowWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  prevItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    padding: "0.6rem 0.8rem",
    background: "#F6F2EC",
    borderRadius: 12,
    border: "2px solid transparent",
    textAlign: "left",
    flex: 1,
    minWidth: 0,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 10,
    background: "transparent",
    color: "#4A5568",
    fontSize: "1.3rem",
    border: "2px solid #E7E1D7",
    lineHeight: 1,
  },
  confirmBox: {
    display: "flex",
    gap: "0.3rem",
    flexShrink: 0,
  },
  confirmYes: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 10,
    background: "#C76A22",
    color: "#fff",
    fontSize: "1.1rem",
    border: "none",
    lineHeight: 1,
  },
  confirmNo: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 10,
    background: "transparent",
    color: "#4A5568",
    fontSize: "1.3rem",
    border: "2px solid #E7E1D7",
    lineHeight: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  prevItemMain: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    lineHeight: 1.3,
  },
  prevItemTitle: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#2B2630",
  },
  prevItemSub: {
    fontSize: "0.75rem",
    color: "#4A5568",
  },
  prevItemScore: {
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "#C76A22",
    whiteSpace: "nowrap",
  },
};