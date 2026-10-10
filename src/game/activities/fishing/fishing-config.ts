import type { PlayerDirection } from "@/game/common/types";

/**
 * Tuning constants + the fishing spot layout for the village river map.
 * Coordinates are in world pixels (tile size 16, scale 1).
 */

export const FISHING_CONFIG = {
    tileSize: 16,

    /** Where the student stands to fish (beside the river). */
    spot: {
        anchor: { x: 296, y: 200 },
        facing: "up" as PlayerDirection,
        /** How close the player must be to the anchor to cast. */
        interactRadius: 26,
        /** Base point the bobber lands, deep in the river. */
        castTarget: { x: 296, y: 164 },
        castJitter: { x: 10, y: 8 },
    },

    /** The student also spawns here when the fishing activity is active. */
    spawn: { x: 296, y: 202 },

    timing: {
        castFly: 380,
        waitMin: 1200,
        waitMax: 2600,
        biteWindow: 1100,
        biteToQuestion: 450,
        catchDuration: 900,
        escapeDuration: 1000,
        betweenChallenges: 600,
    },
} as const;
