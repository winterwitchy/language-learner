import React from "react";

export default function ErrorScreen({ message, onRetry, onReset }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>⚠️</div>
        <h2 style={styles.heading}>Something went wrong</h2>
        <p style={styles.message}>
          {message || "We couldn't load your dialogue. Please try again."}
        </p>
        <div style={styles.actions}>
          <button onClick={onRetry} style={styles.retryBtn}>Try again</button>
          <button onClick={onReset} style={styles.resetBtn}>Back to setup</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "2rem",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "2.5rem 2rem",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(200,120,60,0.13)",
    maxWidth: 380,
    width: "100%",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  heading: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: "1.4rem",
    color: "#2B2630",
    marginBottom: "0.6rem",
  },
  message: {
    fontSize: "0.95rem",
    color: "#4A5568",
    marginBottom: "1.5rem",
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  retryBtn: {
    padding: "0.85rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "1rem",
    borderRadius: 12,
  },
  resetBtn: {
    padding: "0.85rem",
    background: "#F6F2EC",
    color: "#C76A22",
    fontSize: "1rem",
    borderRadius: 12,
    border: "2px solid #E8823C",
  },
};