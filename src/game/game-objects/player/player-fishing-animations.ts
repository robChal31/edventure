import Phaser from "phaser";
import { ASSET_KEYS, type FishingStateKey } from "@/game/common/assets";
import type { Facing } from "@/game/common/types";

/**
 * Fishing is one activity among many, so its artwork is kept generic:
 * six Aseprite sheets in `animations/player/fishing/`, each exported with
 * three tags — `_down`, `_back` (facing up) and `_side`. Left is the side
 * artwork mirrored with flipX.
 *
 *   casting_animation        cast_*          15 frames × 100 ms
 *   fishing_idle_animation   fishing_idle_*   4 frames  (loops while waiting)
 *   fishing_hooked_animation fishing_hooked_* 8 frames  (loops on a bite)
 *   fishing_roll_animation   fishing_roll_*   4 frames  (reeling in)
 *   captured_fish_animation  captured_fish_*  4 frames  (correct answer)
 *   captured_no_fish_animation captured_no_fish_* 4 frames (wrong answer)
 */
export const FISHING_SHEET = {
    /** Frame of `cast_*` where the bait touches the water (splash). */
    splashFrame: 10,
    /** Frames of `cast_*` before the splash: the bait flies but misses. */
    missFrames: 10,
} as const;

/** Animation state → the prefix of its Aseprite tags. */
export const FISHING_STATE_PREFIX: Record<FishingStateKey, string> = {
    cast: "cast",
    castMiss: "cast_miss",
    idle: "fishing_idle",
    hooked: "fishing_hooked",
    roll: "fishing_roll",
    capturedFish: "captured_fish",
    capturedNoFish: "captured_no_fish",
};

/** Facing → tag suffix. Left and right share the side artwork. */
const TAG_SUFFIX: Record<Facing, string> = {
    down: "down",
    up: "back",
    left: "side",
    right: "side",
};

/** The Phaser animation key for a fishing state while facing a direction. */
export function fishingAnimationKey(state: FishingStateKey, facing: Facing): string {
    return `${FISHING_STATE_PREFIX[state]}_${TAG_SUFFIX[facing]}`;
}

/** Left is the side artwork flipped horizontally. */
export function fishingFlipX(facing: Facing): boolean {
    return facing === "left";
}

const FISHING_SHEETS = [
    { key: ASSET_KEYS.PLAYER_FISHING_CASTING, prefix: FISHING_STATE_PREFIX.cast },
    { key: ASSET_KEYS.PLAYER_FISHING_IDLE, prefix: FISHING_STATE_PREFIX.idle },
    { key: ASSET_KEYS.PLAYER_FISHING_HOOKED, prefix: FISHING_STATE_PREFIX.hooked },
    { key: ASSET_KEYS.PLAYER_FISHING_ROLL, prefix: FISHING_STATE_PREFIX.roll },
    { key: ASSET_KEYS.PLAYER_FISHING_CAPTURED_FISH, prefix: FISHING_STATE_PREFIX.capturedFish },
    { key: ASSET_KEYS.PLAYER_FISHING_CAPTURED_NO_FISH, prefix: FISHING_STATE_PREFIX.capturedNoFish },
] as const;

type FrameConfig = Phaser.Types.Animations.AnimationFrame;

function frameConfigs(animation: Phaser.Animations.Animation, from: number, to: number): FrameConfig[] {
    const step = from <= to ? 1 : -1;
    const frames: FrameConfig[] = [];

    for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
        const frame = animation.frames[i];
        if (!frame) continue;
        frames.push({
            key: frame.textureKey,
            frame: frame.textureFrame,
            duration: frame.duration,
        });
    }

    return frames;
}

function createDerived(
    anims: Phaser.Animations.AnimationManager,
    key: string,
    frames: FrameConfig[],
    repeat = 0
): void {
    if (anims.exists(key) || frames.length === 0) return;

    anims.create({
        key,
        frames,
        repeat,
        duration: frames.reduce((sum, frame) => sum + (frame.duration ?? 0), 0),
    });
}

/**
 * Registers every fishing animation. Call once at boot, after the preload
 * pack has loaded the six fishing sheets.
 *
 * The miss throw (bait falls on sand, pier, boat...) is the first part of
 * the cast cut before the splash, and the reel-back for a miss is that
 * same part played backwards, so it always matches the artwork.
 */
export function createPlayerFishingAnimations(
    anims: Phaser.Animations.AnimationManager
): void {
    FISHING_SHEETS.forEach(({ key }) => anims.createFromAseprite(key));

    (["down", "back", "side"] as const).forEach((suffix) => {
        const cast = anims.get(`${FISHING_STATE_PREFIX.cast}_${suffix}`);
        if (!cast) {
            console.warn(`Fishing cast animation not found: cast_${suffix}`);
            return;
        }

        const { missFrames } = FISHING_SHEET;
        createDerived(
            anims,
            `${FISHING_STATE_PREFIX.castMiss}_${suffix}`,
            frameConfigs(cast, 0, missFrames - 1)
        );
    });
}
