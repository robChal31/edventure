/**
 * Debug overlays (collision boxes, player body, interaction ranges and
 * the fishable-water mask). Off by default so students see a clean game;
 * add `?debug` to the page URL to turn them on, e.g.
 * `http://localhost:3000/teacher/preview/quiz-sample-ocean?debug`.
 * In debug mode the Phaser game is also available in DevTools as
 * `window.__LEARNING_WORLD__.game`.
 */
function readDebugFlag(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return new URLSearchParams(window.location.search).has("debug");
    } catch {
        return false;
    }
}

const enabled = readDebugFlag();

export const DEBUG_CONFIG = {
    enabled,
    collision: enabled,
    playerBody: enabled,
    interaction: enabled,
    /** Tints fishable water cells and marks every cast landing point. */
    water: enabled,
} as const;
