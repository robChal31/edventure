"use client";

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
};

export default function ResultsScreen({ summary, primary, secondary, note }: ResultsScreenProps) {
    const pct = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;

    const verdict =
        pct >= 80
            ? "Outstanding angler! 🏆"
            : pct >= 50
              ? "Nice fishing! 🎣"
              : "The fish were tricky today! 🌊";

    return (
        <div className="lw-fade-in absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="lw-pop-in pixel-panel relative max-h-[92dvh] w-[min(94vw,620px)] overflow-y-auto rounded-2xl border-4 border-amber-700 bg-slate-900 p-6">
                {pct >= 80 && <Confetti pieces={36} />}

                <h2 className="text-center font-pixel text-lg text-amber-300">RESULTS</h2>
                <p className="mt-1 text-center text-xs text-slate-400">{summary.quizName}</p>
                <p className="mt-2 text-center text-sm text-sky-200">{verdict}</p>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-500/20 p-3">
                        <div className="font-pixel text-xl text-emerald-300">{summary.correct}</div>
                        <div className="mt-1 text-[10px] uppercase text-emerald-200">Caught</div>
                    </div>
                    <div className="rounded-lg bg-rose-500/20 p-3">
                        <div className="font-pixel text-xl text-rose-300">{summary.incorrect}</div>
                        <div className="mt-1 text-[10px] uppercase text-rose-200">Escaped</div>
                    </div>
                    <div className="rounded-lg bg-sky-500/20 p-3">
                        <div className="font-pixel text-xl text-sky-300">{summary.total}</div>
                        <div className="mt-1 text-[10px] uppercase text-sky-200">Questions</div>
                    </div>
                </div>

                <div className="mt-4 text-center font-pixel text-xs text-amber-200">Score: {pct}%</div>
                {note && <p className="mt-2 text-center text-xs text-slate-400">{note}</p>}

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
                                        <span className="mr-1" title={QUESTION_TYPES[record.question.type].label}>
                                            {QUESTION_TYPES[record.question.type].icon}
                                        </span>
                                        {record.question.text}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Your answer: {describeAnswer(record.question, record.answer)}
                                        {!record.correct && (
                                            <>
                                                {" · "}
                                                <span className="text-emerald-300">
                                                    Correct: {describeCorrectAnswer(record.question)}
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
                        className="pixel-btn rounded-lg bg-emerald-500 px-5 py-3 font-pixel text-xs text-emerald-950"
                    >
                        {primary.label}
                    </button>
                    <button
                        type="button"
                        onClick={secondary.onClick}
                        className="pixel-btn rounded-lg bg-slate-600 px-5 py-3 font-pixel text-xs text-slate-50"
                    >
                        {secondary.label}
                    </button>
                </div>
            </div>
        </div>
    );
}
