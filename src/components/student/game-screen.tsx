"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhaserGame from "@/game/PhaserGame";
import type {
    ActivityController,
    FishingPhase,
    GameEvent,
} from "@/game/game-options";
import type { Question, Quiz, QuizSummary } from "@/quiz/types";
import FishingHud from "./fishing-hud";
import QuestionPanel from "./question-panel";
import ResultsScreen from "./results-screen";
import TouchControls from "./touch-controls";

type GameScreenProps = {
    quiz: Quiz;
    onMenu: () => void;
};

type HudState = {
    caught: number;
    answered: number;
    total: number;
    questionNumber: number;
};

export default function GameScreen({ quiz, onMenu }: GameScreenProps) {
    const [controller, setController] = useState<ActivityController | null>(null);
    const [ready, setReady] = useState(false);
    const [phase, setPhase] = useState<FishingPhase>("idle");
    const [hud, setHud] = useState<HudState>({
        caught: 0,
        answered: 0,
        total: quiz.questions.length,
        questionNumber: 1,
    });
    const [current, setCurrent] = useState<{
        question: Question;
        questionNumber: number;
    } | null>(null);
    const [prompt, setPrompt] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{
        correct: boolean;
        text: string;
    } | null>(null);
    const [summary, setSummary] = useState<QuizSummary | null>(null);

    const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEvent = useCallback((event: GameEvent) => {
        switch (event.type) {
            case "game:ready":
                setReady(true);
                break;
            case "phase":
                setPhase(event.phase);
                break;
            case "hud":
                setHud({
                    caught: event.caught,
                    answered: event.answered,
                    total: event.total,
                    questionNumber: event.questionNumber,
                });
                break;
            case "question":
                setCurrent({
                    question: event.question,
                    questionNumber: event.questionNumber,
                });
                setFeedback(null);
                break;
            case "answer":
                setFeedback({ correct: event.correct, text: event.feedback });
                setCurrent(null);
                if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
                feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
                break;
            case "prompt":
                setPrompt(event.message);
                if (promptTimer.current) clearTimeout(promptTimer.current);
                if (event.message) {
                    promptTimer.current = setTimeout(() => setPrompt(null), 2600);
                }
                break;
            case "complete":
                setSummary(event.summary);
                break;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (promptTimer.current) clearTimeout(promptTimer.current);
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        };
    }, []);

    const handleAnswer = useCallback(
        (index: number) => {
            controller?.answer(index);
        },
        [controller]
    );

    const handleRestart = useCallback(() => {
        setSummary(null);
        setFeedback(null);
        setCurrent(null);
        controller?.restart();
    }, [controller]);

    const statusLine =
        phase === "casting"
            ? "Casting…"
            : phase === "waiting"
              ? "Waiting for a bite…"
              : phase === "bite"
                ? "Something's biting!"
                : null;

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-950">
            <PhaserGame
                options={{ quiz, onEvent: handleEvent }}
                onReady={setController}
            />

            {ready && (
                <FishingHud
                    roomName={quiz.name}
                    questionNumber={hud.questionNumber}
                    total={hud.total}
                    caught={hud.caught}
                    answered={hud.answered}
                />
            )}

            {/* Prompt toast */}
            {prompt && !summary && (
                <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center sm:bottom-28">
                    <div className="pixel-panel max-w-[90vw] rounded-lg bg-slate-900/90 px-4 py-2 text-center text-sm text-amber-200">
                        {prompt}
                    </div>
                </div>
            )}

            {/* Phase status */}
            {statusLine && !summary && (
                <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
                    <span className="font-pixel rounded bg-slate-900/70 px-3 py-1 text-[10px] text-sky-200">
                        {statusLine}
                    </span>
                </div>
            )}

            {/* Feedback banner */}
            {feedback && !summary && (
                <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
                    <div
                        className={`pixel-panel rounded-xl px-6 py-3 font-pixel text-sm ${
                            feedback.correct
                                ? "border-emerald-700 bg-emerald-500/90 text-emerald-950"
                                : "border-rose-700 bg-rose-500/90 text-rose-50"
                        }`}
                    >
                        {feedback.text}
                    </div>
                </div>
            )}

            {/* Question */}
            {phase === "answering" && current && !summary && (
                <QuestionPanel
                    question={current.question}
                    questionNumber={current.questionNumber}
                    total={hud.total}
                    onAnswer={handleAnswer}
                />
            )}

            {/* Touch controls */}
            {!summary && (
                <TouchControls
                    controller={controller}
                    canCast={phase === "idle" && ready}
                    onCast={() => controller?.cast()}
                />
            )}

            {/* Results */}
            {summary && (
                <ResultsScreen
                    summary={summary}
                    onRestart={handleRestart}
                    onMenu={onMenu}
                />
            )}

        </div>
    );
}
