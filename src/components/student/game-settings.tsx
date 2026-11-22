"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useI18n } from "@/i18n/provider";
import LanguageFlag from "@/components/ui/language-flag";
import type { MusicState } from "@/game/common/audio/map-music";

/** A small utility button, not a language form floating beside the score. */
export function GameSettingsButton({ onClick }: { onClick: () => void }) {
    const { t } = useI18n();
    return <button type="button" aria-label={t("Settings")} title={t("Settings")} aria-haspopup="dialog"
        onMouseDown={event => event.preventDefault()} onClick={onClick}
        className="game-settings-trigger pixel-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-100">
        <span className="game-settings-icon" aria-hidden="true" />
    </button>;
}

type GameSettingsProps = {
    open: boolean;
    onClose: () => void;
    /** Yield to Save / exit without losing the settings panel or the answer behind it. */
    suspended?: boolean;
    music: MusicState;
    onMusicChange: (enabled: boolean) => void;
};

/** Settings live in their own native panel: no dropdown/portal obscures the world or the HUD. */
export default function GameSettings({ open, onClose, suspended = false, music, onMusicChange }: GameSettingsProps) {
    const { locale, setLocale, t } = useI18n();
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const languageId = useId();

    useLayoutEffect(() => {
        const element = dialog.current;
        if (!open || suspended || !element) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showModal();
        element.querySelector<HTMLButtonElement>(".game-settings-languages [aria-pressed='true']")?.focus({ preventScroll: true });
        return () => {
            element.close();
            // React may already have removed the dialog before cleanup. Native close() alone
            // cannot restore focus from a disconnected dialog, so restore its opener explicitly.
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

    if (!open) return null;
    return <dialog ref={dialog} className="game-settings-dialog pixel-panel" aria-modal="true" aria-labelledby={titleId}
        onKeyDown={handleKey} onKeyUp={event => event.stopPropagation()}
        onCancel={event => { event.preventDefault(); onClose(); }}
        onPointerDown={event => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }}>
        <header className="flex items-center justify-between gap-4 border-b-2 border-slate-700 px-5 py-3">
            <h2 id={titleId} className="font-pixel text-[11px] leading-relaxed text-amber-200">{t("Game settings")}</h2>
            <button type="button" onClick={onClose} aria-label={t("Close settings")}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-200 hover:bg-slate-700">×</button>
        </header>
        <div className="space-y-5 px-5 py-5">
            <section aria-labelledby={languageId}>
                <h3 id={languageId} className="mb-3 text-sm font-semibold text-slate-100">{t("Language")}</h3>
                <div className="game-settings-languages grid grid-cols-2 gap-3" role="group" aria-labelledby={languageId}>
                    {(["id", "en"] as const).map(value => <button key={value} type="button" aria-pressed={locale === value}
                        aria-label={value === "id" ? "Bahasa Indonesia" : "English"} onClick={() => setLocale(value)}
                        className={`flex min-h-12 items-center justify-center gap-3 rounded-lg border-2 px-3 py-2 font-pixel text-[11px] ${locale === value
                            ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-300"}`}>
                        <span className="game-settings-flag" aria-hidden="true"><LanguageFlag locale={value} /></span>
                        <span aria-hidden="true">{value.toUpperCase()}</span>
                    </button>)}
                </div>
            </section>
            {music.available && <button type="button" aria-pressed={music.enabled} onClick={() => onMusicChange(!music.enabled)}
                className="min-h-11 w-full rounded-lg border-2 border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100">
                {t(music.enabled ? "Music on" : "Music off")}
            </button>}
        </div>
        <footer className="flex justify-end border-t-2 border-slate-700 px-5 py-4">
            <button type="button" onClick={onClose} className="pixel-btn min-h-11 rounded-lg bg-emerald-400 px-4 py-2 font-pixel text-[10px] text-emerald-950">{t("Continue")}</button>
        </footer>
    </dialog>;
}
