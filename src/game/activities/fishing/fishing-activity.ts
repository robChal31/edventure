import Phaser from "phaser";
import { describeCorrectAnswer } from "@/quiz/grading";
import { QuizSession } from "@/quiz/quiz-session";
import type { AnswerValue } from "@/quiz/types";
import { sfx } from "@/game/common/audio/sfx";
import { DEBUG_CONFIG } from "@/game/config/debug-config";
import type { FishingPhase, GameEvent } from "@/game/game-options";
import type { Player } from "@/game/game-objects/player/player";
import type { Point } from "@/game/world/water/water-grid";
import { WaterDebugOverlay } from "@/game/world/water/water-debug";
import { WaterSurface } from "@/game/world/water/water-surface";
import type { Activity, ActivityContext } from "../activity";
import { createFishingTextures } from "./assets/fishing-textures";
import { resolveCast, type CastResult } from "./cast/cast-resolver";
import { FeedbackEffects } from "./effects/feedback-effects";
import { WaterEffects } from "./effects/water-effects";
import { AmbientFishSchool } from "./fish/ambient-fish-school";
import { Fish, fishFootprint, randomFishVariant } from "./fish/fish";
import { planFishApproach, planNibble, type FishApproach } from "./fish/fish-approach";
import { FISHING_CONFIG } from "./fishing-config";
import { FISHING_TEXT, missMessage } from "./fishing-messages";

const { timing } = FISHING_CONFIG;

/**
 * The Fishing activity. One challenge per quiz question:
 *
 *   idle ─F─▶ casting ─(float on water)─▶ waiting ─▶ bite ─▶ answering
 *     ▲          │                          │                   │
 *     │       (miss: sand / pier /          F (reel in)     catching | escaped
 *     │        boat...) reeling ◀───────────┘                   │
 *     └─────────────────────────────────────────────────────────┘ (next question)
 *
 * There are no fishing spots: wherever the student stands, the cast counts
 * if the float lands on a water layer. Fish only ever appear in open water.
 */
export class FishingActivity implements Activity {
    #ctx: ActivityContext;
    #session: QuizSession;
    #surface: WaterSurface;
    #water: WaterEffects;
    #feedback: FeedbackEffects;
    #school?: AmbientFishSchool;
    #debug?: WaterDebugOverlay;
    #footprint = fishFootprint();

    #phase: FishingPhase = "idle";
    #cast: CastResult | null = null;
    #fish: Fish | null = null;
    #timers = new Set<Phaser.Time.TimerEvent>();
    #rippleTimer: Phaser.Time.TimerEvent | null = null;
    #revealPending = false;
    /** Bumped whenever a round is cancelled so stale callbacks do nothing. */
    #round = 0;

    constructor(ctx: ActivityContext) {
        this.#ctx = ctx;
        this.#session = new QuizSession(ctx.quiz);
        this.#surface = new WaterSurface(ctx.worldMap, ctx.mapObjects);
        this.#water = new WaterEffects(ctx.scene);
        this.#feedback = new FeedbackEffects(ctx.scene);
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

    // ─────────────────────────────────────────
    // Activity lifecycle
    // ─────────────────────────────────────────

    public create(): void {
        createFishingTextures(this.scene);

        if (DEBUG_CONFIG.water) {
            this.#debug = new WaterDebugOverlay(this.scene, this.#surface);
        }

        if (!this.#surface.hasOpenWater) {
            console.warn(
                "FishingActivity: no open water found — check the map's water layers."
            );
        }

        this.#school = new AmbientFishSchool(this.scene, this.#surface);

        this.#toIdle();
    }

    public handlePrimaryAction(): void {
        switch (this.#phase) {
            case "idle":
                this.#castLine();
                break;
            case "waiting":
                this.#reelInEarly();
                break;
            default:
                // Busy (casting, biting, answering, ...): ignore.
                break;
        }
    }

    public answer(answer: AnswerValue): void {
        if (this.#phase !== "answering" || this.#revealPending) {
            return;
        }

        const outcome = this.#session.submitAnswer(answer);
        if (!outcome) {
            return;
        }

        this.#revealPending = true;

        this.emit({
            type: "answer",
            correct: outcome.correct,
            question: outcome.question,
            answer: outcome.answer,
            correctAnswer: describeCorrectAnswer(outcome.question),
            caught: this.#session.correctCount,
            answered: this.#session.answeredCount,
            total: this.#session.total,
            feedback: outcome.correct ? FISHING_TEXT.correct : FISHING_TEXT.incorrect,
        });
        // Update the catch count now, but keep showing this question's number
        // until the next challenge starts.
        this.#emitHud(this.#session.answeredCount);

        if (outcome.correct) {
            sfx.correct();
        } else {
            sfx.wrong();
        }

        // Let the student see the reveal on the question card first.
        this.#later(timing.revealDuration, () => {
            this.#revealPending = false;
            if (outcome.correct) {
                this.#catchFish();
            } else {
                this.#loseFish();
            }
        });
    }

    public restart(): void {
        this.#clearRound();

        if (this.player.active) {
            this.player.stopFishing();
            this.player.setInputLocked(false);
        }

        this.#session = new QuizSession(this.#ctx.quiz);
        this.#toIdle();
    }

    public update(): void {
        // Rod, line and float are part of the player's fishing animation;
        // nothing to redraw per frame.
    }

    /** Scene shutdown: the scene destroys game objects itself. */
    public destroy(): void {
        this.#clearRound();
        this.#school?.destroy();
        this.#school = undefined;
        this.#debug?.destroy();
        this.#debug = undefined;
    }

    // ─────────────────────────────────────────
    // Cast
    // ─────────────────────────────────────────

    #castLine(): void {
        const cast = resolveCast(this.player, this.#surface);
        this.#cast = cast;
        this.#debug?.markProbe(cast.point.x, cast.point.y, cast.hit);

        this.#setPhase("casting");
        this.#prompt(null);
        sfx.cast();

        this.player.castLine(
            cast.inWater,
            this.#guard(() => this.#onBaitLanded(cast)),
            this.#guard(() => this.#onCastFinished(cast))
        );
    }

    #onBaitLanded(cast: CastResult): void {
        const { x, y } = cast.point;

        if (cast.inWater) {
            sfx.splash();
            this.#water.ripple(x, y);
            return;
        }

        sfx.thud();
        const sandy = cast.hit.kind === "land" || cast.hit.kind === "shore";
        this.#water.dust(x, y, sandy ? 0xf5deb3 : 0xa1887f);
        this.#prompt(missMessage(cast.hit));
    }

    #onCastFinished(cast: CastResult): void {
        if (cast.inWater) {
            this.#startWaiting(cast);
            return;
        }

        // Missed the water: show the bait on the ground, then reel it back.
        this.#later(timing.missPause, () => this.#reelBack());
    }

    #reelBack(message?: string): void {
        this.#setPhase("reeling");
        sfx.reel();

        this.player.reelIn(
            this.#guard(() => {
                this.#cast = null;
                // Keep the miss explanation on screen instead of the idle hint.
                this.#toIdle(true);
                if (message) this.#prompt(message);
            })
        );
    }

    #reelInEarly(): void {
        const fish = this.#fish;
        this.#fish = null;
        fish?.dive(300, () => fish.destroy());

        this.#clearRound();
        this.#reelBack(FISHING_TEXT.reeledIn);
    }

    // ─────────────────────────────────────────
    // Waiting → bite
    // ─────────────────────────────────────────

    #startWaiting(cast: CastResult): void {
        this.#setPhase("waiting");
        this.#prompt(FISHING_TEXT.waiting);
        this.#startRipples(cast.point);
        this.player.playFishingIdle();

        const plan = planFishApproach(this.#surface, cast.point, this.#footprint);
        const wait = Phaser.Math.Between(timing.waitMin, timing.waitMax);

        this.#later(wait, () => {
            if (plan) {
                this.#approach(cast, plan);
            } else {
                this.#hiddenBite(cast);
            }
        });
    }

    /** A fish shadow swims (through open water only) to the float. */
    #approach(cast: CastResult, plan: FishApproach): void {
        const fish = new Fish(this.scene, plan.start.x, plan.start.y, randomFishVariant());
        fish.setAlpha(0);
        fish.playSwim();
        fish.fadeTo(FISHING_CONFIG.fish.approachAlpha, 300);
        this.#fish = fish;

        fish.swimTo(
            plan.biteAt,
            FISHING_CONFIG.fish.swimSpeed,
            this.#guard(() => {
                const peck = planNibble(this.#surface, plan.biteAt, cast.point, this.#footprint);
                fish.nibble(
                    peck,
                    timing.nibbles,
                    () => this.#water.ripple(cast.point.x, cast.point.y, 6, 400),
                    this.#guard(() => this.#bite(cast))
                );
            })
        );
    }

    /** The float is somewhere too narrow for a visible fish: bubbles only. */
    #hiddenBite(cast: CastResult): void {
        const { x, y } = cast.point;
        this.#water.bubbles(x, y, 3);
        this.#later(700, () => {
            this.#water.bubbles(x, y, 2);
            this.#later(500, () => this.#bite(cast));
        });
    }

    #bite(cast: CastResult): void {
        this.#setPhase("bite");
        this.#stopRipples();
        this.#prompt(null);
        sfx.bite();

        this.player.playFishingBite();
        this.#water.splash(cast.point.x, cast.point.y, 5, 10);
        this.#feedback.exclaim(this.player.x, this.player.y - 24);

        this.#later(timing.biteToQuestion, () => this.#askQuestion());
    }

    #askQuestion(): void {
        const question = this.#session.currentQuestion;
        if (!question) {
            this.#complete();
            return;
        }

        this.#setPhase("answering");
        this.emit({
            type: "question",
            questionNumber: this.#session.currentNumber,
            total: this.#session.total,
            question,
        });
    }

    // ─────────────────────────────────────────
    // Outcome
    // ─────────────────────────────────────────

    #catchFish(): void {
        const cast = this.#cast;
        if (!cast) {
            this.#afterResolve();
            return;
        }

        this.#setPhase("catching");
        sfx.splash();

        // A hidden fish jumps out right at the float (which is on water).
        const fish = this.#fish ?? this.#emergeFish(cast.point);
        this.#fish = fish;

        this.#water.splash(fish.x, fish.y, 7, 14);
        this.#water.ripple(fish.x, fish.y, 14, 800);
        this.#showCatch(true);

        fish.playSwim();
        fish.leapTo(
            { x: this.player.x, y: this.player.y - 18 },
            timing.catchDuration,
            this.#guard(() => {
                this.#feedback.sparkles(this.player.x, this.player.y - 12);
                this.#feedback.popup("+1", this.player.x, this.player.y - 28, "#4ade80");
                fish.destroy();
                this.#fish = null;
                this.#afterResolve();
            })
        );
    }

    #loseFish(): void {
        const cast = this.#cast;
        this.#setPhase("escaped");
        sfx.escape();

        if (cast) {
            this.#water.splash(cast.point.x, cast.point.y, 4, 8);
        }
        this.#showCatch(false);

        const fish = this.#fish;
        const finish = this.#guard(() => {
            fish?.destroy();
            this.#fish = null;
            this.#feedback.popup(FISHING_TEXT.gotAway, this.player.x, this.player.y - 28, "#f87171");
            this.#afterResolve();
        });

        if (!fish) {
            if (cast) this.#water.bubbles(cast.point.x, cast.point.y, 4);
            this.#later(timing.escapeDuration, finish);
            return;
        }

        // Escapes under the water, along a path that stays in open water.
        const away = this.#surface.randomReachablePoint(
            { x: fish.x, y: fish.y },
            this.#footprint,
            40,
            100
        );

        if (away) {
            fish.dartAway(away, timing.escapeDuration, finish);
        } else {
            fish.dive(timing.escapeDuration, finish);
        }
    }

    /** Shows the result on the player (fish or empty hook), then reels in. */
    #showCatch(success: boolean): void {
        this.player.showCatch(success, () => this.player.reelIn());
    }

    #emergeFish(point: Point): Fish {
        const fish = new Fish(this.scene, point.x, point.y, randomFishVariant());
        fish.setAlpha(1);
        return fish;
    }

    #afterResolve(): void {
        this.#cast = null;

        if (this.#session.isComplete) {
            this.#later(400, () => this.#complete());
            return;
        }

        this.#later(timing.betweenChallenges, () => this.#toIdle());
    }

    #complete(): void {
        this.#setPhase("complete");
        sfx.complete();
        this.player.setInputLocked(true);
        this.emit({ type: "complete", summary: this.#session.summary() });
    }

    // ─────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────

    #toIdle(silent = false): void {
        this.#emitHud();
        this.#setPhase("idle");
        if (!silent) {
            this.#prompt(
                FISHING_TEXT.idle(this.#session.currentNumber, this.#session.total)
            );
        }
    }

    #setPhase(phase: FishingPhase): void {
        this.#phase = phase;
        this.emit({ type: "phase", phase });
    }

    #prompt(message: string | null): void {
        this.emit({ type: "prompt", message });
    }

    #emitHud(questionNumber: number = this.#session.currentNumber): void {
        this.emit({
            type: "hud",
            caught: this.#session.correctCount,
            answered: this.#session.answeredCount,
            total: this.#session.total,
            questionNumber,
        });
    }

    #startRipples(point: Point): void {
        this.#stopRipples();
        this.#rippleTimer = this.scene.time.addEvent({
            delay: timing.rippleEvery,
            loop: true,
            callback: () => this.#water.ripple(point.x, point.y, 9, 900),
        });
    }

    #stopRipples(): void {
        this.#rippleTimer?.remove(false);
        this.#rippleTimer = null;
    }

    /** Runs `callback` after `delay` ms unless the round was cancelled. */
    #later(delay: number, callback: () => void): void {
        const round = this.#round;
        const timer = this.scene.time.delayedCall(delay, () => {
            this.#timers.delete(timer);
            if (round === this.#round) callback();
        });
        this.#timers.add(timer);
    }

    /** Wraps a callback so it is ignored once the round was cancelled. */
    #guard(callback: () => void): () => void {
        const round = this.#round;
        return () => {
            if (round === this.#round) callback();
        };
    }

    /** Cancels everything in flight for the current challenge. */
    #clearRound(): void {
        this.#round += 1;
        this.#timers.forEach((timer) => timer.remove(false));
        this.#timers.clear();
        this.#stopRipples();
        this.#fish?.destroy();
        this.#fish = null;
        this.#cast = null;
        this.#revealPending = false;
    }
}
