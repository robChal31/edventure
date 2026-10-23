"use client";

import { useState } from "react";
import type { AnswerValue } from "@/quiz/types";
import type { AnswerReveal } from "./question-card";

type Props = {
    reveal: AnswerReveal | null;
    onAnswer: (answer: AnswerValue) => void;
    autoFocus?: boolean;
    submitHint?: string;
};

const MAX_LENGTH = 80;

export default function ShortAnswerInput({ reveal, onAnswer, autoFocus = true, submitHint = "PRESS ENTER TO REEL IT IN" }: Props) {
    const [text, setText] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const locked = submitted || reveal !== null;
    const given = reveal?.answer.type === "short_answer" ? reveal.answer.text : text;

    const submit = () => {
        if (locked || !text.trim()) return;
        setSubmitted(true);
        onAnswer({ type: "short_answer", text });
    };

    let frame = "border-amber-700 bg-amber-50 focus-within:border-sky-500";
    if (reveal) {
        frame = reveal.correct
            ? "border-emerald-500 bg-emerald-50"
            : "border-rose-500 bg-rose-50";
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <div
                className={`relative flex items-center gap-3 rounded-2xl border-4 px-4 py-3 shadow-[inset_0_-4px_0_rgba(0,0,0,0.12)] transition ${frame}`}
            >
                <span className="text-2xl" aria-hidden>
                    {reveal ? (reveal.correct ? "✅" : "❌") : "📜"}
                </span>
                <input
                    autoFocus={autoFocus}
                    value={reveal ? given : text}
                    onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
                    disabled={locked}
                    maxLength={MAX_LENGTH}
                    placeholder="Type your answer…"
                    aria-label="Your answer"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent text-xl font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none disabled:opacity-100"
                />
            </div>

            {!reveal && (
                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="hidden font-pixel text-[9px] text-slate-500 sm:block">
                        {submitHint}
                    </span>
                    <button
                        type="submit"
                        disabled={locked || !text.trim()}
                        className="pixel-btn ml-auto rounded-xl bg-amber-400 px-5 py-3 font-pixel text-xs text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ✔ SUBMIT
                    </button>
                </div>
            )}
        </form>
    );
}
