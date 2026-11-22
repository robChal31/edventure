import type Phaser from "phaser";
import { ASSET_KEYS } from "@/game/common/assets";

export const FLUTE_ANIMATION = "flute";
export const ALTAR_ANIMATIONS = { IDLE: "idle_altar", FLOWER: "altar_flower_play" } as const;
export type FrogColor = "red" | "blue";
export const FROG_ASSETS = { red: ASSET_KEYS.FROG_RED, blue: ASSET_KEYS.FROG_BLUE } as const;
export function frogAnimation(color: FrogColor, tag: "front_jump" | "front_idle" | "puffing"): string { return `${FROG_ASSETS[color]}:${tag}`; }

type AsepriteExport = { frames: Record<string, { duration: number }>; meta: { frameTags: { name: string; from: number; to: number; direction: string }[] } };
/** Both supplied frog exports use identical tags: namespace them instead of replacing one another. */
export function createSerenadeAnimations(scene: Phaser.Scene): void {
    scene.anims.createFromAseprite(ASSET_KEYS.PLAYER_FLUTE);
    scene.anims.createFromAseprite(ASSET_KEYS.ALTAR_ANIMATION);
    Object.values(FROG_ASSETS).forEach((assetKey) => {
        const data: AsepriteExport = scene.cache.json.get(assetKey);
        data.meta.frameTags.forEach((tag) => {
            const key = `${assetKey}:${tag.name}`;
            if (scene.anims.exists(key)) return;
            const frames = Array.from({ length: tag.to - tag.from + 1 }, (_, i) => ({
                key: assetKey, frame: String(tag.from + i), duration: data.frames[String(tag.from + i)].duration,
            }));
            scene.anims.create({ key, frames: tag.direction === "reverse" ? frames.reverse() : frames,
                duration: frames.reduce((sum, frame) => sum + frame.duration, 0), yoyo: tag.direction === "pingpong" });
        });
    });
}
