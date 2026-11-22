import Phaser from "phaser";
import { describeCorrectAnswer } from "@/quiz/grading";
import type { AnswerValue } from "@/quiz/types";
import { sfx } from "@/game/common/audio/sfx";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { WORLD_CONFIG } from "@/game/config/world-config";
import type { SerenadePhase } from "@/game/game-options";
import type { PreparedAction } from "@/game/equipment/targeting";
import type { Activity, ActivityContext } from "../activity";
import { QuestionCloseGate } from "../catching-bugs/question-close-gate";
import { CapturePopups } from "../capture-popup";
import { SerenadeSession, type SerenadeOutcome } from "./serenade-session";
import { frogLanding, inPerformanceArea, readPerformanceArea, type PerformanceArea } from "./serenade-area";
import { ALTAR_ANIMATIONS, FROG_ASSETS, frogAnimation, type FrogColor } from "./serenade-assets";

const MAX_VISIBLE_FROGS = 30;

/** Correct = one pleasant phrase + one frog; wrong = a sour phrase, never a completion gate. */
export class SerenadeActivity implements Activity {
    #session: SerenadeSession;
    #area: PerformanceArea | null;
    #altar?: Phaser.GameObjects.Sprite;
    #phase: SerenadePhase = "idle";
    #label?: Phaser.GameObjects.Text;
    #frogs: Phaser.GameObjects.Sprite[] = [];
    #spawned = new Set<number>();
    #popups: CapturePopups;
    #timers = new Set<Phaser.Time.TimerEvent>();
    #tweens = new Set<Phaser.Tweens.Tween>();
    #closeGate = new QuestionCloseGate();
    #revealPending = false;
    #destroyed = false;
    #generation = 0;

    constructor(private ctx: ActivityContext) {
        this.#session = new SerenadeSession(ctx.quiz, ctx.progress);
        this.#area = readPerformanceArea(ctx.worldMap.map.getObjectLayer("forest_serenade")?.objects ?? [], WORLD_CONFIG.scale);
        this.#altar = ctx.mapObjects.find((object): object is Phaser.GameObjects.Sprite => object.name === "altar" && object instanceof Phaser.GameObjects.Sprite);
        this.#popups = new CapturePopups(ctx.scene);
    }

    create(): void {
        const { scene } = this.ctx;
        if (this.#area) this.#label = scene.add.text(this.#area.x + this.#area.width / 2, this.#area.y + this.#area.height / 2, "F", {
            fontFamily: '"Press Start 2P"', fontSize: "7px", color: "#fff3b0", stroke: "#234d45", strokeThickness: 2,
        }).setName("serenade-area-label").setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI);
        this.#altar?.play({ key: this.#session.quiz.correctCount > 0 ? ALTAR_ANIMATIONS.FLOWER : ALTAR_ANIMATIONS.IDLE, repeat: -1 });
        // Reconstruct only academic successes, never in-flight actions or duplicate summons.
        this.#session.snapshot().quiz.answers.forEach(({ questionIndex }) => this.#spawned.add(questionIndex));
        const successes = this.#session.quiz.correctCount;
        for (let index = Math.max(0, successes - MAX_VISIBLE_FROGS); index < successes; index += 1) this.#spawnFrog(index, false);
        if (this.#session.quiz.isComplete) this.#complete();
        else this.#toIdle();
    }

    snapshot() { return this.#session.snapshot(); }
    preparePrimaryAction(): PreparedAction {
        const area = this.#area;
        const valid = area !== null && inPerformanceArea(this.#feet(), area);
        return { target: this.#phase === "idle" && area ? { id: "serenade-area", kind: "tile", status: valid ? "valid" : "candidate", bounds: area } : null,
            execute: () => this.#begin() };
    }
    handlePrimaryAction(): void { this.preparePrimaryAction().execute(); }

    #begin(): void {
        if (this.#destroyed || this.#phase !== "idle" || this.#session.quiz.isComplete) return;
        if (!this.#area || !inPerformanceArea(this.#feet(), this.#area)) {
            this.#prompt("Walk up the stairs to the marked clearing in front of the altar, then play your flute.");
            return;
        }
        this.ctx.player.setInputLocked(true);
        this.ctx.player.playFlute();
        this.#setPhase("tuning"); this.#prompt(null);
        this.#later(650, () => {
            this.ctx.player.stopFlute();
            const question = this.#session.quiz.currentQuestion;
            if (!question) { this.#complete(); return; }
            this.#setPhase("answering"); this.#emitHud();
            this.ctx.emit({ type: "question", question, questionNumber: this.#session.quiz.currentNumber, total: this.#session.quiz.total });
        });
    }

    answer(answer: AnswerValue): void {
        if (this.#destroyed || this.#phase !== "answering" || this.#revealPending) return;
        const questionIndex = this.#session.quiz.currentNumber - 1;
        const outcome = this.#session.answer(answer);
        if (!outcome) return;
        this.#revealPending = true;
        this.ctx.emit({ type: "answer", correct: outcome.correct, question: outcome.question, answer: outcome.answer,
            correctAnswer: describeCorrectAnswer(outcome.question), caught: this.#session.quiz.correctCount,
            answered: this.#session.quiz.answeredCount, total: this.#session.quiz.total, retryable: outcome.retryable,
            feedback: outcome.correct ? "A frog answered your melody!" : "That melody was off. No frog this time." });
        this.#emitHud(questionIndex + 1);
        this.#later(outcome.correct ? 1400 : 2400, () => {
            const requestId = this.#closeGate.request(() => this.#resolve(questionIndex, outcome));
            this.#setPhase("closing-question");
            this.ctx.emit({ type: "question:close", requestId });
        });
    }
    questionClosed(requestId: number): void {
        if (!this.#destroyed && this.#phase === "closing-question") this.#closeGate.acknowledge(requestId);
    }

    #resolve(questionIndex: number, outcome: SerenadeOutcome): void {
        this.#setPhase("serenading");
        this.ctx.player.playFlute();
        sfx.flute(outcome.correct);
        if (outcome.frogs === 1 && !this.#spawned.has(questionIndex)) {
            this.#spawned.add(questionIndex);
            this.#altar?.play({ key: ALTAR_ANIMATIONS.FLOWER, repeat: -1 });
            this.#spawnFrog(this.#session.quiz.correctCount - 1, true);
            this.#popups.show(this.ctx.player.x, this.ctx.player.y - 25);
        }
        this.#prompt(outcome.correct ? "A frog answered your melody!" : outcome.retryable ? "No frog yet — play again to retry the same question." : "No frog this time. Play again for the next question.");
        this.#later(1350, () => {
            this.ctx.player.stopFlute();
            if (this.#session.quiz.isComplete) this.#complete();
            else this.#toIdle(outcome.retryable);
        });
    }

    #spawnFrog(index: number, animate: boolean): void {
        const altar = this.#altar;
        if (!altar) return;
        const origin = { x: altar.x + altar.displayWidth / 2, y: altar.y - 4 * WORLD_CONFIG.scale };
        const end = frogLanding(index, origin, { width: this.ctx.worldMap.widthInPixels, height: this.ctx.worldMap.heightInPixels });
        const color: FrogColor = index % 2 === 0 ? "red" : "blue";
        const frog = this.ctx.scene.add.sprite(animate ? origin.x : end.x, animate ? origin.y : end.y, FROG_ASSETS[color], "24")
            .setScale(WORLD_CONFIG.scale).setDepth(end.y + 3).setName(`serenade-frog-${index}`).setData("color", color);
        this.#frogs.push(frog);
        // Large teacher quizzes remain playable: old decorative frogs make room, score stays exact.
        if (this.#frogs.length > MAX_VISIBLE_FROGS) {
            const oldest = this.#frogs.shift()!;
            this.ctx.scene.tweens.killTweensOf(oldest); oldest.destroy();
        }
        if (!animate) { frog.play({ key: frogAnimation(color, "front_idle"), repeat: -1 }); return; }
        frog.play(frogAnimation(color, "front_jump"));
        const hop = { t: 0 };
        this.#animate({ targets: hop, t: 1, duration: 850, ease: "Sine.inOut",
            onUpdate: () => {
                if (frog.active) frog.setPosition(Phaser.Math.Linear(origin.x, end.x, hop.t), Phaser.Math.Linear(origin.y, end.y, hop.t) - Math.sin(hop.t * Math.PI) * 12);
            },
            onComplete: () => { if (frog.active) frog.setPosition(end.x, end.y).play({ key: frogAnimation(color, "front_idle"), repeat: -1 }); } });
    }

    #toIdle(retry = false): void {
        this.#revealPending = false;
        this.ctx.player.setInputLocked(false);
        this.#setPhase("idle"); this.#emitHud();
        this.#prompt(retry ? "No frog yet — play again to retry the same question." : "Walk up the stairs to the marked clearing in front of the altar, then play your flute.");
    }
    #complete(): void {
        this.ctx.player.stopFlute(); this.ctx.player.setInputLocked(true);
        this.#setPhase("complete"); this.#emitHud(); this.#prompt(null);
        sfx.complete(); this.ctx.emit({ type: "complete", summary: this.#session.summary() });
    }
    #feet(): { x: number; y: number } { const body = this.ctx.player.body as Phaser.Physics.Arcade.Body; return { x: body.center.x, y: body.center.y }; }
    #emitHud(questionNumber = this.#session.quiz.currentNumber): void {
        this.ctx.emit({ type: "progress", progress: this.snapshot() });
        this.ctx.emit({ type: "hud", caught: this.#session.quiz.correctCount, answered: this.#session.quiz.answeredCount,
            total: this.#session.quiz.total, questionNumber, misses: this.#session.misses, mode: this.#session.mode });
    }
    #setPhase(phase: SerenadePhase): void { this.#phase = phase; this.ctx.emit({ type: "phase", phase }); this.#label?.setVisible(phase === "idle"); }
    #prompt(message: string | null): void { this.ctx.emit({ type: "prompt", message }); }
    update(): void { /* Frogs idle using the supplied Aseprite animation, never wander or gate the next question. */ }

    restart(): void {
        this.#clearRun(); this.#destroyed = false;
        this.#session = new SerenadeSession(this.ctx.quiz);
        this.ctx.player.setInputLocked(false); this.create();
    }
    destroy(): void {
        if (this.#destroyed) return;
        this.#destroyed = true; this.#clearRun();
    }
    #clearRun(): void {
        this.#generation += 1; this.#closeGate.cancel();
        this.#timers.forEach((timer) => timer.remove(false)); this.#timers.clear();
        this.#tweens.forEach((tween) => tween.remove()); this.#tweens.clear();
        this.#label?.destroy(); this.#label = undefined;
        this.#frogs.forEach((frog) => frog.destroy()); this.#frogs = []; this.#spawned.clear();
        this.#popups.clear(); this.#revealPending = false;
        if (this.ctx.player.active) this.ctx.player.stopFlute();
    }
    #later(delay: number, callback: () => void): void {
        const generation = this.#generation;
        const timer = this.ctx.scene.time.delayedCall(delay, () => {
            this.#timers.delete(timer);
            if (!this.#destroyed && generation === this.#generation) callback();
        }); this.#timers.add(timer);
    }
    #animate(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
        const generation = this.#generation;
        const onComplete = config.onComplete;
        const tween = this.ctx.scene.tweens.add({ ...config, onComplete: (...args: Parameters<Phaser.Types.Tweens.TweenOnCompleteCallback>) => {
            this.#tweens.delete(tween);
            if (!this.#destroyed && generation === this.#generation) onComplete?.(...args);
        } }); this.#tweens.add(tween);
    }
}
