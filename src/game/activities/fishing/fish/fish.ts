import Phaser from "phaser";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import type { Footprint, Point } from "@/game/world/water/water-grid";
import {
    FISH_PALETTES,
    FISHING_TEXTURE_KEYS,
} from "../assets/fishing-textures";
import { FISHING_CONFIG } from "../fishing-config";

/** Size of the procedural fish texture (see fishing-textures.ts). */
const FISH_TEXTURE = { width: 16, height: 10 } as const;

/** Space a fish occupies — must stay entirely inside open water. */
export function fishFootprint(scale: number = FISHING_CONFIG.fish.scale): Footprint {
    const padding = FISHING_CONFIG.fish.footprintPadding;
    return {
        halfWidth: (FISH_TEXTURE.width * scale) / 2 + padding,
        halfHeight: (FISH_TEXTURE.height * scale) / 2 + padding,
    };
}

export function randomFishVariant(): number {
    return Phaser.Math.Between(0, FISH_PALETTES.length - 1);
}

/**
 * A visual fish. Fish are purely feedback for quiz outcomes (and ambient
 * life in the water) — they are not inventory items.
 *
 * Movement helpers only go where they are told: callers (the activity and
 * the ambient school) validate every destination and path against the
 * WaterSurface first, so a fish never swims over land or a bridge.
 */
export class Fish extends Phaser.GameObjects.Sprite {
    #variant: number;
    #proxyTweens: Phaser.Tweens.Tween[] = [];

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        variant: number,
        scale: number = FISHING_CONFIG.fish.scale
    ) {
        super(scene, x, y, FISHING_TEXTURE_KEYS.FISH(variant, 0));
        this.#variant = variant;
        scene.add.existing(this);
        this.setScale(scale);
        this.setDepth(DEPTH_CONFIG.UNDERWATER);
    }

    public get variant(): number {
        return this.#variant;
    }

    public playSwim(): void {
        this.play(FISHING_TEXTURE_KEYS.FISH_SWIM(this.#variant), true);
    }

    /** Fish art faces left by default. */
    public faceToward(x: number): void {
        if (Math.abs(x - this.x) < 0.5) return;
        this.setFlipX(x > this.x);
    }

    public fadeTo(alpha: number, duration: number): void {
        this.scene.tweens.add({ targets: this, alpha, duration });
    }

    /** Straight swim to a (pre-validated) point. */
    public swimTo(target: Point, speed: number, onComplete?: () => void): void {
        this.faceToward(target.x);
        const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

        this.scene.tweens.add({
            targets: this,
            x: target.x,
            y: target.y,
            duration: Math.max(250, (distance / speed) * 1000),
            ease: "Sine.inOut",
            onComplete: () => onComplete?.(),
        });
    }

    /**
     * Quick pecks toward the float. `peck` is the (pre-validated) point the
     * fish darts to; pass its own position for an on-the-spot wiggle.
     */
    public nibble(peck: Point, times: number, onPeck?: () => void, onComplete?: () => void): void {
        this.faceToward(peck.x);

        this.scene.tweens.add({
            targets: this,
            x: peck.x,
            y: peck.y,
            scaleY: this.scaleY * 0.85,
            duration: 110,
            yoyo: true,
            repeat: Math.max(0, times - 1),
            repeatDelay: 260,
            ease: "Quad.out",
            onYoyo: () => onPeck?.(),
            onComplete: () => onComplete?.(),
        });
    }

    /** Correct answer: leap out of the water in an arc toward `target`. */
    public leapTo(target: Point, duration: number, onComplete?: () => void): void {
        const from = { x: this.x, y: this.y };
        const peakY = Math.min(from.y, target.y) - 46;
        const direction = target.x >= from.x ? 1 : -1;
        const baseScale = this.scaleX;
        const proxy = { t: 0 };

        this.setDepth(DEPTH_CONFIG.AIRBORNE);
        this.setAlpha(1);
        this.faceToward(target.x);

        const tween = this.scene.tweens.add({
            targets: proxy,
            t: 1,
            duration,
            ease: "Sine.in",
            onUpdate: () => {
                const t = proxy.t;
                // Quadratic Bézier: start → peak → target.
                this.setPosition(
                    Phaser.Math.Linear(from.x, target.x, t),
                    (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * peakY + t * t * target.y
                );
                this.setAngle(direction * (-25 + 180 * t));
                this.setScale(baseScale * (1 + t * 0.4));
            },
            onComplete: () => {
                this.setAngle(0);
                onComplete?.();
            },
        });

        this.#proxyTweens.push(tween);
    }

    /** Wrong answer: dart away under the water (pre-validated target) and vanish. */
    public dartAway(target: Point, duration: number, onComplete?: () => void): void {
        this.faceToward(target.x);

        this.scene.tweens.add({
            targets: this,
            x: target.x,
            y: target.y,
            alpha: 0,
            duration,
            ease: "Cubic.out",
            onComplete: () => onComplete?.(),
        });
    }

    /** Sink out of sight on the spot. */
    public dive(duration: number, onComplete?: () => void): void {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: this.scaleX * 0.7,
            scaleY: this.scaleY * 0.7,
            duration,
            onComplete: () => onComplete?.(),
        });
    }

    public destroy(fromScene?: boolean): void {
        if (this.scene) {
            this.scene.tweens.killTweensOf(this);
        }
        this.#proxyTweens.forEach((tween) => tween.stop());
        this.#proxyTweens = [];
        super.destroy(fromScene);
    }
}
