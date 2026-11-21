import Phaser from "phaser";
import { ASSET_KEYS } from "@/game/common/assets";
import type { Player } from "@/game/game-objects/player/player";
import type { Point } from "./cricket-motion";

/**
 * The net sheet includes the character. Briefly replace the walking sprite
 * with it, leaving the player's feet/body in place. This is activity-local:
 * it does not add net states to the player's fishing animation machine.
 */
export class CatchingNet {
    #sprite: Phaser.GameObjects.Sprite | null = null;
    #restorePlayer: (() => void) | null = null;
    #fallback: Phaser.Time.TimerEvent | null = null;

    constructor(private scene: Phaser.Scene) {}

    swing(player: Player, target: Point, onComplete: () => void): void {
        this.cancel();
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const sideways = Math.abs(dx) > Math.abs(dy);
        const key = sideways ? "side_net_catch" : dy < 0 ? "back_net_catch" : "front_net_catch";

        if (!this.scene.anims.exists(key)) {
            this.#fallback = this.scene.time.delayedCall(0, onComplete);
            return;
        }

        const wasVisible = player.visible;
        player.setVisible(false);
        this.#restorePlayer = () => {
            if (player.active) player.setVisible(wasVisible);
        };
        this.#sprite = this.scene.add.sprite(player.x, player.y, ASSET_KEYS.PLAYER_CATCHING_NET, "0")
            .setScale(player.scaleX, player.scaleY)
            .setDepth(player.depth)
            .setFlipX(sideways && dx < 0);
        this.#sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.cancel();
            onComplete();
        });
        this.#sprite.play(key);
    }

    cancel(): void {
        this.#fallback?.remove(false);
        this.#fallback = null;
        this.#sprite?.destroy();
        this.#sprite = null;
        this.#restorePlayer?.();
        this.#restorePlayer = null;
    }
}
