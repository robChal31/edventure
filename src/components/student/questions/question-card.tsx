"use client";

import { useId } from "react";
import type { AnswerValue, Question } from "@/quiz/types";
import { QuestionTypeBadge, SubjectTag } from "@/components/ui/badges";
import Confetti from "./confetti";
import MultipleChoiceAnswers from "./multiple-choice-answers";
import ShortAnswerInput from "./short-answer-input";
import TrueFalseAnswers from "./true-false-answers";

export type AnswerReveal = {
    correct: boolean;
    answer: AnswerValue;
    /** Display text of the right answer. */
    correctAnswer: string;
};

type QuestionCardProps = {
    question: Question;
    questionNumber: number;
    total: number;
    reveal: AnswerReveal | null;
    onAnswer: (answer: AnswerValue) => void;
    /** "overlay" floats over the game; "inline" is used for teacher previews. */
    layout?: "overlay" | "inline";
};

/**
 * The card a student answers when a fish bites. One shell for every
 * question type; the body switches on `question.type`.
 */
export default function QuestionCard({
    question,
    questionNumber,
    total,
    reveal,
    onAnswer,
    layout = "overlay",
}: QuestionCardProps) {
    const titleId = useId();
    const isOverlay = layout === "overlay";

    const motion = reveal ? (reveal.correct ? "lw-glow-green" : "lw-shake") : "lw-pop-in";
    const border = reveal
        ? reveal.correct
            ? "border-emerald-500"
            : "border-rose-500"
        : "border-sky-900";

    const card = (
        <div
            role="dialog"
            aria-labelledby={titleId}
            className={`pointer-events-auto relative w-full max-w-160 overflow-hidden rounded-2xl border-4 bg-slate-900/95 shadow-[0_8px_0_rgba(0,0,0,0.45)] backdrop-blur ${border} ${motion}`}
        >
            {reveal?.correct && <Confetti />}

            <header className="lw-waves flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="font-pixel text-[10px] text-sky-50 drop-shadow">
                    <span className="lw-wiggle mr-1">🐟</span> FISH ON THE LINE!
                </span>
                <span className="rounded bg-slate-950/50 px-2 py-1 font-pixel text-[10px] text-amber-200">
                    Q {questionNumber}/{total}
                </span>
            </header>

            <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <QuestionTypeBadge type={question.type} />
                    <SubjectTag subject={question.subject} />
                </div>

                <h2
                    id={titleId}
                    className="text-lg font-semibold leading-snug text-amber-50 sm:text-xl"
                >
                    {question.text}
                </h2>

                <div className="mt-4">
                    {question.type === "multiple_choice" && (
                        <MultipleChoiceAnswers
                            question={question}
                            reveal={reveal}
                            onAnswer={onAnswer}
                            keyboardShortcuts={isOverlay}
                        />
                    )}
                    {question.type === "true_false" && (
                        <TrueFalseAnswers
                            question={question}
                            reveal={reveal}
                            onAnswer={onAnswer}
                            keyboardShortcuts={isOverlay}
                        />
                    )}
                    {question.type === "short_answer" && (
                        <ShortAnswerInput reveal={reveal} onAnswer={onAnswer} autoFocus={isOverlay} />
                    )}
                </div>
            </div>

            {reveal && <RevealBanner reveal={reveal} explanation={question.explanation} />}
        </div>
    );

    if (layout === "inline") {
        return card;
    }

    return (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-2 pb-4 sm:items-center sm:p-6">
            {card}
        </div>
    );
}

function RevealBanner({
    reveal,
    explanation,
}: {
    reveal: AnswerReveal;
    explanation?: string;
}) {
    return (
        <div
            className={`lw-fade-in border-t-4 px-4 py-3 sm:px-6 ${
                reveal.correct
                    ? "border-emerald-700 bg-emerald-500/20"
                    : "border-rose-800 bg-rose-500/15"
            }`}
            aria-live="polite"
        >
            <div className="flex flex-wrap items-center gap-3">
                <span
                    className={`lw-stamp inline-block rounded-md border-2 px-2 py-1 font-pixel text-[11px] ${
                        reveal.correct
                            ? "border-emerald-300 text-emerald-200"
                            : "border-rose-300 text-rose-200"
                    }`}
                >
                    {reveal.correct ? "✔ NICE CATCH!" : "✘ IT GOT AWAY…"}
                </span>
                {!reveal.correct && (
                    <span className="text-sm text-slate-200">
                        Answer: <strong className="text-emerald-300">{reveal.correctAnswer}</strong>
                    </span>
                )}
            </div>
            {explanation && (
                <p className="mt-2 text-sm text-slate-300">
                    <span aria-hidden>💡 </span>
                    {explanation}
                </p>
            )}
        </div>
    );
}
