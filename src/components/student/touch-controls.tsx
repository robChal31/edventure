"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n/provider";
import type { ActivityController, VirtualDirection } from "@/game/game-options";
import { useTouchControls } from "./use-touch-controls";

type TouchAction = {
    label: string;
    enabled: boolean;
    onPress: () => void;
};

type TouchControlsProps = {
    controller: ActivityController | null;
    /** Right-hand action button (CAST / REEL IN). Hidden when omitted. */
    action?: TouchAction;
    hidden?: boolean;
};

/** Touch/pen only, with automatic recovery when a hybrid device changes input. */
export default function TouchControls({ controller, action, hidden = false }: TouchControlsProps) {
    const { t } = useI18n();
    const touch = useTouchControls();
    const visible = touch && !hidden;
    useEffect(() => {
        const release = () => {
            for (const direction of ["up", "down", "left", "right"] as const) controller?.setVirtualDirection(direction, false);
        };
        const onVisibility = () => { if (document.hidden) release(); };
        window.addEventListener("blur", release);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            release();
            window.removeEventListener("blur", release);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [controller, visible]);
    if (!visible) return null;
    const press = (dir: VirtualDirection, pressed: boolean) => {
        controller?.setVirtualDirection(dir, pressed);
    };

    const dirButton = (dir: VirtualDirection, label: string) => (
        <button
            type="button"
            tabIndex={-1}
            className="pixel-btn flex h-12 w-12 touch-none items-center justify-center rounded-lg bg-slate-700 text-lg text-slate-100 active:bg-sky-600"
            onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                press(dir, true);
            }}
            onPointerUp={() => press(dir, false)}
            onPointerLeave={() => press(dir, false)}
            onPointerCancel={() => press(dir, false)}
            onLostPointerCapture={() => press(dir, false)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t("Move {value0}", { value0: t(dir) })}
        >
            {label}
        </button>
    );

    return (
        <div data-testid="touch-controls" className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-4">
            {/* D-pad */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1 opacity-90">
                <div />
                {dirButton("up", "▲")}
                <div />
                {dirButton("left", "◀")}
                <div />
                {dirButton("right", "▶")}
                <div />
                {dirButton("down", "▼")}
                <div />
            </div>

            {action && (
                <div className="pointer-events-auto">
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={action.onPress}
                        disabled={!action.enabled}
                        className={`pixel-btn rounded-full px-6 py-4 font-pixel text-sm ${
                            action.enabled
                                ? "bg-amber-400 text-amber-950"
                                : "bg-slate-700 text-slate-400 opacity-60"
                        }`}
                    >
                        {action.label}
                    </button>
                </div>
            )}
        </div>
    );
}
