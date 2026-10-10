import Phaser from "phaser";
import {
    FISHING_TEXTURE_KEYS,
} from "./assets/fishing-textures";

/**
 * A visual fish. Fish are purely feedback for quiz outcomes (and ambient
 * life in the water) — they are not inventory items.
 */
export class Fish extends Phaser.GameObjects.Sprite {
    #variant: number;

    constructor(scene: Phaser.Scene, x: number, y: number, variant: number) {
        super(
            scene,
            x,
            y,
            FISHING_TEXTURE_KEYS.FISH(variant, 0)
        );
        this.#variant = variant;
        scene.add.existing(this);
        this.setScale(1.5);
    }

    public get variant(): number {
        return this.#variant;
    }

    public playSwim(): void {
        this.play(FISHING_TEXTURE_KEYS.FISH_SWIM(this.#variant), true);
    }

    public faceLeft(left: boolean): void {
        // Fish art faces left by default.
        this.setFlipX(!left);
    }

    /** Swim (as a shadow) toward a point then stop. */
    public glideTo(
        x: number,
        y: number,
        duration: number,
        onComplete?: () => void
    ): void {
        this.faceLeft(x < this.x);
        this.scene.tweens.add({
            targets: this,
            x,
            y,
            duration,
            ease: "Sine.inOut",
            onComplete: () => onComplete?.(),
        });
    }

    /** The fish bites: a quick nibble dip at the bobber. */
    public nibble(): void {
        this.scene.tweens.add({
            targets: this,
            y: this.y + 2,
            duration: 120,
            yoyo: true,
            repeat: 1,
        });
    }

    /** Correct answer: leap from the water and fly toward the player. */
    public leapToPlayer(
        player: { x: number; y: number },
        duration: number,
        onComplete?: () => void
    ): void {
        const from = { x: this.x, y: this.y };
        const to = { x: player.x, y: player.y - 6 };
        const peak = Math.min(from.y, to.y) - 46;

        const proxy = { t: 0 };
        this.faceLeft(to.x < from.x);

        this.scene.tweens.add({
            targets: proxy,
            t: 1,
            duration,
            ease: "Sine.in",
            onUpdate: () => {
                const t = proxy.t;
                const x = Phaser.Math.Linear(from.x, to.x, t);
                // Quadratic arc: start, peak, end.
                const y =
                    (1 - t) * (1 - t) * from.y +
                    2 * (1 - t) * t * peak +
                    t * t * to.y;
                this.setPosition(x, y);
                this.setAngle(-20 + 360 * t * (to.x >= from.x ? 1 : -1) * 0.5);
                this.setScale(1.5 + t * 0.5);
            },
            onComplete: () => {
                this.setAngle(0);
                onComplete?.();
            },
        });
    }

    /** Incorrect answer: leap out and dart away, then fade. */
    public escapeAway(
        awayX: number,
        awayY: number,
        duration: number,
        onComplete?: () => void
    ): void {
        const from = { x: this.x, y: this.y };
        const peak = from.y - 34;
        const proxy = { t: 0 };
        this.faceLeft(awayX < from.x);

        this.scene.tweens.add({
            targets: proxy,
            t: 1,
            duration,
            ease: "Sine.in",
            onUpdate: () => {
                const t = proxy.t;
                const x = Phaser.Math.Linear(from.x, awayX, t);
                const y =
                    (1 - t) * (1 - t) * from.y +
                    2 * (1 - t) * t * peak +
                    t * t * awayY;
                this.setPosition(x, y);
                this.setAlpha(1 - t * t * 0.9);
            },
            onComplete: () => onComplete?.(),
        });
    }
}

/**
 * A handful of low-alpha fish shadows that wander the water so the
 * river feels alive even before the first cast.
 */
export class AmbientFishSchool {
    #fish: Fish[] = [];
    #waterPoints: { x: number; y: number }[];

    constructor(
        scene: Phaser.Scene,
        waterPoints: { x: number; y: number }[],
        count = 5
    ) {
        this.#waterPoints = waterPoints;
        if (waterPoints.length === 0) return;

        for (let i = 0; i < count; i++) {
            const start = Phaser.Utils.Array.GetRandom(waterPoints);
            const fish = new Fish(
                scene,
                start.x,
                start.y,
                i % 4
            );
            fish.setAlpha(0.35);
            fish.setDepth(3);
            fish.playSwim();
            this.#fish.push(fish);
            this.#wander(fish);
        }
    }

    #wander(fish: Fish): void {
        if (this.#waterPoints.length === 0) return;
        const target = Phaser.Utils.Array.GetRandom(this.#waterPoints);
        const dist = Phaser.Math.Distance.Between(
            fish.x,
            fish.y,
            target.x,
            target.y
        );
        fish.glideTo(target.x, target.y, 1500 + dist * 12, () => {
            this.scene.time.addEvent({
                delay: Phaser.Math.Between(300, 1500),
                callback: () => this.#wander(fish),
            });
        });
    }

    private get scene(): Phaser.Scene {
        return this.#fish[0]?.scene as Phaser.Scene;
    }

    public destroy(): void {
        this.#fish.forEach((f) => f.destroy());
        this.#fish = [];
    }
}
