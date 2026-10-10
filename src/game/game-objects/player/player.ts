// game-objects/player/player.ts
import { PLAYER_ANIMATION_KEYS } from "@/game/common/assets";
import { PlayerDirection, Position } from "@/game/common/types";
import { KeyboardComponent } from "@/game/components/input/keyboard-component";
import Phaser from "phaser";

export type PlayerConfig = {
    scene: Phaser.Scene
    position: Position
    assetKey: string
    frame?: number
    controls: KeyboardComponent
    onAxeAction?: () => void;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    #controls!: KeyboardComponent
    #direction: PlayerDirection = "down";
    #isWearingAxe = false;
    #isAxeActionPlaying = false;
    #onAxeAction?: () => void;

    constructor(config: PlayerConfig) {
        const { scene, position, assetKey, frame } = config;
        const { x, y } = position;
        
        super(scene, x, y, assetKey, frame || 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(12, 8);
        body.setOffset(10, 16);

        this.#controls = config.controls
        this.#onAxeAction = config.onAxeAction

        this.play({ key: PLAYER_ANIMATION_KEYS.IDLE_DOWN, repeat: -1 });
        config.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        config.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            config.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        })
    }

    update(): void {
        if (this.#isAxeActionPlaying) {
            return;
        }

        this.#updateMovement();

        if (this.#controls.isTestWearAxeAnimationDown) {
            this.#isWearingAxe = !this.#isWearingAxe;

            if (this.#isWearingAxe) {
                this.#playIdleAxe();
            } else {
                this.#playIdle();
            }

            return;
        }

        if (this.#controls.isTestAxeActionAnimationDown) {
            if (this.#isWearingAxe) {
                this.#playAxeAction();
            }

            return;
        }

        if (this.#controls.isUpDown) {
            this.#direction = "up";

            this.play({
                key: PLAYER_ANIMATION_KEYS.WALK_UP,
                repeat: -1
            }, true);

            return;
        }

        if (this.#controls.isDownDown) {
            this.#direction = "down";

            this.play({
                key: PLAYER_ANIMATION_KEYS.WALK_DOWN,
                repeat: -1
            }, true);

            return;
        }

        if (this.#controls.isLeftDown || this.#controls.isRightDown) {
            this.#direction = "side";

            this.setFlipX(this.#controls.isLeftDown);

            this.play({
                key: PLAYER_ANIMATION_KEYS.WALK_SIDE,
                repeat: -1
            }, true);

            return;
        }

        if (this.#isWearingAxe) {
            this.#playIdleAxe();
        } else {
            this.#playIdle();
        }
    }

    #playIdle(): void {
        switch (this.#direction) {
            case "up":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.IDLE_UP,
                    repeat: -1
                }, true);
                break;

            case "down":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.IDLE_DOWN,
                    repeat: -1
                }, true);
                break;

            case "side":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.IDLE_SIDE,
                    repeat: -1
                }, true);
                break;
        }
    }

    #playIdleAxe(): void {
        switch (this.#direction) {
            case "up":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.BACK_IDLE_AXE,
                    repeat: -1
                }, true);
                break;

            case "down":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.FRONT_IDLE_AXE,
                    repeat: -1
                }, true);
                break;

            case "side":
                this.play({
                    key: PLAYER_ANIMATION_KEYS.SIDE_IDLE_AXE,
                    repeat: -1
                }, true);
                break;
        }
    }

    #playAxeAction(): void {
        if (this.#isAxeActionPlaying) return;

        this.#isAxeActionPlaying = true;

        let animationKey: string;

        switch (this.#direction) {
            case "up":
                animationKey = PLAYER_ANIMATION_KEYS.BACK_SWING_AXE;
                break;

            case "down":
                animationKey = PLAYER_ANIMATION_KEYS.FRONT_SWING_AXE;
                break;

            case "side":
                animationKey = PLAYER_ANIMATION_KEYS.SIDE_SWING_AXE;
                break;
        }

        this.play(animationKey);

        this.#onAxeAction?.();

        this.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE,
            () => {
                this.#isAxeActionPlaying = false;
                this.#playIdleAxe();
            }
        );
    }

    #updateMovement(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        const speed = 100;

        body.setVelocity(0);

        if (this.#controls.isLeftDown) {
            body.setVelocityX(-speed);
        } else if (this.#controls.isRightDown) {
            body.setVelocityX(speed);
        }

        if (this.#controls.isUpDown) {
            body.setVelocityY(-speed);
        } else if (this.#controls.isDownDown) {
            body.setVelocityY(speed);
        }
    }

    public get direction(): PlayerDirection {
        return this.#direction;
    }
}