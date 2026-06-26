import React, { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [value, setValue] = useState("");
  const canSubmit = value.trim().length > 0;

  const submit = () => {
    if (canSubmit) onLogin(value.trim());
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>Dialogue Practice</h1>
        <p style={styles.subtitle}>Enter your user ID to load your sessions.</p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="User ID"
          style={styles.input}
          autoFocus
        />

        <button onClick={submit} disabled={!canSubmit} style={styles.btn}>
          Continue →
        </button>

        <p style={styles.hint}>
          Demo: any ID works and keeps its own sessions. In the real app this is filled in from your login.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: "2.5rem 2rem",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(200, 120, 60, 0.13)",
    maxWidth: 380,
    width: "100%",
  },
  logo: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "1.8rem",
    color: "#2B2630",
    marginBottom: "0.4rem",
  },
  subtitle: {
    color: "#4A5568",
    fontSize: "1rem",
    marginBottom: "1.5rem",
  },
  input: {
    width: "100%",
    fontSize: "1.1rem",
    textAlign: "center",
    border: "2px solid #E7E1D7",
    borderRadius: 12,
    padding: "0.8rem",
    marginBottom: "1rem",
  },
  btn: {
    width: "100%",
    padding: "0.9rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "1.05rem",
    borderRadius: 12,
  },
  hint: {
    marginTop: "1.2rem",
    fontSize: "0.78rem",
    color: "#4A5568",
    lineHeight: 1.5,
  },
};
