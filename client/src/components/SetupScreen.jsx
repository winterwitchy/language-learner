import React, { useState } from "react";

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

export default function SetupScreen({ onStart }) {
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("A2");
  const [scenario, setScenario] = useState(null);

  const canStart = scenario !== null;

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>Dialogue Practice</h1>
        <p style={styles.subtitle}>Pick a situation and start a real conversation!</p>
      </header>

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
                  border: language === lang ? "2px solid #4A90D9" : "2px solid transparent",
                  background: language === lang ? "#EBF4FF" : "#F0F6FF",
                  color: language === lang ? "#2C6FAC" : "#1A2340",
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
                onClick={() => setLevel(lvl)}
                style={{
                  ...styles.pill,
                  border: level === lvl ? "2px solid #4A90D9" : "2px solid transparent",
                  background: level === lvl ? "#EBF4FF" : "#F0F6FF",
                  color: level === lvl ? "#2C6FAC" : "#1A2340",
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
          <label style={styles.sectionLabel}>🎭 Choose a Scenario</label>
          <div style={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                style={{
                  ...styles.scenarioCard,
                  border: scenario === s.id ? "2px solid #4A90D9" : "2px solid transparent",
                  background: scenario === s.id ? "#EBF4FF" : "#F0F6FF",
                }}
              >
                <div style={styles.scenarioLabel}>{s.label}</div>
                <div style={styles.scenarioDesc}>{s.description}</div>
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => onStart({ language, level, scenario })}
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
    maxWidth: 680,
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
    color: "#1A2340",
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
    boxShadow: "0 4px 20px rgba(74, 144, 217, 0.12)",
  },
  section: {
    marginBottom: "1.8rem",
  },
  sectionLabel: {
    display: "block",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#1A2340",
    marginBottom: "0.8rem",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  pill: {
    padding: "0.5rem 1rem",
    background: "#F0F6FF",
    color: "#1A2340",
    borderRadius: 30,
    fontSize: "0.9rem",
    border: "2px solid transparent",
    lineHeight: 1.3,
  },
  pillActive: {
    background: "#EBF4FF",
    borderColor: "#4A90D9",
    color: "#2C6FAC",
  },
  scenarioGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "0.75rem",
  },
  scenarioCard: {
    padding: "1rem",
    background: "#F0F6FF",
    borderRadius: 14,
    textAlign: "left",
    border: "2px solid transparent",
    lineHeight: 1.4,
  },
  scenarioActive: {
    background: "#EBF4FF",
    borderColor: "#4A90D9",
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
    background: "linear-gradient(135deg, #4A90D9, #2C6FAC)",
    color: "#fff",
    fontSize: "1.1rem",
    borderRadius: 12,
    marginTop: "0.5rem",
  },
};