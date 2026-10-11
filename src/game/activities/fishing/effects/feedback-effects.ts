import Phaser from "phaser";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { FISHING_TEXTURE_KEYS } from "../assets/fishing-textures";

/** World-space feedback: sparkles, the "!" bite bubble, floating text. */
export class FeedbackEffects {
    constructor(private scene: Phaser.Scene) {}

    public sparkles(x: number, y: number, count = 8): void {
        for (let i = 0; i < count; i++) {
            const spark = this.scene.add.image(
                x + Phaser.Math.Between(-16, 16),
                y + Phaser.Math.Between(-16, 8),
                FISHING_TEXTURE_KEYS.SPARKLE
            );
            spark.setDepth(DEPTH_CONFIG.WORLD_UI);

            this.scene.tweens.add({
                targets: spark,
                y: spark.y - 12,
                alpha: 0,
                scale: 0.4,
                duration: 650,
                delay: i * 55,
                onComplete: () => spark.destroy(),
            });
        }
    }

    /** The classic "!" pop above the player when a fish bites. */
    public exclaim(x: number, y: number): void {
        const mark = this.scene.add.image(x, y, FISHING_TEXTURE_KEYS.EXCLAIM);
        mark.setDepth(DEPTH_CONFIG.WORLD_UI);
        mark.setScale(0);

        this.scene.tweens.add({
            targets: mark,
            scale: 1.5,
            duration: 160,
            ease: "Back.out",
            onComplete: () => {
                this.scene.tweens.add({
                    targets: mark,
                    alpha: 0,
                    delay: 520,
                    duration: 200,
                    onComplete: () => mark.destroy(),
                });
            },
        });
    }

    public popup(text: string, x: number, y: number, color: string): void {
        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "10px",
            color,
            stroke: "#000000",
            strokeThickness: 3,
        });
        label.setOrigin(0.5);
        label.setDepth(DEPTH_CONFIG.WORLD_UI);

        this.scene.tweens.add({
            targets: label,
            y: y - 22,
            alpha: 0,
            delay: 250,
            duration: 900,
            onComplete: () => label.destroy(),
        });
    }
}
