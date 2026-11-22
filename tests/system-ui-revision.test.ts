import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type Phaser from "phaser";
import { SYSTEM_QUESTS, systemQuestText } from "../src/i18n/system-quests";
import { hasTranslation, translate } from "../src/i18n/translate";
import { seedQuizzes } from "../src/lms/seed";
import { ACTIVITIES } from "../src/quiz/activities";
import { EQUIPMENT } from "../src/game/equipment/equipment";
import { CORRECT_REVEAL_MS, WORLD_REWARD_MS } from "../src/quiz/reward-feedback";
import { CapturePopups } from "../src/game/activities/capture-popup";
import { ASSET_KEYS } from "../src/game/common/assets";
import { sfx } from "../src/game/common/audio/sfx";
import { shouldShowTouchControls } from "../src/components/student/use-touch-controls";
import QuestBoard from "../src/components/student/hub/quest-board";
import QuestionCard from "../src/components/student/questions/question-card";
import ResultsScreen from "../src/components/student/results-screen";
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

class RewardObject {
    name = ""; destroyed = false; active = true; scale = 1;
    constructor(public x: number, public y: number, public text?: string, public texture?: string, public frame?: number, public style?: object) {}
    setName(name: string) { this.name = name; return this; }
    setOrigin() { return this; } setDepth() { return this; } setTint() { return this; }
    setScale(scale: number) { this.scale = scale; return this; }
    destroy() { this.destroyed = true; this.active = false; }
}
function rewardScene(textureExists = true) {
    const objects: RewardObject[] = [], tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [], killed: unknown[] = [];
    return { objects, tweens, killed, scene: {
        textures: { exists: () => textureExists },
        add: {
            text: (x: number, y: number, text: string, style: object) => { const o = new RewardObject(x, y, text, undefined, undefined, style); objects.push(o); return o; },
            image: (x: number, y: number, key: string, frame: number) => { const o = new RewardObject(x, y, undefined, key, frame); objects.push(o); return o; },
        },
        tweens: { add: (config: Phaser.Types.Tweens.TweenBuilderConfig) => { tweens.push(config); return {}; }, killTweensOf: (object: unknown) => killed.push(object) },
    } as unknown as Phaser.Scene };
}

test("reward feedback: visible hold, bounded original-art burst and immediate owned cleanup on restart/travel", () => {
    assert.ok(CORRECT_REVEAL_MS >= 2000 && CORRECT_REVEAL_MS <= 3000);
    assert.ok(WORLD_REWARD_MS >= 1600 && WORLD_REWARD_MS <= 2500);
    const fake = rewardScene(), rewards = new CapturePopups(fake.scene, () => false);
    rewards.show(42.1, 25.4);
    const label = fake.objects[0], stars = fake.objects.slice(1);
    assert.equal(label.name, "capture-plus-one"); assert.equal(label.text, "+1");
    assert.equal(stars.length, 8);
    assert.ok(stars.every(star => star.texture === ASSET_KEYS.REWARD_SHINE && [0, 1].includes(star.frame!)));
    const fade = fake.tweens.find(tween => tween.targets === label && tween.alpha === 0)!;
    assert.ok(Number(fade.delay) >= 1200, "no immediate fade of the +1");
    assert.equal(Number(fade.delay) + Number(fade.duration), WORLD_REWARD_MS);
    rewards.clear();
    assert.equal(fake.killed.length, 9); assert.ok(fake.objects.every(object => object.destroyed));
    rewards.clear(); assert.equal(fake.killed.length, 9, "cleanup is idempotent");
    rewards.show(5, 9); assert.equal(fake.objects.length, 18, "next run can celebrate normally");
    rewards.clear();
});

test("reward feedback: reduced motion keeps a legible +1 but no position/scale tween; missing art cannot block completion", () => {
    const fake = rewardScene(), rewards = new CapturePopups(fake.scene, () => true);
    rewards.show(40, 20);
    assert.equal(fake.objects.length, 3);
    assert.ok(fake.tweens.every(tween => tween.x === undefined && tween.y === undefined && tween.scale === undefined));
    for (const tween of fake.tweens) (tween.onComplete as (() => void))?.();
    assert.ok(fake.objects.every(object => object.destroyed));
    rewards.clear(); assert.equal(fake.killed.length, 0, "finished objects leave ownership set");
    const noArt = rewardScene(false), fallback = new CapturePopups(noArt.scene, () => false);
    fallback.show(4, 8); assert.equal(noArt.objects.length, 1); fallback.clear();
});

test("reward art: preload exactly the two native 16px Shine frames from the original pixel pack", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8"));
    const assets = pack.flatMap((group: { path: string; files: { key: string; url: string; frameConfig?: object }[] }) => group.files.map(file => ({ ...file, path: group.path })));
    const shine = assets.filter((asset: { key: string }) => asset.key === ASSET_KEYS.REWARD_SHINE);
    assert.equal(shine.length, 1);
    assert.equal(shine[0].url, "Character/Character/Others/Shine.png");
    assert.deepEqual(shine[0].frameConfig, { frameWidth: 16, frameHeight: 16 });
    const png = readFileSync(`public/${shine[0].path}/${shine[0].url}`);
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
