// game-objects/player/player.ts
import { PLAYER_ANIMATION_KEYS, type FishingStateKey } from "@/game/common/assets";
import { Facing, PlayerDirection, Position } from "@/game/common/types";
import { KeyboardComponent } from "@/game/components/input/keyboard-component";
import Phaser from "phaser";
import {
    FISHING_SHEET,
    fishingAnimationKey,
    fishingFlipX,
} from "./player-fishing-animations";

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
    /** The equipment router, not the player/input, chooses an action. */
    onPrimaryAction?: () => void;
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
    #onPrimaryAction?: () => void;
    #controlsPaused = false;
    #cancelAxeAnimation?: () => void;

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
        this.#onPrimaryAction = config.onPrimaryAction

        this.#face(config.facing ?? "down");
        this.#playIdle();

        config.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        config.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            config.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
            this.#cancelFishingAnimation?.();
            this.#cancelAxeAnimation?.();
        })
    }

    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.#syncBodyToFrame();
    }

    update(): void {
        // Consume even blocked presses so answers/overlays never queue a later tool use.
        const pressed = this.#controls.isPrimaryActionJustDown;
        if (pressed && !this.#isAxeActionPlaying && !this.#inputLocked && !this.#controlsPaused) {
            this.#onPrimaryAction?.();
        }
        if (this.#controlsPaused) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        if (this.#isAxeActionPlaying || this.#isFishing) {
            return;
        }

        this.#updateMovement();

        if (this.#inputLocked || this.#controlsPaused) {
            this.#playIdle();
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

    public swingAxe(onHit: () => void): void {
        if (this.isActionBusy || this.#inputLocked || this.#controlsPaused) return;

        this.#isAxeActionPlaying = true;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);

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

        const finish = (animation: Phaser.Animations.Animation) => {
            if (animation.key !== animationKey) return;
            this.#cancelAxeAnimation?.();
            this.#isAxeActionPlaying = false;
            this.#playIdleAxe();
        };
        this.#cancelAxeAnimation = () => {
            this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
            this.#cancelAxeAnimation = undefined;
        };
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
        this.play(animationKey);
        onHit();
    }

    public get isActionBusy(): boolean { return this.#isAxeActionPlaying || this.#isFishing; }
    public get isInputLocked(): boolean { return this.#inputLocked; }

    public setControlsPaused(paused: boolean): void {
        this.#controlsPaused = paused;
        if (paused) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    }

    public wearAxe(wearing: boolean): void {
        this.#isWearingAxe = wearing;
        if (!this.isActionBusy) {
            if (wearing) this.#playIdleAxe();
            else this.#playIdle();
        }
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
    //
    // The fishing states (cast, idle, hooked, roll, captured) are played from
    // the sheets in animations/player/fishing; see player-fishing-animations.ts.
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
     * @param landsInWater true → the full cast ending with the float in the
     *   water; false → the cast stops before the splash (the bait hit sand,
     *   a bridge, ...).
     * @param onLanded the bait touches down (splash frame / end of throw).
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

        let landed = false;
        const land = () => {
            if (landed) return;
            landed = true;
            onLanded?.();
        };

        if (landsInWater) {
            this.#playFishingAnimation("cast", facing, {
                onFrame: (index) => {
                    if (index >= FISHING_SHEET.splashFrame) land();
                },
                onComplete: () => {
                    land();
                    onComplete?.();
                },
            });
        } else {
            this.#playFishingAnimation("castMiss", facing, {
                onComplete: () => {
                    land();
                    onComplete?.();
                },
            });
        }

        return facing;
    }

    /** The float rests on the water while the fish is not biting yet. */
    public playFishingIdle(): void {
        if (!this.#isFishing) return;
        this.#playFishingAnimation("idle", this.#fishingFacing, {}, true);
    }

    /** A fish bites: the float bobs with the hook until the question ends. */
    public playFishingBite(): void {
        if (!this.#isFishing) return;
        this.#playFishingAnimation("hooked", this.#fishingFacing, {}, true);
    }

    /**
     * The result of the question: the caught fish (or an empty hook) is
     * shown, then the line is reeled in.
     */
    public showCatch(success: boolean, onComplete?: () => void): void {
        if (!this.#isFishing) {
            onComplete?.();
            return;
        }

        this.#playFishingAnimation(
            success ? "capturedFish" : "capturedNoFish",
            this.#fishingFacing,
            { onComplete }
        );
    }

    /** Reels the line in, then returns to normal walking. */
    public reelIn(onComplete?: () => void): void {
        if (!this.#isFishing) {
            onComplete?.();
            return;
        }

        this.#playFishingAnimation("roll", this.#fishingFacing, {
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

    #playFishingAnimation(
        state: FishingStateKey,
        facing: Facing,
        handlers: FishingAnimationHandlers,
        loop = false
    ): void {
        // Drop listeners of an interrupted animation so they can never fire
        // later (e.g. the next time the same animation completes).
        this.#cancelFishingAnimation?.();

        const key = fishingAnimationKey(state, facing);

        // A missing animation must never leave the player stuck in fishing
        // mode (no completion event would ever fire): skip straight ahead.
        if (!this.scene.anims.exists(key)) {
            console.warn(`Fishing animation missing: ${key}`);
            this.#cancelFishingAnimation = undefined;
            this.scene.time.delayedCall(0, () => handlers.onComplete?.());
            return;
        }

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

        this.setFlipX(fishingFlipX(facing));
        this.play({ key, repeat: loop ? -1 : 0 });
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

        if (this.#inputLocked || this.#controlsPaused) {
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
