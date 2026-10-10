import Phaser from "phaser";
import { Collidable } from "../common/types/collision";
import { Interactable } from "../common/types/interaction";
import { VisibleObject } from "../common/types/world-object";
import { DepthSortable } from "../common/types";

export type WorldObject = {
    gameObject: Phaser.GameObjects.GameObject;
    interactable?: Interactable;
    collidable?: Collidable;
    visible?: VisibleObject;
    depthSortable?: DepthSortable;
};