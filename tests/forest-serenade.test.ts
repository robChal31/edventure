import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SerenadeSession } from "../src/game/activities/forest-serenade/serenade-session";
import { inPerformanceArea, readPerformanceArea, frogLanding } from "../src/game/activities/forest-serenade/serenade-area";
import { FLUTE_ANIMATION, ALTAR_ANIMATIONS, FROG_ASSETS, frogAnimation } from "../src/game/activities/forest-serenade/serenade-assets";
import { DEEP_FOREST_MAP } from "../src/game/world/maps/deep-forest-map";
import { WORLD_MAPS } from "../src/game/world/maps/map-registry";
import { defaultEquipment, equipmentRoute } from "../src/game/equipment/equipment";
import { sanitizeCheckpoint } from "../src/lms/repositories/checkpoint-repository";
import { draftFromQuiz, saveQuiz } from "../src/lms/repositories/quiz-repository";
import { seedQuestions, seedQuizzes } from "../src/lms/seed";
import { getActivity } from "../src/quiz/activities";
import { hasTranslation } from "../src/i18n/translate";
import type { PlayableQuiz, Question } from "../src/quiz/types";

autoTests();
function autoTests(): void {
    for (const count of [1, 5, 7, 23]) {
        test(`serenade: ${count} assessment questions finish at 0%, without frogs or resource gates`, () => {
            const session = new SerenadeSession(makeQuiz(count));
            let frogs = 0;
            for (let i = 0; i < count; i += 1) {
                const result = session.answer({ type: "short_answer", text: "wrong" })!;
                assert.equal(result.retryable, false); frogs += result.frogs;
            }
            assert.equal(frogs, 0); assert.equal(session.quiz.isComplete, true);
            assert.equal(session.summary().total, count); assert.equal(session.summary().incorrect, count);
            assert.equal(session.summary().records.length, count); assert.equal(session.summary().correct, 0);
            assert.equal(session.misses, count); assert.equal(session.answer({ type: "short_answer", text: "yes" }), null);
        });
    }
}
function makeQuiz(count: number, mode: "practice" | "assessment" = "assessment"): PlayableQuiz {
    return { id: "serenade", name: "Any subject", activityId: "forest_serenade", mode,
        questions: Array.from({ length: count }, (_, i): Question => ({ id: `forest-${i}`, type: "short_answer", text: `Question ${i + 1}`, acceptedAnswers: ["yes"] })) };
}

test("serenade: each correct answer grants exactly one frog, wrong answers none, and counts remain independent", () => {
    const session = new SerenadeSession(makeQuiz(7));
    const grants = [true, false, true, false, true, true, false].map((correct) => session.answer({ type: "short_answer", text: correct ? "yes" : "no" })!.frogs);
    assert.deepEqual(grants, [1, 0, 1, 0, 1, 1, 0]); assert.equal(session.quiz.isComplete, true);
    assert.equal(session.quiz.correctCount, 4); assert.equal(session.quiz.answeredCount, 7); assert.equal(session.misses, 3);
    assert.deepEqual(session.summary().records.map((record) => record.question.id), Array.from({ length: 7 }, (_, i) => `forest-${i}`));
});

test("serenade: practice retries the same question, retains every miss and never summons a frog for a miss", () => {
    const session = new SerenadeSession(makeQuiz(2, "practice"));
    for (let i = 0; i < 3; i += 1) {
        const result = session.answer({ type: "short_answer", text: "no" })!;
        assert.equal(result.retryable, true); assert.equal(result.frogs, 0); assert.equal(session.quiz.currentQuestion?.id, "forest-0");
    }
    assert.equal(session.quiz.answeredCount, 0); assert.equal(session.misses, 3);
    assert.equal(session.answer({ type: "short_answer", text: "yes" })?.frogs, 1);
    assert.equal(session.quiz.currentQuestion?.id, "forest-1");
    session.answer({ type: "short_answer", text: "yes" });
    assert.equal(session.summary().correct, 2); assert.equal(session.summary().misses, 3); assert.equal(session.quiz.isComplete, true);
});

test("serenade: practice and assessment resume safely, including after the last submission", () => {
    for (const mode of ["practice", "assessment"] as const) {
        const quiz = makeQuiz(2, mode); const first = new SerenadeSession(quiz);
        first.answer({ type: "short_answer", text: "no" });
        if (mode === "practice") first.answer({ type: "short_answer", text: "yes" });
        const restored = new SerenadeSession(quiz, JSON.parse(JSON.stringify(first.snapshot())));
        assert.equal(restored.quiz.currentQuestion?.id, "forest-1"); assert.equal(restored.misses, 1);
        assert.equal(restored.quiz.correctCount, mode === "practice" ? 1 : 0);
        restored.answer({ type: "short_answer", text: mode === "practice" ? "yes" : "no" });
        const done = new SerenadeSession(quiz, restored.snapshot());
        assert.equal(done.quiz.isComplete, true); assert.deepEqual(done.summary(), restored.summary());
    }
});

test("serenade: the authored activity uses the original map, a deliberate flute route and generic quiz content", () => {
    assert.equal(WORLD_MAPS.deep_forest, DEEP_FOREST_MAP);
    assert.equal(defaultEquipment("forest_serenade"), "flute");
    assert.equal(equipmentRoute("flute", "forest_serenade"), "activity");
    assert.equal(equipmentRoute("flute", "fishing"), "unavailable");
    assert.equal(equipmentRoute("none", "forest_serenade"), "none");
    assert.equal(getActivity("forest_serenade").available, true);
    const sample = seedQuizzes().find((quiz) => quiz.activityId === "forest_serenade")!;
    const bank = new Set(seedQuestions().map((q) => q.id));
    assert.ok(sample.questionIds.length > 0); assert.ok(sample.questionIds.every((id) => bank.has(id)));
    const saved = saveQuiz({ ...draftFromQuiz(sample), id: "teacher-serenade", mode: "practice" });
    assert.equal(saved.mode, "practice"); assert.equal(saved.activityId, "forest_serenade");
});

test("serenade: checkpoints accept the new activity without weakening other activity validation", () => {
    const quiz = makeQuiz(1); const state = new SerenadeSession(quiz); state.answer({ type: "short_answer", text: "no" });
    const checkpoint = { version: 1, studentId: "student-a", runId: "run", startedAt: "2026-10-23T08:00:00Z", savedAt: "2026-10-23T08:00:01Z", quiz, progress: state.snapshot() };
    assert.ok(sanitizeCheckpoint(checkpoint));
    assert.equal(sanitizeCheckpoint({ ...checkpoint, quiz: { ...quiz, activityId: "invented" } }), null);
    assert.equal(new SerenadeSession(quiz, sanitizeCheckpoint(checkpoint)!.progress).quiz.isComplete, true);
});

test("serenade: the performance area is explicit, scaled, finite, visible and reachable through the original stair gap", () => {
    const raw = JSON.parse(readFileSync("public/assets/images/levels/deep_forest/deep_forest.tmj", "utf8"));
    const objects = raw.layers.find((layer: { name: string }) => layer.name === "forest_serenade").objects;
    const area = readPerformanceArea(objects)!;
    assert.ok(area); assert.ok(inPerformanceArea({ x: 488, y: 136 }, area));
    assert.equal(inPerformanceArea({ x: 488, y: 184 }, area), false);
    assert.deepEqual(readPerformanceArea(objects, 2), { x: area.x * 2, y: area.y * 2, width: area.width * 2, height: area.height * 2 });
    for (const bad of [[], [{ name: "performance_area", x: 0, y: 0, width: 0, height: 1 }], [{ ...objects[0], visible: false }], [{ ...objects[0], x: NaN }]]) assert.equal(readPerformanceArea(bad), null);
    const hill = raw.layers.find((layer: { name: string }) => layer.name === "deep_forest_hill");
    const stairs = raw.layers.find((layer: { name: string }) => layer.name === "stairs");
    assert.equal(hill.data[9 * raw.width + 30], 0); assert.ok(stairs.data[9 * raw.width + 30] > 0);
    assert.deepEqual(DEEP_FOREST_MAP.layers.collision, ["deep_forest_cliff", "deep_forest_hill"]);
});

test("serenade: both supplied frog palettes, flute and altar use actual Aseprite tags and valid preloaded exports", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8")) as { path: string; files: { key: string; textureURL?: string; atlasURL?: string; url?: string }[] }[];
    const assets = pack.flatMap((group) => group.files.map((file) => ({ ...file, path: group.path })));
    for (const [key, tags] of [["PLAYER_FLUTE", [FLUTE_ANIMATION]], ["ALTAR_ANIMATION", Object.values(ALTAR_ANIMATIONS)],
        [FROG_ASSETS.red, ["front_jump", "front_idle"]], [FROG_ASSETS.blue, ["front_jump", "front_idle"]]] as const) {
        const matches = assets.filter((asset) => asset.key === key); assert.equal(matches.length, 1);
        const asset = matches[0]; assert.ok(existsSync(`public/${asset.path}/${asset.textureURL}`));
        const data = JSON.parse(readFileSync(`public/${asset.path}/${asset.atlasURL}`, "utf8"));
        for (const name of tags) assert.ok(data.meta.frameTags.some((tag: { name: string }) => tag.name === name), name);
        for (const tag of data.meta.frameTags) for (let i = tag.from; i <= tag.to; i += 1) assert.ok(data.frames[String(i)]);
    }
    assert.notEqual(frogAnimation("red", "front_idle"), frogAnimation("blue", "front_idle"));
    for (const definition of DEEP_FOREST_MAP.tilesets) assert.ok(assets.some((asset) => asset.key === definition.assetKey), definition.name);
});

test("serenade: decorative landings stay bounded for large quizzes and all feedback has both locales", () => {
    for (let i = 0; i < 2000; i += 1) {
        const point = frogLanding(i, { x: 490, y: 123 }, { width: 640, height: 320 });
        assert.ok(point.x >= 8 && point.x <= 632 && point.y >= 8 && point.y <= 312);
    }
    const copy = getActivity("forest_serenade").copy;
    for (const message of [copy.questionCue, copy.actionLabel, copy.playAgainLabel, copy.scoreLabel, ...Object.values(copy.answerFeedback!)]) assert.ok(hasTranslation(message), message);
});
