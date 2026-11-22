"use client";

import { useSyncExternalStore } from "react";

export type InputModality = "touch" | "keyboard-mouse" | null;
const COARSE_POINTER = "(pointer: coarse)";
let lastInput: InputModality = null;

/** Capability provides the first view; actual input wins on hybrid tablets/laptops. */
export function shouldShowTouchControls(coarsePointer: boolean, input: InputModality): boolean {
    return input === "touch" || (input === null && coarsePointer);
}

function subscribe(onChange: () => void): () => void {
    const media = window.matchMedia(COARSE_POINTER);
    const changeInput = (input: InputModality) => {
        if (lastInput === input) return;
        lastInput = input;
        onChange();
    };
    const onPointer = (event: PointerEvent) => {
        if (event.pointerType === "touch" || event.pointerType === "pen") changeInput("touch");
        else if (event.pointerType === "mouse") changeInput("keyboard-mouse");
    };
    const onKey = (event: KeyboardEvent) => {
        if (!event.isComposing && !["Shift", "Control", "Alt", "Meta"].includes(event.key)) changeInput("keyboard-mouse");
    };
    // Capture real input even while a native instruction dialog or question handles the event.
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    media.addEventListener("change", onChange);
    return () => {
        window.removeEventListener("pointerdown", onPointer, true);
        window.removeEventListener("keydown", onKey, true);
        media.removeEventListener("change", onChange);
    };
}
function snapshot(): boolean {
    return shouldShowTouchControls(window.matchMedia(COARSE_POINTER).matches, lastInput);
}
export function useTouchControls(): boolean {
    return useSyncExternalStore(subscribe, snapshot, () => false);
}
