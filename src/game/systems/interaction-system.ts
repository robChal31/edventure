import Phaser from "phaser";
import { Player } from "../game-objects/player/player";
import { Interactable } from "../common/types/interaction";
import { PlayerAction } from "../common/types";
import { WORLD_CONFIG } from "../config/world-config";
import { InteractionTargetSelector } from "../common/system/interaction/interaction-target-selector";

export class InteractionSystem {
    #debugRange?: Phaser.GameObjects.Rectangle;

    #targetSelector: InteractionTargetSelector;

    constructor(
        private player: Player,
        objects: readonly Interactable[]
    ) {
        this.#targetSelector =
            new InteractionTargetSelector(objects);
    }

    public update(): void {}

    public interact(action: PlayerAction): void {
        const interactionBounds =
            this.#getInteractionBounds();

        this.#showDebugRange(
            interactionBounds
        );

        const target =
            this.#targetSelector.findTarget(
                new Phaser.Math.Vector2(
                    this.player.x,
                    this.player.y
                ),
                interactionBounds,
                this.player.direction,
                this.player.flipX
            );

        if (!target) {
            action.onMiss();
            return;
        }

        target.interact({
            player: this.player,
            action,
        });
    }

    #getInteractionBounds(): Phaser.Geom.Rectangle {
        const range =
            WORLD_CONFIG.tileSize *
            WORLD_CONFIG.scale;

        const width =
            WORLD_CONFIG.tileSize *
            WORLD_CONFIG.scale;

        const x = this.player.x;
        const y = this.player.y;

        const halfWidth = width / 2;

        switch (this.player.direction) {
            case "up":
                return new Phaser.Geom.Rectangle(
                    x - halfWidth,
                    y - range,
                    width,
                    range
                );

            case "down":
                return new Phaser.Geom.Rectangle(
                    x - halfWidth,
                    y,
                    width,
                    range
                );

            case "side":
                if (this.player.flipX) {
                    return new Phaser.Geom.Rectangle(
                        x - range,
                        y - halfWidth,
                        range,
                        width
                    );
                }

                return new Phaser.Geom.Rectangle(
                    x,
                    y - halfWidth,
                    range,
                    width
                );

            default:
                return new Phaser.Geom.Rectangle();
        }
    }

    #showDebugRange(
        bounds: Phaser.Geom.Rectangle
    ): void {
        if (!this.#debugRange) {
            this.#debugRange =
                this.player.scene.add.rectangle(
                    bounds.centerX,
                    bounds.centerY,
                    bounds.width,
                    bounds.height
                );

            this.#debugRange.setOrigin(0.5);

            this.#debugRange.setStrokeStyle(
                2,
                0xff0000,
                1
            );

            this.#debugRange.setFillStyle(
                0xff0000,
                0.1
            );

            this.#debugRange.setDepth(9);

            return;
        }

        this.#debugRange.setPosition(
            bounds.centerX,
            bounds.centerY
        );

        this.#debugRange.setSize(
            bounds.width,
            bounds.height
        );

        this.#debugRange.setVisible(true);
    }
}