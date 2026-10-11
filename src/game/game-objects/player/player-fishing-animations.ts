import Phaser from "phaser";
import {
    ASSET_KEYS,
    PLAYER_ANIMATION_KEYS,
    PLAYER_FISHING_ANIMATION_KEYS,
} from "@/game/common/assets";
import type { Facing } from "@/game/common/types";

/**
 * Frame layout inside each direction tag (Down/Up/Right/Left) of
 * `animations/player/fishing/fishing.json` — 15 frames × 80 ms:
 *
 *   0       idle with rod
 *   1–5     wind-up and swing
 *   6–9     bobber flying
 *   10      bobber hits the water (splash)
 *   11–13   splash fading
 *   14      float resting on the water, line out (held while waiting)
 */
export const FISHING_SHEET = {
    splashFrame: 10,
    lastFlightFrame: 9,
    restFrame: 14,
} as const;

export type FishingAnimationSet = {
    /** The full throw from the Aseprite tag (ends on the resting float). */
    cast: string;
    /** Throw that stops right before the splash (bait hit sand/bridge/...). */
    miss: string;
    /** Splash replay + back to the resting float: a fish bites. */
    bite: string;
    /** Throw backwards: reel the line in, ending on the idle-with-rod pose. */
    reel: string;
};

export const FISHING_ANIMATIONS: Record<Facing, FishingAnimationSet> = {
    down: {
        cast: PLAYER_ANIMATION_KEYS.FISHING_CAST_DOWN,
        miss: PLAYER_FISHING_ANIMATION_KEYS.MISS_DOWN,
        bite: PLAYER_FISHING_ANIMATION_KEYS.BITE_DOWN,
        reel: PLAYER_FISHING_ANIMATION_KEYS.REEL_DOWN,
    },
    up: {
        cast: PLAYER_ANIMATION_KEYS.FISHING_CAST_UP,
        miss: PLAYER_FISHING_ANIMATION_KEYS.MISS_UP,
        bite: PLAYER_FISHING_ANIMATION_KEYS.BITE_UP,
        reel: PLAYER_FISHING_ANIMATION_KEYS.REEL_UP,
    },
    right: {
        cast: PLAYER_ANIMATION_KEYS.FISHING_CAST_RIGHT,
        miss: PLAYER_FISHING_ANIMATION_KEYS.MISS_RIGHT,
        bite: PLAYER_FISHING_ANIMATION_KEYS.BITE_RIGHT,
        reel: PLAYER_FISHING_ANIMATION_KEYS.REEL_RIGHT,
    },
    left: {
        cast: PLAYER_ANIMATION_KEYS.FISHING_CAST_LEFT,
        miss: PLAYER_FISHING_ANIMATION_KEYS.MISS_LEFT,
        bite: PLAYER_FISHING_ANIMATION_KEYS.BITE_LEFT,
        reel: PLAYER_FISHING_ANIMATION_KEYS.REEL_LEFT,
    },
};

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
    frames: FrameConfig[]
): void {
    if (anims.exists(key) || frames.length === 0) return;

    anims.create({
        key,
        frames,
        duration: frames.reduce((sum, frame) => sum + (frame.duration ?? 0), 0),
    });
}

/**
 * Registers the fishing animations. Call once at boot, after the
 * PLAYER_FISHING aseprite file has loaded.
 *
 * Only the four direction tags are imported (the parent "Cast" tag that
 * spans all 60 frames is skipped). The miss / bite / reel variants are
 * built from the same frames and frame durations, so they always match
 * the artwork.
 */
export function createPlayerFishingAnimations(
    anims: Phaser.Animations.AnimationManager
): void {
    const sets = Object.values(FISHING_ANIMATIONS);

    anims.createFromAseprite(
        ASSET_KEYS.PLAYER_FISHING,
        sets.map((set) => set.cast)
    );

    sets.forEach((set) => {
        const cast = anims.get(set.cast);
        if (!cast) {
            console.warn(`Fishing animation tag not found: ${set.cast}`);
            return;
        }

        const { splashFrame, lastFlightFrame, restFrame } = FISHING_SHEET;

        createDerived(anims, set.miss, frameConfigs(cast, 0, lastFlightFrame));
        createDerived(anims, set.bite, frameConfigs(cast, splashFrame, restFrame));
        createDerived(anims, set.reel, frameConfigs(cast, lastFlightFrame, 0));
    });
}
