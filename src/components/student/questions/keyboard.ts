/** True when a key event comes from a text field (never steal those keys). */
export function isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element || typeof element.closest !== "function") return false;
    return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
}
