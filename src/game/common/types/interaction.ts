import Phaser from "phaser";
import { PlayerAction } from "./../types";

export type InteractionContext = {
    player: Phaser.GameObjects.GameObject;
    action: PlayerAction;
};

export interface Interactable {
    getInteractionBounds(): Phaser.Geom.Rectangle;
    interact(context: InteractionContext): void;
}