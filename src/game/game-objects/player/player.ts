// game-objects/player/player.ts
import { PLAYER_ANIMATION_KEYS } from "@/game/common/assets";
import { Facing, PlayerDirection, Position } from "@/game/common/types";
import { KeyboardComponent } from "@/game/components/input/keyboard-component";
import Phaser from "phaser";
import { FISHING_ANIMATIONS, FISHING_SHEET } from "./player-fishing-animations";

/**
 * Feet-sized physics body, defined in 32×32 frame space. Frames of other
 * sizes (the 64×64 fishing sheet) get the offset re-centred every frame so
 * the body never moves when the animation changes.
 */
const PLAYER_BODY = {
    width: 12,
    height: 8,
    offsetX: 10,
    offsetY: 16,
    baseFrameSize: 32,
} as const;

export type PlayerConfig = {
    scene: Phaser.Scene
    position: Position
    assetKey: string
    frame?: number
    controls: KeyboardComponent
    /** Initial facing (defaults to down). */
    facing?: Facing
    onAxeAction?: () => void;
    /** Fired when the fishing key (F or Space) is just pressed. */
    onFishingAction?: () => void;
}

type FishingAnimationHandlers = {
    /** Called on every frame change with the 0-based frame index. */
    onFrame?: (frameIndex: number) => void;
    onComplete?: () => void;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
    #controls!: KeyboardComponent
    #direction: PlayerDirection = "down";
    #isWearingAxe = false;
    #isAxeActionPlaying = false;
    #isFishing = false;
    #fishingFacing: Facing = "down";
    #cancelFishingAnimation?: () => void;
    #inputLocked = false;
    #onAxeAction?: () => void;
    #onFishingAction?: () => void;

    constructor(config: PlayerConfig) {
        const { scene, position, assetKey, frame } = config;
        const { x, y } = position;
        
        super(scene, x, y, assetKey, frame || 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(PLAYER_BODY.width, PLAYER_BODY.height);
        body.setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);

        this.#controls = config.controls
        this.#onAxeAction = config.onAxeAction
        this.#onFishingAction = config.onFishingAction

        this.#face(config.facing ?? "down");
        this.#playIdle();

        config.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        config.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            config.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
            this.#cancelFishingAnimation?.();
        })
    }

    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.#syncBodyToFrame();
    }

    update(): void {
        // The fishing key goes to the activity first: depending on its phase
        // it casts, reels in early, or does nothing.
        if (
            this.#controls.isFishingKeyJustDown &&
            !this.#isAxeActionPlaying &&
            !this.#inputLocked
        ) {
            this.#onFishingAction?.();
        }

        if (this.#isAxeActionPlaying || this.#isFishing) {
            return;
        }

        this.#updateMovement();

        if (this.#inputLocked) {
            this.#playIdle();
            return;
        }

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

    public setInputLocked(locked: boolean): void {
        this.#inputLocked = locked;
        if (locked) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(0);
        }
    }

    // ─────────────────────────────────────────
    // FISHING
    // ─────────────────────────────────────────

    public get isFishing(): boolean {
        return this.#isFishing;
    }

    /** Four-way facing; "side" is resolved with flipX. */
    public get facing(): Facing {
        if (this.#isFishing) {
            return this.#fishingFacing;
        }
        if (this.#direction === "side") {
            return this.flipX ? "left" : "right";
        }
        return this.#direction;
    }

    /**
     * Throws the line toward the current facing.
     *
     * @param landsInWater true → the full throw ending with the float in the
     *   water; false → the throw stops before the splash frames (the bait hit
     *   sand, a bridge, ...).
     * @param onLanded the bobber touches down (splash frame / end of throw).
     * @param onComplete the throw animation finished.
     */
    public castLine(
        landsInWater: boolean,
        onLanded?: () => void,
        onComplete?: () => void
    ): Facing {
        const facing = this.facing;

        this.#isFishing = true;
        this.#fishingFacing = facing;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);
        // Left/Right have dedicated artwork in the fishing sheet.
        this.setFlipX(false);

        const animations = FISHING_ANIMATIONS[facing];
        let landed = false;
        const land = () => {
            if (landed) return;
            landed = true;
            onLanded?.();
        };

        if (landsInWater) {
            this.#playFishingAnimation(animations.cast, {
                onFrame: (index) => {
                    if (index >= FISHING_SHEET.splashFrame) land();
                },
                onComplete: () => {
                    land();
                    onComplete?.();
                },
            });
        } else {
            this.#playFishingAnimation(animations.miss, {
                onComplete: () => {
                    land();
                    onComplete?.();
                },
            });
        }

        return facing;
    }

    /** Replays the splash on the float: a fish is biting. */
    public playFishingBite(onComplete?: () => void): void {
        if (!this.#isFishing) return;
        this.#playFishingAnimation(FISHING_ANIMATIONS[this.#fishingFacing].bite, {
            onComplete,
        });
    }

    /** Reels the line in, then returns to normal walking. */
    public reelIn(onComplete?: () => void): void {
        if (!this.#isFishing) {
            onComplete?.();
            return;
        }

        this.#playFishingAnimation(FISHING_ANIMATIONS[this.#fishingFacing].reel, {
            onComplete: () => {
                this.stopFishing();
                onComplete?.();
            },
        });
    }

    /** Leaves fishing mode immediately (no animation). */
    public stopFishing(): void {
        this.#cancelFishingAnimation?.();

        if (!this.#isFishing) return;

        this.#isFishing = false;
        this.#face(this.#fishingFacing);
        this.#playIdle();
    }

    #playFishingAnimation(key: string, handlers: FishingAnimationHandlers): void {
        // Drop listeners of an interrupted animation so they can never fire
        // later (e.g. the next time the same animation completes).
        this.#cancelFishingAnimation?.();

        const onUpdate = (
            animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame
        ) => {
            // AnimationFrame.index is 1-based.
            if (animation.key === key) handlers.onFrame?.(frame.index - 1);
        };

        const onComplete = (animation: Phaser.Animations.Animation) => {
            if (animation.key !== key) return;
            cleanup();
            handlers.onComplete?.();
        };

        const cleanup = () => {
            this.off(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);
            this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
            if (this.#cancelFishingAnimation === cleanup) {
                this.#cancelFishingAnimation = undefined;
            }
        };

        this.on(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
        this.#cancelFishingAnimation = cleanup;

        this.play(key);
    }

    #face(facing: Facing): void {
        if (facing === "left" || facing === "right") {
            this.#direction = "side";
            this.setFlipX(facing === "left");
        } else {
            this.#direction = facing;
            this.setFlipX(false);
        }
    }

    /** Keeps the feet body in place whatever the current frame size is. */
    #syncBodyToFrame(): void {
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (!body) return;

        const offsetX = PLAYER_BODY.offsetX + (this.width - PLAYER_BODY.baseFrameSize) / 2;
        const offsetY = PLAYER_BODY.offsetY + (this.height - PLAYER_BODY.baseFrameSize) / 2;

        if (body.offset.x !== offsetX || body.offset.y !== offsetY) {
            body.setOffset(offsetX, offsetY);
        }
    }

    #updateMovement(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.#inputLocked) {
            body.setVelocity(0);
            return;
        }

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
