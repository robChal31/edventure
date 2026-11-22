"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { useI18n } from "@/i18n/provider";
import type { ActivityDefinition } from "@/quiz/activities";
import { activityDialoguePages, activityReferencePages, dialogueGraphemes, DIALOGUE_HEADINGS, DIALOGUE_SPEAKERS, type DialoguePage } from "@/quiz/activity-dialogue";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
    const media = window.matchMedia(MOTION_QUERY);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
}
const reducedMotionSnapshot = () => window.matchMedia(MOTION_QUERY).matches;
const serverMotionSnapshot = () => true;

/** The accessible text is always complete; only its decorative visual copy types in. */
function useDialogueText(text: string, suspended: boolean) {
    const letters = useMemo(() => dialogueGraphemes(text), [text]);
    const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, serverMotionSnapshot);
    const [visible, setVisible] = useState(0);
    const progress = useRef(0);
    useEffect(() => {
        if (reducedMotion || suspended || progress.current >= letters.length) return;
        const timer = window.setInterval(() => {
            progress.current = Math.min(progress.current + 2, letters.length);
            setVisible(progress.current);
            if (progress.current === letters.length) window.clearInterval(timer);
        }, 32);
        return () => window.clearInterval(timer);
    }, [letters.length, reducedMotion, suspended]);
    const count = reducedMotion ? letters.length : visible;
    return {
        typing: count < letters.length,
        shown: letters.slice(0, count).join(""),
        remaining: letters.slice(count).join(""),
        reveal: () => { progress.current = letters.length; setVisible(letters.length); },
    };
}

type ActivityDialogueProps = {
    activity: ActivityDefinition;
    open: boolean;
    onClose: () => void;
    /** Temporarily yield to the existing Save / exit dialog, without losing the current page. */
    suspended?: boolean;
    includeWorldTips?: boolean;
    finishLabel?: string;
};

/** Activity introductions and Help share one bottom-screen, portrait-led RPG conversation. */
export default function ActivityDialogue({ open, ...props }: ActivityDialogueProps) {
    if (!open) return null;
    // Closing/reopening or travelling to another activity starts a fresh conversation.
    return <DialogueSession key={`${props.activity.id}-${Boolean(props.includeWorldTips)}`} {...props} />;
}

function DialogueSession({ activity, onClose, suspended = false, includeWorldTips = false, finishLabel = "Let's go!" }: Omit<ActivityDialogueProps, "open">) {
    const { t, locale } = useI18n();
    const [detailed, setDetailed] = useState(false);
    const pages = useMemo(() => detailed ? activityReferencePages(activity, includeWorldTips) : activityDialoguePages(activity), [activity, detailed, includeWorldTips]);
    const [index, setIndex] = useState(0);
    const dialog = useRef<HTMLDialogElement>(null);
    const primary = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const textId = useId();
    const page = pages[index];
    const heading = t(DIALOGUE_HEADINGS[page.kind], page.kind === "step" ? { value0: page.step } : undefined);
    const text = page.kind === "controls" ? page.controls.map(([keys, action]) => `${t(keys)}: ${t(action)}`).join(". ") : t(page.text);
    const pageLabel = t("Dialogue page {current} of {total}", { current: index + 1, total: pages.length });

    useLayoutEffect(() => {
        const element = dialog.current;
        if (!element || suspended) return;
        // Native modal focus containment/inertness and focus restoration, without a document-wide trap.
        element.showModal();
        primary.current?.focus({ preventScroll: true });
        return () => element.close();
    }, [suspended]);

    return <dialog ref={dialog} className="activity-dialogue" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId}
        onCancel={(event) => { event.preventDefault(); onClose(); }}>
        <h2 id={titleId} className="sr-only">{t("How to play · {value0} {value1}", { value0: activity.icon, value1: t(activity.label) })}</h2>
        <p id={textId} className="sr-only" role="status" aria-live="polite" aria-atomic="true">{pageLabel}. {heading}. {text}</p>
        <DialoguePageView key={`${page.id}-${locale}`} activity={activity} page={page} heading={heading} pageLabel={pageLabel}
            index={index} total={pages.length} suspended={suspended} primary={primary}
            finishLabel={finishLabel} onClose={onClose} detailed={detailed}
            onToggleDetails={() => { setIndex(0); setDetailed(value => !value); }}
            onBack={() => setIndex(value => Math.max(0, value - 1))}
            onNext={() => { if (index === pages.length - 1) onClose(); else setIndex(value => value + 1); }} />
    </dialog>;
}

function DialoguePageView({ activity, page, heading, pageLabel, index, total, suspended, primary, finishLabel, onClose, onBack, onNext, detailed, onToggleDetails }: {
    activity: ActivityDefinition; page: DialoguePage; heading: string; pageLabel: string;
    index: number; total: number; suspended: boolean; primary: RefObject<HTMLButtonElement | null>;
    detailed: boolean; onToggleDetails: () => void;
    finishLabel: string; onClose: () => void; onBack: () => void; onNext: () => void;
}) {
    const { t } = useI18n();
    const speaker = DIALOGUE_SPEAKERS[activity.id];
    const typed = useDialogueText(page.kind === "controls" ? "" : t(page.text), suspended);
    const advance = () => { if (typed.typing) typed.reveal(); else onNext(); };
    useLayoutEffect(() => { primary.current?.focus({ preventScroll: true }); }, [primary]);

    const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
        // Q, answer shortcuts and movement must never reach the world or the question behind Help.
        // Window capture listeners still handle the app's existing F5 / Ctrl+R save choices.
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
        if (event.key === "Tab") {
            // Some browsers otherwise send Tab from the last control into browser chrome.
            const targets = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']");
            const first = targets[0], last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            return;
        }
        if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (event.repeat) return;
        // Keep normal keyboard activation for Back / Skip, rather than treating every button as Next.
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (button) button.click();
        else advance();
    };

    return <div className="activity-dialogue-layout" onKeyDownCapture={handleKey}
        onKeyUpCapture={(event) => { event.stopPropagation(); }}>
        <header className="activity-dialogue-header">
            <p className="activity-dialogue-context font-pixel">{t(activity.label)}<span className="activity-dialogue-location"> · {t(activity.location)}</span></p>
            <button type="button" className="activity-dialogue-skip" onClick={onClose}>{t("Skip guide")} <span aria-hidden="true">×</span></button>
        </header>
        <div className="activity-dialogue-conversation">
            <div className="activity-dialogue-portrait" aria-hidden="true">
                <span className="activity-dialogue-portrait-art" style={{ backgroundImage: `url("${speaker.portrait}")` }} />
            </div>
            <div className="activity-dialogue-speaker">
                <p className="activity-dialogue-name font-pixel">{speaker.name}</p>
                <p className="activity-dialogue-role">{t(speaker.role)}</p>
                <h3 className="activity-dialogue-heading">{heading}</h3>
            </div>
            <div className="activity-dialogue-body" tabIndex={0} role="region" aria-label={heading}>
                {page.kind === "controls" ? <dl className="activity-dialogue-controls">
                    {page.controls.map(([keys, action]) => <div key={keys}><dt><kbd>{t(keys)}</kbd></dt><dd>{t(action)}</dd></div>)}
                </dl> : <p className="activity-dialogue-text" aria-hidden="true"><span>{typed.shown}</span><span className="activity-dialogue-unrevealed">{typed.remaining}</span></p>}
            </div>
        </div>
        <footer className="activity-dialogue-footer">
            <div className="activity-dialogue-info">
                {detailed && <span className="activity-dialogue-counter font-pixel" aria-label={pageLabel}>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>}
                <span className="activity-dialogue-pace">{t(detailed ? "Read at your own pace." : "Guide available any time.")}</span>
                <kbd className="activity-dialogue-shortcut">{t("Enter / Space")}</kbd>
            </div>
            <div className="activity-dialogue-actions">
                <button type="button" className="activity-dialogue-button" onClick={onToggleDetails}>{t(detailed ? "Quick guide" : "Details")}</button>
                {detailed && <button type="button" className="activity-dialogue-button" disabled={index === 0} onClick={onBack}>{t("Back")}</button>}
                <button ref={primary} type="button" className="activity-dialogue-button activity-dialogue-primary" onClick={advance}>
                    {typed.typing ? t("Show text") : index === total - 1 ? t(finishLabel) : t("Next")}<span className="activity-dialogue-arrow" aria-hidden="true" />
                </button>
            </div>
        </footer>
    </div>;
}
