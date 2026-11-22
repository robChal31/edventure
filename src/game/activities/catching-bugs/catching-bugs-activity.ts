import Phaser from "phaser";
import { CORRECT_REVEAL_MS, WORLD_REWARD_MS } from "@/quiz/reward-feedback";
import { describeCorrectAnswer } from "@/quiz/grading";
import type { AnswerValue } from "@/quiz/types";
import { ASSET_KEYS } from "@/game/common/assets";
import { sfx } from "@/game/common/audio/sfx";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { WORLD_CONFIG } from "@/game/config/world-config";
import type { CatchingBugsPhase } from "@/game/game-options";
import type { PreparedAction } from "@/game/equipment/targeting";
import type { Activity, ActivityContext } from "../activity";
import { CRICKET_MOVE } from "./catching-bugs-assets";
import { CatchingBugsSession, type BugAnswerOutcome } from "./catching-bugs-session";
import { CapturePopups } from "../capture-popup";
import { CatchingNet } from "./catching-net";
import { QuestionCloseGate } from "./question-close-gate";
import {
    CRICKET_RADIUS, CATCH_RANGE, moveCricket, nearestCricket, readCricketField, releaseCricket, spawnCrickets,
    type CricketField, type CricketMotion,
} from "./cricket-motion";

type Cricket = {
    questionIndex: number;
    motion: CricketMotion;
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.Text;
    footprint: Phaser.GameObjects.Rectangle;
    shadow: Phaser.GameObjects.Ellipse;
    state: "idle" | "question" | "released" | "captured";
};

/** One stationary animated cricket per question, scattered in fixed-size rounds. */
export class CatchingBugsActivity implements Activity {
    #session: CatchingBugsSession;
    #field: CricketField;
    #net: CatchingNet;
    #popups: CapturePopups;
    #bodies: Phaser.Physics.Arcade.StaticGroup;
    #collider: Phaser.Physics.Arcade.Collider;
    #crickets: Cricket[] = [];
    #resolving = new Set<Cricket>();
    #target: Cricket | null = null;
    #phase: CatchingBugsPhase = "idle";
    #revealPending = false;
    #timers = new Set<Phaser.Time.TimerEvent>();
    #tweens = new Set<Phaser.Tweens.Tween>();
    #closeGate = new QuestionCloseGate();
    #generation = 0;
    #destroyed = false;
    #spawn: { x: number; y: number };

    constructor(private ctx: ActivityContext) {
        this.#session = new CatchingBugsSession(ctx.quiz, undefined, ctx.progress);
        this.#field = readCricketField(ctx.worldMap.map.getObjectLayer("catching_bugs")?.objects ?? [], WORLD_CONFIG.scale);
        this.#net = new CatchingNet(ctx.scene);
        this.#popups = new CapturePopups(ctx.scene);
        this.#bodies = ctx.scene.physics.add.staticGroup();
        this.#collider = ctx.scene.physics.add.collider(ctx.player, this.#bodies);
        this.#spawn = { x: ctx.player.x, y: ctx.player.y };
    }

    create(): void {
        if (this.#session.quiz.isComplete) {
            this.#emitHud();
            this.#complete();
        } else this.#spawnRound();
    }

    snapshot() { return this.#session.snapshot(); }

    preparePrimaryAction(): PreparedAction {
        const cricket = this.#phase === "idle"
            ? nearestCricket(this.#playerFeet(), this.#crickets.filter((bug) => bug.state === "idle"), CATCH_RANGE * 1.6) : null;
        const feet = this.#playerFeet();
        const inReach = cricket !== null && Math.hypot(feet.x - cricket.motion.x, feet.y - cricket.motion.y) <= CATCH_RANGE;
        return {
            target: cricket ? {
                id: cricket.sprite.name, kind: "object", status: inReach ? "valid" : "candidate",
                bounds: { x: cricket.motion.x - 8, y: cricket.motion.y - 6, width: 16, height: 12 },
            } : null,
            execute: () => this.#catch(inReach ? cricket : null),
        };
    }

    handlePrimaryAction(): void { this.preparePrimaryAction().execute(); }

    #catch(target: Cricket | null): void {
        if (this.#destroyed || this.#phase !== "idle") return;
        if (!target || target.state !== "idle" || !target.sprite.active || !this.#crickets.includes(target)) {
            this.#prompt("Equip the net, approach a cricket marked ?, then press F / Space or CATCH.");
            return;
        }
        this.#target = target;
        target.state = "question";
        target.label.setVisible(false);
        this.#revealPending = false;
        this.ctx.player.setInputLocked(true);
        this.#setPhase("netting");
        this.#prompt(null);
        const generation = this.#generation;
        this.#net.swing(this.ctx.player, target.motion, () => {
            if (generation !== this.#generation || this.#destroyed) return;
            this.#setPhase("answering");
            this.#emitHud(target.questionIndex + 1);
            this.ctx.emit({
                type: "question", question: this.ctx.quiz.questions[target.questionIndex],
                questionNumber: target.questionIndex + 1, total: this.#session.quiz.total,
            });
        });
    }

    answer(answer: AnswerValue): void {
        if (this.#destroyed || this.#phase !== "answering" || this.#revealPending || !this.#target) return;
        const target = this.#target;
        const outcome = this.#session.answer(target.questionIndex, answer);
        if (!outcome) return;
        this.#revealPending = true;
        this.ctx.emit({
            type: "answer", correct: outcome.correct, question: outcome.question, answer: outcome.answer,
            correctAnswer: describeCorrectAnswer(outcome.question), caught: this.#session.quiz.correctCount,
            answered: this.#session.quiz.answeredCount, total: this.#session.quiz.total, retryable: outcome.retryable,
            feedback: outcome.correct ? "Cricket caught!" : outcome.retryable ? "Cricket escaped — try again!" : "Cricket escaped and counts as a miss.",
        });
        this.#emitHud(target.questionIndex + 1);
        // Feedback can be read first; world effects MUST await the UI's unmount receipt.
        this.#later(outcome.correct ? CORRECT_REVEAL_MS : 2800, () => {
            const requestId = this.#closeGate.request(() => this.#resolve(target, outcome));
            this.#setPhase("closing-question");
            this.ctx.emit({ type: "question:close", requestId });
        });
    }

    questionClosed(requestId: number): void {
        if (!this.#destroyed && this.#phase === "closing-question") this.#closeGate.acknowledge(requestId);
    }

    restart(): void {
        this.#clearRun();
        this.#destroyed = false;
        this.#session = new CatchingBugsSession(this.ctx.quiz);
        (this.ctx.player.body as Phaser.Physics.Arcade.Body).reset(this.#spawn.x, this.#spawn.y);
        this.ctx.player.setInputLocked(false);
        this.create();
    }

    update(time: number, delta: number): void {
        if (this.#destroyed || this.#phase === "complete") return;
        for (const cricket of this.#crickets) {
            moveCricket(cricket.motion, this.#field, delta);
            const { x, y, vx } = cricket.motion;
            cricket.sprite.setPosition(x, y).setDepth(y + CRICKET_RADIUS);
            cricket.footprint.setPosition(x - 6, y);
            (cricket.footprint.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            cricket.shadow.setPosition(x, y + 3);
            if (vx !== 0) cricket.sprite.setFlipX(vx < 0);
            // Only the playful question mark bobs. Idle cricket coordinates never change.
            cricket.label.setPosition(x, y - 13 + Math.sin(time / 260 + cricket.questionIndex) * 1.5);
        }
    }

    destroy(): void {
        if (this.#destroyed) return;
        this.#destroyed = true; this.#clearRun();
        this.#collider.destroy(); this.#bodies.destroy(true);
    }

    #spawnRound(): void {
        const indices = this.#session.questionIndices;
        const motions = spawnCrickets(this.#field, indices.length);
        this.#crickets = indices.map((questionIndex, index): Cricket => {
            const motion = motions[index];
            const sprite = this.ctx.scene.add.sprite(motion.x, motion.y, ASSET_KEYS.CRICKET, "0")
                .setName(`cricket-${questionIndex}`).setScale(WORLD_CONFIG.scale)
                .setDepth(motion.y + CRICKET_RADIUS).play(CRICKET_MOVE);
            sprite.anims.timeScale = 0.85 + Math.random() * 0.3;
            const label = this.ctx.scene.add.text(motion.x, motion.y - 13, "?", {
                fontFamily: '"Press Start 2P"', fontSize: "8px", color: "#fff3b0",
                stroke: "#173b25", strokeThickness: 3,
            }).setName("cricket-question-mark").setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI);
            // Small feet collider: it stops walking through a cricket without blocking net reach (28px).
            const footprint = this.ctx.scene.add.rectangle(motion.x - 6, motion.y, 12, 7).setOrigin(0, 0)
                .setName(`cricket-feet-${questionIndex}`).setVisible(false);
            this.#bodies.add(footprint);
            const shadow = this.ctx.scene.add.ellipse(motion.x, motion.y + 3, 14, 5, 0x304b45, 0.2)
                .setName("cricket-contact-shadow").setDepth(DEPTH_CONFIG.SHADOW);
            return { questionIndex, motion, sprite, label, footprint, shadow, state: "idle" };
        });
        this.#toIdle(`Round ${this.#session.roundNumber}/${this.#session.roundCount} · ${indices.length} crickets. Find ? and use the net!`);
    }

    #resolve(target: Cricket, outcome: BugAnswerOutcome): void {
        this.#target = null;
        this.#setPhase(outcome.correct ? "catching" : "escaped");
        target.label.setVisible(false);
        if (outcome.correct) {
            sfx.capture();
            this.#prompt("Got it! The cricket is in the net!");
            target.state = "captured";
            (target.footprint.body as Phaser.Physics.Arcade.StaticBody).enable = false;
            target.footprint.destroy(); target.shadow.destroy();
            this.#popups.show(this.ctx.player.x, this.ctx.player.y - 25);
            this.#crickets = this.#crickets.filter((cricket) => cricket !== target);
            this.#resolving.add(target);
            target.sprite.setDepth(DEPTH_CONFIG.AIRBORNE);
            const start = { x: target.sprite.x, y: target.sprite.y };
            const end = { x: this.ctx.player.x, y: this.ctx.player.y - 10 };
            const flight = { progress: 0 };
            this.#net.swing(this.ctx.player, start, () => {});
            this.#animate({
                targets: flight, progress: 1, duration: 850, ease: "Sine.easeInOut",
                onUpdate: () => {
                    const t = flight.progress;
                    target.sprite.setPosition(Phaser.Math.Linear(start.x, end.x, t), Phaser.Math.Linear(start.y, end.y, t) - Math.sin(t * Math.PI) * 16)
                        .setScale(WORLD_CONFIG.scale * (1 + Math.sin(t * Math.PI) * 0.35)).setAlpha(1 - t * t * t);
                },
            });
            this.#later(WORLD_REWARD_MS, () => this.#finishTarget(target, outcome));
        } else {
            sfx.wrong();
            target.state = "released";
            releaseCricket(target.motion, this.#field, this.#playerFeet());
            if (!outcome.retryable) {
                // A brief dart first, then a smooth fade; no teleport or instant removal.
                this.#animate({ targets: target.sprite, alpha: 0, delay: 200, duration: 950, ease: "Sine.easeIn" });
            }
            this.#later(1200, () => this.#finishTarget(target, outcome));
        }
    }

    #finishTarget(target: Cricket, outcome: BugAnswerOutcome): void {
        if (outcome.retryable) {
            target.motion.cooldown = target.motion.vx = target.motion.vy = 0;
            target.state = "idle";
            target.label.setVisible(true);
            this.#toIdle("Miss +1. The cricket stopped — catch the same cricket to retry its question.");
            return;
        }
        this.#crickets = this.#crickets.filter((cricket) => cricket !== target);
        this.#destroyCricket(target);
        this.#resolving.delete(target);
        if (this.#session.quiz.isComplete) this.#complete();
        else if (this.#session.advanceRound()) {
            this.#setPhase("round-transition");
            this.#prompt("Round complete! The next crickets appear in the same field.");
            this.#later(700, () => this.#spawnRound());
        } else this.#toIdle(outcome.correct ? "Caught! Find the next ?." : "Miss +1. The cricket escaped — find the next one.");
    }

    #complete(): void {
        this.#setPhase("complete");
        this.#prompt(null);
        this.ctx.player.setInputLocked(true);
        sfx.complete();
        this.ctx.emit({ type: "complete", summary: this.#session.summary() });
    }

    #toIdle(message: string): void {
        this.#revealPending = false;
        this.ctx.player.setInputLocked(false);
        this.#setPhase("idle");
        this.#emitHud();
        this.#prompt(message);
    }

    #playerFeet(): { x: number; y: number } {
        const body = this.ctx.player.body as Phaser.Physics.Arcade.Body;
        return { x: body.center.x, y: body.center.y };
    }

    #emitHud(questionNumber = this.#session.quiz.currentNumber): void {
        this.ctx.emit({ type: "progress", progress: this.snapshot() });
        this.ctx.emit({
            type: "hud", caught: this.#session.quiz.correctCount, answered: this.#session.quiz.answeredCount,
            total: this.#session.quiz.total, questionNumber, misses: this.#session.misses,
            round: this.#session.roundNumber, rounds: this.#session.roundCount, mode: this.#session.mode,
        });
    }
    #setPhase(phase: CatchingBugsPhase): void { this.#phase = phase; this.ctx.emit({ type: "phase", phase }); }
    #prompt(message: string | null): void { this.ctx.emit({ type: "prompt", message }); }

    #animate(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
        const generation = this.#generation;
        const tween = this.ctx.scene.tweens.add({ ...config, onComplete: () => {
            this.#tweens.delete(tween);
            if (generation !== this.#generation) tween.remove();
        } });
        this.#tweens.add(tween);
    }

    #later(delay: number, callback: () => void): void {
        const generation = this.#generation;
        const timer = this.ctx.scene.time.delayedCall(delay, () => {
            this.#timers.delete(timer);
            if (!this.#destroyed && generation === this.#generation) callback();
        });
        this.#timers.add(timer);
    }
    #destroyCricket(cricket: Cricket): void {
        cricket.sprite.destroy(); cricket.label.destroy(); cricket.footprint.destroy(); cricket.shadow.destroy();
    }
    #clearRun(): void {
        this.#generation += 1;
        this.#closeGate.cancel();
        this.#timers.forEach((timer) => timer.remove(false));
        this.#timers.clear();
        this.#tweens.forEach((tween) => tween.remove());
        this.#tweens.clear();
        this.#net.cancel();
        this.#popups.clear();
        this.#crickets.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.clear();
        this.#crickets = [];
        this.#target = null;
        this.#revealPending = false;
    }
}
