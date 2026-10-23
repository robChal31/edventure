"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import PhaserGame from "@/game/PhaserGame";
import type {
    ActivityController,
    ActivityPhase,
    ActivityHudState,
    GameEvent,
    GameOptions,
    MapId,
} from "@/game/game-options";
import { getActivity } from "@/quiz/activities";
import type { ActivityId, AnswerValue, PlayableQuiz, Question, QuizSummary } from "@/quiz/types";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { ActivityGuideDialog } from "@/components/ui/activity-guide";
import ActivityHud from "./activity-hud";
import QuestionCard, { type AnswerReveal } from "./questions/question-card";
import ResultsScreen from "./results-screen";
import TouchControls from "./touch-controls";

/** What a hub overlay (the village quest board) can do. */
export type HubControls = {
    ready: boolean;
    startQuiz: (quiz: PlayableQuiz) => void;
    /** Tell the game an HTML panel is open (pauses game keyboard). */
    setOverlayOpen: (open: boolean) => void;
};

type GameScreenProps = {
    /** Start straight at the activity's map (teacher preview). */
    initialQuiz?: PlayableQuiz;
    /** Overlay shown on the hub map (student quest board). */
    renderHub?: (controls: HubControls) => ReactNode;
    /** Top-left badge while on the hub (student name etc.). */
    badge?: ReactNode;
    /** Ribbon text for teacher previews. */
    ribbon?: string;
    exit: { label: string; onExit: () => void };
    onQuizComplete?: (summary: QuizSummary, startedAt: string) => void;
    resultsNote?: string;
};

type CurrentQuestion = { question: Question; questionNumber: number; total: number };

export default function GameScreen({
    initialQuiz,
    renderHub,
    badge,
    ribbon,
    exit,
    onQuizComplete,
    resultsNote,
}: GameScreenProps) {
    const [controller, setController] = useState<ActivityController | null>(null);
    const [ready, setReady] = useState(false);
    const [mapId, setMapId] = useState<MapId | null>(null);
    const [activityId, setActivityId] = useState<ActivityId | null>(null);
    const [travelling, setTravelling] = useState(false);
    const [phase, setPhase] = useState<ActivityPhase>("idle");
    const [hud, setHud] = useState<ActivityHudState>({ caught: 0, answered: 0, total: 0, questionNumber: 1 });
    const [current, setCurrent] = useState<CurrentQuestion | null>(null);
    const [reveal, setReveal] = useState<AnswerReveal | null>(null);
    const [prompt, setPrompt] = useState<string | null>(null);
    const [summary, setSummary] = useState<QuizSummary | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<PlayableQuiz | null>(initialQuiz ?? null);
    const [hubOverlayOpen, setHubOverlayOpen] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedAt = useRef<string>(new Date().toISOString());
    const onCompleteRef = useRef(onQuizComplete);

    useEffect(() => {
        onCompleteRef.current = onQuizComplete;
    });

    const resetActivityUi = useCallback(() => {
        setPhase("idle");
        setCurrent(null);
        setReveal(null);
        setSummary(null);
        setPrompt(null);
    }, []);

    const handleEvent = useCallback(
        (event: GameEvent) => {
            switch (event.type) {
                case "game:ready":
                    setReady(true);
                    break;
                case "map:loaded":
                    resetActivityUi();
                    setMapId(event.mapId);
                    setActivityId(event.activityId);
                    setTravelling(false);
                    if (event.activityId) {
                        startedAt.current = new Date().toISOString();
                        // First time on a map: explain how to play it.
                        setGuideOpen(true);
                    } else {
                        setActiveQuiz(null);
                    }
                    break;
                case "travel:start":
                    setTravelling(true);
                    setHubOverlayOpen(false);
                    resetActivityUi();
                    break;
                case "phase":
                    setPhase(event.phase);
                    if (event.phase !== "answering") {
                        setCurrent(null);
                        setReveal(null);
                    }
                    break;
                case "hud":
                    setHud({
                        caught: event.caught,
                        answered: event.answered,
                        total: event.total,
                        questionNumber: event.questionNumber,
                        misses: event.misses,
                        round: event.round,
                        rounds: event.rounds,
                        mode: event.mode,
                    });
                    break;
                case "question":
                    setReveal(null);
                    setCurrent({
                        question: event.question,
                        questionNumber: event.questionNumber,
                        total: event.total,
                    });
                    break;
                case "answer":
                    setReveal({
                        correct: event.correct,
                        answer: event.answer,
                        correctAnswer: event.correctAnswer,
                        retryable: event.retryable,
                    });
                    break;
                case "prompt":
                    setPrompt(event.message);
                    if (promptTimer.current) clearTimeout(promptTimer.current);
                    if (event.message) {
                        // Longer messages stay a bit longer (young readers).
                        const duration = Math.max(2800, event.message.length * 55);
                        promptTimer.current = setTimeout(() => setPrompt(null), duration);
                    }
                    break;
                case "complete":
                    setSummary(event.summary);
                    onCompleteRef.current?.(event.summary, startedAt.current);
                    break;
            }
        },
        [resetActivityUi]
    );

    useEffect(() => {
        return () => {
            if (promptTimer.current) clearTimeout(promptTimer.current);
        };
    }, []);

    // HTML overlays need the keyboard; Phaser must not swallow keys then.
    const overlayOpen =
        Boolean(current) || Boolean(summary) || hubOverlayOpen || confirmLeave || guideOpen;
    useEffect(() => {
        controller?.setKeyboardEnabled(!overlayOpen);
    }, [controller, overlayOpen]);

    const gameOptions = useMemo<GameOptions>(
        () => ({ initialQuiz, onEvent: handleEvent }),
        // The game boots once; later changes are sent through the controller.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const handleAnswer = useCallback(
        (answer: AnswerValue) => controller?.answer(answer),
        [controller]
    );

    const hubControls = useMemo<HubControls>(
        () => ({
            ready: ready && Boolean(controller) && !travelling,
            startQuiz: (quiz) => {
                setActiveQuiz(quiz);
                controller?.startQuiz(quiz);
            },
            setOverlayOpen: setHubOverlayOpen,
        }),
        [controller, ready, travelling]
    );

    const restartQuiz = () => {
        resetActivityUi();
        startedAt.current = new Date().toISOString();
        controller?.setKeyboardEnabled(true);
        controller?.restart();
    };

    const isHub = Boolean(mapId) && !activityId;
    const inActivity = Boolean(activityId);
    const hasHub = Boolean(renderHub);
    const activity = getActivity(activityId ?? activeQuiz?.activityId ?? "fishing");
    const statusLine = inActivity ? activity.copy.status[phase] : undefined;

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-950">
            <PhaserGame options={gameOptions} onReady={setController} />

            {/* Loading veil until the first map is on screen. */}
            {!mapId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
                    <div className="lw-bob text-4xl" aria-hidden>🧭</div>
                    <p className="font-pixel text-[10px] text-sky-300">LOADING WORLD…</p>
                </div>
            )}

            {ribbon && (
                <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md bg-violet-600/90 px-3 py-1 font-pixel text-[9px] text-white shadow">
                    {ribbon}
                </div>
            )}

            {/* Hub (village) */}
            {isHub && !travelling && (
                <>
                    {badge && <div className="absolute left-2 top-2 sm:left-3 sm:top-3">{badge}</div>}
                    {renderHub?.(hubControls)}
                </>
            )}

            {/* Any registered activity map */}
            {inActivity && !travelling && (
                <>
                    <ActivityHud
                        roomName={activeQuiz?.name ?? activity.label}
                        questionNumber={hud.questionNumber}
                        total={hud.total}
                        caught={hud.caught}
                        answered={hud.answered}
                        scoreIcon={activity.copy.scoreIcon}
                        scoreLabel={activity.copy.scoreLabel}
                        misses={hud.misses}
                        round={hud.round}
                        rounds={hud.rounds}
                        mode={hud.mode}
                    />

                    {!summary && (
                        <div className="absolute right-2 top-18 flex flex-col items-end gap-1.5 sm:right-3 sm:top-20">
                            <button
                                type="button"
                                tabIndex={-1}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setGuideOpen(true)}
                                className="pixel-btn rounded-lg bg-sky-700/90 px-3 py-2 font-pixel text-[9px] text-sky-50"
                            >
                                ❔ HOW TO
                            </button>
                            <button
                                type="button"
                                tabIndex={-1}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => (hasHub ? setConfirmLeave(true) : exit.onExit())}
                                className="pixel-btn rounded-lg bg-slate-800/90 px-3 py-2 font-pixel text-[9px] text-slate-100"
                            >
                                {hasHub ? "🏡 LEAVE" : exit.label}
                            </button>
                        </div>
                    )}
                </>
            )}

            {prompt && !summary && !current && !travelling && (
                <div className="pointer-events-none absolute inset-x-0 bottom-44 z-10 flex justify-center px-3 sm:bottom-32">
                    <div className="lw-pop-in pixel-panel max-w-[92vw] rounded-lg bg-slate-900/90 px-4 py-2 text-center text-sm text-amber-200">
                        {prompt}
                    </div>
                </div>
            )}

            {statusLine && !summary && !current && (
                <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
                    <span className="font-pixel rounded bg-slate-900/70 px-3 py-1 text-[10px] text-sky-200">
                        {statusLine}
                    </span>
                </div>
            )}

            {inActivity && current && !summary && (
                <QuestionCard
                    key={`${current.questionNumber}-${current.question.id}`}
                    cue={activity.copy.questionCue}
                    shortAnswerHint={activity.copy.shortAnswerHint}
                    question={current.question}
                    questionNumber={current.questionNumber}
                    total={current.total}
                    reveal={reveal}
                    onAnswer={handleAnswer}
                />
            )}

            {mapId && !summary && !current && !travelling && !hubOverlayOpen && (
                <TouchControls
                    controller={controller}
                    action={
                        inActivity
                            ? {
                                  label:
                                      phase === "waiting"
                                          ? activity.copy.waitingActionLabel
                                          : activity.copy.actionLabel,
                                  enabled: phase === "idle" || phase === "waiting",
                                  onPress: () => controller?.cast(),
                              }
                            : undefined
                    }
                />
            )}

            {summary && (
                <ResultsScreen
                    summary={summary}
                    note={resultsNote}
                    primary={
                        hasHub
                            ? { label: "🏡 BACK TO VILLAGE", onClick: () => controller?.returnToHub() }
                            : { label: "▶ PLAY AGAIN", onClick: restartQuiz }
                    }
                    secondary={
                        hasHub
                            ? { label: activity.copy.playAgainLabel, onClick: restartQuiz }
                            : { label: exit.label, onClick: exit.onExit }
                    }
                />
            )}

            <ActivityGuideDialog activity={activity} open={guideOpen} onClose={() => setGuideOpen(false)} />

            <ConfirmDialog
                open={confirmLeave}
                title={`Leave the ${activity.location.toLowerCase()}?`}
                message="Your answers for this quest won't be saved. You can come back any time from the Quest Board."
                confirmLabel="Leave"
                danger
                onCancel={() => setConfirmLeave(false)}
                onConfirm={() => {
                    setConfirmLeave(false);
                    controller?.returnToHub();
                }}
            />
        </div>
    );
}
