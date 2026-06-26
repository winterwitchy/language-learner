import { useState, useCallback, useEffect } from "react";
import { createChat, getChat, postAnswer, setChatStatus } from "../api";

// Convert the persisted merged turn rows into the alternating npc/user view the
// dialogue UI walks through. Each user entry keeps its turnId so we can submit
// answers to the right row.
function turnsToDialogue(turns) {
  const dialogue = [];
  for (const t of turns) {
    if (t.aiMessage) dialogue.push({ speaker: "npc", line: t.aiMessage });
    if (t.task != null) {
      dialogue.push({ speaker: "user", prompt: t.task, hint: t.hint, turnId: t.turnId });
    }
  }
  return dialogue;
}

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
  const [answersMap, setAnswersMap] = useState({});
  const [npcName, setNpcName] = useState("Speaker");
  const [chatId, setChatId] = useState(null);

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

  const start = useCallback(async ({ scenario, level, language, turns }) => {
    setStatus("loading");
    setDialogue([]);
    setStepIndex(0);
    setUserInput("");
    setEvaluation(null);
    setScore({ correct: 0, total: 0 });
    setTurnHistory([]);
    setAnswersMap({});
    setErrorMessage("");
    setChatId(null);
    setSessionConfig({ scenario, level, language, turns });

    const result = await createChat({ scenario, level, language, turns });

    if (!result.ok) {
      setErrorMessage(result.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    setChatId(result.chatId);
    setNpcName(result.npcName ?? "Speaker");
    setDialogue(turnsToDialogue(result.turns));
    setStepIndex(0);
    setStatus("active");
  }, []);

  // Reopen a saved (quit or completed) session and jump to where it left off.
  const resume = useCallback(async (id) => {
    setStatus("loading");
    setErrorMessage("");

    const result = await getChat(id);
    if (!result.ok) {
      setErrorMessage(result.error ?? "Couldn't load that session.");
      setStatus("error");
      return;
    }

    const turns = result.turns;
    const dlg = turnsToDialogue(turns);

    setSessionConfig({ scenario: result.scenario, level: result.level, language: result.language });
    setNpcName(result.npcName ?? "Speaker");
    setChatId(result.chatId);
    setDialogue(dlg);

    // Rebuild the answered history + running score, and find the first
    // unanswered user turn to resume from.
    const newAnswers = {};
    const newHistory = [];
    let correct = 0;
    let answered = 0;
    let resumeStep = -1;

    dlg.forEach((entry, idx) => {
      if (entry.speaker !== "user") return;
      const turn = turns.find((t) => t.turnId === entry.turnId);
      if (turn && turn.studentResponse != null) {
        newAnswers[idx] = turn.studentResponse;
        newHistory.push({
          prompt: turn.task,
          userAnswer: turn.studentResponse,
          result: turn.result,
          feedback: turn.feedback,
          betterAnswer: turn.betterAnswer,
        });
        correct += turn.score ?? 0;
        answered += 1;
      } else if (resumeStep === -1) {
        resumeStep = idx;
      }
    });

    setAnswersMap(newAnswers);
    setTurnHistory(newHistory);
    setScore({ correct, total: answered });
    setUserInput("");
    setEvaluation(null);

    if (resumeStep === -1) {
      setStepIndex(dlg.length - 1);
      setStatus("complete");
    } else {
      setStepIndex(resumeStep);
      setStatus("active");
    }
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!userInput.trim() || isEvaluating) return;

    const turn = dialogue[stepIndex];
    if (!turn || turn.speaker !== "user") return;

    const answer = userInput.trim();
    setIsEvaluating(true);
    setAnswersMap((prev) => ({ ...prev, [stepIndex]: answer }));
    setEvaluation(null);

    const result = await postAnswer({ chatId, turnId: turn.turnId, answer });

    const eval_ = result.ok
      ? { result: result.result, feedback: result.feedback, betterAnswer: result.betterAnswer }
      : { result: "partial", feedback: "Can't give feedback right now due to a technical issue 😔 Keep going — you're doing great!", betterAnswer: "" };

    setEvaluation(eval_);
    setScore((prev) => ({
      correct: prev.correct + (eval_.result === "correct" ? 1 : eval_.result === "partial" ? 0.5 : 0),
      total: prev.total + 1,
    }));
    setTurnHistory((prev) => [
      ...prev,
      {
        prompt: turn.prompt,
        userAnswer: answer,
        result: eval_.result,
        feedback: eval_.feedback,
        betterAnswer: eval_.betterAnswer,
      },
    ]);
    setIsEvaluating(false);
  }, [userInput, isEvaluating, dialogue, stepIndex, chatId]);

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
    setAnswersMap({});
    setNpcName("Speaker");
    setChatId(null);
  }, []);

  // Leave an in-progress session: mark it 'abandoned' (quit) then return to setup.
  const leaveToChats = useCallback(async () => {
    if (chatId && status === "active") {
      await setChatStatus(chatId, "abandoned");
    }
    reset();
  }, [chatId, status, reset]);

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
    npcName,
  };
}
