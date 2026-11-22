import { ASSET_KEYS, WOOD_LOG_ANIMATION_KEYS } from "@/game/common/assets";
import { INVENTORY_PICKUP, type PickupRequest } from "@/game/inventory/inventory";
import Phaser from "phaser";
import { LOG_SCALE } from "../tree-lifecycle";

/** A world pickup is consumed only after the inventory acknowledges its durable write. */
export class ItemSpawn extends Phaser.Physics.Arcade.Sprite {
    #collecting = false;
    constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number) {
        super(scene, x, y, ASSET_KEYS.WOOD_LOG_ANIMATION, 0);
        scene.add.existing(this);
        this.setScale(0).setAlpha(0).setName("dropped-log").setDepth(targetY + 3).setData("itemId", "wood");
        this.play({ key: WOOD_LOG_ANIMATION_KEYS.LIGHT_ROUND_LOG, repeat: -1 });
        const bounds = scene.physics.world.bounds;
        const toss = scene.tweens.add({
            targets: this,
            x: Phaser.Math.Clamp(targetX, bounds.left + 6, bounds.right - 6),
            y: Phaser.Math.Clamp(targetY, bounds.top + 6, bounds.bottom - 6),
            scale: LOG_SCALE, alpha: 1, angle: Phaser.Math.Between(-20, 20), duration: 350, ease: "Back.out",
            onComplete: () => {
                if (!this.active) return;
                this.setInteractive({ useHandCursor: true,
                    hitArea: new Phaser.Geom.Rectangle(-8, -8, this.width + 16, this.height + 16),
                    hitAreaCallback: Phaser.Geom.Rectangle.Contains });
            },
        });
        this.on("pointerover", () => this.setTint(0xffefb0));
        this.on("pointerout", () => this.clearTint());
        this.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            if (this.#collecting || !this.active) return;
            this.#collecting = true;
            const request: PickupRequest = { itemId: "wood", quantity: 1, complete: (accepted) => {
                if (!this.active) return;
                if (!accepted) { this.#collecting = false; return; }
                this.disableInteractive();
                scene.tweens.add({ targets: this, y: this.y - 12, alpha: 0, scale: 0, duration: 180, onComplete: () => this.destroy() });
            } };
            if (!scene.events.listenerCount(INVENTORY_PICKUP)) { this.#collecting = false; return; }
            scene.events.emit(INVENTORY_PICKUP, request);
        });
        this.once(Phaser.GameObjects.Events.DESTROY, () => { toss.remove(); scene.tweens.killTweensOf(this); });
    }
}
