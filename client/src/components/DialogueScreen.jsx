import React, { useEffect, useRef } from "react";

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

const NPC_NAMES = {
  cafe: "Barista",
  restaurant: "Waiter",
  hotel: "Receptionist",
  bookshop: "Bookseller",
  grocery: "Cashier",
  directions: "Local",
  shop: "Shopkeeper",
  school: "Teacher",
  park: "Friend",
  pharmacy: "Pharmacist",
  airport: "Staff",
  doctor: "Doctor",
};

const LEVEL_COLORS = {
  A1: { bg: "#E6F9F2", text: "#2A9468", border: "#3DBD8A" },
  A2: { bg: "#EBF4FF", text: "#2C6FAC", border: "#4A90D9" },
  B1: { bg: "#FEF6E7", text: "#B87A10", border: "#F5A623" },
  B2: { bg: "#FEF0EE", text: "#C0392B", border: "#F26B5B" },
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
  totalUserTurns,
  completedUserTurns,
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
  const levelColors = LEVEL_COLORS[level] ?? LEVEL_COLORS["A2"];
  const npcName = NPC_NAMES[scenario] ?? "Speaker";
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
          background: progress === 100 ? "#3DBD8A" : "#4A90D9",
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

            return (
              <div key={i} style={styles.userRow}>
                <div style={styles.promptCard}>
                  <div style={styles.promptLabel}>Your turn</div>
                  <div style={styles.promptText}>{turn.prompt}</div>
                  {turn.hint && !evaluation && (
                    <div style={styles.hint}>💡 {turn.hint}</div>
                  )}
                </div>

                {isCurrentTurn && evaluation && (
                  <div style={styles.userBubbleWrap}>
                    <div style={{
                      ...styles.userBubble,
                      borderColor: evaluation.correct ? "#3DBD8A" : "#F26B5B",
                      background: evaluation.correct ? "#E6F9F2" : "#FEF0EE",
                    }}>
                      {userInput}
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
            borderLeft: `4px solid ${evaluation.correct ? "#3DBD8A" : "#F26B5B"}`,
            background: evaluation.correct ? "#E6F9F2" : "#FEF0EE",
          }}>
            <div style={styles.feedbackIcon}>
              {evaluation.correct ? "🎉" : "💪"}
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
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here…"
            rows={2}
            style={styles.textarea}
          />
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