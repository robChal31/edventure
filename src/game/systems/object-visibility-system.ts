import { Player } from "../game-objects/player/player";
import { VisibleObject } from "../common/types/world-object";

export class ObjectVisibilitySystem {
    constructor(
        private player: Player,
        private objects: readonly VisibleObject[]
    ) {}

    public update(): void {
        const playerBounds =
            this.player.getBounds();

        this.objects.forEach((object) => {
            const objectBounds =
                object.getBounds();

            const overlapLeft =
                objectBounds.left + 8;

            const overlapRight =
                objectBounds.right - 8;

            const overlapTop =
                objectBounds.top + 32;

            const overlapBottom =
                objectBounds.bottom;

            const playerX =
                playerBounds.centerX;

            const playerY =
                playerBounds.bottom;

            const isBehindObject =
                playerX >= overlapLeft &&
                playerX <= overlapRight &&
                playerY >= overlapTop &&
                playerY <= overlapBottom;

            object.setAlpha(
                isBehindObject ? 0.5 : 1
            );
        });
    }
}