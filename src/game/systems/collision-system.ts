import Phaser from "phaser";
import { Player } from "../game-objects/player/player";
import { WorldMap } from "../world/world-map";
import { WorldObject } from "../world/world-object";
import { WORLD_CONFIG } from "../config/world-config";

export class CollisionSystem {
    // Cache opaque bounds per texture+frame biar ga scan pixel berulang
    #opaqueBoundsCache = new Map<string, Phaser.Geom.Rectangle | null>();

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
        this.scene.physics.add.collider(
            this.player,
            this.worldMap.waterLayer
        );
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
        const opaqueBounds = this.#getOpaqueBounds(
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

    #getOpaqueBounds(
        texture: Phaser.Textures.Texture,
        frame: Phaser.Textures.Frame
    ): Phaser.Geom.Rectangle | null {
        const cacheKey = `${texture.key}:${frame.name}`;

        if (this.#opaqueBoundsCache.has(cacheKey)) {
            return this.#opaqueBoundsCache.get(cacheKey)!;
        }

        const source = texture.getSourceImage() as
            | HTMLImageElement
            | HTMLCanvasElement
            | HTMLVideoElement;

        const fx = frame.x;
        const fy = frame.y;
        const fw = frame.width;
        const fh = frame.height;

        if (fw <= 0 || fh <= 0) {
            this.#opaqueBoundsCache.set(cacheKey, null);
            return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = fw;
        canvas.height = fh;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            this.#opaqueBoundsCache.set(cacheKey, null);
            return null;
        }

        ctx.drawImage(source as CanvasImageSource, fx, fy, fw, fh, 0, 0, fw, fh);

        const data = ctx.getImageData(0, 0, fw, fh).data;

        let minX = fw;
        let minY = fh;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const alpha = data[(y * fw + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY) {
            this.#opaqueBoundsCache.set(cacheKey, null);
            return null;
        }

        const result = new Phaser.Geom.Rectangle(
            minX,
            minY,
            maxX - minX + 1,
            maxY - minY + 1
        );

        this.#opaqueBoundsCache.set(cacheKey, result);
        return result;
    }

    public initDebug(): void {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(99999);

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