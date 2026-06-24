import { useState, useCallback, useEffect } from "react";
import { generateDialogue, evaluateAnswer } from "../api";


export function useDialogue() {
  const [status, setStatus] = useState("idle");
  const [dialogue, setDialogue] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [turnHistory, setTurnHistory] = useState([]);

  const currentTurn = dialogue[stepIndex] ?? null;

  useEffect(() => {
    if (status === "active" && currentTurn?.speaker === "npc" && !evaluation) {
      const timer = setTimeout(() => {
        setStepIndex((prev) => {
          const next = prev + 1;
          if (next >= dialogue.length) {
            setStatus("complete");
            return prev;
          }
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, currentTurn, dialogue, evaluation]);

  const start = useCallback(async ({ scenario, level, language }) => {
    setStatus("loading");
    setDialogue([]);
    setStepIndex(0);
    setUserInput("");
    setEvaluation(null);
    setScore({ correct: 0, total: 0 });
    setTurnHistory([]);
    setErrorMessage("");
    setSessionConfig({ scenario, level, language });

    const result = await generateDialogue({ scenario, level, language });

    if (!result.ok) {
      setErrorMessage(result.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    setDialogue(result.dialogue);
    setStepIndex(0);
    setStatus("active");
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!userInput.trim() || isEvaluating) return;

    const currentTurn = dialogue[stepIndex];
    if (!currentTurn || currentTurn.speaker !== "user") return;

    setIsEvaluating(true);
    setEvaluation(null);

    const result = await evaluateAnswer({
      scenario: sessionConfig.scenario,
      level: sessionConfig.level,
      language: sessionConfig.language,
      prompt: currentTurn.prompt,
      userAnswer: userInput.trim(),
    });

    const eval_ = result.ok
      ? { result: result.result, feedback: result.feedback, betterAnswer: result.betterAnswer }
      : { result: "partial", feedback: "Good effort! Keep going.", betterAnswer: "" };

    setEvaluation(eval_);
    setScore((prev) => ({
      correct: prev.correct + (eval_.result === "correct" ? 1 : eval_.result === "partial" ? 0.5 : 0),
      total: prev.total + 1,
    }));
    setTurnHistory((prev) => [
      ...prev,
      {
        prompt: currentTurn.prompt,
        userAnswer: userInput.trim(),
        result: eval_.result,
        feedback: eval_.feedback,
        betterAnswer: eval_.betterAnswer,
      },
    ]);
    setIsEvaluating(false);
  }, [userInput, isEvaluating, dialogue, stepIndex, sessionConfig]);

    const advance = useCallback(() => {
    setEvaluation(null);
    setUserInput("");

    const nextStep = stepIndex + 1;

    if (nextStep >= dialogue.length) {
      setStatus("complete");
      return;
    }

    setStepIndex(nextStep);
  }, [stepIndex, dialogue]);

    const reset = useCallback(() => {
    setStatus("idle");
    setDialogue([]);
    setStepIndex(0);
    setUserInput("");
    setEvaluation(null);
    setIsEvaluating(false);
    setSessionConfig(null);
    setErrorMessage("");
    setScore({ correct: 0, total: 0 });
    setTurnHistory([]);
  }, []);


  const awaitingInput = status === "active" && currentTurn?.speaker === "user" && !evaluation && !isEvaluating;
  const totalUserTurns = dialogue.filter((t) => t.speaker === "user").length;
  const visibleTurns = dialogue.slice(0, stepIndex + 1);

  return {
    status,
    dialogue,
    visibleTurns,
    stepIndex,
    currentTurn,
    userInput,
    setUserInput,
    evaluation,
    isEvaluating,
    awaitingInput,
    score,
    turnHistory,
    sessionConfig,
    errorMessage,
    totalUserTurns,
    start,
    submitAnswer,
    advance,
    reset,
  };
}