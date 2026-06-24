import React from "react";

export default function LoadingScreen({ sessionConfig }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <h2 style={styles.heading}>Preparing your conversation</h2>
        <p style={styles.sub}>
          {sessionConfig?.scenario} · {sessionConfig?.level} · {sessionConfig?.language}
        </p>
        <p style={styles.msg}>Setting the scene…</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
    padding: "3rem 2rem",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(74,144,217,0.12)",
    maxWidth: 360,
    width: "100%",
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "5px solid #EBF4FF",
    borderTop: "5px solid #4A90D9",
    margin: "0 auto 1.5rem",
    animation: "spin 0.9s linear infinite",
  },
  heading: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: "1.3rem",
    color: "#1A2340",
    marginBottom: "0.5rem",
  },
  sub: {
    fontSize: "0.85rem",
    color: "#4A5568",
    marginBottom: "1rem",
  },
  msg: {
    fontSize: "0.9rem",
    color: "#4A90D9",
    fontStyle: "italic",
  },
};