"use client";

import { useEffect } from "react";
import type { Question } from "@/quiz/types";

type QuestionPanelProps = {
    question: Question;
    questionNumber: number;
    total: number;
    onAnswer: (index: number) => void;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionPanel({
    question,
    questionNumber,
    total,
    onAnswer,
}: QuestionPanelProps) {
    // Allow quick keyboard answering with number keys.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const n = parseInt(e.key, 10);
            if (!Number.isNaN(n) && n >= 1 && n <= question.options.length) {
                onAnswer(n - 1);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [question, onAnswer]);

    return (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 sm:items-center sm:pb-0">
            <div className="pixel-panel pointer-events-auto w-[min(92vw,560px)] rounded-xl border-4 border-sky-900 bg-slate-900/95 p-4 sm:p-6">
                <div className="mb-2 flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-sky-300">
                        QUESTION {questionNumber} / {total}
                    </span>
                    {question.subject && (
                        <span className="rounded bg-sky-500/20 px-2 py-1 font-pixel text-[9px] text-sky-300">
                            {question.subject}
                        </span>
                    )}
                </div>

                <h2 className="mb-4 text-base font-semibold leading-snug text-amber-200 sm:text-lg">
                    {question.text}
                </h2>

                <div className="grid gap-2">
                    {question.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onAnswer(i)}
                            className="pixel-btn flex items-center gap-3 rounded-lg bg-slate-700 px-3 py-3 text-left text-sm text-slate-100 hover:bg-sky-600"
                        >
                            <span className="font-pixel flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-[10px] text-amber-300">
                                {LETTERS[i]}
                            </span>
                            <span className="flex-1">{opt}</span>
                            <span className="hidden font-pixel text-[9px] text-slate-400 sm:block">
                                [{i + 1}]
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
