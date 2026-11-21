import Phaser from "phaser";
import { DEPTH_CONFIG } from "../config/depth-config";
import type { Player } from "../game-objects/player/player";
import type { WorldObject } from "./world-object";
import type { WorldMap } from "./world-map";

/** Contact shadows only. Original shadow atlases and authored shadow tiles are not doubled. */
export class WorldShadows {
    #player: Phaser.GameObjects.Ellipse;
    #objects: { owner: Phaser.GameObjects.GameObject; shadow: Phaser.GameObjects.Ellipse }[] = [];

    constructor(scene: Phaser.Scene, private player: Player, objects: readonly WorldObject[], map: WorldMap,
        animatedSprites: readonly Phaser.GameObjects.Sprite[] = []) {
        this.#player = scene.add.ellipse(player.x, player.y + 7, 13, 5, 0x304b45, 0.22)
            .setName("player-contact-shadow").setDepth(DEPTH_CONFIG.SHADOW);
        const add = (image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, footprint?: Phaser.GameObjects.Rectangle | null) => {
            // Palms/bushes already have original shadows. Water props do not cast land shadows.
            if (/coconut|bush|water(?!_fountain)|lotus|stone_ripple|boat|canoe|cloud/i.test(image.name)) return;
            if (!footprint || footprint.width < 6 || map.hasShadowAt(footprint.x + footprint.width / 2, footprint.y + footprint.height / 2)) return;
            const shadow = scene.add.ellipse(footprint.x + footprint.width / 2 + 1, footprint.y + footprint.height / 2 + 1,
                Math.min(footprint.width + 4, 90), Math.max(3, Math.min(footprint.height * 0.7, 14)), 0x34443d, 0.14)
                .setName("object-contact-shadow").setDepth(DEPTH_CONFIG.SHADOW);
            this.#objects.push({ owner: image, shadow });
        };
        objects.forEach((object) => {
            if (object.gameObject instanceof Phaser.GameObjects.Image) add(object.gameObject, object.collidable?.collisionBody);
        });
        // E.g. the village fountain is animated, but still touches the ground.
        animatedSprites.forEach((sprite) => add(sprite, sprite.getData("collisionFootprint")));
    }

    update(): void {
        this.#player.setPosition(this.player.x, this.player.y + 7).setVisible(this.player.active && this.player.visible);
        this.#objects.forEach(({ owner, shadow }) => { if (!owner.active && shadow.active) shadow.destroy(); });
    }
    destroy(): void { this.#player.destroy(); this.#objects.forEach(({ shadow }) => shadow.destroy()); this.#objects = []; }
}
