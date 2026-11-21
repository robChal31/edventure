"use client";
import { useI18n } from "@/i18n/provider";

/** Small, honest loading state — no artificial wait, confetti or fake percentage. */
export default function WorldLoading({ progress }: { progress?: number }) {
    const { t } = useI18n();
    const percent = progress === undefined ? undefined : Math.max(0, Math.min(100, Math.round(progress * 100)));
    return <div className="world-loading flex h-full min-h-48 w-full flex-col items-center justify-center gap-4 bg-[#edf9fb] px-6 text-center text-slate-700" role="status" aria-live="polite">
        <div className="relative flex h-20 items-end justify-center gap-4" aria-hidden>
            <span className="text-xl text-amber-500">✦</span>
            <span className="loading-sapling lw-bob" />
            <span className="pb-8 text-sm text-sky-500">✦</span>
        </div>
        <div><p className="font-pixel text-[10px] leading-6 text-teal-800">{t("Getting the world ready…")}</p>
            <p className="mt-1 text-xs text-slate-600">{t("A little adventure is on its way.")}</p></div>
        {percent !== undefined ? <div className="h-2 w-44 overflow-hidden rounded-full bg-teal-100" role="progressbar" aria-label={t("Loading world")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full rounded-full bg-teal-500 transition-[width] duration-150" style={{ width: `${percent}%` }} />
        </div> : <span className="h-1 w-20 rounded-full bg-teal-200" aria-hidden />}
    </div>;
}
