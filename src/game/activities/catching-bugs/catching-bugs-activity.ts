import Phaser from "phaser";
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
    state: "idle" | "question" | "released" | "captured";
};

/** One stationary animated cricket per question, scattered in fixed-size rounds. */
export class CatchingBugsActivity implements Activity {
    #session: CatchingBugsSession;
    #field: CricketField;
    #net: CatchingNet;
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
        this.#session = new CatchingBugsSession(ctx.quiz);
        this.#field = readCricketField(ctx.worldMap.map.getObjectLayer("catching_bugs")?.objects ?? [], WORLD_CONFIG.scale);
        this.#net = new CatchingNet(ctx.scene);
        this.#spawn = { x: ctx.player.x, y: ctx.player.y };
    }

    create(): void {
        if (this.#session.quiz.isComplete) {
            this.#emitHud();
            this.#complete();
        } else this.#spawnRound();
    }

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
            this.#prompt("Pakai jaring, dekati cricket bertanda ?, lalu tekan F / Spasi atau TANGKAP.");
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
            feedback: outcome.correct ? "Cricket tertangkap!" : outcome.retryable ? "Cricket lepas — coba lagi!" : "Cricket lepas dan dihitung miss.",
        });
        this.#emitHud(target.questionIndex + 1);
        // Feedback can be read first; world effects MUST await the UI's unmount receipt.
        this.#later(outcome.correct ? 1400 : 2800, () => {
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
            if (vx !== 0) cricket.sprite.setFlipX(vx < 0);
            // Only the playful question mark bobs. Idle cricket coordinates never change.
            cricket.label.setPosition(x, y - 13 + Math.sin(time / 260 + cricket.questionIndex) * 1.5);
        }
    }

    destroy(): void { this.#destroyed = true; this.#clearRun(); }

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
            return { questionIndex, motion, sprite, label, state: "idle" };
        });
        this.#toIdle(`Ronde ${this.#session.roundNumber}/${this.#session.roundCount} · ${indices.length} cricket. Cari tanda ? dan pakai jaring!`);
    }

    #resolve(target: Cricket, outcome: BugAnswerOutcome): void {
        this.#target = null;
        this.#setPhase(outcome.correct ? "catching" : "escaped");
        target.label.setVisible(false);
        if (outcome.correct) {
            sfx.correct();
            this.#prompt("Dapat! Cricket masuk ke jaring ✨");
            target.state = "captured";
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
            this.#later(920, () => this.#finishTarget(target, outcome));
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
            this.#toIdle("Miss +1. Cricket berhenti lagi — tangkap cricket yang sama untuk mengulang soal.");
            return;
        }
        this.#crickets = this.#crickets.filter((cricket) => cricket !== target);
        this.#destroyCricket(target);
        this.#resolving.delete(target);
        if (this.#session.quiz.isComplete) this.#complete();
        else if (this.#session.advanceRound()) {
            this.#setPhase("round-transition");
            this.#prompt("Ronde selesai! Cricket berikutnya muncul di ladang yang sama.");
            this.#later(700, () => this.#spawnRound());
        } else this.#toIdle(outcome.correct ? "Tertangkap! Cari tanda ? berikutnya." : "Miss +1. Cricket lepas — cari cricket berikutnya.");
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
    #destroyCricket(cricket: Cricket): void { cricket.sprite.destroy(); cricket.label.destroy(); }
    #clearRun(): void {
        this.#generation += 1;
        this.#closeGate.cancel();
        this.#timers.forEach((timer) => timer.remove(false));
        this.#timers.clear();
        this.#tweens.forEach((tween) => tween.remove());
        this.#tweens.clear();
        this.#net.cancel();
        this.#crickets.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.clear();
        this.#crickets = [];
        this.#target = null;
        this.#revealPending = false;
    }
}
