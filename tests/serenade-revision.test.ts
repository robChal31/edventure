import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FrogGround, FROG_MOTION, distanceFromHill, frogRoutePosition, frogTravelDuration, type FrogPoint } from "../src/game/activities/forest-serenade/frog-layout";
import { SerenadeSession } from "../src/game/activities/forest-serenade/serenade-session";
import { readPerformanceArea } from "../src/game/activities/forest-serenade/serenade-area";
import { TARGET_CORNER_SIZE, targetCornerPositions } from "../src/game/equipment/target-marker-layout";
import { LanguageSwitcher } from "../src/i18n/provider";
import LanguageFlag from "../src/components/ui/language-flag";
import FormSelect from "../src/components/ui/form-select";
import { getActivity } from "../src/quiz/activities";
import { hasTranslation } from "../src/i18n/translate";
import type { PlayableQuiz } from "../src/quiz/types";

function grid(width = 40, height = 20, accept: (x: number, y: number) => boolean = () => true): FrogPoint[] {
    return Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width) }))
        .filter(({ x, y }) => accept(x, y)).map(({ x, y }) => ({ x: x * 16 + 8, y: y * 16 + 8 }));
}
const origin = { x: 496, y: 144 };
const hill = { x: 416, y: 64, width: 144, height: 96 };

for (const count of [1, 5, 7, 23, 50, 2000]) test(`frog layout: ${count} questions have exactly ${count} stable homes, with no 30-frog cap`, () => {
    const ground = new FrogGround(grid(), 16, origin);
    const homes = ground.scatter(count, hill);
    assert.equal(homes.length, count);
    assert.deepEqual(homes.slice(0, 5), ground.scatter(Math.min(5, count), hill));
    for (const home of homes) {
        assert.ok(home.x >= 8 && home.x <= 632 && home.y >= 8 && home.y <= 312);
        assert.ok(distanceFromHill(home, hill) >= 32 && distanceFromHill(home, hill) <= 64);
    }
    assert.equal(new Set(homes.slice(0, Math.min(count, 50)).map(p => `${p.x},${p.y}`)).size, Math.min(count, 50));
});

test("frog layout: scattered homes stay local to the altar hill, not at distant map corners", () => {
    const homes = new FrogGround(grid(), 16, origin).scatter(7, hill);
    assert.ok(Math.max(...homes.map(p => p.x)) - Math.min(...homes.map(p => p.x)) >= 144);
    assert.ok(Math.max(...homes.map(p => p.y)) - Math.min(...homes.map(p => p.y)) >= 96);
    for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) assert.ok(Math.hypot(homes[i].x - homes[j].x, homes[i].y - homes[j].y) >= 32);
});

test("frog layout: disconnected floors are excluded and approach routes use the real gap, never cross a solid cell", () => {
    const blocked = grid(10, 8, x => x !== 4);
    const isolated = new FrogGround(blocked, 16, { x: 8, y: 8 });
    assert.ok(isolated.points.every(p => p.x < 64));
    const points = grid(10, 8, (x, y) => x !== 4 || y === 5), ground = new FrogGround(points, 16, { x: 8, y: 8 });
    const route = ground.route({ x: 8, y: 8 }, { x: 152, y: 8 });
    assert.deepEqual(route[0], { x: 8, y: 8 }); assert.deepEqual(route.at(-1), { x: 152, y: 8 });
    assert.ok(route.some(p => p.x === 72 && p.y === 88));
    for (let i = 1; i < route.length; i++) assert.equal(Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y), 16);
    for (const point of route) assert.ok(points.some(p => p.x === point.x && p.y === point.y));
    assert.equal(frogTravelDuration(route), Math.max(FROG_MOTION.minDurationMs, (route.length - 1) / FROG_MOTION.tilesPerSecond * 1000));
    const last = frogRoutePosition(route, 1); assert.equal(last.x, 152); assert.equal(last.y, 8);
    const first = frogRoutePosition(route, 0); assert.equal(first.x, 8); assert.equal(first.y, 8);
    assert.deepEqual(new FrogGround([], 16, origin).scatter(7, hill), []);
});

test("frog layout: gathering slots circle the hill, stay outside it, and leave the entrance clear", () => {
    const ground = new FrogGround(grid(), 16, origin);
    const slots = ground.gathering(7, hill, { x: 480, y: 128, width: 32, height: 32 });
    assert.equal(slots.length, 7); assert.equal(new Set(slots.map(p => `${p.x},${p.y}`)).size, 7);
    for (const point of slots) {
        assert.ok(distanceFromHill(point, hill) > 0 && distanceFromHill(point, hill) <= 32);
        assert.equal(point.x >= 464 && point.x <= 528 && point.y >= 128 && point.y <= 192, false);
    }
    assert.ok(slots.some(p => p.x < hill.x)); assert.ok(slots.some(p => p.x > hill.x + hill.width));
    assert.ok(slots.some(p => p.y < hill.y)); assert.ok(slots.some(p => p.y > hill.y + hill.height));
    assert.deepEqual(ground.gathering(7, hill, { x: 480, y: 128, width: 32, height: 32 }), slots);
});

test("frog identity: restore keeps success indices with gaps, not a renumbered group of spawned frogs", () => {
    const quiz: PlayableQuiz = { id: "forest", name: "Forest", activityId: "forest_serenade", mode: "assessment",
        questions: Array.from({ length: 5 }, (_, i) => ({ id: `q-${i}`, type: "true_false", text: String(i), correctAnswer: true })) };
    const session = new SerenadeSession(quiz);
    assert.equal(session.answer({ type: "true_false", value: false })!.frogIndex, null);
    assert.equal(session.answer({ type: "true_false", value: true })!.frogIndex, 1);
    session.answer({ type: "true_false", value: false }); session.answer({ type: "true_false", value: true });
    const restored = new SerenadeSession(quiz, session.snapshot());
    assert.deepEqual(restored.befriendedQuestions, [1, 3]); assert.equal(restored.quiz.total, 5);
    assert.equal(restored.quiz.currentNumber, 5); assert.equal(restored.misses, 2);
});

test("forest marker: authored activation and its unpadded native-corner outline are exactly 32 by 32", () => {
    const map = JSON.parse(readFileSync("public/assets/images/levels/deep_forest/deep_forest.tmj", "utf8"));
    const area = readPerformanceArea(map.layers.find((l: { name: string }) => l.name === "forest_serenade").objects)!;
    assert.equal(area.width, 32); assert.equal(area.height, 32);
    const corners = targetCornerPositions(area, 0, 0);
    assert.equal(Math.max(...corners.map(p => p.x)) + TARGET_CORNER_SIZE - Math.min(...corners.map(p => p.x)), 32);
    assert.equal(Math.max(...corners.map(p => p.y)) + TARGET_CORNER_SIZE - Math.min(...corners.map(p => p.y)), 32);
    // Existing tree/fishing/net markers retain the original default padding.
    assert.equal(targetCornerPositions(area)[0].x, corners[0].x - 3);
});

test("language picker: both sizes show a real flag plus ID only, keeping the full language name accessible", () => {
    for (const compact of [false, true]) {
        const html = renderToStaticMarkup(createElement(LanguageSwitcher, { compact }));
        assert.ok(html.includes('data-language-flag="id"')); assert.ok(html.includes('aria-hidden="true">ID</span>'));
        assert.ok(html.includes('class="sr-only">Bahasa Indonesia</span>'));
        assert.equal(html.includes("language-caption"), false); assert.equal(html.includes("Antarmuka dalam"), false);
    }
    const html = renderToStaticMarkup(createElement(FormSelect, { value: "en", "aria-label": "Language", onValueChange: () => {},
        options: [{ value: "en", label: "EN", accessibleLabel: "English", icon: createElement(LanguageFlag, { locale: "en" }) }] }));
    assert.ok(html.includes('data-language-flag="en"')); assert.ok(html.includes('aria-hidden="true">EN</span>'));
    assert.ok(html.includes('class="sr-only">English</span>')); assert.equal(html.includes("<select"), false);
});

test("revised serenade guides, outcomes and scores have matching Indonesian copy", () => {
    const activity = getActivity("forest_serenade");
    for (const message of [activity.tagline, activity.guide.goal, ...activity.guide.steps, activity.copy.scoreLabel, "Frogs befriended",
        "Your frog is joining the altar circle!", "That melody was off. Your frog stays where it is.", "Your frog is waiting — play again to retry the same question.", "Your frog stays put. Play again for the next question."])
        assert.ok(hasTranslation(message), message);
});
