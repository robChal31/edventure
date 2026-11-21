import Phaser from "phaser";
import { PlayerAction } from "./../types";

export type InteractionContext = {
    player: Phaser.GameObjects.GameObject;
    action: PlayerAction;
};

export interface Interactable {
    getInteractionBounds(): Phaser.Geom.Rectangle;
    canInteract?(action: PlayerAction["type"]): boolean;
    interact(context: InteractionContext): void;
}