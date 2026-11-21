import Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import { DEPTH_CONFIG } from "../config/depth-config";

/** Original, lightly translucent cloud art. Existing authored CLOUDS tiles take priority. */
export class CloudLayer {
    #clouds: Phaser.GameObjects.Sprite[] = [];
    #reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    constructor(scene: Phaser.Scene, private width: number, height: number, authored = false) {
        if (authored || !scene.textures.exists(ASSET_KEYS.CLOUDS)) return;
        for (let index = 0; index < 2; index += 1) {
            this.#clouds.push(scene.add.sprite(width * (0.22 + index * 0.51), height * (0.2 + index * 0.27), ASSET_KEYS.CLOUDS, index)
                .setName(`cloud-${index}`).setAlpha(0.32).setDepth(DEPTH_CONFIG.CLOUDS).setData("atmosphere", true));
        }
    }
    update(delta: number): void {
        if (this.#reducedMotion) return;
        this.#clouds.forEach((cloud, index) => {
            cloud.x += Math.min(delta, 100) / 1000 * (1.8 + index * 0.4);
            if (cloud.x > this.width + 32) cloud.x = -32;
        });
    }
    destroy(): void { this.#clouds.forEach((cloud) => cloud.destroy()); this.#clouds = []; }
}
