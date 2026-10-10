import Phaser from "phaser";
import { Player } from "@/game/game-objects/player/player";
import { QuizSession } from "@/quiz/quiz-session";
import type { Quiz } from "@/quiz/types";
import type {
    FishingPhase,
    GameEvent,
    VirtualDirection,
} from "@/game/game-options";
import { sfx } from "@/game/common/audio/sfx";
import { FISHING_CONFIG } from "./fishing-config";
import { FishingSpot } from "./fishing-spot";
import { Fish, AmbientFishSchool } from "./fish";
import {
    FISHING_TEXTURE_KEYS,
    createFishingTextures,
} from "./assets/fishing-textures";

export type FishingActivityContext = {
    scene: Phaser.Scene;
    player: Player;
    waterPoints: { x: number; y: number }[];
    quiz: Quiz;
    emit: (event: GameEvent) => void;
};

/**
 * The Fishing activity. Orchestrates the full loop:
 *   move to spot -> cast -> wait -> bite -> answer -> catch/escape -> next.
 * Exactly one challenge is run per quiz question.
 */
export class FishingActivity {
    #ctx: FishingActivityContext;
    #session: QuizSession;
    #phase: FishingPhase = "idle";
    #spot!: FishingSpot;
    #school?: AmbientFishSchool;

    #lineGraphics!: Phaser.GameObjects.Graphics;
    #bobber?: Phaser.GameObjects.Sprite;
    #bobberOut = false;
    #currentFish?: Fish;
    #rippleEvent?: Phaser.Time.TimerEvent;

    constructor(ctx: FishingActivityContext) {
        this.#ctx = ctx;
        this.#session = new QuizSession(ctx.quiz);
    }

    private get scene(): Phaser.Scene {
        return this.#ctx.scene;
    }
    private get player(): Player {
        return this.#ctx.player;
    }
    private emit(event: GameEvent): void {
        this.#ctx.emit(event);
    }

    public get phase(): FishingPhase {
        return this.#phase;
    }

    public create(): void {
        createFishingTextures(this.scene);

        this.#lineGraphics = this.scene.add.graphics();
        this.#lineGraphics.setDepth(8000);

        this.#spot = new FishingSpot(
            this.scene,
            FISHING_CONFIG.spot.anchor
        );

        this.#school = new AmbientFishSchool(
            this.scene,
            this.#ctx.waterPoints
        );

        this.#emitHud();
        this.#setPhase("idle");
        this.#promptIdle();
    }

    // ─────────────────────────────────────────
    // Public control surface
    // ─────────────────────────────────────────

    public onPlayerInteract(): void {
        this.attemptCast();
    }

    public setVirtualDirection(dir: VirtualDirection, pressed: boolean): void {
        // Handled by the input component; no-op here for API symmetry.
        void dir;
        void pressed;
    }

    public attemptCast(): void {
        if (this.#phase !== "idle") {
            return;
        }

        if (!this.#spot.isPlayerInRange(this.player)) {
            this.emit({
                type: "prompt",
                message: "Walk to the glowing spot by the river to fish!",
            });
            return;
        }

        this.#beginCast();
    }

    public answer(optionIndex: number): void {
        if (this.#phase !== "answering") {
            return;
        }

        const outcome = this.#session.submitAnswer(optionIndex);
        if (!outcome) {
            return;
        }

        const feedback = outcome.correct
            ? "Correct! You caught a fish!"
            : `Not quite. The fish got away!`;

        this.emit({
            type: "answer",
            correct: outcome.correct,
            selectedIndex: outcome.selectedIndex,
            correctIndex: outcome.question.correctIndex,
            question: outcome.question,
            caught: this.#session.correctCount,
            answered: this.#session.answeredCount,
            total: this.#session.total,
            feedback,
        });

        this.#emitHud();

        if (outcome.correct) {
            sfx.correct();
            this.#doCatch();
        } else {
            sfx.wrong();
            this.#doEscape();
        }
    }

    public restart(): void {
        this.#clearVisuals();
        this.#session = new QuizSession(this.#ctx.quiz);
        this.#emitHud();
        this.#setPhase("idle");
        this.#promptIdle();
    }

    public destroy(): void {
        this.#clearVisuals();
        this.#school?.destroy();
        this.#spot?.destroy();
        this.#lineGraphics?.destroy();
        this.player.setInputLocked(false);
    }

    // ─────────────────────────────────────────
    // Update loop (rod + line + spot highlight)
    // ─────────────────────────────────────────

    public update(): void {
        const inRange = this.#spot.isPlayerInRange(this.player);
        this.#spot.setHighlighted(this.#phase === "idle" && inRange);

        this.#lineGraphics.clear();
        if (this.#bobberOut && this.#bobber) {
            this.#drawLine();
        }
    }

    // ─────────────────────────────────────────
    // Loop stages
    // ─────────────────────────────────────────

    #promptIdle(): void {
        this.player.setInputLocked(false);
        this.emit({
            type: "prompt",
            message: `Question ${this.#session.currentNumber} of ${this.#session.total} — stand at the glowing spot and press SPACE / tap CAST.`,
        });
    }

    #beginCast(): void {
        this.#setPhase("casting");
        this.emit({ type: "prompt", message: null });
        sfx.cast();

        this.player.playCast(() => {
            this.#launchBobber();
        });
    }

    #launchBobber(): void {
        const target = {
            x:
                FISHING_CONFIG.spot.castTarget.x +
                Phaser.Math.Between(
                    -FISHING_CONFIG.spot.castJitter.x,
                    FISHING_CONFIG.spot.castJitter.x
                ),
            y:
                FISHING_CONFIG.spot.castTarget.y +
                Phaser.Math.Between(
                    -FISHING_CONFIG.spot.castJitter.y,
                    FISHING_CONFIG.spot.castJitter.y
                ),
        };

        this.#bobber = this.scene.add.sprite(
            this.player.x,
            this.player.y - 10,
            FISHING_TEXTURE_KEYS.BOBBER
        );
        this.#bobber.setDepth(8500);
        this.#bobberOut = true;

        const from = { x: this.#bobber.x, y: this.#bobber.y };
        const peak = Math.min(from.y, target.y) - 40;
        const proxy = { t: 0 };

        this.scene.tweens.add({
            targets: proxy,
            t: 1,
            duration: FISHING_CONFIG.timing.castFly,
            ease: "Sine.out",
            onUpdate: () => {
                const t = proxy.t;
                const x = Phaser.Math.Linear(from.x, target.x, t);
                const y =
                    (1 - t) * (1 - t) * from.y +
                    2 * (1 - t) * t * peak +
                    t * t * target.y;
                this.#bobber?.setPosition(x, y);
            },
            onComplete: () => {
                sfx.splash();
                this.#spawnSplash(target.x, target.y);
                this.#startWaiting();
            },
        });
    }

    #startWaiting(): void {
        this.#setPhase("waiting");

        // Gentle bobbing.
        if (this.#bobber) {
            this.scene.tweens.add({
                targets: this.#bobber,
                y: this.#bobber.y + 2,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.inOut",
            });
        }

        // Periodic ripples.
        this.#rippleEvent = this.scene.time.addEvent({
            delay: 700,
            loop: true,
            callback: () => {
                if (this.#bobber) {
                    this.#spawnRipple(this.#bobber.x, this.#bobber.y + 4);
                }
            },
        });

        // A fish shadow approaches the bobber.
        this.#currentFish = new Fish(
            this.scene,
            this.#bobber!.x + Phaser.Math.Between(-60, 60),
            this.#bobber!.y + Phaser.Math.Between(20, 40),
            Phaser.Math.Between(0, 3)
        );
        this.#currentFish.setAlpha(0.45);
        this.#currentFish.setDepth(4);
        this.#currentFish.playSwim();

        const wait = Phaser.Math.Between(
            FISHING_CONFIG.timing.waitMin,
            FISHING_CONFIG.timing.waitMax
        );

        this.scene.time.addEvent({
            delay: wait,
            callback: () => {
                if (this.#phase !== "waiting") return;
                this.#currentFish?.glideTo(
                    this.#bobber!.x,
                    this.#bobber!.y + 4,
                    400,
                    () => this.#bite()
                );
            },
        });
    }

    #bite(): void {
        this.#setPhase("bite");
        sfx.bite();

        if (this.#bobber) {
            // Dip the bobber.
            this.scene.tweens.add({
                targets: this.#bobber,
                y: this.#bobber.y + 4,
                duration: 120,
                yoyo: true,
                repeat: 2,
            });
            this.#spawnSplash(this.#bobber.x, this.#bobber.y);
            this.#showExclaim(this.#bobber.x, this.#bobber.y - 18);
        }

        this.scene.time.addEvent({
            delay: FISHING_CONFIG.timing.biteToQuestion,
            callback: () => this.#showQuestion(),
        });
    }

    #showQuestion(): void {
        this.#setPhase("answering");
        this.player.setInputLocked(true);

        const question = this.#session.currentQuestion;
        if (!question) {
            this.#complete();
            return;
        }

        this.emit({
            type: "question",
            questionNumber: this.#session.currentNumber,
            total: this.#session.total,
            question,
        });
    }

    #doCatch(): void {
        this.#setPhase("catching");
        this.#stopRipples();
        this.#clearBobber();

        const fish = this.#currentFish;
        if (!fish) {
            this.#afterResolve();
            return;
        }

        fish.setAlpha(1);
        fish.setDepth(9000);
        fish.playSwim();

        if (this.#bobber) {
            this.#spawnSplash(this.#bobber.x, this.#bobber.y);
        }

        fish.leapToPlayer(this.player, FISHING_CONFIG.timing.catchDuration, () => {
            this.#spawnSparkles(this.player.x, this.player.y - 12);
            this.#popup("+1", this.player.x, this.player.y - 26, "#4ade80");
            fish.destroy();
            this.#currentFish = undefined;
            this.#afterResolve();
        });
    }

    #doEscape(): void {
        this.#setPhase("escaped");
        this.#stopRipples();
        sfx.escape();

        const fish = this.#currentFish;
        if (!fish) {
            this.#clearBobber();
            this.#afterResolve();
            return;
        }

        if (this.#bobber) {
            this.#spawnSplash(this.#bobber.x, this.#bobber.y);
        }
        this.#clearBobber();

        fish.setAlpha(1);
        fish.setDepth(9000);
        fish.playSwim();

        fish.escapeAway(
            fish.x + Phaser.Math.Between(-90, 90),
            fish.y + 60,
            FISHING_CONFIG.timing.escapeDuration,
            () => {
                this.#popup("It got away!", this.player.x, this.player.y - 26, "#f87171");
                fish.destroy();
                this.#currentFish = undefined;
                this.#afterResolve();
            }
        );
    }

    #afterResolve(): void {
        if (this.#session.isComplete) {
            this.scene.time.addEvent({
                delay: 400,
                callback: () => this.#complete(),
            });
            return;
        }

        this.scene.time.addEvent({
            delay: FISHING_CONFIG.timing.betweenChallenges,
            callback: () => {
                this.#setPhase("idle");
                this.#promptIdle();
            },
        });
    }

    #complete(): void {
        this.#setPhase("complete");
        sfx.complete();
        this.player.setInputLocked(false);
        this.emit({ type: "complete", summary: this.#session.summary() });
    }

    // ─────────────────────────────────────────
    // Visual helpers
    // ─────────────────────────────────────────

    #setPhase(phase: FishingPhase): void {
        this.#phase = phase;
        this.emit({ type: "phase", phase });
    }

    #emitHud(): void {
        this.emit({
            type: "hud",
            caught: this.#session.correctCount,
            answered: this.#session.answeredCount,
            total: this.#session.total,
            questionNumber: this.#session.currentNumber,
        });
    }

    #drawLine(): void {
        if (!this.#bobber) return;

        const handX = this.player.x + 6;
        const handY = this.player.y - 8;

        // Rod (short thick segment toward the bobber).
        const angle = Math.atan2(
            this.#bobber.y - handY,
            this.#bobber.x - handX
        );
        const rodLen = 14;
        const tipX = handX + Math.cos(angle) * rodLen;
        const tipY = handY + Math.sin(angle) * rodLen;

        this.#lineGraphics.lineStyle(2, 0x8b5a2b, 1);
        this.#lineGraphics.beginPath();
        this.#lineGraphics.moveTo(handX, handY);
        this.#lineGraphics.lineTo(tipX, tipY);
        this.#lineGraphics.strokePath();

        // Line (thin, slight sag) — sample a quadratic bezier.
        const midX = (tipX + this.#bobber.x) / 2;
        const midY = (tipY + this.#bobber.y) / 2 + 8;

        this.#lineGraphics.lineStyle(1, 0xffffff, 0.6);
        this.#lineGraphics.beginPath();
        this.#lineGraphics.moveTo(tipX, tipY);
        for (let i = 1; i <= 10; i++) {
            const t = i / 10;
            const x =
                (1 - t) * (1 - t) * tipX +
                2 * (1 - t) * t * midX +
                t * t * this.#bobber.x;
            const y =
                (1 - t) * (1 - t) * tipY +
                2 * (1 - t) * t * midY +
                t * t * this.#bobber.y;
            this.#lineGraphics.lineTo(x, y);
        }
        this.#lineGraphics.strokePath();
    }

    #spawnRipple(x: number, y: number): void {
        const ripple = this.scene.add.circle(x, y, 2, 0xffffff, 0);
        ripple.setStrokeStyle(1, 0xe0f2fe, 0.7);
        ripple.setDepth(8400);
        this.scene.tweens.add({
            targets: ripple,
            radius: 12,
            alpha: 0,
            duration: 700,
            onComplete: () => ripple.destroy(),
        });
    }

    #spawnSplash(x: number, y: number): void {
        for (let i = 0; i < 6; i++) {
            const drop = this.scene.add.sprite(
                x,
                y,
                FISHING_TEXTURE_KEYS.SPLASH
            );
            drop.setDepth(9200);
            const dx = Phaser.Math.Between(-14, 14);
            const dy = -Phaser.Math.Between(8, 22);
            this.scene.tweens.add({
                targets: drop,
                x: x + dx,
                y: y + dy,
                alpha: 0,
                duration: 450,
                ease: "Quad.out",
                onComplete: () => drop.destroy(),
            });
        }
    }

    #spawnSparkles(x: number, y: number): void {
        for (let i = 0; i < 6; i++) {
            const spark = this.scene.add.sprite(
                x + Phaser.Math.Between(-16, 16),
                y + Phaser.Math.Between(-16, 8),
                FISHING_TEXTURE_KEYS.SPARKLE
            );
            spark.setDepth(9600);
            this.scene.tweens.add({
                targets: spark,
                y: spark.y - 12,
                alpha: 0,
                scale: 0.4,
                duration: 600,
                delay: i * 60,
                onComplete: () => spark.destroy(),
            });
        }
    }

    #showExclaim(x: number, y: number): void {
        const ex = this.scene.add.sprite(x, y, FISHING_TEXTURE_KEYS.EXCLAIM);
        ex.setDepth(9500);
        ex.setScale(0);
        this.scene.tweens.add({
            targets: ex,
            scale: 1.4,
            duration: 150,
            ease: "Back.out",
            onComplete: () => {
                this.scene.time.addEvent({
                    delay: 500,
                    callback: () => {
                        this.scene.tweens.add({
                            targets: ex,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => ex.destroy(),
                        });
                    },
                });
            },
        });
    }

    #popup(text: string, x: number, y: number, color: string): void {
        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "10px",
            color,
            stroke: "#000000",
            strokeThickness: 3,
        });
        label.setOrigin(0.5);
        label.setDepth(10000);
        this.scene.tweens.add({
            targets: label,
            y: y - 22,
            alpha: 0,
            duration: 900,
            onComplete: () => label.destroy(),
        });
    }

    #stopRipples(): void {
        this.#rippleEvent?.remove(false);
        this.#rippleEvent = undefined;
    }

    #clearBobber(): void {
        this.#bobberOut = false;
        this.#bobber?.destroy();
        this.#bobber = undefined;
        this.#lineGraphics.clear();
    }

    #clearVisuals(): void {
        this.#stopRipples();
        this.#clearBobber();
        this.#currentFish?.destroy();
        this.#currentFish = undefined;
    }
}
