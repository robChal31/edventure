"use client";

import type { ActivityDefinition } from "@/quiz/activities";
import Modal from "./modal";
import PixelButton from "./pixel-button";

/** The goal, numbered steps and controls of one activity. Used everywhere it is explained. */
export function ActivityGuideContent({ activity }: { activity: ActivityDefinition }) {
    const { guide } = activity;
    return (
        <div className="flex flex-col gap-4 text-sm text-slate-200">
            <p className="font-semibold text-amber-100">{guide.goal}</p>

            <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-sky-300">
                {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                ))}
            </ol>

            <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Controls</h3>
                <dl className="grid gap-1.5 sm:grid-cols-2">
                    {guide.controls.map(([keys, does]) => (
                        <div key={keys} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2 py-1.5">
                            <dt>
                                <kbd className="rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">
                                    {keys}
                                </kbd>
                            </dt>
                            <dd className="text-xs text-slate-300">{does}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}

/** A collapsible "How to play" for cards and forms. */
export function ActivityGuideDetails({ activity }: { activity: ActivityDefinition }) {
    return (
        <details className="group rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2">
            <summary className="cursor-pointer select-none text-xs font-semibold text-sky-300 hover:text-sky-200">
                ❔ How to play {activity.label}
            </summary>
            <div className="mt-3">
                <ActivityGuideContent activity={activity} />
            </div>
        </details>
    );
}

/** Pops up the instructions of an activity (opened automatically when a quest starts). */
export function ActivityGuideDialog({
    activity,
    open,
    onClose,
}: {
    activity: ActivityDefinition;
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`How to play · ${activity.icon} ${activity.label}`}
            size="md"
            footer={
                <PixelButton tone="emerald" onClick={onClose}>
                    ▶ Got it, let&apos;s go!
                </PixelButton>
            }
        >
            <ActivityGuideContent activity={activity} />
        </Modal>
    );
}
