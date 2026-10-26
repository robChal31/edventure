import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CatchingBugsSession, CRICKETS_PER_ROUND } from "../src/game/activities/catching-bugs/catching-bugs-session";
import {
    CATCH_RANGE,
    CRICKET_RADIUS,
    CRICKET_SPACING,
    moveCricket,
    nearestCricket,
    readCricketField,
    releaseCricket,
    spawnCrickets,
    type CricketField,
} from "../src/game/activities/catching-bugs/cricket-motion";
import { FARM_MAP } from "../src/game/world/maps/farm-map";
import { WORLD_MAPS } from "../src/game/world/maps/map-registry";
import { getActivity } from "../src/quiz/activities";
import { QuizSession } from "../src/quiz/quiz-session";
import type { AnswerValue, PlayableQuiz, Question } from "../src/quiz/types";

const choice = (choiceIndex: number): AnswerValue => ({ type: "multiple_choice", choiceIndex });
function makeQuiz(count: number, mode?: PlayableQuiz["mode"]): PlayableQuiz {
    return {
        id: "bugs-test",
        name: "Any subject",
        activityId: "catching_bugs",
        mode,
        questions: Array.from({ length: count }, (_, index) => ({
            id: `q${index}`,
            type: "multiple_choice",
            text: `Question ${index}`,
            options: ["a", "b", "c", "d"],
            correctIndex: index % 4,
        })),
    };
}

function randomGenerator(): () => number {
    let state = 1729;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

test("bugs: one cricket per question, fixed capacity and a smaller final round", () => {
    const session = new CatchingBugsSession(makeQuiz(12));
    assert.equal(session.capacity, CRICKETS_PER_ROUND);
    assert.equal(session.roundCount, 3);
    assert.equal(session.advanceRound(), false);
    const batchSizes: number[] = [];
    const seen = new Set<number>();
    do {
        const indices = session.questionIndices;
        batchSizes.push(indices.length);
        // Catch freely, not in the authored question order.
        for (const index of indices.reverse()) {
            assert.equal(seen.has(index), false);
            seen.add(index);
            assert.equal(session.answer(index, choice(index % 4))?.correct, true);
        }
    } while (session.advanceRound());

    assert.deepEqual(batchSizes, [5, 5, 2]);
    assert.equal(seen.size, 12);
    assert.equal(session.quiz.isComplete, true);
    assert.equal(session.summary().correct, 12);
    assert.deepEqual(session.summary().records.map((record) => record.question.id),
        Array.from({ length: 12 }, (_, i) => `q${i}`));
    assert.equal(session.answer(0, choice(0)), null);
});

test("bugs: practice releases the same question, counts misses and only scores its final answer", () => {
    const session = new CatchingBugsSession(makeQuiz(2, "practice"));
    const first = session.answer(1, choice(0));
    assert.equal(first?.retryable, true);
    assert.equal(first?.question.id, "q1");
    assert.equal(first?.isLast, false);
    assert.equal(session.answer(1, choice(2))?.retryable, true);
    assert.equal(session.misses, 2);
    assert.equal(session.quiz.answeredCount, 0);
    assert.deepEqual(session.questionIndices, [0, 1]);
    assert.equal(session.advanceRound(), false);

    session.answer(0, choice(0));
    const retried = session.answer(1, choice(1));
    assert.equal(retried?.question.id, first?.question.id);
    assert.equal(retried?.retryable, false);
    assert.equal(retried?.isLast, true);
    assert.equal(session.summary().incorrect, 0);
    assert.equal(session.summary().correct, 2);
    assert.equal(session.summary().misses, 2);
    assert.equal(session.summary().records.length, 2);
    assert.equal(session.summary().mode, "practice");
});

test("bugs: assessment defaults to one attempt, with no barn lives or timeout", () => {
    const session = new CatchingBugsSession(makeQuiz(2));
    assert.equal(session.mode, "assessment");
    assert.equal(session.answer(1, choice(0))?.retryable, false);
    assert.equal(session.answer(1, choice(1)), null);
    assert.equal(session.misses, 1);
    assert.deepEqual(session.questionIndices, [0]);
    session.answer(0, choice(0));
    assert.equal(session.quiz.isComplete, true);
    assert.equal(session.summary().correct, 1);
    assert.equal(session.summary().incorrect, 1);
    assert.equal(session.summary().misses, 1);
});

test("bugs: future rounds and invalid indices cannot answer or add misses", () => {
    const session = new CatchingBugsSession(makeQuiz(9));
    for (const index of [-1, 0.5, NaN, Infinity, 5, 8, 100]) {
        assert.equal(session.answer(index, choice(0)), null);
    }
    assert.equal(session.quiz.answeredCount, 0);
    assert.equal(session.misses, 0);
    assert.equal(session.advanceRound(), false);
});

test("bugs: mixed question types and subjects are graded by QuizSession", () => {
    const questions: Question[] = [
        { id: "math", subject: "Mathematics", type: "multiple_choice", text: "2 + 2?", options: ["3", "4"], correctIndex: 1 },
        { id: "science", subject: "Science", type: "true_false", text: "The Sun is a star.", correctAnswer: true },
        { id: "language", subject: "Bahasa Indonesia", type: "short_answer", text: "Lawan kata panas?", acceptedAnswers: ["dingin"] },
    ];
    const session = new CatchingBugsSession({ ...makeQuiz(0, "practice"), questions });
    assert.equal(session.answer(2, { type: "short_answer", text: "hangat" })?.retryable, true);
    assert.equal(session.answer(2, { type: "short_answer", text: " DINGIN! " })?.correct, true);
    assert.equal(session.answer(0, choice(1))?.correct, true);
    assert.equal(session.answer(1, { type: "true_false", value: true })?.isLast, true);
    assert.equal(session.summary().correct, 3);
    assert.equal(session.summary().misses, 1);
});

test("bugs: zero, one and exact-capacity question counts finish without extra rounds", () => {
    for (const count of [0, 1, 5, 10]) {
        const session = new CatchingBugsSession(makeQuiz(count));
        let spawned = 0;
        do {
            spawned += session.questionIndices.length;
            for (const index of session.questionIndices) session.answer(index, choice(index % 4));
        } while (session.advanceRound());
        assert.equal(spawned, count);
        assert.equal(session.quiz.isComplete, true);
        assert.equal(session.advanceRound(), false);
    }
    for (const capacity of [0, -1, 0.5, NaN, Infinity]) {
        assert.throws(() => new CatchingBugsSession(makeQuiz(1), capacity), RangeError);
    }
});

test("QuizSession: spatial answers do not alter sequential defaults or overwrite a resolved target", () => {
    const session = new QuizSession(makeQuiz(3));
    assert.equal(session.submitAnswerFor(2, choice(2))?.question.id, "q2");
    assert.equal(session.currentQuestion?.id, "q0");
    assert.equal(session.submitAnswer(choice(0))?.question.id, "q0");
    assert.equal(session.currentQuestion?.id, "q1");
    assert.equal(session.submitAnswerFor(2, choice(0)), null);
    assert.equal(session.submitAnswer(choice(1))?.isLast, true);
    assert.equal(session.submitAnswer(choice(0)), null);
    assert.deepEqual(session.summary().records.map((record) => record.question.id), ["q0", "q1", "q2"]);
});

const field: CricketField = { x: 184, y: 104, width: 200, height: 192 };
function assertInside(point: { x: number; y: number }, area = field): void {
    assert.ok(point.x >= area.x + CRICKET_RADIUS && point.x <= area.x + area.width - CRICKET_RADIUS);
    assert.ok(point.y >= area.y + CRICKET_RADIUS && point.y <= area.y + area.height - CRICKET_RADIUS);
}

test("bugs: random separated spawns animate in place without autonomous translation", () => {
    for (const random of [randomGenerator(), () => 0, () => 0.5, () => 0.9999]) {
        const motions = spawnCrickets(field, 5, random);
        assert.equal(motions.length, 5);
        const before = structuredClone(motions);
        motions.forEach((motion, index) => {
            assertInside(motion);
            for (const other of motions.slice(index + 1)) {
                assert.ok(Math.hypot(motion.x - other.x, motion.y - other.y) >= CRICKET_SPACING);
            }
        });
        for (let frame = 0; frame < 12000; frame += 1) {
            motions.forEach((motion) => moveCricket(motion, field, frame % 100 === 0 ? 60000 : 16));
        }
        assert.deepEqual(motions, before);
    }
    assert.notDeepEqual(spawnCrickets(field, 5, randomGenerator()), spawnCrickets(field, 5, () => 0.9));
    assert.deepEqual(spawnCrickets(field, 0), []);
    for (const count of [-1, 0.5, NaN, Infinity]) assert.throws(() => spawnCrickets(field, count), RangeError);
});

test("bugs: wrong-answer release darts smoothly inside fences then stops, even in a corner", () => {
    for (const x of [field.x + CRICKET_RADIUS, field.x + field.width / 2, field.x + field.width - CRICKET_RADIUS]) {
        for (const y of [field.y + CRICKET_RADIUS, field.y + field.height / 2, field.y + field.height - CRICKET_RADIUS]) {
            const motion = { x, y, vx: 0, vy: 0, cooldown: 0 };
            releaseCricket(motion, field, { x: field.x + field.width / 2, y: field.y + field.height / 2 });
            assert.equal(motion.x, x); // No initial teleport.
            assert.equal(motion.y, y);
            assert.ok(motion.cooldown > 0);
            for (const delta of [-1, 0, NaN, Infinity]) {
                const before = { ...motion };
                moveCricket(motion, field, delta);
                assert.deepEqual(motion, before);
            }
            for (let frame = 0; frame < 80; frame += 1) {
                const before = { ...motion };
                moveCricket(motion, field, 16);
                assertInside(motion);
                assert.ok(Math.hypot(motion.x - before.x, motion.y - before.y) < 0.7);
            }
            assert.ok(Math.hypot(motion.x - x, motion.y - y) > 8);
            assert.equal(motion.cooldown, 0);
            assert.equal(motion.vx, 0);
            assert.equal(motion.vy, 0);
            const stopped = { ...motion };
            for (let frame = 0; frame < 100; frame += 1) moveCricket(motion, field, 100);
            assert.deepEqual(motion, stopped);
        }
    }
});

test("bugs: primary action requires proximity and selects one nearest available cricket", () => {
    const motions = spawnCrickets(field, 3, () => 0.5);
    const crickets = motions.map((motion, index) => ({ questionIndex: index, motion }));
    const player = { x: 220, y: 160 };
    Object.assign(motions[0], { x: player.x + CATCH_RANGE + 1, y: player.y });
    Object.assign(motions[1], { x: player.x + 10, y: player.y });
    Object.assign(motions[2], { x: player.x + 20, y: player.y });
    assert.equal(nearestCricket(player, crickets)?.questionIndex, 1);
    motions[1].cooldown = 1;
    assert.equal(nearestCricket(player, crickets)?.questionIndex, 2);
    motions[2].cooldown = 1;
    assert.equal(nearestCricket(player, crickets), null);
});

test("farm: authored field is fixed-size and avoids every fence, water tile and barn", () => {
    const farm = JSON.parse(readFileSync("public/assets/images/levels/farm/barn.json", "utf8"));
    assert.equal(farm.width * farm.tilewidth, 640);
    assert.equal(farm.height * farm.tileheight, 320);
    const area = readCricketField(farm.layers.find((layer: { name: string }) => layer.name === "catching_bugs").objects);
    assert.deepEqual(area, field);
    for (const name of ["fence", "water"]) {
        const data: number[] = farm.layers.find((layer: { name: string }) => layer.name === name).data;
        for (let y = Math.floor(area.y / 16); y <= Math.floor((area.y + area.height - 1) / 16); y += 1) {
            for (let x = Math.floor(area.x / 16); x <= Math.floor((area.x + area.width - 1) / 16); x += 1) {
                assert.equal(data[y * farm.width + x], 0, `${name} at ${x},${y}`);
            }
        }
    }
    const barn = farm.layers.find((layer: { name: string }) => layer.name === "barn").objects[0];
    assert.ok(area.x + area.width < barn.x);
    assert.equal(WORLD_MAPS.farm, FARM_MAP);
    assert.equal(getActivity("catching_bugs").available, true);
    for (const missing of [[], [{ name: "cricket_field", x: 0, y: 0, width: 10, height: 10 }]]) {
        assert.throws(() => readCricketField(missing), /cricket_field/);
    }
});

test("farm: all tilesets and original net/cricket atlases are preloaded from real files", () => {
    const pack: { path: string; files: { key: string; url?: string; atlasURL?: string; textureURL?: string }[] }[] =
        JSON.parse(readFileSync("public/assets/data/assets.json", "utf8"));
    const entries = pack.flatMap((group) => group.files.map((file) => ({ ...file, path: group.path })));
    assert.equal(new Set(entries.map((entry) => entry.key)).size, entries.length);
    for (const { assetKey } of FARM_MAP.tilesets) {
        const entry = entries.find((file) => file.key === assetKey)!;
        assert.ok(entry, `asset ${assetKey}`);
        assert.ok(existsSync(resolve("public", entry.path, entry.url!)));
    }
    for (const key of ["PLAYER_CATCHING_NET", "CRICKET"]) {
        const entry = entries.find((file) => file.key === key)!;
        assert.ok(existsSync(resolve("public", entry.path, entry.textureURL!)));
        const atlas = JSON.parse(readFileSync(resolve("public", entry.path, entry.atlasURL!), "utf8"));
        assert.ok(Object.keys(atlas.frames).length > 0);
        const tags = atlas.meta.frameTags.map((tag: { name: string }) => tag.name);
        assert.deepEqual(tags, key === "CRICKET" ? ["move"] : ["front_net_catch", "back_net_catch", "side_net_catch"]);
    }
});
