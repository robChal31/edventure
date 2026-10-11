import type { Facing } from "@/game/common/types";

/**
 * Tuning for the fishing activity. There are no fishing spots: a cast
 * works anywhere, as long as the float lands on a water layer.
 * Distances are world pixels at scale 1 (tile size 16).
 */
export const FISHING_CONFIG = {
    /**
     * Where the float touches the water, relative to the player's sprite
     * centre, per facing. Measured from the splash frame of
     * animations/player/fishing/fishing.png (multiplied by player scale).
     */
    castLanding: {
        down: { x: 0, y: 29 },
        up: { x: 0, y: -18 },
        right: { x: 18, y: 15 },
        left: { x: -17, y: 15 },
    } satisfies Record<Facing, { x: number; y: number }>,

    fish: {
        scale: 1.25,
        /** Extra margin (px) around the sprite that must also be open water. */
        footprintPadding: 1,
        /** Opacity of the shadow swimming to the float. */
        approachAlpha: 0.6,
        /** How far away the biting fish starts swimming from. */
        approachDistance: { min: 40, max: 90 },
        /** How close to the float a fish must get to bite. */
        maxBiteDistance: 18,
        /** px per second */
        swimSpeed: 42,
    },

    ambient: {
        count: 6,
        alpha: 0.3,
        wanderDistance: { min: 40, max: 150 },
        /** px per second */
        swimSpeed: 18,
        restMs: { min: 500, max: 2000 },
    },

    timing: {
        /** After the float settles, before a fish shows up. */
        waitMin: 900,
        waitMax: 2200,
        nibbles: 2,
        biteToQuestion: 450,
        /** The question card stays up this long to show right / wrong. */
        revealDuration: 1500,
        /** Bait lies on the sand this long before it is reeled back. */
        missPause: 300,
        catchDuration: 900,
        escapeDuration: 900,
        betweenChallenges: 600,
        rippleEvery: 1100,
    },
} as const;
