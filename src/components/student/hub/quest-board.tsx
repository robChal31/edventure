"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { getActivity } from "@/quiz/activities";
import { ActivityGuideDetails } from "@/components/ui/activity-guide";
import { QUESTION_TYPES } from "@/quiz/question-types";
import type { PlayableQuiz, QuestionType, QuizMode } from "@/quiz/types";
import type { HubControls } from "../game-screen";

export type QuestInfo = {
    quizId: string;
    name: string;
    description: string;
    activityId: PlayableQuiz["activityId"];
    mode?: QuizMode;
    questionCount: number;
    questionTypes: QuestionType[];
    attempts: number;
    bestScore: number | null;
};

type QuestBoardProps = {
    controls: HubControls;
    quests: QuestInfo[];
    /** Builds the playable snapshot when the student picks a quest. */
    buildQuiz: (quizId: string) => PlayableQuiz | null;
    autoOpen?: boolean;
};

/**
 * The village quest board: lists the quizzes assigned to the student.
 * Picking one travels to the activity's map (e.g. the beach for fishing).
 */
export default function QuestBoard({ controls, quests, buildQuiz, autoOpen = false }: QuestBoardProps) {
    const [open, setOpen] = useState(autoOpen && quests.length > 0);
    const { setOverlayOpen } = controls;
    const pending = quests.filter((quest) => quest.attempts === 0).length;

    useLayoutEffect(() => {
        setOverlayOpen(open);
    }, [open, setOverlayOpen]);

    useLayoutEffect(() => () => setOverlayOpen(false), [setOverlayOpen]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("input, textarea, [contenteditable='true']")) return;
            if (event.key === "q" || event.key === "Q") {
                setOpen((value) => !value);
            } else if (event.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const start = (quizId: string) => {
        const quiz = buildQuiz(quizId);
        if (!quiz || !controls.ready) return;
        setOpen(false);
        controls.startQuiz(quiz);
    };

    return (
        <>
            <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setOpen(true)}
                    className="pixel-btn relative flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2.5 font-pixel text-[10px] text-amber-950"
                >
                    <span className="text-base" aria-hidden>📜</span>
                    QUESTS
                    <span className="hidden rounded bg-amber-950/20 px-1 text-[8px] sm:inline">Q</span>
                    {pending > 0 && (
                        <span className="lw-bob absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] text-white ring-2 ring-slate-950">
                            {pending}
                        </span>
                    )}
                </button>
            </div>

            {!open && (
                <div className="equipment-prompt pointer-events-none absolute inset-x-0 flex justify-center px-3">
                    <div className="pixel-panel rounded-lg bg-slate-900/85 px-4 py-2 text-center text-xs text-amber-100">
                        Walk with the arrow keys · press <strong>Q</strong> for the Quest Board
                    </div>
                </div>
            )}

            {open && (
                <div
                    className="lw-fade-in absolute inset-0 z-20 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setOpen(false);
                    }}
                >
                    <div
                        role="dialog"
                        aria-label="Quest board"
                        className="lw-pop-in relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-4 border-amber-900 bg-[#5b3a1e] shadow-[0_10px_0_rgba(0,0,0,0.45)]"
                    >
                        <div className="flex items-center justify-between border-b-4 border-amber-950/60 bg-[#4a2f17] px-5 py-3">
                            <h2 className="font-pixel text-sm text-amber-200">📜 QUEST BOARD</h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded px-2 text-lg text-amber-200 hover:bg-amber-950/40"
                                aria-label="Close quest board"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {quests.length === 0 ? (
                                <div className="rounded-xl bg-amber-50 p-6 text-center text-amber-950">
                                    <div className="text-4xl" aria-hidden>🌴</div>
                                    <p className="mt-2 font-pixel text-[10px]">NO QUESTS YET</p>
                                    <p className="mt-2 text-sm">
                                        Your teacher hasn&apos;t assigned a quiz yet. Explore the village while you wait!
                                    </p>
                                </div>
                            ) : (
                                <ul className="grid gap-3">
                                    {quests.map((quest) => (
                                        <QuestCard key={quest.quizId} quest={quest} onStart={() => start(quest.quizId)} disabled={!controls.ready} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function QuestCard({
    quest,
    onStart,
    disabled,
}: {
    quest: QuestInfo;
    onStart: () => void;
    disabled: boolean;
}) {
    const activity = getActivity(quest.activityId);
    const isNew = quest.attempts === 0;

    return (
        <li className="relative rounded-xl border-b-4 border-amber-300 bg-amber-50 p-4 text-amber-950 shadow">
            {isNew && (
                <span className="absolute -right-1 -top-2 rotate-3 rounded bg-rose-500 px-2 py-1 font-pixel text-[8px] text-white shadow">
                    NEW!
                </span>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-pixel text-[11px] leading-relaxed">{quest.name}</h3>
                    {quest.description && (
                        <p className="mt-1 text-sm text-amber-900/80">{quest.description}</p>
                    )}
                    <div className="mt-2">
                        <ActivityGuideDetails activity={activity} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        <span className="rounded bg-sky-200 px-2 py-0.5 text-sky-900">
                            {activity.icon} {activity.label} · {activity.location}
                        </span>
                        <span className="rounded bg-amber-200 px-2 py-0.5">
                            {quest.questionCount} question{quest.questionCount === 1 ? "" : "s"}
                        </span>
                        {quest.activityId === "catching_bugs" && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">
                                {quest.mode === "practice" ? "Latihan" : "Asesmen"}
                            </span>
                        )}
                        {quest.questionTypes.map((type) => (
                            <span key={type} title={QUESTION_TYPES[type].label} className="rounded bg-white px-1.5 py-0.5">
                                {QUESTION_TYPES[type].icon}
                            </span>
                        ))}
                    </div>
                    {!isNew && (
                        <p className="mt-2 text-xs text-amber-900">
                            ⭐ Best: <strong>{quest.bestScore ?? 0}%</strong> · played {quest.attempts}×
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onStart}
                    disabled={disabled}
                    className="pixel-btn self-center rounded-lg bg-emerald-500 px-4 py-3 font-pixel text-[10px] text-emerald-950 disabled:opacity-50"
                >
                    {isNew ? activity.copy.startLabel : "PLAY ▶"}
                </button>
            </div>
        </li>
    );
}
