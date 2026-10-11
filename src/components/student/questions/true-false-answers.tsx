"use client";

import { useEffect, useState } from "react";
import type { AnswerValue, TrueFalseQuestion } from "@/quiz/types";
import { isTypingTarget } from "./keyboard";
import type { AnswerReveal } from "./question-card";

type Props = {
    question: TrueFalseQuestion;
    reveal: AnswerReveal | null;
    onAnswer: (answer: AnswerValue) => void;
    /** Global keyboard shortcuts (only for the in-game overlay). */
    keyboardShortcuts?: boolean;
};

const CHOICES = [
    {
        value: true,
        label: "TRUE",
        icon: "✔",
        keys: "T",
        tile: "bg-emerald-400 border-emerald-800 text-emerald-950",
        badge: "bg-emerald-900/30",
    },
    {
        value: false,
        label: "FALSE",
        icon: "✘",
        keys: "F",
        tile: "bg-rose-400 border-rose-800 text-rose-950",
        badge: "bg-rose-900/30",
    },
] as const;

export default function TrueFalseAnswers({ question, reveal, onAnswer, keyboardShortcuts = true }: Props) {
    const [picked, setPicked] = useState<boolean | null>(null);
    const locked = picked !== null || reveal !== null;
    const selected = reveal?.answer.type === "true_false" ? reveal.answer.value : picked;

    const choose = (value: boolean) => {
        if (locked) return;
        setPicked(value);
        onAnswer({ type: "true_false", value });
    };

    // T / F, 1 / 2, or ← / →.
    useEffect(() => {
        if (locked || !keyboardShortcuts) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
            if (isTypingTarget(event.target)) return;
            const key = event.key.toLowerCase();
            if (key === "t" || key === "1" || key === "arrowleft") {
                event.preventDefault();
                choose(true);
            } else if (key === "f" || key === "2" || key === "arrowright") {
                event.preventDefault();
                choose(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <div>
            <div className="grid grid-cols-2 gap-3">
                {CHOICES.map((choice) => {
                    const isCorrect = choice.value === question.correctAnswer;
                    const isSelected = choice.value === selected;

                    let state = "hover:-translate-y-1 hover:brightness-110";
                    let mark: string | null = null;
                    if (reveal) {
                        if (isCorrect) {
                            state = "ring-4 ring-white scale-[1.03]";
                            mark = isSelected ? "YOU GOT IT!" : "RIGHT ANSWER";
                        } else if (isSelected) {
                            state = "opacity-75 saturate-50 ring-4 ring-slate-900";
                            mark = "YOUR PICK";
                        } else {
                            state = "opacity-35 saturate-50";
                        }
                    } else if (isSelected) {
                        state = "ring-4 ring-white translate-y-1";
                    }

                    return (
                        <button
                            key={choice.label}
                            type="button"
                            disabled={locked}
                            onClick={() => choose(choice.value)}
                            className={`relative flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-b-[6px] px-3 py-4 transition duration-150 disabled:cursor-default ${choice.tile} ${state}`}
                            aria-label={choice.label}
                        >
                            <span
                                className={`flex h-14 w-14 items-center justify-center rounded-full font-pixel text-2xl text-white drop-shadow ${choice.badge}`}
                                aria-hidden
                            >
                                {choice.icon}
                            </span>
                            <span className="font-pixel text-base sm:text-lg">{choice.label}</span>
                            {mark ? (
                                <span className="lw-stamp absolute -top-2 rounded bg-slate-950 px-2 py-1 font-pixel text-[8px] text-amber-200">
                                    {mark}
                                </span>
                            ) : (
                                !locked && keyboardShortcuts && (
                                    <span className="hidden font-pixel text-[9px] opacity-70 sm:block">
                                        PRESS {choice.keys}
                                    </span>
                                )
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
