"use client";

import type { QuizSummary } from "@/quiz/types";

type ResultsScreenProps = {
    summary: QuizSummary;
    onRestart: () => void;
    onMenu: () => void;
};

export default function ResultsScreen({
    summary,
    onRestart,
    onMenu,
}: ResultsScreenProps) {
    const pct =
        summary.total > 0
            ? Math.round((summary.correct / summary.total) * 100)
            : 0;

    const verdict =
        pct >= 80
            ? "Outstanding angler! 🏆"
            : pct >= 50
              ? "Nice fishing! 🎣"
              : "The fish were tricky today! 🌊";

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="pixel-panel max-h-[90vh] w-[min(92vw,600px)] overflow-y-auto rounded-xl border-4 border-amber-700 bg-slate-900 p-6">
                <h2 className="font-pixel text-center text-lg text-amber-300">
                    RESULTS
                </h2>
                <p className="mt-2 text-center text-sm text-sky-200">{verdict}</p>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-500/20 p-3">
                        <div className="font-pixel text-xl text-emerald-300">
                            {summary.correct}
                        </div>
                        <div className="mt-1 text-[10px] uppercase text-emerald-200">
                            Caught
                        </div>
                    </div>
                    <div className="rounded-lg bg-rose-500/20 p-3">
                        <div className="font-pixel text-xl text-rose-300">
                            {summary.incorrect}
                        </div>
                        <div className="mt-1 text-[10px] uppercase text-rose-200">
                            Escaped
                        </div>
                    </div>
                    <div className="rounded-lg bg-sky-500/20 p-3">
                        <div className="font-pixel text-xl text-sky-300">
                            {summary.total}
                        </div>
                        <div className="mt-1 text-[10px] uppercase text-sky-200">
                            Questions
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center font-pixel text-xs text-amber-200">
                    Score: {pct}%
                </div>

                <div className="mt-5 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                    {summary.records.map((r, i) => (
                        <div
                            key={i}
                            className={`rounded border-2 px-3 py-2 text-sm ${
                                r.correct
                                    ? "border-emerald-600 bg-emerald-500/10"
                                    : "border-rose-600 bg-rose-500/10"
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className={r.correct ? "text-emerald-300" : "text-rose-300"}>
                                    {r.correct ? "✔" : "✘"}
                                </span>
                                <div>
                                    <div className="text-slate-100">{r.question.text}</div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Your answer: {r.question.options[r.selectedIndex]}
                                        {!r.correct && (
                                            <>
                                                {" · "}
                                                <span className="text-emerald-300">
                                                    Correct: {r.question.options[r.question.correctIndex]}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-center gap-3">
                    <button
                        onClick={onRestart}
                        className="pixel-btn rounded bg-emerald-500 px-5 py-3 font-pixel text-xs text-emerald-950"
                    >
                        ▶ PLAY AGAIN
                    </button>
                    <button
                        onClick={onMenu}
                        className="pixel-btn rounded bg-slate-600 px-5 py-3 font-pixel text-xs"
                    >
                        MENU
                    </button>
                </div>
            </div>
        </div>
    );
}
