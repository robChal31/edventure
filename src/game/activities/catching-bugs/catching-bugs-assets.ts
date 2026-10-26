import type Phaser from "phaser";
import { ASSET_KEYS } from "@/game/common/assets";

export const CRICKET_MOVE = "cricket_move";

/** Only existing Aseprite artwork; do not create placeholder bug/net textures. */
export function createCatchingBugsAnimations(scene: Phaser.Scene): void {
    scene.anims.createFromAseprite(ASSET_KEYS.PLAYER_CATCHING_NET);
    if (!scene.anims.exists(CRICKET_MOVE)) {
        scene.anims.create({
            key: CRICKET_MOVE,
            frames: ["0", "1", "2", "3"].map((frame) => ({ key: ASSET_KEYS.CRICKET, frame })),
            frameRate: 10,
            repeat: -1,
        });
    }
}
