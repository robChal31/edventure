import Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import type { PlayerAction } from "../common/types";
import type { Interactable, InteractionContext } from "../common/types/interaction";
import type { Collidable } from "../common/types/collision";
import type { VisibleObject } from "../common/types/world-object";
import { getOpaqueBounds } from "../common/texture/opaque-bounds";
import { DropSystem } from "../components/game-object/item/drop-system";
import { BushLifecycle } from "./bush-lifecycle";

/** Original bush art, pinned shadow/roots, a small axe footprint, and no stump stage. */
export class Bush extends Phaser.GameObjects.Container implements Interactable, Collidable, VisibleObject {
    #life = new BushLifecycle();
    #canopy: Phaser.GameObjects.Image;
    #base: Phaser.GameObjects.Image;
    #busy = false;
    #gust?: Phaser.Tweens.Tween;
    #shake?: Phaser.Tweens.Tween;
    public collisionBody: Phaser.GameObjects.Rectangle | null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: number, scale: number) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setScale(scale);
        this.#base = scene.add.image(0, 0, texture, frame).setOrigin(0, 1);
        const { realWidth: w, realHeight: h } = this.#base.frame;
        const split = Math.max(1, h - 8);
        this.#canopy = scene.add.image(0, 0, texture, frame).setOrigin(0, 1).setCrop(0, 0, w, split);
        this.#base.setCrop(0, split, w, h - split);
        this.add([this.#base, this.#canopy]);
        const opaque = getOpaqueBounds(this.#base.texture, this.#base.frame) ?? { x: 0, y: 0, width: w, height: h };
        const width = opaque.width * 0.8 * scale;
        const height = Math.max(4, opaque.height * 0.22) * scale;
        this.collisionBody = scene.add.rectangle(x + (opaque.x + opaque.width * 0.1) * scale,
            y - h * scale + (opaque.y + opaque.height) * scale - height, width, height).setOrigin(0, 0).setVisible(false);
        scene.physics.add.existing(this.collisionBody, true);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.#gust?.remove(); this.#shake?.remove();
            this.collisionBody?.destroy(); this.collisionBody = null;
        });
    }
    get stage(): string { return this.#life.stage; }
    get isBusy(): boolean { return this.#busy; }
    canInteract(action: PlayerAction["type"]): boolean { return this.active && !this.#busy && this.stage === "standing" && action === "axe"; }
    getInteractionBounds(): Phaser.Geom.Rectangle {
        const b = this.collisionBody?.getBounds();
        return b && this.active ? new Phaser.Geom.Rectangle(b.x - 4, b.y - 4, b.width + 8, b.height + 8) : new Phaser.Geom.Rectangle();
    }
    interact(context: InteractionContext): void { if (context.action.type === "axe") this.chop(); }
    chop(): void {
        if (!this.canInteract("axe")) return;
        this.#gust?.remove(); this.#gust = undefined; this.#canopy.x = 0;
        this.#busy = true;
        const result = this.#life.hit();
        if (this.scene.cache.audio.exists(ASSET_KEYS.CHOPPING_WOOD)) this.scene.sound.play(ASSET_KEYS.CHOPPING_WOOD, { volume: 0.5 });
        this.#shake = this.scene.tweens.add({ targets: this.#canopy, x: 2, duration: 60, yoyo: true, repeat: 2,
            onComplete: () => {
                if (!this.active) return;
                this.#shake = undefined; this.#canopy.x = 0;
                if (result === "cleared") {
                    const bounds = this.collisionBody!.getBounds();
                    new DropSystem(this.scene).spawn({ count: 1, spawnPosition: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY - 4), bounds });
                    // Destroying the independent body also disposes the collider/registry entry.
                    if (this.collisionBody?.body) (this.collisionBody.body as Phaser.Physics.Arcade.StaticBody).enable = false;
                    this.destroy();
                } else this.#busy = false;
            } });
    }
    breeze(): void {
        if (!this.active || this.#busy || this.#gust || this.stage !== "standing") return;
        this.#gust = this.scene.tweens.add({ targets: this.#canopy, x: 1, duration: 300, yoyo: true, repeat: 1, ease: "Sine.inOut",
            onComplete: () => { this.#gust = undefined; } });
    }
}
