import Phaser from "phaser";
import { Player } from "../game-objects/player/player";
import { WorldMap } from "../world/world-map";
import { Collidable } from "../common/types/collision";

export class CollisionSystem {
    constructor(
        private scene: Phaser.Scene,
        private player: Player,
        private worldMap: WorldMap,
        private objects: readonly Collidable[]
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
        const cliffIndexes = [
            1389,
            1391,
            1392,
            1398,
            1399,
            1437,
            1446,
            1464,
            1488,
            1510,
            1512,
            1533,
            1534,
        ];

        cliffIndexes.forEach((index) => {
            this.worldMap.waterLayer.setCollision(index);
        });

        this.scene.physics.add.collider(
            this.player,
            this.worldMap.waterLayer
        );
    }

    #setupObjectCollision(): void {
        this.objects.forEach((object) => {
            if (!object.collisionBody) {
                return;
            }

            this.scene.physics.add.collider(
                this.player,
                object.collisionBody
            );
        });
    }
}