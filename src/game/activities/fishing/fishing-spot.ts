import Phaser from "phaser";
import { FISHING_CONFIG } from "./fishing-config";

/**
 * A designated place beside the water where the student can cast.
 * Renders a soft pulsing marker so the spot is discoverable, and reports
 * whether the player is close enough to fish.
 */
export class FishingSpot {
    #marker?: Phaser.GameObjects.Arc;
    #pulseTween?: Phaser.Tweens.Tween;

    constructor(
        private scene: Phaser.Scene,
        private anchor: { x: number; y: number }
    ) {
        this.#createMarker();
    }

    #createMarker(): void {
        const { x, y } = this.anchor;

        this.#marker = this.scene.add.circle(x, y + 2, 12, 0xffffff, 0.14);
        this.#marker.setStrokeStyle(1, 0xffffff, 0.5);
        this.#marker.setDepth(2);

        this.#pulseTween = this.scene.tweens.add({
            targets: this.#marker,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0.35,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    }

    public isPlayerInRange(player: { x: number; y: number }): boolean {
        const dist = Phaser.Math.Distance.Between(
            player.x,
            player.y,
            this.anchor.x,
            this.anchor.y
        );
        return dist <= FISHING_CONFIG.spot.interactRadius;
    }

    public setHighlighted(highlighted: boolean): void {
        if (!this.#marker) return;
        this.#marker.setVisible(highlighted);
    }

    public destroy(): void {
        this.#pulseTween?.stop();
        this.#marker?.destroy();
    }
}
