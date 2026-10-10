import Phaser from "phaser";

export interface VisibleObject {
    getBounds(): Phaser.Geom.Rectangle;
    setAlpha(value: number): Phaser.GameObjects.GameObject;
}