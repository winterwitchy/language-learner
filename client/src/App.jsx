import React, { useCallback } from "react";
import { useDialogue } from "./hooks/useDialogue";
import SetupScreen from "./components/SetupScreen";
import DialogueScreen from "./components/DialogueScreen";
import ResultsScreen from "./components/ResultsScreen";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";

export default function App() {
  const {
    status,
    visibleTurns,
    currentTurn,
    userInput,
    setUserInput,
    evaluation,
    isEvaluating,
    npcName,
    awaitingInput,
    score,
    turnHistory,
    answersMap,
    sessionConfig,
    errorMessage,
    totalUserTurns,
    chatId,
    start,
    resume,
    submitAnswer,
    advance,
    reset,
    leaveToChats,
  } = useDialogue();

  const handleReplay = useCallback(() => {
    if (sessionConfig) start(sessionConfig);
  }, [sessionConfig, start]);

  if (status === "idle") return <SetupScreen onStart={start} onResume={resume} />;
  if (status === "loading") return <LoadingScreen sessionConfig={sessionConfig} />;
  if (status === "error") return <ErrorScreen message={errorMessage} onRetry={handleReplay} onReset={reset} />;
  if (status === "complete") return (
    <ResultsScreen
      score={score}
      turnHistory={turnHistory}
      sessionConfig={sessionConfig}
      chatId={chatId}
      onReplay={handleReplay}
      onReset={reset}
    />
  );

  return (
    <DialogueScreen
      visibleTurns={visibleTurns}
      currentTurn={currentTurn}
      userInput={userInput}
      setUserInput={setUserInput}
      evaluation={evaluation}
      isEvaluating={isEvaluating}
      awaitingInput={awaitingInput}
      score={score}
      answersMap={answersMap}
      turnHistory={turnHistory}
      totalUserTurns={totalUserTurns}
      completedUserTurns={score.total}
      sessionConfig={sessionConfig}
      onSubmit={submitAnswer}
      onAdvance={advance}
      onReset={reset}
      onBackToChats={leaveToChats}
      npcName={npcName}
    />
  );
}