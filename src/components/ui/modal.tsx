"use client";

import { useEffect, useId, type ReactNode } from "react";

type ModalProps = {
    open: boolean;
    title: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: "md" | "lg" | "xl";
};

// Open modals, top-most last — Esc only closes the top one.
const modalStack: string[] = [];

const WIDTHS = {
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
};

/** Simple accessible modal: Esc / backdrop click closes it. */
export default function Modal({
    open,
    title,
    onClose,
    children,
    footer,
    size = "md",
}: ModalProps) {
    const titleId = useId();

    useEffect(() => {
        if (!open) return;
        modalStack.push(titleId);
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && modalStack[modalStack.length - 1] === titleId) {
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            const index = modalStack.lastIndexOf(titleId);
            if (index >= 0) modalStack.splice(index, 1);
        };
    }, [open, onClose, titleId]);

    if (!open) return null;

    return (
        <div
            className="lw-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-2 sm:items-center sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`lw-pop-in pixel-panel flex max-h-[94dvh] w-full ${WIDTHS[size]} flex-col overflow-hidden rounded-xl border-slate-950 bg-slate-900`}
            >
                <div className="flex items-center justify-between gap-4 border-b-2 border-slate-800 bg-slate-950/60 px-5 py-3">
                    <h2 id={titleId} className="font-pixel text-xs text-amber-300 sm:text-sm">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-slate-800 bg-slate-950/40 px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
