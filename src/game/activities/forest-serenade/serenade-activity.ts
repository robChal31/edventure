import Phaser from "phaser";
import { CORRECT_REVEAL_MS } from "@/quiz/reward-feedback";
import { describeCorrectAnswer } from "@/quiz/grading";
import type { AnswerValue } from "@/quiz/types";
import { sfx } from "@/game/common/audio/sfx";
import { SERENADE_FINALE_DURATION_MS } from "@/game/common/audio/serenade-music";
import { DEPTH_CONFIG } from "@/game/config/depth-config";
import { WORLD_CONFIG } from "@/game/config/world-config";
import type { SerenadePhase } from "@/game/game-options";
import type { PreparedAction } from "@/game/equipment/targeting";
import type { Activity, ActivityContext } from "../activity";
import { QuestionCloseGate } from "../catching-bugs/question-close-gate";
import { CapturePopups } from "../capture-popup";
import { SerenadeSession, type SerenadeOutcome } from "./serenade-session";
import { inPerformanceArea, readPerformanceArea, type PerformanceArea } from "./serenade-area";
import { ALTAR_ANIMATIONS, FROG_ASSETS, frogAnimation, type FrogColor } from "./serenade-assets";
import { FrogGround, altarHillBounds, frogRoutePosition, frogTravelDuration, type FrogBounds, type FrogPoint } from "./frog-layout";
import { SerenadeNotes } from "./serenade-notes";

type QuestionFrog = { index: number; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; color: FrogColor };

/** One existing frog per question. Correct answers invite it around the altar hill, then puffing. */
export class SerenadeActivity implements Activity {
    #session: SerenadeSession;
    #area: PerformanceArea | null;
    #altar?: Phaser.GameObjects.Sprite;
    #phase: SerenadePhase = "idle";
    #label?: Phaser.GameObjects.Text;
    #frogs = new Map<number, QuestionFrog>();
    #landings = new Map<number, FrogPoint>();
    #ground: FrogGround;
    #hill: FrogBounds;
    #gathering: FrogPoint[];
    #notes: SerenadeNotes;
    #stopFinale?: () => void;
    #popups: CapturePopups;
    #timers = new Set<Phaser.Time.TimerEvent>();
    #tweens = new Set<Phaser.Tweens.Tween>();
    #closeGate = new QuestionCloseGate();
    #revealPending = false;
    #destroyed = false;
    #generation = 0;
    #nextVisibility = 0;

    constructor(private ctx: ActivityContext) {
        this.#session = new SerenadeSession(ctx.quiz, ctx.progress);
        this.#area = readPerformanceArea(ctx.worldMap.map.getObjectLayer("forest_serenade")?.objects ?? [], WORLD_CONFIG.scale);
        this.#altar = ctx.mapObjects.find((object): object is Phaser.GameObjects.Sprite => object.name === "altar" && object instanceof Phaser.GameObjects.Sprite);
        this.#popups = new CapturePopups(ctx.scene);
        this.#notes = new SerenadeNotes(ctx.scene);
        this.#ground = this.#readGround();
        this.#hill = this.#readHill();
        this.#gathering = this.#ground.gathering(this.#session.quiz.total, this.#hill, this.#area);
    }

    create(): void {
        const { scene } = this.ctx;
        if (this.#area) this.#label = scene.add.text(this.#area.x + this.#area.width / 2, this.#area.y + this.#area.height / 2, "F", {
            fontFamily: '"Press Start 2P"', fontSize: "7px", color: "#fff3b0", stroke: "#234d45", strokeThickness: 2,
        }).setName("serenade-area-label").setOrigin(0.5).setDepth(DEPTH_CONFIG.WORLD_UI);
        this.#altar?.play({ key: this.#session.quiz.correctCount > 0 ? ALTAR_ANIMATIONS.FLOWER : ALTAR_ANIMATIONS.IDLE, repeat: -1 });
        this.#ground.scatter(this.#session.quiz.total, this.#hill).forEach((home, index) => this.#createFrog(index, home));
        // Rebuild the same question identities, not a second group of newly summoned frogs.
        this.#session.befriendedQuestions.forEach((index) => {
            const frog = this.#frogs.get(index), landing = this.#reserveLanding(index);
            if (frog && landing) this.#puff(frog, landing);
        });
        this.#syncLabels();
        if (this.#session.quiz.isComplete) this.#finish();
        else this.#toIdle();
    }

    snapshot() { return this.#session.snapshot(); }
    preparePrimaryAction(): PreparedAction {
        const area = this.#area;
        const valid = area !== null && inPerformanceArea(this.#feet(), area);
        return { target: this.#phase === "idle" && area ? { id: "serenade-area", kind: "tile", status: valid ? "valid" : "candidate", bounds: area, markerPadding: 0 } : null,
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
        this.#notes.follow("player", this.ctx.player, "player");
        this.#setPhase("tuning"); this.#prompt(null);
        this.#later(650, () => {
            // Keep the original flute loop playing while the student reads, types and answers.
            const question = this.#session.quiz.currentQuestion;
            if (!question) { this.#finish(); return; }
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
            feedback: outcome.correct ? "Your frog is joining the altar circle!" : "That melody was off. Your frog stays where it is." });
        this.#emitHud(questionIndex + 1);
        this.#later(outcome.correct ? CORRECT_REVEAL_MS : 2400, () => {
            const requestId = this.#closeGate.request(() => this.#resolve(outcome));
            this.#setPhase("closing-question");
            this.ctx.emit({ type: "question:close", requestId });
        });
    }
    questionClosed(requestId: number): void {
        if (!this.#destroyed && this.#phase === "closing-question") this.#closeGate.acknowledge(requestId);
    }

    #resolve(outcome: SerenadeOutcome): void {
        this.#setPhase("serenading");
        sfx.flute(outcome.correct);
        let travel = 0;
        if (outcome.frogIndex !== null && !this.#landings.has(outcome.frogIndex)) {
            this.#altar?.play({ key: ALTAR_ANIMATIONS.FLOWER, repeat: -1 });
            travel = this.#approach(outcome.frogIndex);
        }
        this.#prompt(outcome.correct ? "Your frog is joining the altar circle!" : outcome.retryable ? "Your frog is waiting — play again to retry the same question." : "Your frog stays put. Play again for the next question.");
        // Let the supplied 600ms puffing cycle be visible before advancing, without any score gate.
        this.#later(Math.max(1350, travel + 650), () => {
            if (this.#session.quiz.isComplete) this.#finish();
            else this.#toIdle(outcome.retryable);
        });
    }

    #readGround(): FrogGround {
        const { worldMap, scene } = this.ctx, size = worldMap.tileWidth;
        const ground = worldMap.getLayer("deep_forest_grass");
        const edges = worldMap.collisionLayerNames.map((name) => worldMap.getLayer(name));
        const points: FrogPoint[] = [], radius = size * 0.2;
        // Includes both automatic props and additive Tiled collision rectangles, padded for frog feet.
        const solids: FrogBounds[] = [...scene.physics.world.staticBodies].filter((body) => body.enable)
            .map(body => ({ x: body.left - radius, y: body.top - radius, width: body.right - body.left + radius * 2, height: body.bottom - body.top + radius * 2 }));
        // A one-tile margin keeps the original frog frame and its ordinal inside the map.
        for (let y = size * 1.5; y < worldMap.heightInPixels - size; y += size) for (let x = size * 1.5; x < worldMap.widthInPixels - size; x += size) {
            if ((ground?.getTileAtWorldXY(x, y)?.index ?? -1) < 0 || edges.some((layer) => (layer?.getTileAtWorldXY(x, y)?.index ?? -1) >= 0)) continue;
            if (solids.some(bounds => x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height)) continue;
            points.push({ x, y });
        }
        return new FrogGround(points, size, this.ctx.player, solids);
    }
    #readHill(): FrogBounds {
        const size = this.ctx.worldMap.tileWidth, rim: FrogPoint[] = [];
        this.ctx.worldMap.getLayer("deep_forest_hill")?.forEachTile((tile: Phaser.Tilemaps.Tile) => {
            if (tile.index >= 0) rim.push({ x: (tile.x + 0.5) * size, y: (tile.y + 0.5) * size });
        });
        const area = this.#area ?? { x: this.ctx.player.x, y: this.ctx.player.y, width: 0, height: 0 };
        const anchor = this.#altar ? { x: this.#altar.x + this.#altar.displayWidth / 2, y: this.#altar.y - this.#altar.displayHeight / 2 }
            : { x: area.x + area.width / 2, y: area.y + area.height / 2 };
        return altarHillBounds(rim, size, anchor) ?? area;
    }
    #reserveLanding(index: number): FrogPoint | null {
        const point = this.#gathering[index];
        if (point) this.#landings.set(index, point);
        return point ?? null;
    }
    #createFrog(index: number, home: FrogPoint): void {
        const color: FrogColor = index % 2 === 0 ? "red" : "blue";
        const sprite = this.ctx.scene.add.sprite(home.x, home.y, FROG_ASSETS[color], "24")
            .setScale(WORLD_CONFIG.scale).setDepth(home.y + 3).setName(`serenade-frog-${index}`)
            .setData({ color, questionIndex: index, state: "waiting", home: { ...home }, gathering: this.#gathering[index], hill: this.#hill });
        sprite.play({ key: frogAnimation(color, "front_idle"), repeat: -1 });
        const label = this.ctx.scene.add.text(home.x, home.y - 10 * WORLD_CONFIG.scale, String(index + 1), {
            fontFamily: '"Press Start 2P"', fontSize: "5px", color: "#d5efdf", stroke: "#173c3c", strokeThickness: 2,
        }).setOrigin(0.5, 1).setName(`serenade-question-${index}`).setDepth(DEPTH_CONFIG.WORLD_UI - 2);
        this.#frogs.set(index, { index, sprite, label, color });
    }
    #approach(index: number): number {
        const frog = this.#frogs.get(index), landing = this.#reserveLanding(index);
        if (!frog || !landing) return 0;
        const path = this.#ground.travelRoute(frog.sprite, landing);
        if (!path.length) { this.#puff(frog, landing); return 0; }
        const duration = frogTravelDuration(path, this.#ground.tileSize), hop = { t: 0 };
        frog.sprite.setData({ state: "approaching", route: path, travelDuration: duration });
        this.#animate({ targets: hop, t: 1, duration, ease: "Sine.inOut",
            onUpdate: () => {
                if (!frog.sprite.active) return;
                const point = frogRoutePosition(path, hop.t);
                const horizontal = Math.abs(point.dx) > Math.abs(point.dy);
                const tag = horizontal ? "side_jump" : point.dy < 0 ? "back_jump" : "front_jump";
                frog.sprite.setFlipX(horizontal && point.dx < 0).play({ key: frogAnimation(frog.color, tag), repeat: -1 }, true);
                frog.sprite.setPosition(point.x, point.y - Math.sin(point.traveled / this.#ground.tileSize * Math.PI) ** 2 * 4).setDepth(point.y + 3);
                frog.label.setPosition(frog.sprite.x, frog.sprite.y - 10 * WORLD_CONFIG.scale);
            },
            onComplete: () => {
                if (!frog.sprite.active) return;
                this.#puff(frog, landing);
                this.#popups.show(frog.sprite.x, frog.sprite.y - 15);
            } });
        return duration;
    }
    #puff(frog: QuestionFrog, point: FrogPoint): void {
        frog.sprite.setPosition(point.x, point.y).setDepth(point.y + 3).setFlipX(false).setData("state", "puffing")
            .play({ key: frogAnimation(frog.color, "puffing"), repeat: -1 });
        frog.label.setPosition(point.x, point.y - 10 * WORLD_CONFIG.scale).setColor("#a7ffcd");
        this.#notes.follow(`frog-${frog.index}`, frog.sprite, "frog", frog.index);
    }
    #syncLabels(): void {
        this.#frogs.forEach(({ sprite, label }, index) => {
            const current = index === this.#session.quiz.currentNumber - 1 && !this.#session.quiz.isComplete;
            label.setColor(this.#landings.has(index) ? "#a7ffcd" : current ? "#fff3a3" : this.#session.quiz.hasAnswered(index) ? "#96afb0" : "#d5efdf");
            label.setVisible(sprite.visible && (this.#frogs.size <= 40 || current));
        });
    }

    #toIdle(retry = false): void {
        this.ctx.player.stopFlute(); this.#notes.stop("player");
        this.#revealPending = false;
        this.ctx.player.setInputLocked(false);
        this.#setPhase("idle"); this.#emitHud(); this.#syncLabels();
        this.#prompt(retry ? "Your frog is waiting — play again to retry the same question." : "Walk up the stairs to the marked clearing in front of the altar, then play your flute.");
    }
    #finish(): void {
        if (this.#destroyed || this.#phase === "finale" || this.#phase === "complete") return;
        this.ctx.player.setInputLocked(true); this.ctx.player.playFlute();
        this.#notes.follow("player", this.ctx.player, "player");
        this.#setPhase("finale"); this.#emitHud();
        this.#prompt("All questions answered! Enjoy a short forest song.");
        this.#stopFinale = sfx.serenadeFinale();
        // A fixed visual outro, never an audio-ended/score/frog-count gate (also works muted/offline).
        this.#later(SERENADE_FINALE_DURATION_MS, () => {
            this.#stopFinale?.(); this.#stopFinale = undefined;
            this.#complete();
        });
    }
    #complete(): void {
        this.ctx.player.stopFlute(); this.#notes.stop("player"); this.ctx.player.setInputLocked(true);
        this.#setPhase("complete"); this.#emitHud(); this.#prompt(null); this.#syncLabels();
        this.ctx.emit({ type: "complete", summary: this.#session.summary() });
    }
    #feet(): { x: number; y: number } { const body = this.ctx.player.body as Phaser.Physics.Arcade.Body; return { x: body.center.x, y: body.center.y }; }
    #emitHud(questionNumber = this.#session.quiz.currentNumber): void {
        this.ctx.emit({ type: "progress", progress: this.snapshot() });
        this.ctx.emit({ type: "hud", caught: this.#session.quiz.correctCount, answered: this.#session.quiz.answeredCount,
            total: this.#session.quiz.total, questionNumber, misses: this.#session.misses, mode: this.#session.mode });
    }
    #setPhase(phase: SerenadePhase): void { this.#phase = phase; this.ctx.emit({ type: "phase", phase }); this.#label?.setVisible(phase === "idle"); }
    #prompt(message: string | null): void { this.ctx.emit({ type: "prompt", message }); }
    update(time: number): void {
        if (time < this.#nextVisibility) return;
        this.#nextVisibility = time + 120;
        const view = this.ctx.scene.cameras.main.worldView;
        this.#frogs.forEach(({ sprite }) => {
            const visible = view.contains(sprite.x, sprite.y);
            sprite.setVisible(visible);
            if (visible) sprite.anims.resume();
            else if (sprite.getData("state") !== "approaching") sprite.anims.pause();
        });
        this.#syncLabels(); this.#notes.update();
    }

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
        this.#generation += 1; this.#closeGate.cancel(); this.#nextVisibility = 0; this.#phase = "idle";
        this.#stopFinale?.(); this.#stopFinale = undefined; this.#notes.clear();
        this.#timers.forEach((timer) => timer.remove(false)); this.#timers.clear();
        this.#tweens.forEach((tween) => tween.remove()); this.#tweens.clear();
        this.#label?.destroy(); this.#label = undefined;
        this.#frogs.forEach(({ sprite, label }) => { sprite.destroy(); label.destroy(); }); this.#frogs.clear(); this.#landings.clear();
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
