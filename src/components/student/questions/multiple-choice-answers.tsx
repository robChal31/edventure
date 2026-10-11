"use client";

import { useEffect, useState } from "react";
import type { AnswerValue, MultipleChoiceQuestion } from "@/quiz/types";
import { isTypingTarget } from "./keyboard";
import type { AnswerReveal } from "./question-card";

const TILES = [
    { letter: "A", shape: "▲", tile: "bg-rose-500 border-rose-800 text-rose-950" },
    { letter: "B", shape: "◆", tile: "bg-sky-400 border-sky-800 text-sky-950" },
    { letter: "C", shape: "●", tile: "bg-amber-400 border-amber-700 text-amber-950" },
    { letter: "D", shape: "■", tile: "bg-emerald-400 border-emerald-800 text-emerald-950" },
    { letter: "E", shape: "★", tile: "bg-violet-400 border-violet-800 text-violet-950" },
    { letter: "F", shape: "✚", tile: "bg-orange-400 border-orange-800 text-orange-950" },
];

type Props = {
    question: MultipleChoiceQuestion;
    reveal: AnswerReveal | null;
    onAnswer: (answer: AnswerValue) => void;
    /** Global keyboard shortcuts (only for the in-game overlay). */
    keyboardShortcuts?: boolean;
};

export default function MultipleChoiceAnswers({ question, reveal, onAnswer, keyboardShortcuts = true }: Props) {
    const [picked, setPicked] = useState<number | null>(null);
    const locked = picked !== null || reveal !== null;
    const selected =
        reveal?.answer.type === "multiple_choice" ? reveal.answer.choiceIndex : picked;

    const choose = (index: number) => {
        if (locked || index < 0 || index >= question.options.length) return;
        setPicked(index);
        onAnswer({ type: "multiple_choice", choiceIndex: index });
    };

    // Number keys 1–6 or letters A–F.
    useEffect(() => {
        if (locked || !keyboardShortcuts) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
            if (isTypingTarget(event.target)) return;
            const key = event.key.toUpperCase();
            const byNumber = Number.parseInt(key, 10) - 1;
            const byLetter = TILES.findIndex((tile) => tile.letter === key);
            const index = Number.isNaN(byNumber) ? byLetter : byNumber;
            if (index >= 0 && index < question.options.length) {
                event.preventDefault();
                choose(index);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <div>
            <div className={`grid gap-2.5 ${question.options.length > 2 ? "sm:grid-cols-2" : ""}`}>
                {question.options.map((option, index) => {
                    const tile = TILES[index % TILES.length];
                    const isCorrect = index === question.correctIndex;
                    const isSelected = index === selected;

                    let state = "hover:-translate-y-0.5 hover:brightness-110";
                    let mark: string | null = null;
                    if (reveal) {
                        if (isCorrect) {
                            state = "ring-4 ring-emerald-300 scale-[1.02]";
                            mark = "✔";
                        } else if (isSelected) {
                            state = "ring-4 ring-rose-400 opacity-80 saturate-50";
                            mark = "✘";
                        } else {
                            state = "opacity-35 saturate-50";
                        }
                    } else if (isSelected) {
                        state = "ring-4 ring-white translate-y-0.5";
                    }

                    return (
                        <button
                            key={index}
                            type="button"
                            disabled={locked}
                            onClick={() => choose(index)}
                            className={`group relative flex min-h-16 items-center gap-3 rounded-xl border-b-4 px-3 py-3 text-left transition duration-150 disabled:cursor-default ${tile.tile} ${state}`}
                            aria-label={`Option ${tile.letter}: ${option}`}
                        >
                            <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-black/20 font-pixel text-[10px] leading-none text-white">
                                <span aria-hidden className="text-sm leading-none">{tile.shape}</span>
                                <span className="mt-0.5">{tile.letter}</span>
                            </span>
                            <span className="flex-1 text-base font-bold leading-snug">{option}</span>
                            {mark && (
                                <span className="lw-stamp font-pixel text-lg text-white drop-shadow">{mark}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {!locked && keyboardShortcuts && (
                <p className="mt-3 hidden text-center font-pixel text-[9px] text-slate-500 sm:block">
                    TAP AN ANSWER — OR PRESS 1–{question.options.length}
                </p>
            )}
        </div>
    );
}
