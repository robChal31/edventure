"use client";

type ActivityHudProps = {
    roomName: string;
    questionNumber: number;
    total: number;
    caught: number;
    answered: number;
    /** Icon and label of the score line, from the activity's copy. */
    scoreIcon: string;
    scoreLabel: string;
};

/** Quest title, progress and score for any activity. */
export default function ActivityHud({
    roomName,
    questionNumber,
    total,
    caught,
    answered,
    scoreIcon,
    scoreLabel,
}: ActivityHudProps) {
    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
            <div className="pixel-panel rounded-lg bg-slate-900/80 px-3 py-2">
                <div className="font-pixel text-[10px] text-amber-300">
                    {roomName}
                </div>
                <div className="mt-1 font-pixel text-[9px] text-sky-300">
                    Question {Math.min(questionNumber, total)} of {total}
                </div>
            </div>

            <div className="pixel-panel rounded-lg bg-slate-900/80 px-3 py-2 text-right">
                <div className="font-pixel text-[10px] text-emerald-300">
                    {scoreIcon} {caught}/{answered} {scoreLabel}
                </div>
                <div className="mt-1 flex max-w-[45vw] flex-wrap justify-end gap-0.5" aria-hidden>
                    {Array.from({ length: total }).map((_, i) => (
                        <span
                            key={i}
                            className={`text-[10px] ${
                                i < caught
                                    ? "opacity-100"
                                    : i < answered
                                      ? "opacity-25 grayscale"
                                      : "opacity-40"
                            }`}
                        >
                            {scoreIcon}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
