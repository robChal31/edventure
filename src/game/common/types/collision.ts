import Phaser from "phaser";

export interface Collidable {
    collisionBody: Phaser.GameObjects.Rectangle | null;
}