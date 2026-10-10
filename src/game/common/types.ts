import { CHARACTER_ANIMATIONS } from "./assets";
import Phaser from "phaser";

export type CharacterAnimation = keyof typeof CHARACTER_ANIMATIONS

export type Position = {
    x: number;
    y: number;
};

export type GameObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
export type PlayerDirection = "up" | "down" | "side";
export type CollisionConfig = {
    x: number;
    y: number;
    width: number;
    height: number;
        offset: {
        x: number;
        y: number;
    };

};
export type FootprintConfig = {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
};
export type VisibilityConfig = {
    offsetLeft?: number;
    offsetRight?: number;
    offsetTop?: number;
    offsetBottom?: number;
    alpha?: number;
};
export type PlayerAction = {
    type: "axe" | "sword" | "pickaxe";
    onMiss: () => void;
};
export interface DepthSortable {
    y: number;
    setDepth(value: number): this;
}