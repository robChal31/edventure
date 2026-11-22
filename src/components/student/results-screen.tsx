"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/provider";
import { describeAnswer, describeCorrectAnswer } from "@/quiz/grading";
import { QUESTION_TYPES } from "@/quiz/question-types";
import type { QuizSummary } from "@/quiz/types";
import Confetti from "./questions/confetti";

export type ResultsAction = {
    label: string;
    onClick: () => void;
};

type ResultsScreenProps = {
    summary: QuizSummary;
    primary: ResultsAction;
    secondary: ResultsAction;
    /** Shown under the score, e.g. "Saved to your teacher's report". */
    note?: string;
    saveError?: { retry: () => void };
};

export default function ResultsScreen({ summary, primary, secondary, note, saveError }: ResultsScreenProps) {
    const { t } = useI18n();
    const bugs = summary.activityId === "catching_bugs";
    const serenade = summary.activityId === "forest_serenade";
    const hasRetries = bugs || serenade;
    const pct = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;

    const verdict =
        pct >= 80
            ? "Outstanding work! 🏆"
            : pct >= 50
              ? "Well done! 🌟"
              : "You finished every question. Keep learning! 💪";

    return (
        <div className="lw-fade-in absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="lw-pop-in pixel-panel relative max-h-[92dvh] w-[min(94vw,620px)] overflow-y-auto rounded-2xl border-4 border-amber-700 bg-slate-900 p-6">
                {pct >= 80 && <Confetti pieces={36} />}

                <h2 className="text-center font-pixel text-lg text-amber-300">{t("QUEST COMPLETE")}</h2>
                <p className="mt-1 text-center text-xs text-slate-400">{summary.quizName}</p>
                <p className="mt-2 text-center text-sm text-sky-200">{t(verdict)}</p>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-500/20 p-3">
                        <div className="font-pixel text-xl text-emerald-300">{summary.correct}</div>
                        <div className="mt-1 text-[10px] uppercase text-emerald-200">{serenade ? t("Frogs summoned") : t("Caught")}</div>
                    </div>
                    <div className="rounded-lg bg-rose-500/20 p-3">
                        <div className="font-pixel text-xl text-rose-300">{hasRetries ? summary.misses ?? summary.incorrect : summary.incorrect}</div>
                        <div className="mt-1 text-[10px] uppercase text-rose-200">{hasRetries ? t("Miss") : t("Escaped")}</div>
                    </div>
                    <div className="rounded-lg bg-sky-500/20 p-3">
                        <div className="font-pixel text-xl text-sky-300">{summary.total}</div>
                        <div className="mt-1 text-[10px] uppercase text-sky-200">{bugs ? t("Question") : t("Questions")}</div>
                    </div>
                </div>

                <div className="mt-4 text-center font-pixel text-xs text-amber-200">{t("Score:")}{" "}{pct}%</div>
                {hasRetries && (
                    <p className="mt-2 text-center text-xs text-amber-100">
                        {summary.mode === "practice" ? t("Practice: scores use each question's final answer. Misses count all wrong attempts, including retries.") : t("Assessment: one attempt per question. Wrong answers count as misses.")}
                    </p>
                )}
                {note && <p className="mt-2 text-center text-xs text-slate-400">{t(note)}</p>}
                {saveError && <div role="alert" className="mt-4 rounded-lg border border-rose-400 bg-rose-950/60 p-3 text-center text-sm text-rose-100">
                    <p>{t("Results could not be saved. Keep this tab open and try saving again.")}</p>
                    <button type="button" onClick={saveError.retry} className="pixel-btn mt-3 rounded-lg bg-sky-600 px-4 py-2 font-bold text-white">{t("Retry saving results")}</button>
                </div>}

                <div className="mt-5 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                    {summary.records.map((record, i) => (
                        <div
                            key={i}
                            className={`rounded-lg border-2 px-3 py-2 text-sm ${
                                record.correct
                                    ? "border-emerald-600 bg-emerald-500/10"
                                    : "border-rose-600 bg-rose-500/10"
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className={record.correct ? "text-emerald-300" : "text-rose-300"}>
                                    {record.correct ? "✔" : "✘"}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-slate-100">
                                        <span className="mr-1" title={t(QUESTION_TYPES[record.question.type].label)}>
                                            {QUESTION_TYPES[record.question.type].icon}
                                        </span>
                                        {record.question.text}
                                    </div>
                                    {record.question.image && <Image src={record.question.image.src} alt={record.question.image.alt}
                                        width={record.question.image.width} height={record.question.image.height} unoptimized className="mt-2 max-h-24 w-auto max-w-full rounded bg-white object-contain" />}
                                    <div className="mt-1 text-xs text-slate-400">{t("Your answer:")}{" "}{record.question.type === "true_false" ? t(describeAnswer(record.question, record.answer)) : describeAnswer(record.question, record.answer)}
                                        {!record.correct && (
                                            <>
                                                {" · "}
                                                <span className="text-emerald-300">{t("Correct:")}{" "}{record.question.type === "true_false" ? t(describeCorrectAnswer(record.question)) : describeCorrectAnswer(record.question)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={primary.onClick}
                        disabled={Boolean(saveError)}
                        className="pixel-btn rounded-lg bg-emerald-500 px-5 py-3 font-pixel text-xs text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t(primary.label)}
                    </button>
                    <button
                        type="button"
                        onClick={secondary.onClick}
                        disabled={Boolean(saveError)}
                        className="pixel-btn rounded-lg bg-slate-600 px-5 py-3 font-pixel text-xs text-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t(secondary.label)}
                    </button>
                </div>
            </div>
        </div>
    );
}
