import Phaser from "phaser";
import { Player } from "../game-objects/player/player";
import { WorldMap } from "../world/world-map";
import { WorldObject } from "../world/world-object";
import { WORLD_CONFIG } from "../config/world-config";
import { DEPTH_CONFIG } from "../config/depth-config";
import { getOpaqueBounds } from "../common/texture/opaque-bounds";

export class CollisionSystem {
    constructor(
        private scene: Phaser.Scene,
        private player: Player,
        private worldMap: WorldMap,
        private objects: readonly WorldObject[]
    ) {}

    public setup(): void {
        this.#setupWorldCollision();
        this.#setupWaterCollision();
        this.#setupObjectCollision();
    }

    #setupWorldCollision(): void {
        this.player.setCollideWorldBounds(true);
    }

    #setupWaterCollision(): void {
        // Every layer defined as water blocks walking (shallow + deep).
        this.worldMap.waterLayers.forEach((waterLayer) => {
            this.scene.physics.add.collider(
                this.player,
                waterLayer
            );
        });
    }

    #setupObjectCollision(): void {
        this.objects.forEach((object) => {
            const gameObject = object.gameObject;

            if (object.collidable?.collisionBody) {
                this.scene.physics.add.collider(
                    this.player,
                    object.collidable.collisionBody
                );
                return;
            }

            if (!(gameObject instanceof Phaser.GameObjects.Image)) {
                return;
            }

            const collisionBody = this.#createCollisionBody(gameObject);

            object.collidable = { collisionBody };

            this.scene.physics.add.collider(
                this.player,
                collisionBody
            );
        });
    }

    #createCollisionBody(
        image: Phaser.GameObjects.Image
    ): Phaser.GameObjects.Rectangle {
        const opaqueBounds = getOpaqueBounds(
            image.texture,
            image.frame
        );

        let width: number;
        let height: number;
        let offsetX: number;
        let offsetY: number;

        if (opaqueBounds) {
            // Full opaque width, tapi bisa dipersempit dikit
            const widthRatio = 0.9;
            // Cuma 25% dari BAWAH opaque bounds
            const bottomHeightRatio = 0.25;

            const opaqueWorldX = opaqueBounds.x * WORLD_CONFIG.scale;
            const opaqueWorldY = opaqueBounds.y * WORLD_CONFIG.scale;
            const opaqueWorldW = opaqueBounds.width * WORLD_CONFIG.scale;
            const opaqueWorldH = opaqueBounds.height * WORLD_CONFIG.scale;

            width = opaqueWorldW * widthRatio;
            // Cuma ambil bagian bawah opaque bounds
            height = opaqueWorldH * bottomHeightRatio;

            // Center horizontal dari opaque bounds
            offsetX = opaqueWorldX + (opaqueWorldW - width) / 2;
            // Bottom dari opaque bounds
            offsetY = opaqueWorldY + opaqueWorldH - height;
        } else {
            // Fallback: cuma bagian bawah sprite
            width = image.displayWidth * 0.6;
            height = image.displayHeight * 0.15;
            offsetX = (image.displayWidth - width) / 2;
            offsetY = image.displayHeight - height;
        }

        // Image origin = (0, 1) → image.y = bottom sprite
        const bodyX = image.x + offsetX;
        const bodyY = image.y - image.displayHeight + offsetY;

        const body = this.scene.add.rectangle(
            bodyX,
            bodyY,
            width,
            height
        );

        body.setOrigin(0, 0);
        body.setVisible(false);

        this.scene.physics.add.existing(body, true);

        return body;
    }

    public initDebug(): void {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(DEPTH_CONFIG.DEBUG);

        graphics.lineStyle(2, 0x00ff00, 1);

        this.objects.forEach(({ collidable }) => {
            const body = collidable?.collisionBody;
            if (!body) return;

            graphics.strokeRect(
                body.x,
                body.y,
                body.width,
                body.height
            );
        });
    }
}