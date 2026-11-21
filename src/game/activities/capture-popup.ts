import Phaser from "phaser";
import { DEPTH_CONFIG } from "../config/depth-config";

/** Owned by the activity; a restart/travel can remove every pending +1 immediately. */
export class CapturePopups {
    #labels = new Map<Phaser.GameObjects.Text, Phaser.Tweens.Tween>();
    constructor(private scene: Phaser.Scene) {}
    show(x: number, y: number): void {
        const label = this.scene.add.text(Math.round(x), Math.round(y), "+1", {
            fontFamily: '"Press Start 2P"', fontSize: "9px", color: "#fef08a", stroke: "#285b3d", strokeThickness: 2,
        }).setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI).setName("capture-plus-one");
        const tween = this.scene.tweens.add({ targets: label, y: label.y - 17, alpha: 0, delay: 180, duration: 1050,
            ease: "Sine.out", onComplete: () => { this.#labels.delete(label); label.destroy(); } });
        this.#labels.set(label, tween);
    }
    clear(): void { this.#labels.forEach((tween, label) => { tween.remove(); label.destroy(); }); this.#labels.clear(); }
}
