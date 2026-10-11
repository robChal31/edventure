import Phaser from "phaser";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { FISHING_TEXTURE_KEYS } from "../assets/fishing-textures";

/** Small, self-cleaning effects on (or just above) the water surface. */
export class WaterEffects {
    constructor(private scene: Phaser.Scene) {}

    /** An expanding ring where something touched the water. */
    public ripple(x: number, y: number, radius = 12, duration = 750): void {
        const ring = this.scene.add.circle(x, y, 2);
        ring.setStrokeStyle(1, 0xe0f2fe, 0.8);
        ring.setDepth(DEPTH_CONFIG.WATER_SURFACE);

        this.scene.tweens.add({
            targets: ring,
            radius,
            alpha: 0,
            duration,
            ease: "Sine.out",
            onComplete: () => ring.destroy(),
        });
    }

    /** Water drops flying up out of a splash. */
    public splash(x: number, y: number, count = 6, spread = 14): void {
        for (let i = 0; i < count; i++) {
            const drop = this.scene.add.image(x, y, FISHING_TEXTURE_KEYS.SPLASH);
            drop.setDepth(DEPTH_CONFIG.AIRBORNE);

            this.scene.tweens.add({
                targets: drop,
                x: x + Phaser.Math.Between(-spread, spread),
                y: y - Phaser.Math.Between(8, 22),
                alpha: 0,
                duration: 450,
                ease: "Quad.out",
                onComplete: () => drop.destroy(),
            });
        }
    }

    /** A few bubbles: something is moving under the surface. */
    public bubbles(x: number, y: number, count = 3): void {
        for (let i = 0; i < count; i++) {
            const bubble = this.scene.add.image(
                x + Phaser.Math.Between(-5, 5),
                y + Phaser.Math.Between(-2, 3),
                FISHING_TEXTURE_KEYS.BUBBLE
            );
            bubble.setDepth(DEPTH_CONFIG.WATER_SURFACE);
            bubble.setAlpha(0);

            this.scene.tweens.add({
                targets: bubble,
                y: bubble.y - Phaser.Math.Between(3, 6),
                alpha: { from: 0.9, to: 0 },
                duration: 650,
                delay: i * 140,
                ease: "Sine.out",
                onComplete: () => bubble.destroy(),
            });
        }
    }

    /** Puff of sand / wood dust where a cast missed the water. */
    public dust(x: number, y: number, tint = 0xf5deb3): void {
        for (let i = 0; i < 6; i++) {
            const mote = this.scene.add.image(x, y, FISHING_TEXTURE_KEYS.DUST);
            mote.setTint(tint);
            mote.setDepth(y + 1);

            const angle = (i / 6) * Math.PI * 2;
            this.scene.tweens.add({
                targets: mote,
                x: x + Math.cos(angle) * Phaser.Math.Between(5, 9),
                y: y + Math.sin(angle) * Phaser.Math.Between(2, 4) - 3,
                alpha: 0,
                duration: 420,
                ease: "Quad.out",
                onComplete: () => mote.destroy(),
            });
        }
    }
}
