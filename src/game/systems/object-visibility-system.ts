import { Player } from "../game-objects/player/player";
import { VisibleObject } from "../common/types/world-object";

export class ObjectVisibilitySystem {
    private readonly transparentAlpha = 0.5;

    constructor(
        private player: Player,
        private objects: readonly VisibleObject[]
    ) {}

    public update(): void {
        const playerBounds = this.player.getBounds();

        // Titik acuan player adalah posisi kaki.
        const playerX = playerBounds.centerX;
        const playerY = playerBounds.bottom;

        this.objects.forEach((object) => {
            const bounds = object.getBounds();

            // Hindari transparansi pada object yang terlalu kecil.
            if (bounds.width <= 0 || bounds.height <= 0) {
                object.setAlpha(1);
                return;
            }

            // Area horizontal yang masih dianggap menutupi player.
            const horizontalInset = Math.min(
                bounds.width * 0.15,
                12
            );

            const overlapLeft =
                bounds.left + horizontalInset;

            const overlapRight =
                bounds.right - horizontalInset;

            // Abaikan bagian paling atas object.
            // Area transparansi dimulai di 35% tinggi object.
            const overlapTop =
                bounds.top + bounds.height * 0.35;

            const overlapBottom = bounds.bottom;
            
            const isBehindObject =
                playerX >= overlapLeft &&
                playerX <= overlapRight &&
                playerY >= overlapTop &&
                playerY <= overlapBottom;

            object.setAlpha(
                isBehindObject
                    ? this.transparentAlpha
                    : 1
            );
        });
    }
}