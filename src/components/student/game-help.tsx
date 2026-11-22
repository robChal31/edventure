"use client";
import { useI18n } from "@/i18n/provider";
import type { ActivityDefinition } from "@/quiz/activities";
import Modal from "@/components/ui/modal";
import PixelButton from "@/components/ui/pixel-button";
import ActivityDialogue from "@/components/ui/activity-dialogue";
import { WORLD_HELP_TIPS } from "@/quiz/activity-dialogue";

export default function GameHelp({ open, onClose, activity, suspended = false }: { open: boolean; onClose: () => void; activity?: ActivityDefinition; suspended?: boolean }) {
    const { t } = useI18n();
    const controls = [
        ["↑ ↓ ← →", "Walk / use the on-screen D-pad"], ["F / Space", "Use equipped tool"],
        [t("Equipment slot"), "Choose a tool or empty hands"], ["Q", "Open the Quest Board in the village"],
    ];
    if (activity) return <ActivityDialogue activity={activity} open={open} onClose={onClose} suspended={suspended} includeWorldTips finishLabel="Continue" />;
    // General village reference stays a normal Help modal; only activity instructions are dialogues.
    return <Modal open={open && !suspended} title={t("❔ {value0}", { value0: t("Help") })} onClose={onClose}
        footer={<PixelButton tone="emerald" onClick={onClose}>{t("Continue")}</PixelButton>}>
        <div className="space-y-4 text-sm text-slate-200">
            <p>{t("Explore the village and choose a quest from the board. You do not need to hold a tool while exploring.")}</p>
            <dl className="space-y-2">{controls.map(([keys, label]) => <div key={keys} className="flex items-center gap-3 rounded-lg bg-slate-800/70 p-2">
                <dt className="min-w-24 rounded border border-slate-600 bg-slate-950 p-1 text-center text-xs text-amber-200">{keys}</dt>
                <dd>{t(label)}</dd>
            </div>)}</dl>
        </div>
        <p className="mt-4 text-sm text-amber-100">{t(WORLD_HELP_TIPS[0])}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">{t(WORLD_HELP_TIPS[1])}</p>
    </Modal>;
}
