import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type Phaser from "phaser";
import { SYSTEM_QUESTS, systemQuestText } from "../src/i18n/system-quests";
import { hasTranslation, translate } from "../src/i18n/translate";
import { seedQuizzes } from "../src/lms/seed";
import { ACTIVITIES } from "../src/quiz/activities";
import { EQUIPMENT } from "../src/game/equipment/equipment";
import { CORRECT_REVEAL_MS } from "../src/quiz/reward-feedback";
import { CapturePopups } from "../src/game/activities/capture-popup";
import { ASSET_KEYS } from "../src/game/common/assets";
import { sfx } from "../src/game/common/audio/sfx";
import { shouldShowTouchControls } from "../src/components/student/use-touch-controls";
import QuestBoard from "../src/components/student/hub/quest-board";
import QuestionCard from "../src/components/student/questions/question-card";
import ResultsScreen from "../src/components/student/results-screen";
import GameMenu from "../src/components/student/game-menu";
import ActivityHud from "../src/components/student/activity-hud";
import type { Question, QuizSummary } from "../src/quiz/types";

const id = (message: string) => translate("id", message);
const en = (message: string) => translate("en", message);

test("system quest metadata: all shipped quests and legacy browser fields localize both ways without rewriting data", () => {
    const quizzes = seedQuizzes(), original = JSON.stringify(quizzes);
    assert.deepEqual(Object.keys(SYSTEM_QUESTS).sort(), quizzes.map(quiz => quiz.id).sort());
    for (const quiz of quizzes) for (const field of ["name", "description"] as const) {
        const copy = SYSTEM_QUESTS[quiz.id][field];
        assert.ok(hasTranslation(copy.message), copy.message);
        assert.equal(systemQuestText(quiz.id, field, quiz[field], en), copy.message);
        assert.equal(systemQuestText(quiz.id, field, quiz[field], id), id(copy.message));
        assert.notEqual(id(copy.message), copy.message);
        for (const legacy of copy.legacy ?? []) assert.equal(systemQuestText(quiz.id, field, legacy, en), copy.message);
    }
    assert.equal(JSON.stringify(quizzes), original);
});

test("system quest metadata: arbitrary teacher names and independently customized fields NEVER enter the translator", () => {
    const rejectTranslation = () => { throw Error("Teacher content must not enter the translator"); };
    for (const value of ["Questions", "Forest Serenade", "Nama kuis guru", "Cricket di Ladang"]) {
        assert.equal(systemQuestText("teacher-created", "name", value, rejectTranslation), value);
        assert.equal(systemQuestText("__proto__", "name", value, rejectTranslation), value);
    }
    const quiz = seedQuizzes()[0];
    assert.equal(systemQuestText(quiz.id, "name", "Forest Serenade — class A", rejectTranslation), "Forest Serenade — class A");
    assert.equal(systemQuestText(quiz.id, "description", "Description edited by teacher", rejectTranslation), "Description edited by teacher");
    assert.equal(systemQuestText(quiz.id, "name", quiz.name, id), "Senandung Hutan");
});

test("system UI: quest cards translate seeded metadata, NEW, question counts, practice and activity labels together", () => {
    const quizzes = seedQuizzes();
    const html = renderToStaticMarkup(createElement(QuestBoard, {
        controls: { ready: true, startQuiz: () => {}, setOverlayOpen: () => {} }, buildQuiz: () => null, autoOpen: true,
        quests: quizzes.map(quiz => ({ quizId: quiz.id, name: quiz.name, description: quiz.description, activityId: quiz.activityId,
            mode: quiz.mode, questionCount: quiz.questionIds.length, questionTypes: ["true_false" as const], attempts: 0, bestScore: null })),
    }));
    for (const quiz of quizzes) {
        assert.ok(html.includes(systemQuestText(quiz.id, "name", quiz.name, id)));
        assert.equal(html.includes(`>${quiz.name}</h3>`), false);
    }
    for (const copy of ["NEW!", "Practice", "Assessment", "Play", "Catching Bugs", "Fishing", "Forest Serenade"]) assert.ok(html.includes(id(copy)), copy);
    assert.ok(html.includes("7 soal"));
});

const question: Question = {
    id: "authored", schoolId: null, type: "multiple_choice", text: "Questions", explanation: "Empty hands",
    options: ["Forest Serenade", "Catching Bugs"], correctIndex: 0, createdAt: "2026-10-23", updatedAt: "2026-10-23",
};

test("system/content boundary: question prose, choices and explanation keep their authored language even when equal to UI keys", () => {
    const original = JSON.stringify(question);
    const html = renderToStaticMarkup(createElement(QuestionCard, { question, questionNumber: 1, total: 1,
        reveal: { correct: true, correctAnswer: question.options[0], answer: { type: "multiple_choice", choiceIndex: 0 } }, onAnswer: () => {} }));
    for (const content of ["Questions", "Forest Serenade", "Catching Bugs", "Empty hands"]) assert.ok(html.includes(content), content);
    assert.ok(html.includes(id("Multiple choice")));
    assert.equal(html.includes("Senandung Hutan"), false);
    assert.equal(JSON.stringify(question), original);
    const summary: QuizSummary = { quizId: "quiz-sample-catching-bugs", quizName: "Cricket di Ladang", activityId: "catching_bugs",
        total: 1, correct: 1, incorrect: 0, mode: "practice", misses: 1,
        records: [{ question, answer: { type: "multiple_choice", choiceIndex: 0 }, correct: true }] };
    const result = renderToStaticMarkup(createElement(ResultsScreen, { summary, primary: { label: "Play", onClick: () => {} }, secondary: { label: "Continue", onClick: () => {} } }));
    assert.ok(result.includes("Jangkrik di Ladang"));
    assert.ok(result.includes("Questions"));
    assert.ok(result.includes("Forest Serenade"));
    assert.equal(summary.quizName, "Cricket di Ladang", "durable result stays unlocalized");
});

test("system UI: every activity/mechanic/tool message is a canonical key with a localized pair", () => {
    for (const activity of ACTIVITIES) {
        const messages = [activity.label, activity.location, activity.quickInstruction, activity.tagline, activity.guide.goal,
            ...activity.guide.steps, ...activity.guide.controls.flat(),
            ...Object.values(activity.copy).flatMap(value => typeof value === "object" ? Object.values(value) : [value])];
        for (const copy of messages) if (/[A-Za-z]{2}/.test(copy)) {
            assert.ok(hasTranslation(copy), copy);
            assert.equal(en(copy), copy, `canonical system key: ${copy}`);
        }
    }
    for (const tool of Object.values(EQUIPMENT)) for (const copy of [tool.label, tool.actionLabel, tool.hint]) assert.ok(hasTranslation(copy), copy);
    for (const copy of ["Guide", "Replay instructions", "Details", "Quick guide"]) assert.ok(hasTranslation(copy), copy);
    assert.equal(id("Flute"), "Seruling");
    assert.equal(id("Round 1/2 · 5 crickets. Find ? and use the net!"), "Ronde 1/2 · 5 jangkrik. Cari tanda ? dan pakai jaring!");
    assert.equal(en("Ronde 1/2 · 5 jangkrik. Cari tanda ? dan pakai jaring!"), "Round 1/2 · 5 crickets. Find ? and use the net!");
});

test("touch controls: primary capability, never viewport width; active keyboard/mouse wins and touch/pen can restore", () => {
    assert.equal(shouldShowTouchControls(false, null), false, "desktop first view");
    assert.equal(shouldShowTouchControls(true, null), true, "phone/tablet first view");
    for (const coarse of [true, false]) {
        assert.equal(shouldShowTouchControls(coarse, "keyboard-mouse"), false);
        assert.equal(shouldShowTouchControls(coarse, "touch"), true);
    }
});

const menuProps = {
    open: false, onOpenChange: () => {}, help: { label: "Guide" as const, onClick: () => {} },
    leave: { label: "Save / exit", onClick: () => {} },
    music: { available: true, enabled: true, playing: false }, onMusicChange: () => {},
};

test("game menu: closed by default with exactly one corner button; all utility actions live inside its hidden panel", () => {
    const html = renderToStaticMarkup(createElement(GameMenu, menuProps));
    const [chrome, panel] = html.split("<dialog");
    assert.equal((chrome.match(/<button /g) ?? []).length, 1);
    assert.ok(chrome.includes('aria-label="Menu game"'));
    assert.ok(chrome.includes('aria-haspopup="dialog"'));
    assert.ok(chrome.includes('aria-expanded="false"'));
    assert.ok(chrome.includes('game-menu-icon'));
    assert.equal(/<dialog[^>]*\sopen(?:[= >])/.test(html), false, "native dialog stays hidden until showModal after a click");
    for (const copy of ["Guide", "Language", "Save / exit", "Music on"]) {
        assert.equal(chrome.includes(`>${id(copy)}<`), false);
        assert.ok(panel.includes(id(copy)), copy);
    }
    const controls = chrome.match(/aria-controls="([^"]+)"/)![1];
    assert.ok(panel.includes(`id="${controls}"`));
});

test("game menu: expanded panel combines Guide, flag/code-only language, optional music and Save / exit", () => {
    const html = renderToStaticMarkup(createElement(GameMenu, { ...menuProps, open: true }));
    assert.ok(html.includes('aria-expanded="true"'));
    assert.ok(html.includes('aria-modal="true"'));
    for (const copy of ["Game menu", "Close menu", "Settings", "Language", "Guide", "Save / exit", "Continue", "Music on", "Music off"]) {
        assert.ok(hasTranslation(copy), copy);
        assert.equal(en(copy), copy);
    }
    assert.equal((html.match(/data-language-flag=/g) ?? []).length, 2);
    for (const code of ["ID", "EN"]) assert.ok(html.includes(`aria-hidden="true">${code}</span>`));
    assert.ok(html.includes('aria-pressed="true" aria-label="Bahasa Indonesia"'));
    assert.ok(html.includes('aria-pressed="false" aria-label="English"'));
    assert.equal(html.includes(">Bahasa Indonesia<"), false);
    assert.equal(html.includes(">English<"), false);
    assert.equal(html.includes('role="combobox"'), false);
    assert.ok(html.includes('game-menu-guide'));
    assert.ok(html.includes('game-menu-leave'));
    const unavailable = renderToStaticMarkup(createElement(GameMenu, { ...menuProps, leave: undefined,
        help: { label: "Help", onClick: () => {} }, music: { ...menuProps.music, available: false } }));
    assert.equal(unavailable.includes(id("Music on")), false);
    assert.equal(unavailable.includes("game-menu-leave"), false);
    assert.ok(unavailable.includes(id("Help")));
});

test("game menu: refresh suspension collapses the panel state; failed saving still has an accessible warning on the lone trigger", () => {
    const html = renderToStaticMarkup(createElement(GameMenu, { ...menuProps, open: true, suspended: true, saveError: true }));
    const [chrome] = html.split("<dialog");
    assert.ok(chrome.includes('aria-expanded="false"'));
    assert.equal((chrome.match(/<button /g) ?? []).length, 1);
    assert.ok(chrome.includes('role="status"'));
    assert.ok(chrome.includes(id("Progress not saved")));
    assert.ok(chrome.includes('aria-describedby='));
});

test("activity HUD: left completion/round/mode remain; right avatar, caught and miss card are removed", () => {
    const html = renderToStaticMarkup(createElement(ActivityHud, { roomName: "An authored title", questionNumber: 6, total: 7,
        answered: 5, round: 2, rounds: 2, mode: "practice" }));
    assert.ok(html.includes("An authored title"));
    assert.ok(html.includes(translate("id", "Completed {answered}/{total}", { answered: 5, total: 7 })));
    assert.ok(html.includes(id("Practice")));
    assert.ok(html.includes('role="progressbar"'));
    assert.ok(html.includes('aria-valuenow="5"'));
    assert.ok(html.includes('aria-valuemax="7"'));
    assert.equal(Number(html.match(/style="width:([\d.]+)%"/)?.[1]), 5 / 7 * 100);
    for (const removed of ["activity-hud-right", "character-portrait", id("Miss:"), id("Caught"), "<button"]) {
        assert.equal(html.includes(removed), false, removed);
    }
    const screen = readFileSync("src/components/student/game-screen.tsx", "utf8");
    assert.equal((screen.match(/<GameMenu /g) ?? []).length, 1, "hub/activities share one menu instance");
    for (const removed of ["GameSettings", "activity-menu", "hud.caught", "hud.misses", "scoreLabel="]) assert.equal(screen.includes(removed), false, removed);
});

test("activity HUD simplification never removes grading/misses from the separate final results", () => {
    const summary: QuizSummary = { quizId: "custom", quizName: "Authored name", activityId: "catching_bugs", total: 7,
        correct: 2, incorrect: 5, mode: "practice", misses: 8, records: [] };
    const html = renderToStaticMarkup(createElement(ResultsScreen, { summary, primary: { label: "Play", onClick: () => {} },
        secondary: { label: "Continue", onClick: () => {} } }));
    assert.ok(html.includes(id("Miss")));
    assert.ok(html.includes(id("Caught")));
    assert.ok(html.includes("29%"));
    assert.ok(html.includes('>8</div>'));
    assert.equal(summary.misses, 8);
    assert.equal(summary.correct, 2);
});

class RewardObject {
    name = ""; destroyed = false; active = true; scale = 1;
    constructor(public x: number, public y: number, public text?: string, public texture?: string, public style?: Record<string, unknown>) {}
    setName(name: string) { this.name = name; return this; }
    setOrigin() { return this; } setDepth() { return this; }
    setScale(scale: number) { this.scale = scale; return this; }
    destroy() { this.destroyed = true; this.active = false; }
}
function rewardScene() {
    const objects: RewardObject[] = [], tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [], removed: unknown[] = [], killed: unknown[] = [];
    return { objects, tweens, removed, killed, scene: {
        add: {
            text: (x: number, y: number, text: string, style: Record<string, unknown>) => { const o = new RewardObject(x, y, text, undefined, style); objects.push(o); return o; },
            image: (x: number, y: number, key: string) => { const o = new RewardObject(x, y, undefined, key); objects.push(o); return o; },
        },
        tweens: {
            add: (config: Phaser.Types.Tweens.TweenBuilderConfig) => { tweens.push(config); return { remove: () => removed.push(config) }; },
            killTweensOf: (object: unknown) => killed.push(object),
        },
    } as unknown as Phaser.Scene };
}

test("reward rollback: original unboxed 9px yellow +1, 17px rise and 180+1050ms subtle fade; no scale/burst", () => {
    assert.equal(CORRECT_REVEAL_MS, 2200, "the separate question-card reveal is not rolled back");
    const fake = rewardScene(), rewards = new CapturePopups(fake.scene);
    rewards.show(42.1, 25.4);
    assert.equal(fake.objects.length, 1, "only the original text, no new star burst");
    const label = fake.objects[0];
    assert.equal(label.name, "capture-plus-one"); assert.equal(label.text, "+1");
    assert.deepEqual({ x: label.x, y: label.y, scale: label.scale }, { x: 42, y: 25, scale: 1 });
    assert.deepEqual(label.style, { fontFamily: '\"Press Start 2P\"', fontSize: "9px", color: "#fef08a", stroke: "#285b3d", strokeThickness: 2 });
    assert.equal(fake.tweens.length, 1);
    const tween = fake.tweens[0];
    assert.equal(tween.targets, label); assert.equal(tween.y, 8); assert.equal(tween.alpha, 0);
    assert.equal(tween.delay, 180); assert.equal(tween.duration, 1050); assert.equal(tween.ease, "Sine.out");
    assert.equal(tween.scale, undefined);
    rewards.clear();
    assert.equal(fake.removed.length, 1); assert.ok(label.destroyed);
    rewards.clear(); assert.equal(fake.removed.length, 1, "cleanup stays idempotent");
    rewards.show(5, 9);
    assert.equal(fake.objects.length, 2, "next run can show the original popup normally");
    (fake.tweens[1].onComplete as (() => void))();
    assert.ok(fake.objects.every(object => object.destroyed));
    rewards.clear(); assert.equal(fake.removed.length, 1, "completed popup is no longer owned");
});

/** Exercise the actual effects class with Phaser's tiny random/texture surface, not a browser renderer. */
function fishingFeedback() {
    const sandboxModule = { exports: {} };
    const compiled = ts.transpileModule(readFileSync("src/game/activities/fishing/effects/feedback-effects.ts", "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    runInNewContext(compiled, { module: sandboxModule, exports: sandboxModule.exports, require: (path: string) => {
        if (path === "phaser") return { Math: { Between: (min: number) => min } };
        if (path.endsWith("/locale")) return { getLocale: () => "en" };
        if (path.endsWith("/translate")) return { translate };
        if (path.endsWith("/depth-config")) return { DEPTH_CONFIG: { WORLD_UI: 100 } };
        if (path.endsWith("/fishing-textures")) return { FISHING_TEXTURE_KEYS: { SPARKLE: "lw_sparkle", EXCLAIM: "lw_exclaim" } };
        throw new Error(`Unexpected effects dependency: ${path}`);
    } });
    return sandboxModule.exports as typeof import("../src/game/activities/fishing/effects/feedback-effects");
}

test("reward rollback: Fishing keeps its original green popup and native sparkles, with safe restart/travel cleanup", () => {
    const { FeedbackEffects } = fishingFeedback(), fake = rewardScene(), effects = new FeedbackEffects(fake.scene);
    effects.sparkles(20, 40);
    effects.popup("+1", 20, 24, "#4ade80");
    assert.equal(fake.objects.length, 9);
    assert.ok(fake.objects.slice(0, 8).every(object => object.texture === "lw_sparkle"));
    const label = fake.objects[8];
    assert.equal(label.text, "+1"); assert.equal(label.style?.fontSize, "10px");
    assert.equal(label.style?.color, "#4ade80"); assert.equal(label.style?.backgroundColor, undefined);
    const popup = fake.tweens[8];
    assert.equal(popup.y, 2); assert.equal(popup.alpha, 0);
    assert.equal(popup.delay, 250); assert.equal(popup.duration, 900);
    effects.clear();
    assert.equal(fake.killed.length, 9); assert.ok(fake.objects.every(object => object.destroyed));
    effects.clear(); assert.equal(fake.killed.length, 9);
    effects.exclaim(20, 40);
    effects.clear(); assert.equal(fake.killed.length, 10, "also clears a bite indicator's nested tweens");
    effects.popup("+1", 10, 10, "#4ade80");
    (fake.tweens.at(-1)!.onComplete as (() => void))();
    effects.clear(); assert.equal(fake.killed.length, 10, "finished effects are no longer owned");
});

test("reward rollback: activity placement/timing are restored without reverting the question reveal or audio", () => {
    const bugs = readFileSync("src/game/activities/catching-bugs/catching-bugs-activity.ts", "utf8");
    const fishing = readFileSync("src/game/activities/fishing/fishing-activity.ts", "utf8");
    const serenade = readFileSync("src/game/activities/forest-serenade/serenade-activity.ts", "utf8");
    assert.ok(bugs.includes("this.#later(920, () => this.#finishTarget(target, outcome))"));
    assert.ok(bugs.includes("sfx.capture()"));
    assert.ok(fishing.includes('this.#feedback.popup("+1", this.player.x, this.player.y - 28, "#4ade80")'));
    assert.ok(fishing.includes("this.#feedback.clear()"));
    assert.ok(fishing.includes("sfx.fishLeap()"));
    assert.ok(serenade.includes("this.#popups.show(frog.sprite.x, frog.sprite.y - 15)"));
    assert.equal(serenade.includes("this.#popups.show(this.ctx.player"), false, "+1 returns to the frog landing, not the player");
    assert.ok(serenade.includes("Math.max(1350, travel + 650)"));
    for (const activity of [bugs, fishing, serenade]) assert.equal(activity.includes("WORLD_REWARD_MS"), false);
    assert.ok(bugs.includes("CORRECT_REVEAL_MS")); assert.ok(serenade.includes("CORRECT_REVEAL_MS"));
});

test("reward rollback: unused Shine preload is removed, but original pack artwork is never deleted", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8"));
    const assets = pack.flatMap((group: { files: { key: string }[] }) => group.files);
    assert.equal(assets.some((asset: { key: string }) => asset.key === "REWARD_SHINE"), false);
    assert.equal("REWARD_SHINE" in ASSET_KEYS, false);
    const png = readFileSync("public/assets/images/farm asset pack/Character/Character/Others/Shine.png");
    assert.equal(png.readUInt32BE(16), 32); assert.equal(png.readUInt32BE(20), 16);
});

test("reward audio: distinct bounded capture/leap cues degrade safely without audio support", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "window");
    const tones: { from?: number; to?: number; end?: number }[] = [];
    const gains: number[] = [];
    class Audio {
        state = "running"; currentTime = 10; sampleRate = 8000;
        createOscillator() {
            const tone: typeof tones[number] = {}; tones.push(tone);
            return { type: "sine", frequency: { setValueAtTime: (n: number) => { tone.from = n; }, exponentialRampToValueAtTime: (n: number) => { tone.to = n; } },
                connect: () => ({ connect: () => {} }), start: () => {}, stop: (end: number) => { tone.end = end; } };
        }
        createGain() { return { gain: { setValueAtTime: (n: number) => gains.push(n), exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
        createBuffer(_channels: number, frames: number) { return { getChannelData: () => new Float32Array(frames) }; }
        createBufferSource() { return { buffer: null, connect: () => ({ connect: () => {} }), start: () => {} }; }
    }
    try {
        Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: Audio } });
        sfx.unlock(); sfx.capture(); const capture = tones.splice(0);
        sfx.fishLeap(); const leap = tones.splice(0);
        assert.equal(capture.length, 3); assert.equal(leap.length, 2); assert.notDeepEqual(capture, leap);
        assert.ok([...capture, ...leap].every(tone => tone.from! > 0 && tone.to! > tone.from! && tone.end! < 10.6));
        assert.ok(gains.every(gain => gain > 0 && gain <= 0.07));
        Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
        assert.doesNotThrow(() => { sfx.capture(); sfx.fishLeap(); });
    } finally {
        if (original) Object.defineProperty(globalThis, "window", original);
        else Reflect.deleteProperty(globalThis, "window");
    }
});
