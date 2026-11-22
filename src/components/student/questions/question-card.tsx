"use client";

import { useI18n } from "@/i18n/provider";
import { useEffect, useId } from "react";
import Image from "next/image";
import type { AnswerFeedbackCopy } from "@/quiz/activities";
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
    /** A wrong practice catch leaves the target available for another attempt. */
    retryable?: boolean;
};

type QuestionCardProps = {
    question: Question;
    questionNumber: number;
    total: number;
    reveal: AnswerReveal | null;
    onAnswer: (answer: AnswerValue) => void;
    /** "overlay" floats over the game; "inline" is used for teacher previews. */
    layout?: "overlay" | "inline";
    /** Heading shown in the card's top bar, from the activity's copy. */
    cue?: string;
    shortAnswerHint?: string;
    feedbackCopy?: AnswerFeedbackCopy;
    closing?: boolean;
    onExited?: () => void;
    /** Bug-world celebration happens after this card unmounts. Fishing keeps its existing reveal. */
    celebrate?: boolean;
    /** A Help / Save dialog is above this card; keep drafts but suspend all answer input. */
    suspended?: boolean;
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
    cue = "❓ QUESTION",
    shortAnswerHint,
    feedbackCopy,
    closing = false,
    onExited,
    celebrate = true,
    suspended = false,
}: QuestionCardProps) {
    const { t } = useI18n();
    const titleId = useId();
    const isOverlay = layout === "overlay";

    useEffect(() => {
        if (!closing || !onExited) return;
        // animationend may be disabled by reduced motion or a backgrounded tab.
        const fallback = setTimeout(onExited, 230);
        return () => clearTimeout(fallback);
    }, [closing, onExited]);

    const motion = closing ? "lw-close-question" : reveal ? (reveal.correct ? "lw-glow-green" : "lw-shake") : "lw-pop-in";
    const border = reveal
        ? reveal.correct
            ? "border-emerald-500"
            : "border-rose-500"
        : "border-sky-900";

    const card = (
        <div
            role={isOverlay ? "dialog" : "group"}
            aria-labelledby={titleId}
            inert={suspended}
            aria-hidden={suspended || undefined}
            data-closing={closing || undefined}
            onAnimationEnd={(event) => {
                if (closing && event.target === event.currentTarget && event.animationName === "lw-close-question") onExited?.();
            }}
            className={`pointer-events-auto relative w-full max-w-160 max-h-[90dvh] overflow-y-auto rounded-2xl border-4 bg-slate-900/95 shadow-[0_8px_0_rgba(0,0,0,0.45)] backdrop-blur ${border} ${motion}`}
        >
            {celebrate && reveal?.correct && <Confetti />}

            <header className="lw-waves flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="font-pixel text-[10px] text-sky-50 drop-shadow">
                    <span className="lw-wiggle mr-1">{t(cue)}</span>
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
                    {question.text || t("Look at the image and answer.")}
                </h2>

                {question.image && <figure className="mt-3 rounded-xl bg-white/95 p-2">
                    <Image src={question.image.src} alt={question.image.alt} width={question.image.width} height={question.image.height}
                        unoptimized className="mx-auto max-h-[28dvh] w-auto max-w-full rounded object-contain" />
                </figure>}

                <div className="mt-4">
                    {question.type === "multiple_choice" && (
                        <MultipleChoiceAnswers
                            question={question}
                            reveal={reveal}
                            onAnswer={(answer) => { if (!suspended) onAnswer(answer); }}
                            keyboardShortcuts={isOverlay && !suspended}
                        />
                    )}
                    {question.type === "true_false" && (
                        <TrueFalseAnswers
                            question={question}
                            reveal={reveal}
                            onAnswer={(answer) => { if (!suspended) onAnswer(answer); }}
                            keyboardShortcuts={isOverlay && !suspended}
                        />
                    )}
                    {question.type === "short_answer" && (
                        <ShortAnswerInput reveal={reveal} onAnswer={(answer) => { if (!suspended) onAnswer(answer); }} autoFocus={isOverlay && !suspended} submitHint={shortAnswerHint} />
                    )}
                </div>
            </div>

            {reveal && <RevealBanner copy={feedbackCopy} reveal={reveal} explanation={question.explanation} trueFalse={question.type === "true_false"} />}
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
    trueFalse,
    copy,
}: {
    trueFalse: boolean;
    copy?: AnswerFeedbackCopy;
    reveal: AnswerReveal;
    explanation?: string;
}) {
    const { t } = useI18n();
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
                    {reveal.correct ? t(copy?.correct ?? "✔ NICE CATCH!") : t(copy?.incorrect ?? "✘ IT GOT AWAY…")}
                </span>
                {!reveal.correct && (
                    <span className="text-sm text-slate-200">{t("Answer:")}{" "}<strong className="text-emerald-300">{trueFalse ? t(reveal.correctAnswer) : reveal.correctAnswer}</strong>
                    </span>
                )}
            </div>
            {reveal.retryable && (
                <p className="mt-2 text-sm text-amber-200">{t(copy?.retry ?? "Practice: cricket escaped, miss +1. Approach and catch it again to retry the same question.")}</p>
            )}
            {explanation && (
                <p className="mt-2 text-sm text-slate-300">
                    <span aria-hidden>💡 </span>
                    {explanation}
                </p>
            )}
        </div>
    );
}
