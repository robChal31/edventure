"use client";
import { useI18n } from "@/i18n/provider";
import type { ActivityHudState } from "@/game/game-options";
import CharacterPortrait from "@/components/ui/character-portrait";
import { completionProgress } from "@/quiz/completion-progress";

type ActivityHudProps = {
    roomName: string; questionNumber: number; total: number; caught: number; answered: number;
    scoreLabel: string;
} & Pick<ActivityHudState, "misses" | "round" | "rounds" | "mode">;

/** Completion and academic/game success are deliberately separate, at every score. */
export default function ActivityHud({ roomName, questionNumber, total, caught, answered, scoreLabel, misses, round, rounds, mode }: ActivityHudProps) {
    const { t } = useI18n();
    const progress = completionProgress(answered, total);
    return <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="pixel-panel max-w-[62vw] rounded-lg bg-slate-900/85 px-3 py-2">
            <div className="break-words font-pixel text-[9px] leading-relaxed text-amber-300 sm:text-[10px]">{roomName}</div>
            <div className="mt-1 font-pixel text-[8px] leading-relaxed text-sky-300">{t("Question {value0} of {value1}", { value0: Math.min(questionNumber, total), value1: total })}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-amber-100">
                {mode && <span>{mode === "practice" ? t("Practice") : t("Assessment")}{rounds !== undefined && <> · {t("Round {round}/{rounds}", { round: round ?? 1, rounds })}</>}</span>}
                <span>{t("Completed {answered}/{total}", { answered: progress.completed, total })}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full min-w-28 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label={t("Questions completed")}
                aria-valuenow={progress.completed} aria-valuemin={0} aria-valuemax={Math.max(1, total)}>
                <div className="h-full rounded-full bg-teal-300 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
            </div>
            {progress.nearFinish && <p className="mt-1 text-[10px] text-teal-200" aria-live="polite">{t("Only {count} left — keep going!", { count: progress.remaining })}</p>}
        </div>
        <div className="pixel-panel shrink-0 rounded-lg bg-slate-900/85 px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-2"><CharacterPortrait size={30} /><span className="font-pixel text-[10px] text-emerald-300">{caught}/{total}</span></div>
            <div className="mt-1 text-[10px] text-emerald-200">{t(scoreLabel)}</div>
            {misses !== undefined && <div className="mt-1 font-pixel text-[9px] text-rose-300" aria-live="polite">{t("Miss:")} {misses}</div>}
        </div>
    </div>;
}
