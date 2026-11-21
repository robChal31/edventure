/** Pure, shared rules for standing trees and already-authored stumps. */
export type TreeStage = "standing" | "stump" | "cleared";
export const STUMP_CHOPS = 3;
export const LOG_SCALE = 0.5;

export class TreeLifecycle {
    stage: TreeStage;
    hits = 0;
    constructor(readonly standingChops: number, stump = false) {
        if (!Number.isSafeInteger(standingChops) || standingChops < 1) throw new RangeError("A tree needs a positive integer chop count.");
        this.stage = stump ? "stump" : "standing";
    }
    hit(): { changed: boolean; previous: TreeStage; stage: TreeStage } | null {
        if (this.stage === "cleared") return null;
        const previous = this.stage;
        this.hits += 1;
        const changed = this.hits >= (this.stage === "standing" ? this.standingChops : STUMP_CHOPS);
        if (changed) {
            this.stage = this.stage === "standing" ? "stump" : "cleared";
            this.hits = 0;
        }
        return { changed, previous, stage: this.stage };
    }
}
