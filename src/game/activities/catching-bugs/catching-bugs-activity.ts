import Phaser from "phaser";
import { describeCorrectAnswer } from "@/quiz/grading";
import type { AnswerValue } from "@/quiz/types";
import { ASSET_KEYS } from "@/game/common/assets";
import { sfx } from "@/game/common/audio/sfx";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { WORLD_CONFIG } from "@/game/config/world-config";
import type { CatchingBugsPhase } from "@/game/game-options";
import type { Activity, ActivityContext } from "../activity";
import { CRICKET_MOVE } from "./catching-bugs-assets";
import { CatchingBugsSession, type BugAnswerOutcome } from "./catching-bugs-session";
import { CatchingNet } from "./catching-net";
import {
    CRICKET_RADIUS,
    CRICKET_SPEED,
    moveCricket,
    nearestCricket,
    readCricketField,
    spawnCrickets,
    type CricketField,
    type CricketMotion,
} from "./cricket-motion";

type Cricket = {
    questionIndex: number;
    motion: CricketMotion;
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.Text;
};

/** One moving cricket per question; fixed-size batches share the same farm. */
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
    #generation = 0;
    #destroyed = false;
    #spawn: { x: number; y: number };

    constructor(private ctx: ActivityContext) {
        this.#session = new CatchingBugsSession(ctx.quiz);
        this.#field = readCricketField(
            ctx.worldMap.map.getObjectLayer("catching_bugs")?.objects ?? [],
            WORLD_CONFIG.scale
        );
        this.#net = new CatchingNet(ctx.scene);
        this.#spawn = { x: ctx.player.x, y: ctx.player.y };
    }

    create(): void {
        if (this.#session.quiz.isComplete) {
            this.#emitHud();
            this.#complete();
            return;
        }
        this.#spawnRound();
    }

    handlePrimaryAction(): void {
        if (this.#destroyed || this.#phase !== "idle") return;
        const target = nearestCricket(this.#playerFeet(), this.#crickets);
        if (!target) {
            this.#prompt("Dekati cricket di dalam ladang, lalu tekan F / Spasi atau tombol TANGKAP.");
            return;
        }

        this.#target = target;
        this.#revealPending = false;
        this.ctx.player.setInputLocked(true);
        this.#setPhase("netting");
        this.#prompt(null);
        const generation = this.#generation;
        this.#net.swing(this.ctx.player, target.motion, () => {
            if (generation !== this.#generation || this.#destroyed) return;
            const question = this.ctx.quiz.questions[target.questionIndex];
            this.#setPhase("answering");
            this.#emitHud(target.questionIndex + 1);
            this.ctx.emit({
                type: "question",
                question,
                questionNumber: target.questionIndex + 1,
                total: this.#session.quiz.total,
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
            type: "answer",
            correct: outcome.correct,
            question: outcome.question,
            answer: outcome.answer,
            correctAnswer: describeCorrectAnswer(outcome.question),
            caught: this.#session.quiz.correctCount,
            answered: this.#session.quiz.answeredCount,
            total: this.#session.quiz.total,
            retryable: outcome.retryable,
            feedback: outcome.correct
                ? "Cricket tertangkap!"
                : outcome.retryable
                  ? "Cricket lepas! Dekati lagi untuk mencoba soal yang sama."
                  : "Cricket lepas dan dihitung miss.",
        });
        this.#emitHud(target.questionIndex + 1);
        if (outcome.correct) sfx.correct();
        else sfx.wrong();

        // Keep the question/reveal visible before releasing or removing the target.
        this.#later(outcome.correct ? 1600 : 3200, () => this.#resolve(target, outcome));
    }

    restart(): void {
        this.#clearRun();
        this.#destroyed = false;
        this.#session = new CatchingBugsSession(this.ctx.quiz);
        (this.ctx.player.body as Phaser.Physics.Arcade.Body).reset(this.#spawn.x, this.#spawn.y);
        this.ctx.player.setInputLocked(false);
        this.create();
    }

    update(_time: number, delta: number): void {
        if (this.#destroyed || this.#phase === "complete") return;
        const nearby = this.#phase === "idle" ? nearestCricket(this.#playerFeet(), this.#crickets) : null;
        // No timers to the barn and no pause/penalty while reading a question.
        for (const cricket of this.#crickets) {
            moveCricket(cricket.motion, this.#field, delta);
            const { x, y, vx } = cricket.motion;
            cricket.sprite.setPosition(x, y).setFlipX(vx < 0).setDepth(y + CRICKET_RADIUS);
            cricket.label.setPosition(x, y - 12);
            cricket.label.setText(cricket === nearby ? `F ${cricket.questionIndex + 1}` : `${cricket.questionIndex + 1}`);
            cricket.label.setColor(cricket === nearby ? "#fde68a" : "#dcfce7");
        }
    }

    destroy(): void {
        this.#destroyed = true;
        this.#clearRun();
    }

    #spawnRound(): void {
        const indices = this.#session.questionIndices;
        const motions = spawnCrickets(this.#field, indices.length);
        this.#crickets = indices.map((questionIndex, index) => {
            const motion = motions[index];
            const sprite = this.ctx.scene.add.sprite(motion.x, motion.y, ASSET_KEYS.CRICKET, "0")
                .setName(`cricket-${questionIndex}`)
                .setScale(WORLD_CONFIG.scale)
                .setDepth(motion.y + CRICKET_RADIUS)
                .play(CRICKET_MOVE);
            const label = this.ctx.scene.add.text(motion.x, motion.y - 12, `${questionIndex + 1}`, {
                fontFamily: ASSET_KEYS.FONT_PRESS_START_2P,
                fontSize: "6px",
                color: "#dcfce7",
                backgroundColor: "#173b25cc",
                padding: { x: 2, y: 2 },
            }).setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI);
            return { questionIndex, motion, sprite, label };
        });
        this.#toIdle(`Ronde ${this.#session.roundNumber}/${this.#session.roundCount} · ${indices.length} cricket di ladang. Dekati lalu tangkap!`);
    }

    #resolve(target: Cricket, outcome: BugAnswerOutcome): void {
        this.#setPhase(outcome.correct ? "catching" : "escaped");
        this.#target = null;
        if (outcome.retryable) {
            // A released cricket darts away but remains inside the very same field.
            target.motion.cooldown = 1.2;
            target.motion.turnIn = 1.2;
            const dx = target.motion.x - this.ctx.player.x;
            const dy = target.motion.y - this.ctx.player.y;
            const length = Math.hypot(dx, dy);
            target.motion.vx = length > 0 ? dx / length * CRICKET_SPEED : CRICKET_SPEED;
            target.motion.vy = length > 0 ? dy / length * CRICKET_SPEED : 0;
            this.#later(450, () => this.#toIdle("Cricket lepas · miss +1. Mode latihan: tangkap lagi untuk mencoba soal yang sama."));
            return;
        }

        this.#crickets = this.#crickets.filter((cricket) => cricket !== target);
        target.sprite.setTint(outcome.correct ? 0xbbf7d0 : 0xfda4af);
        const tween = this.ctx.scene.tweens.add({
            targets: [target.sprite, target.label],
            alpha: 0,
            duration: 350,
        });
        // These resolved objects stay owned until their animation ends or the run is cancelled.
        this.#resolving.add(target);
        this.#later(400, () => {
            tween.remove();
            this.#destroyCricket(target);
            this.#resolving.delete(target);
            if (this.#session.quiz.isComplete) {
                this.#complete();
            } else if (this.#session.advanceRound()) {
                this.#setPhase("round-transition");
                this.#prompt("Ronde selesai! Cricket untuk soal berikutnya akan muncul di ladang yang sama.");
                this.#later(800, () => this.#spawnRound());
            } else {
                this.#toIdle(outcome.correct ? "Tertangkap! Cari cricket berikutnya." : "Cricket lepas · miss +1. Cari cricket berikutnya.");
            }
        });
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
            type: "hud",
            caught: this.#session.quiz.correctCount,
            answered: this.#session.quiz.answeredCount,
            total: this.#session.quiz.total,
            questionNumber,
            misses: this.#session.misses,
            round: this.#session.roundNumber,
            rounds: this.#session.roundCount,
            mode: this.#session.mode,
        });
    }

    #setPhase(phase: CatchingBugsPhase): void {
        this.#phase = phase;
        this.ctx.emit({ type: "phase", phase });
    }

    #prompt(message: string | null): void {
        this.ctx.emit({ type: "prompt", message });
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
        this.ctx.scene.tweens.killTweensOf([cricket.sprite, cricket.label]);
        cricket.sprite.destroy();
        cricket.label.destroy();
    }

    #clearRun(): void {
        this.#generation += 1;
        this.#timers.forEach((timer) => timer.remove(false));
        this.#timers.clear();
        this.#net.cancel();
        this.#crickets.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.forEach((cricket) => this.#destroyCricket(cricket));
        this.#resolving.clear();
        this.#crickets = [];
        this.#target = null;
        this.#revealPending = false;
    }
}
