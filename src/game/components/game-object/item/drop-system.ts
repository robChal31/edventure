import { ItemSpawn } from "@/game/game-objects/item/item_spawn";
import Phaser from "phaser";

type DropDirection = "top" | "bottom" | "left" | "right";

export type DropConfig = {
    count: number;
    spawnPosition: Phaser.Math.Vector2;
    bounds: Phaser.Geom.Rectangle;
};

export class DropSystem {
    constructor(private scene: Phaser.Scene) {}

    public spawn(config: DropConfig): void {
        if (config.count <= 0) {
            return;
        }

        const direction = this.#getDirection(config.bounds);
        const targets = this.#getTargetPositions(
            config.bounds,
            direction,
            config.count
        );

        targets.forEach(target => {
            new ItemSpawn(
                this.scene,
                config.spawnPosition.x,
                config.spawnPosition.y,
                target.x,
                target.y
            );
        });
    }

    #getDirection(bounds: Phaser.Geom.Rectangle): DropDirection {
        const worldBounds = this.scene.physics.world.bounds;
        const edgePadding = 32;

        const directions: DropDirection[] = [];

        if (bounds.left > worldBounds.left + edgePadding) {
            directions.push("left");
        }

        if (bounds.right < worldBounds.right - edgePadding) {
            directions.push("right");
        }

        if (bounds.top > worldBounds.top + edgePadding) {
            directions.push("top");
        }

        if (bounds.bottom < worldBounds.bottom - edgePadding) {
            directions.push("bottom");
        }

        if (directions.length === 0) {
            return "bottom";
        }

        return Phaser.Utils.Array.GetRandom(directions);
    }

    #getTargetPositions(
        bounds: Phaser.Geom.Rectangle,
        direction: DropDirection,
        count: number
    ): Phaser.Math.Vector2[] {
        const spacing = 10;
        const spawnDistance = 8;
        const randomOffset = 12;

        const clusterWidth = spacing;
        const clusterHeight = Math.ceil(count / 2) * spacing;

        let startX = bounds.centerX;
        let startY = bounds.centerY;

        switch (direction) {
            case "left":
                startX = bounds.left - spawnDistance - clusterWidth;
                startY = bounds.centerY - clusterHeight / 2;
                break;

            case "right":
                startX = bounds.right + spawnDistance;
                startY = bounds.centerY - clusterHeight / 2;
                break;

            case "top":
                startX = bounds.centerX - clusterWidth / 2;
                startY = bounds.top - spawnDistance - clusterHeight;
                break;

            case "bottom":
                startX = bounds.centerX - clusterWidth / 2;
                startY = bounds.bottom + spawnDistance;
                break;

            default:
                startX = bounds.centerX;
                startY = bounds.centerY;
                break;
        }

        if (direction === "left" || direction === "right") {
            startY += Phaser.Math.Between(
                -randomOffset,
                randomOffset
            );
        } else {
            startX += Phaser.Math.Between(
                -randomOffset,
                randomOffset
            );
        }

        return Array.from({ length: count }, (_, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;

            return new Phaser.Math.Vector2(
                startX + col * spacing,
                startY + row * spacing
            );
        });
    }
}