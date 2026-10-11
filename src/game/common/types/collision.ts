import Phaser from "phaser";

export interface CollisionFootprint {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}

export interface Collidable {
    collisionBody: Phaser.GameObjects.Rectangle | null;
}

