"use client";
import { useI18n } from "@/i18n/provider";
import type { ActivityDefinition } from "@/quiz/activities";
import Modal from "@/components/ui/modal";
import PixelButton from "@/components/ui/pixel-button";
import { ActivityGuideContent } from "@/components/ui/activity-guide";

export default function GameHelp({ open, onClose, activity }: { open: boolean; onClose: () => void; activity?: ActivityDefinition }) {
    const { t } = useI18n();
    const controls = [
        ["↑ ↓ ← →", "Walk / use the on-screen D-pad"], ["F / Space", "Use equipped tool"],
        [t("Equipment slot"), "Choose a tool or empty hands"], ["Q", "Open the Quest Board in the village"],
    ];
    return <Modal open={open} title={t("❔ {value0}", { value0: t("Help") })} onClose={onClose}
        footer={<PixelButton tone="emerald" onClick={onClose}>{t("Continue")}</PixelButton>}>
        {activity ? <ActivityGuideContent activity={activity} /> : <div className="space-y-4 text-sm text-slate-200">
            <p>{t("Explore the village and choose a quest from the board. You do not need to hold a tool while exploring.")}</p>
            <dl className="space-y-2">{controls.map(([keys, label]) => <div key={keys} className="flex items-center gap-3 rounded-lg bg-slate-800/70 p-2">
                <dt className="min-w-24 rounded border border-slate-600 bg-slate-950 p-1 text-center text-xs text-amber-200">{keys}</dt>
                <dd>{t(label)}</dd>
            </div>)}</dl>
        </div>}
        <p className="mt-4 text-sm text-amber-100">{t("Axe: trees take 5 chops, then 3 more to clear the wood. Bushes disappear after 3 chops without leaving a stump. Click dropped logs to collect them, then open Inventory to see your bag.")}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">{t("Progress is saved on this browser, not across devices. Refresh uses your browser's standard confirmation; use Save / exit for more choices.")}</p>
    </Modal>;
}
