import { ASSET_KEYS, WOOD_LOG_ANIMATION_KEYS } from "@/game/common/assets";
import Phaser from "phaser";

export class ItemSpawn extends Phaser.Physics.Arcade.Sprite {
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
    ) {
        super(
            scene,
            x,
            y,
            ASSET_KEYS.WOOD_LOG_ANIMATION,
            0
        );

        scene.add.existing(this);

        this.setScale(0);
        this.setAlpha(0);
        this.setDepth(10);
        this.play({
            key: WOOD_LOG_ANIMATION_KEYS.LIGHT_ROUND_LOG,
            repeat: -1
        });

        scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            scale: 1,
            alpha: 1,
            angle: Phaser.Math.Between(-20, 20),
            duration: 350,
            ease: 'Back.out',
        });
    }
}