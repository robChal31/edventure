export const BUSH_CHOPS = 3;

/** Bushes go straight from standing to cleared: no tree/stump conversion. */
export class BushLifecycle {
    #hits = 0;
    get stage(): "standing" | "cleared" { return this.#hits >= BUSH_CHOPS ? "cleared" : "standing"; }
    hit(): "shaken" | "cleared" | null {
        if (this.stage === "cleared") return null;
        this.#hits += 1;
        return this.#hits >= BUSH_CHOPS ? "cleared" : "shaken";
    }
}
