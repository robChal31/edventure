import Phaser from "phaser";
import { Interactable } from "../../types/interaction";

export type InteractionTargetCandidate = {
    object: Interactable;
    distance: number;
    isInDirection: boolean;
};

export class InteractionTargetSelector {
    constructor(
        private objects: readonly Interactable[]
    ) {}

    public findTarget(
        position: Phaser.Math.Vector2,
        interactionBounds: Phaser.Geom.Rectangle,
        direction: "up" | "down" | "side",
        flipX: boolean
    ): Interactable | null {
        const candidates =
            this.objects
                // 1. Object WAJIB masuk axe range.
                .filter(object => {
                    const bounds =
                        object.getInteractionBounds();

                    return Phaser.Geom.Intersects.RectangleToRectangle(
                        interactionBounds,
                        bounds
                    );
                })
                // 2. Hitung direction dan distance
                .map(object => {
                    const bounds =
                        object.getInteractionBounds();

                    return {
                        object,
                        distance:
                            this.#getDistance(
                                position,
                                bounds
                            ),
                        isInDirection:
                            this.#isInDirection(
                                position,
                                bounds,
                                direction,
                                flipX
                            ),
                    };
                })
                // 3. Direction lebih penting daripada distance.
                .sort((a, b) => {
                    if (
                        a.isInDirection !==
                        b.isInDirection
                    ) {
                        return a.isInDirection
                            ? -1
                            : 1;
                    }

                    // 4. Kalau direction sama,
                    // pilih yang paling dekat.
                    return (
                        a.distance -
                        b.distance
                    );
                });

        return candidates[0]?.object ?? null;
    }

    #isInDirection(
        position: Phaser.Math.Vector2,
        bounds: Phaser.Geom.Rectangle,
        direction: "up" | "down" | "side",
        flipX: boolean
    ): boolean {
        switch (direction) {
            case "up":
                return bounds.centerY < position.y;

            case "down":
                return bounds.centerY > position.y;

            case "side":
                if (flipX) {
                    // Facing left.
                    return (
                        bounds.centerX <
                        position.x
                    );
                }

                // Facing right.
                return (
                    bounds.centerX >
                    position.x
                );

            default:
                return false;
        }
    }

    #getDistance(
        position: Phaser.Math.Vector2,
        bounds: Phaser.Geom.Rectangle
    ): number {
        return Phaser.Math.Distance.Between(
            position.x,
            position.y,
            bounds.centerX,
            bounds.centerY
        );
    }
}