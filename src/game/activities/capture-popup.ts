import type Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import { DEPTH_CONFIG } from "../config/depth-config";
import { WORLD_REWARD_MS } from "@/quiz/reward-feedback";

type RewardObject = Phaser.GameObjects.Text | Phaser.GameObjects.Image;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small, bounded bursts using the original Shine.png art. Every object/tween belongs to the run. */
export class CapturePopups {
    #objects = new Set<RewardObject>();
    constructor(private scene: Phaser.Scene, private motionReduced = reducedMotion) {}

    show(x: number, y: number): void {
        const still = this.motionReduced();
        const label = this.scene.add.text(Math.round(x), Math.round(y), "+1", {
            fontFamily: '"Press Start 2P"', fontSize: "12px", color: "#fff1a8", backgroundColor: "#122c33",
            stroke: "#071526", strokeThickness: 2, padding: { x: 4, y: 3 },
        }).setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI).setName("capture-plus-one");
        this.#objects.add(label);
        if (!still) {
            label.setScale(0.7);
            this.scene.tweens.add({ targets: label, scale: 1, duration: 180, ease: "Back.out" });
            this.scene.tweens.add({ targets: label, y: label.y - 22, duration: WORLD_REWARD_MS, ease: "Sine.out" });
        }
        // Remain fully legible for most of the reward; only fade at the end, never immediately.
        this.#fade(label, WORLD_REWARD_MS - 400, 400);
        this.sparkles(x, y + 12);
    }

    sparkles(x: number, y: number): void {
        if (!this.scene.textures.exists(ASSET_KEYS.REWARD_SHINE)) return;
        const still = this.motionReduced(), count = still ? 2 : 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) - Math.PI / 2;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const star = this.scene.add.image(Math.round(x + dx * 9), Math.round(y + dy * 7), ASSET_KEYS.REWARD_SHINE, i % 2)
                .setDepth(DEPTH_CONFIG.WORLD_UI - 1).setScale(0.8).setTint(i % 2 ? 0xb5ecff : 0xffe397).setName("capture-reward-star");
            this.#objects.add(star);
            if (!still) this.scene.tweens.add({ targets: star,
                x: Math.round(x + dx * (24 + i % 3 * 4)), y: Math.round(y + dy * 20 - 8),
                scale: 1.15, duration: 800, ease: "Sine.out" });
            this.#fade(star, still ? 950 : 650 + i * 50, 450);
        }
    }

    #fade(object: RewardObject, delay: number, duration: number): void {
        this.scene.tweens.add({ targets: object, alpha: 0, delay, duration, onComplete: () => {
            this.#objects.delete(object);
            object.destroy();
        } });
    }

    clear(): void {
        this.#objects.forEach(object => { this.scene.tweens.killTweensOf(object); object.destroy(); });
        this.#objects.clear();
    }
}
