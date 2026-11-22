"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useI18n } from "@/i18n/provider";
import LanguageFlag from "@/components/ui/language-flag";
import type { MusicState } from "@/game/common/audio/map-music";

type GameMenuProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Temporarily yield to the refresh/save choices without losing menu or question state. */
    suspended?: boolean;
    help: { label: "Help" | "Guide"; onClick: () => void };
    leave?: { label: string; onClick: () => void };
    music: MusicState;
    onMusicChange: (enabled: boolean) => void;
    saveError?: boolean;
};

/** One corner button. Guide, language/music and Save / exit only appear inside its panel. */
export default function GameMenu({ open, onOpenChange, suspended = false, help, leave, music, onMusicChange, saveError = false }: GameMenuProps) {
    const { locale, setLocale, t } = useI18n();
    const trigger = useRef<HTMLButtonElement>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const titleId = useId();
    const settingsId = useId();
    const languageId = useId();
    const warningId = useId();

    useLayoutEffect(() => {
        const element = dialog.current;
        if (!open || suspended || !element) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
        element.showModal();
        element.querySelector<HTMLButtonElement>(".game-menu-guide")?.focus({ preventScroll: true });
        return () => {
            element.close();
            // Native close alone cannot restore focus if React already removed the panel.
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, [open, suspended]);

    const handleKey = (event: KeyboardEvent<HTMLDialogElement>) => {
        event.stopPropagation();
        if (event.key !== "Tab") return;
        const targets = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const selectAction = (action: () => void) => { onOpenChange(false); action(); };
    const isolateTriggerActivation = (event: KeyboardEvent<HTMLButtonElement>) => {
        // Space opens this button, not the equipped tool or a question behind it.
        if (event.key === " " || event.key === "Enter") event.stopPropagation();
    };

    return <>
        <button ref={trigger} type="button" aria-label={t("Game menu")} title={t("Game menu")} aria-haspopup="dialog"
            aria-expanded={open && !suspended} aria-controls={dialogId} aria-describedby={saveError ? warningId : undefined}
            onMouseDown={event => event.preventDefault()} onClick={() => onOpenChange(!open)}
            onKeyDown={isolateTriggerActivation} onKeyUp={isolateTriggerActivation}
            className="game-menu-trigger pixel-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-100">
            <span className="game-menu-icon" aria-hidden="true" />
            {saveError && <span aria-hidden="true" className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rose-400 ring-2 ring-slate-950" />}
        </button>
        {saveError && <span id={warningId} role="status" className="sr-only">{t("Progress not saved")}</span>}
        {/* A closed native dialog is hidden/inert, including to screen readers and Tab. */}
        <dialog ref={dialog} id={dialogId} className="game-menu-dialog pixel-panel" aria-modal="true" aria-labelledby={titleId}
            onKeyDown={handleKey} onKeyUp={event => event.stopPropagation()}
            onCancel={event => { event.preventDefault(); onOpenChange(false); }}
            onPointerDown={event => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onOpenChange(false);
            }}>
            <header className="flex items-center justify-between gap-4 border-b-2 border-slate-700 px-4 py-2">
                <h2 id={titleId} className="font-pixel text-[11px] leading-relaxed text-amber-200">{t("Game menu")}</h2>
                <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close menu")}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-slate-200 hover:bg-slate-700">×</button>
            </header>
            <div className="space-y-4 px-4 py-4">
                <button type="button" onClick={() => selectAction(help.onClick)} aria-label={t(help.label === "Guide" ? "Replay instructions" : "Help")}
                    className="game-menu-guide pixel-btn min-h-11 w-full rounded-lg bg-sky-700 px-3 py-2 font-pixel text-[10px] text-sky-50">? {t(help.label)}</button>
                <section aria-labelledby={settingsId} className="space-y-2 border-y-2 border-slate-700 py-3">
                    <h3 id={settingsId} className="text-sm font-semibold text-amber-200">{t("Settings")}</h3>
                    <p id={languageId} className="text-sm text-slate-200">{t("Language")}</p>
                    <div className="game-menu-languages grid grid-cols-2 gap-3" role="group" aria-labelledby={languageId}>
                        {(["id", "en"] as const).map(value => <button key={value} type="button" aria-pressed={locale === value}
                            aria-label={value === "id" ? "Bahasa Indonesia" : "English"} onClick={() => setLocale(value)}
                            className={`flex min-h-12 items-center justify-center gap-3 rounded-lg border-2 px-3 py-2 font-pixel text-[11px] ${locale === value
                                ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-300"}`}>
                            <span className="game-menu-flag" aria-hidden="true"><LanguageFlag locale={value} /></span>
                            <span aria-hidden="true">{value.toUpperCase()}</span>
                        </button>)}
                    </div>
                    {music.available && <button type="button" aria-pressed={music.enabled} onClick={() => onMusicChange(!music.enabled)}
                        className="min-h-11 w-full rounded-lg border-2 border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100">
                        {t(music.enabled ? "Music on" : "Music off")}
                    </button>}
                </section>
                {leave && <button type="button" onClick={() => selectAction(leave.onClick)}
                    className="game-menu-leave pixel-btn min-h-11 w-full rounded-lg bg-slate-800 px-3 py-2 font-pixel text-[10px] leading-relaxed text-slate-100">{t(leave.label)}</button>}
                {saveError && <p className="text-sm text-rose-200">{t("Progress not saved")}</p>}
            </div>
            <footer className="flex justify-end border-t-2 border-slate-700 px-4 py-3">
                <button type="button" onClick={() => onOpenChange(false)} className="pixel-btn min-h-11 rounded-lg bg-emerald-400 px-4 py-2 font-pixel text-[10px] text-emerald-950">{t("Continue")}</button>
            </footer>
        </dialog>
    </>;
}
