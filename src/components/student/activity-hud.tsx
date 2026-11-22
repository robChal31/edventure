"use client";
import { useI18n } from "@/i18n/provider";
import type { ActivityHudState } from "@/game/game-options";
import { completionProgress } from "@/quiz/completion-progress";

type ActivityHudProps = {
    roomName: string; questionNumber: number; total: number; answered: number;
} & Pick<ActivityHudState, "round" | "rounds" | "mode">;

/** Only completion progress belongs on the HUD. Academic/game outcomes stay in the results. */
export default function ActivityHud({ roomName, questionNumber, total, answered, round, rounds, mode }: ActivityHudProps) {
    const { t } = useI18n();
    const progress = completionProgress(answered, total);
    return <div className="activity-hud pointer-events-none absolute left-2 top-2 max-w-[calc(100%-76px)] sm:left-3 sm:top-3 sm:max-w-[62vw]">
        <div className="pixel-panel world-hud-panel min-w-0 rounded-lg px-3 py-2">
            <div className="break-words font-pixel text-[9px] leading-relaxed text-amber-300 sm:text-[10px]">{roomName}</div>
            <div className="mt-1 font-pixel text-[9px] leading-relaxed text-sky-200">{t("Question {value0} of {value1}", { value0: Math.min(questionNumber, total), value1: total })}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-amber-100">
                {mode && <span>{mode === "practice" ? t("Practice") : t("Assessment")}{rounds !== undefined && <> · {t("Round {round}/{rounds}", { round: round ?? 1, rounds })}</>}</span>}
                <span>{t("Completed {answered}/{total}", { answered: progress.completed, total })}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label={t("Questions completed")}
                aria-valuenow={progress.completed} aria-valuemin={0} aria-valuemax={Math.max(1, total)}>
                <div className="h-full rounded-full bg-teal-300 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
            </div>
            {progress.nearFinish && <p className="mt-1 text-[10px] text-teal-200" aria-live="polite">{t("Only {count} left — keep going!", { count: progress.remaining })}</p>}
        </div>
    </div>;
}
