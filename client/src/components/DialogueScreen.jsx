import React, { useEffect, useRef } from "react";

// Max length of a student answer. Kept in sync with the server-side check in
// index.js so the API call is never wasted on an over-long answer.
const MAX_ANSWER_LENGTH = 280;

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


const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: 1200,
    margin: "0 auto",
    background: "#F6F2EC",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    background: "#fff",
    borderBottom: "1px solid #E7E1D7",
    gap: "0.5rem",
    flexShrink: 0,
  },
  backBtn: {
    background: "transparent",
    color: "#4A5568",
    fontSize: "0.9rem",
    padding: "0.3rem 0.6rem",
    borderRadius: 8,
    fontWeight: 600,
  },
  topBarCenter: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  scenarioTag: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#2B2630",
  },
  levelBadge: {
    fontWeight: 800,
    fontSize: "0.75rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 20,
  },
  langTag: {
    fontSize: "0.8rem",
    color: "#4A5568",
    background: "#F6F2EC",
    padding: "0.15rem 0.5rem",
    borderRadius: 20,
  },
  scorePill: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#2B2630",
    background: "#FEF6E7",
    padding: "0.3rem 0.7rem",
    borderRadius: 20,
    border: "1.5px solid #F5A623",
    whiteSpace: "nowrap",
  },
  progressTrack: {
    height: 5,
    background: "#E7E1D7",
    flexShrink: 0,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#F6F2EC",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "1.25rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputArea: {
    padding: "0.75rem 2rem",
    background: "#fff",
    borderTop: "1px solid #E7E1D7",
    display: "flex",
    gap: "0.6rem",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  npcRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
  },
  npcAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  npcBubbleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    maxWidth: "75%",
  },
  npcName: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#4A5568",
    marginLeft: "0.3rem",
  },
  npcBubble: {
    background: "#fff",
    border: "1.5px solid #E7E1D7",
    borderRadius: "4px 16px 16px 16px",
    padding: "0.7rem 1rem",
    fontSize: "1rem",
    color: "#2B2630",
    lineHeight: 1.5,
  },
  userRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  promptCard: {
    background: "#fff",
    border: "2px dashed #6B4FD0",
    borderRadius: 14,
    padding: "0.8rem 1rem",
  },
  promptLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#5135A8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.3rem",
  },
  promptText: {
    fontSize: "0.95rem",
    color: "#2B2630",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  hint: {
    marginTop: "0.5rem",
    fontSize: "0.85rem",
    color: "#B87A10",
    background: "#FEF6E7",
    borderRadius: 8,
    padding: "0.35rem 0.6rem",
    display: "inline-block",
  },
  userBubbleWrap: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: "0.6rem",
  },
  userBubble: {
    maxWidth: "70%",
    borderRadius: "16px 4px 16px 16px",
    padding: "0.7rem 1rem",
    fontSize: "1rem",
    lineHeight: 1.5,
    border: "2px solid",
    fontWeight: 500,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3DBD8A, #2A9468)",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  evaluatingRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.4rem 0",
  },
  evaluatingText: {
    fontSize: "0.85rem",
    color: "#4A5568",
    fontStyle: "italic",
  },
  feedbackCard: {
    borderRadius: 14,
    padding: "1rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  feedbackIcon: {
    fontSize: "1.5rem",
    flexShrink: 0,
  },
  feedbackBody: {
    flex: 1,
  },
  feedbackText: {
    fontSize: "0.95rem",
    color: "#2B2630",
    lineHeight: 1.5,
    marginBottom: "0.4rem",
  },
  betterAnswer: {
    fontSize: "0.88rem",
    color: "#4A5568",
    background: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    padding: "0.35rem 0.6rem",
  },
  betterLabel: {
    fontWeight: 700,
  },
  nextBtn: {
    padding: "0.5rem 1rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "0.9rem",
    borderRadius: 10,
    flexShrink: 0,
    alignSelf: "center",
  },
  inputArea: {
    padding: "0.75rem 1rem",
    background: "#fff",
    borderTop: "1px solid #E7E1D7",
    display: "flex",
    gap: "0.6rem",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: "none",
    fontSize: "1rem",
    lineHeight: 1.5,
    borderRadius: 12,
    padding: "0.6rem 0.9rem",
    border: "2px solid #E7E1D7",
    outline: "none",
    transition: "border-color 0.15s",
  },
  charCount: {
    fontSize: "0.7rem",
    color: "#4A5568",
    alignSelf: "flex-end",
    paddingBottom: "0.55rem",
    whiteSpace: "nowrap",
  },
  submitBtn: {
    padding: "0.6rem 1.2rem",
    background: "linear-gradient(135deg, #E8823C, #C76A22)",
    color: "#fff",
    fontSize: "1rem",
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  inputDisabled: {
    flex: 1,
    padding: "0.8rem",
    color: "#4A5568",
    fontSize: "0.9rem",
    fontStyle: "italic",
    textAlign: "center",
  },
};


export default function DialogueScreen({
  visibleTurns,
  currentTurn,
  userInput,
  setUserInput,
  evaluation,
  isEvaluating,
  awaitingInput,
  score,
  answersMap,
  turnHistory,
  totalUserTurns,
  completedUserTurns,
  npcName,
  sessionConfig,
  onSubmit,
  onAdvance,
  onReset,
}) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleTurns, evaluation]);

  useEffect(() => {
    if (awaitingInput) inputRef.current?.focus();
  }, [awaitingInput]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && awaitingInput && userInput.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const scenario = sessionConfig?.scenario;
  const level = sessionConfig?.level;
  const language = sessionConfig?.language;
  // Level badge is always purple (secondary accent), regardless of difficulty.
  const levelColors = { bg: "#EFEAFB", text: "#5135A8", border: "#6B4FD0" };
  const progress = totalUserTurns > 0 ? (score.total / totalUserTurns) * 100 : 0;

  return (
    <div style={styles.wrapper}>

      <div style={styles.topBar}>
        <button onClick={onReset} style={styles.backBtn}>← Back</button>
        <div style={styles.topBarCenter}>
          <span style={styles.scenarioTag}>{SCENARIO_LABELS[scenario] ?? scenario}</span>
          <span style={{
            ...styles.levelBadge,
            background: levelColors.bg,
            color: levelColors.text,
            border: `1.5px solid ${levelColors.border}`,
          }}>
            {level}
          </span>
          <span style={styles.langTag}>{language}</span>
        </div>
        <div style={styles.scorePill}>⭐ {score.correct}/{score.total}</div>
      </div>

      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill,
          width: `${progress}%`,
          background: progress === 100 ? "#3DBD8A" : "#E8823C",
        }} />
      </div>
      <div style={styles.chatArea}>
        {visibleTurns.map((turn, i) => {
          if (turn.speaker === "npc") {
            return (
              <div key={i} style={styles.npcRow}>
                <div style={styles.npcAvatar}>{npcName[0]}</div>
                <div style={styles.npcBubbleWrap}>
                  <div style={styles.npcName}>{npcName}</div>
                  <div style={styles.npcBubble}>{turn.line}</div>
                </div>
              </div>
            );
          }

          if (turn.speaker === "user") {
            const isCurrentTurn = i === visibleTurns.length - 1;
            const submittedAnswer = answersMap[i];
            const turnResult = turnHistory[Object.keys(answersMap).indexOf(String(i))]?.result;

            return (
              <div key={i} style={styles.userRow}>
                <div style={styles.promptCard}>
                  <div style={styles.promptLabel}>Your turn</div>
                  <div style={styles.promptText}>{turn.prompt}</div>
                  {turn.hint && isCurrentTurn && !evaluation && (
                    <div style={styles.hint}>💡 {turn.hint}</div>
                  )}
                </div>

                {submittedAnswer && (!isCurrentTurn || evaluation) && (
                  <div style={styles.userBubbleWrap}>
                    <div style={{
                      ...styles.userBubble,
                      borderColor: turnResult === "correct" ? "#3DBD8A" : turnResult === "partial" ? "#F5A623" : "#F26B5B",
                      background: turnResult === "correct" ? "#E6F9F2" : turnResult === "partial" ? "#FEF6E7" : "#FEF0EE",
                    }}>
                      {submittedAnswer}
                    </div>
                    <div style={styles.userAvatar}>You</div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {isEvaluating && (
          <div style={styles.evaluatingRow}>
            <div style={styles.evaluatingText}>Checking your answer…</div>
          </div>
        )}

        {evaluation && !isEvaluating && (
          <div style={{
            ...styles.feedbackCard,
            borderLeft: `4px solid ${evaluation.result === "correct" ? "#3DBD8A" : evaluation.result === "partial" ? "#F5A623" : "#F26B5B"}`,
            background: evaluation.result === "correct" ? "#E6F9F2" : evaluation.result === "partial" ? "#FEF6E7" : "#FEF0EE",
          }}>
            <div style={styles.feedbackIcon}>
              {evaluation.result === "correct" ? "🎉" : evaluation.result === "partial" ? "🤔" : "😔"}
            </div>
            <div style={styles.feedbackBody}>
              <div style={styles.feedbackText}>{evaluation.feedback}</div>
              {evaluation.betterAnswer && (
                <div style={styles.betterAnswer}>
                  <span style={styles.betterLabel}>Model answer: </span>
                  {evaluation.betterAnswer}
                </div>
              )}
            </div>
            <button onClick={onAdvance} style={styles.nextBtn}>Next →</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {awaitingInput && (
        <div style={styles.inputArea}>
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here…"
            rows={2}
            maxLength={MAX_ANSWER_LENGTH}
            style={styles.textarea}
          />
          <span style={styles.charCount}>
            {userInput.length}/{MAX_ANSWER_LENGTH}
          </span>
          <button
            onClick={onSubmit}
            disabled={!userInput.trim()}
            style={styles.submitBtn}
          >
            Send
          </button>
        </div>
      )}

      {isEvaluating && (
        <div style={styles.inputArea}>
          <div style={styles.inputDisabled}>Evaluating your answer…</div>
        </div>
      )}

    </div>
  );
}