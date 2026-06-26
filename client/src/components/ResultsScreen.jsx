import React from "react";

const SCENARIO_LABELS = {
  cafe: "☕ At a Café",
  restaurant: "🍽️ At a Restaurant",
  hotel: "🏨 At a Hotel",
  bookshop: "📚 At a Bookshop",
  grocery: "🛒 At a Grocery Store",
  directions: "🗺️ Asking Directions",
  shop: "🛍️ At a Shop",
  school: "🏫 At School",
  park: "🌳 At the Park",
  pharmacy: "💊 At a Pharmacy",
  airport: "✈️ At the Airport",
  doctor: "🏥 At the Doctor",
};

function getResultTier(correct, total) {
  if (total === 0) return { emoji: "🌟", label: "Done!", color: "#E8823C" };
  const pct = correct / total;
  if (pct === 1) return { emoji: "🏆", label: "Perfect!", color: "#F5A623" };
  if (pct >= 0.75) return { emoji: "🎉", label: "Great job!", color: "#3DBD8A" };
  if (pct >= 0.5) return { emoji: "💪", label: "Good effort!", color: "#E8823C" };
  return { emoji: "📚", label: "Keep practising!", color: "#F26B5B" };
}


export default function ResultsScreen({ score, turnHistory, sessionConfig, onReplay, onReset }) {
  const { correct, total } = score;
  const tier = getResultTier(correct, total);
  const scenario = sessionConfig?.scenario;
  const level = sessionConfig?.level;
  const language = sessionConfig?.language;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const circumference = 2 * Math.PI * 48;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>

        <div style={styles.hero}>
          <div style={styles.heroEmoji}>{tier.emoji}</div>
          <h1 style={{ ...styles.heroLabel, color: tier.color }}>{tier.label}</h1>
          <p style={styles.heroSub}>
            You got <strong>{correct}</strong> out of <strong>{total}</strong> points
          </p>

          <div style={styles.scoreRingWrap}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="48" fill="none" stroke="#E7E1D7" strokeWidth="10" />
              <circle
                cx="55" cy="55" r="48"
                fill="none"
                stroke={tier.color}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percentage / 100)}
                strokeLinecap="round"
                transform="rotate(-90 55 55)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div style={styles.scoreRingLabel}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: tier.color }}>
                {percentage}%
              </div>
            </div>
          </div>

          <div style={styles.metaRow}>
            <span style={styles.metaTag}>{SCENARIO_LABELS[scenario] ?? scenario}</span>
            <span style={styles.metaTag}>{level} · {language}</span>
          </div>
        </div>
        {turnHistory.length > 0 && (
          <div style={styles.breakdown}>
            <h2 style={styles.breakdownTitle}>Review your answers</h2>
            <div style={styles.turnList}>
              {turnHistory.map((turn, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.turnCard,
                    borderLeft: `4px solid ${turn.result === "correct" ? "#3DBD8A" : turn.result === "partial" ? "#F5A623" : "#F26B5B"}`,
                  }}
                >
                  <div style={styles.turnHeader}>
                    <span style={styles.turnNumber}>Turn {i + 1}</span>
                    <span style={turn.result === "correct" ? styles.correctBadge : turn.result === "partial" ? styles.partialBadge : styles.incorrectBadge}>
                      {turn.result === "correct" ? "✓ Correct" : turn.result === "partial" ? "~ Partial" : "✗ Needs work"}
                    </span>
                  </div>
                  <div style={styles.turnPrompt}>
                    <span style={styles.turnLabel}>Task: </span>{turn.prompt}
                  </div>
                  <div style={styles.turnAnswer}>
                    <span style={styles.turnLabel}>You said: </span>
                    <em>{turn.userAnswer}</em>
                  </div>
                  {turn.betterAnswer && (
                    <div style={styles.turnBetter}>
                      <span style={styles.turnLabel}>Model answer: </span>
                      {turn.betterAnswer}
                    </div>
                  )}
                  <div style={styles.turnFeedback}>{turn.feedback}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={styles.actions}>
          <button onClick={onReplay} style={styles.replayBtn}>
            🔄 Try Again
          </button>
          <button onClick={onReset} style={styles.newBtn}>
            🏠 New Scenario
          </button>
        </div>

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
  card: {
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 4px 20px rgba(200,120,60,0.13)",
    overflow: "hidden",
  },
  hero: {
    textAlign: "center",
    padding: "2.5rem 2rem 2rem",
    background: "linear-gradient(180deg, #F6F2EC 0%, #fff 100%)",
    borderBottom: "1px solid #E7E1D7",
  },
  heroEmoji: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  heroLabel: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: "2rem",
    marginBottom: "0.4rem",
  },
  heroSub: {
    fontSize: "1rem",
    color: "#4A5568",
    marginBottom: "1.5rem",
  },
  scoreRingWrap: {
    position: "relative",
    display: "inline-block",
    marginBottom: "1.2rem",
  },
  scoreRingLabel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  metaRow: {
    display: "flex",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  metaTag: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#4A5568",
    background: "#F6F2EC",
    padding: "0.2rem 0.6rem",
    borderRadius: 20,
    border: "1px solid #E7E1D7",
  },
  breakdown: {
    padding: "1.5rem 2rem",
  },
  breakdownTitle: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: "1.1rem",
    color: "#2B2630",
    marginBottom: "1rem",
  },
  turnList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  turnCard: {
    background: "#F9F6F0",
    borderRadius: 12,
    padding: "0.9rem 1rem",
  },
  turnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  turnNumber: {
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "#4A5568",
  },
  correctBadge: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#2A9468",
    background: "#E6F9F2",
    padding: "0.15rem 0.5rem",
    borderRadius: 20,
  },
  partialBadge: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#B87A10",
    background: "#FEF6E7",
    padding: "0.15rem 0.5rem",
    borderRadius: 20,
  },
  incorrectBadge: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#C0392B",
    background: "#FEF0EE",
    padding: "0.15rem 0.5rem",
    borderRadius: 20,
  },
  turnPrompt: {
    fontSize: "0.9rem",
    color: "#2B2630",
    marginBottom: "0.3rem",
    lineHeight: 1.4,
  },
  turnAnswer: {
    fontSize: "0.88rem",
    color: "#4A5568",
    marginBottom: "0.3rem",
  },
  turnBetter: {
    fontSize: "0.88rem",
    color: "#2A9468",
    fontWeight: 500,
    marginBottom: "0.3rem",
  },
  turnLabel: {
    fontWeight: 700,
    color: "#2B2630",
  },
  turnFeedback: {
    fontSize: "0.85rem",
    color: "#4A5568",
    fontStyle: "italic",
    marginTop: "0.4rem",
    borderTop: "1px solid #ECE6DC",
    paddingTop: "0.4rem",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    padding: "1.5rem 2rem",
    borderTop: "1px solid #E7E1D7",
    flexWrap: "wrap",
  },
  replayBtn: {
    flex: 1,
    padding: "0.85rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "1rem",
    borderRadius: 12,
    minWidth: 160,
  },
  newBtn: {
    flex: 1,
    padding: "0.85rem",
    background: "#F6F2EC",
    color: "#C76A22",
    fontSize: "1rem",
    borderRadius: 12,
    border: "2px solid #E8823C",
    minWidth: 160,
  },
};