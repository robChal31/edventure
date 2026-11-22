import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readTiledCollisionRectangles, type TiledCollisionObject } from "../src/game/world/tiled-collision";
import { FrogGround, FROG_MOTION, FROG_NEIGHBORHOOD, distanceFromHill, frogTravelDuration, frogRoutePosition, type FrogBounds, type FrogPoint } from "../src/game/activities/forest-serenade/frog-layout";

const rectangle = (overrides: Partial<TiledCollisionObject> = {}): TiledCollisionObject => ({ id: 9, x: 10.25, y: 20.5, width: 30.75, height: 40.125, rotation: 0, ...overrides });

test("Tiled collision: unnamed rectangles use exact top-left coordinates and scale once, without mutating map data", () => {
    const layers = [{ name: "collision", objects: [rectangle()] }], before = structuredClone(layers);
    assert.deepEqual(readTiledCollisionRectangles(layers), [{ layer: "collision", objectId: 9, x: 10.25, y: 20.5, width: 30.75, height: 40.125 }]);
    assert.deepEqual(readTiledCollisionRectangles(layers, 2), [{ layer: "collision", objectId: 9, x: 20.5, y: 41, width: 61.5, height: 80.25 }]);
    assert.deepEqual(layers, before);
});

test("Tiled collision: a generic layer name opts in, including grouped/hidden editor helper geometry", () => {
    const layers = [
        { name: "collision", visible: false, objects: [rectangle({ visible: false })] },
        { name: "buildings/collision", objects: [rectangle({ id: 10, x: 110.25, y: 220.5 })] },
        { name: "school", objects: [rectangle()] },
        { name: "enemy_collision", objects: [rectangle()] },
        { name: "collision/decoration", objects: [rectangle()] },
    ];
    const result = readTiledCollisionRectangles(layers);
    assert.equal(result.length, 2); assert.equal(result[1].layer, "buildings/collision");
    // These are Phaser-parsed coordinates: parent/layer offsets must not be applied a second time.
    assert.equal(result[1].x, 110.25); assert.equal(result[1].y, 220.5);
    assert.deepEqual(readTiledCollisionRectangles([]), []);
});

test("Tiled collision: invalid extents/scales and unsupported shapes never become giant fallback blockers", () => {
    const invalid = [
        rectangle({ x: NaN }), rectangle({ y: Infinity }), rectangle({ width: 0 }), rectangle({ height: -1 }),
        rectangle({ width: undefined }), rectangle({ rotation: 45 }), rectangle({ gid: 12 }), rectangle({ ellipse: true }),
        rectangle({ point: true }), rectangle({ polygon: [{ x: 0, y: 0 }] }), rectangle({ polyline: [] }), rectangle({ text: { text: "label" } }),
    ];
    assert.deepEqual(readTiledCollisionRectangles([{ name: "collision", objects: invalid }]), []);
    for (const scale of [0, -1, NaN, Infinity]) assert.deepEqual(readTiledCollisionRectangles([{ name: "collision", objects: [rectangle()] }], scale), []);
    assert.equal(readTiledCollisionRectangles([{ name: "collision", objects: [rectangle({ rotation: 360 })] }]).length, 1);
});

for (const [path, count] of [["world/system_map.json", 5], ["farm/barn.json", 1], ["deep_forest/deep_forest.tmj", 2]] as const) {
    test(`Tiled collision: preserve all ${count} authored rectangles in the latest ${path}`, () => {
        const raw = JSON.parse(readFileSync(`public/assets/images/levels/${path}`, "utf8"));
        const layers = raw.layers.filter((layer: { type: string }) => layer.type === "objectgroup");
        const objects = layers.find((layer: { name: string }) => layer.name === "collision").objects;
        const result = readTiledCollisionRectangles(layers);
        assert.equal(result.length, count); assert.equal(objects.length, count);
        for (let i = 0; i < count; i += 1) {
            assert.deepEqual(result[i], { layer: "collision", objectId: objects[i].id, x: objects[i].x, y: objects[i].y, width: objects[i].width, height: objects[i].height });
        }
    });
}

const hill = { x: 416, y: 64, width: 144, height: 96 }, start = { x: 480, y: 128, width: 32, height: 32 };
const grid = (width = 40, height = 20): FrogPoint[] => Array.from({ length: width * height }, (_, i) => ({ x: i % width * 16 + 8, y: Math.floor(i / width) * 16 + 8 }));
const inside = (point: FrogPoint, bounds: FrogBounds) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
const id = (point: FrogPoint) => `${point.x},${point.y}`;
const length = (path: readonly FrogPoint[]) => path.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - path[i].x, point.y - path[i].y), 0);

function ringCells(ground: FrogGround): readonly FrogPoint[] {
    const entrance = { x: start.x - 16, y: start.y, width: start.width + 32, height: start.height + 32 };
    return ground.points.filter(point => distanceFromHill(point, hill) > 0 && distanceFromHill(point, hill) <= 32 && !inside(point, entrance));
}
function stepsFrom(points: readonly FrogPoint[], from: FrogPoint): Map<string, number> {
    const cells = new Set(points.map(id)), steps = new Map([[id(from), 0]]), queue = [from];
    for (let i = 0; i < queue.length; i += 1) {
        const point = queue[i], nextSteps = steps.get(id(point))! + 1;
        for (const next of [{ x: point.x - 16, y: point.y }, { x: point.x + 16, y: point.y }, { x: point.x, y: point.y - 16 }, { x: point.x, y: point.y + 16 }]) {
            if (cells.has(id(next)) && !steps.has(id(next))) { steps.set(id(next), nextSteps); queue.push(next); }
        }
    }
    return steps;
}

test("frog gathering: destinations prioritize each home's shortest reachable hill side, not a question-index angle", () => {
    const ground = new FrogGround(grid().filter(point => !inside(point, hill)), 16, { x: 488, y: 184 });
    const homes = ground.scatter(35, hill), slots = ground.gathering(35, hill, start), ring = ringCells(ground);
    assert.equal(new Set(slots.map(id)).size, 35);
    homes.forEach((home, i) => {
        const steps = stepsFrom(ground.points, home), closest = Math.min(...ring.map(point => steps.get(id(point)) ?? Infinity));
        assert.ok(steps.get(id(slots[i]))! <= closest + FROG_NEIGHBORHOOD.gatheringDetourTiles);
        assert.ok(length(ground.travelRoute(home, slots[i])) <= length(ground.route(home, slots[i])));
    });
    assert.deepEqual(ground.gathering(5, hill, start), slots.slice(0, 5));
});

test("frog gathering: use reachable path distance rather than a closer-looking target behind a wall", () => {
    const blocker = { x: 383, y: 96, width: 2, height: 96 };
    const ground = new FrogGround(grid().filter(point => !inside(point, hill)), 16, { x: 488, y: 184 }, [blocker]);
    const [home] = ground.scatter(1, hill), [slot] = ground.gathering(1, hill, start), ring = ringCells(ground);
    const euclideanClosest = [...ring].sort((a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y))[0];
    const bestDistance = Math.min(...ring.map(point => length(ground.route(home, point))));
    assert.equal(length(ground.route(home, slot)), bestDistance);
    assert.ok(length(ground.route(home, slot)) < length(ground.route(home, euclideanClosest)));
});

test("frog gathering: dense long quizzes reuse local capacity instead of sending later frogs around the hill", () => {
    const ground = new FrogGround(grid().filter(point => !inside(point, hill)), 16, { x: 488, y: 184 });
    const homes = ground.scatter(2000, hill), slots = ground.gathering(2000, hill, start), ring = ringCells(ground);
    const cached = new Map<string, Map<string, number>>();
    assert.equal(slots.length, 2000);
    homes.forEach((home, i) => {
        const steps = cached.get(id(home)) ?? stepsFrom(ground.points, home); cached.set(id(home), steps);
        const best = Math.min(...ring.map(point => steps.get(id(point)) ?? Infinity));
        assert.ok(steps.get(id(slots[i]))! <= best + FROG_NEIGHBORHOOD.gatheringDetourTiles);
        assert.ok(distanceFromHill(slots[i], hill) > 0 && distanceFromHill(slots[i], hill) <= 32);
    });
});

test("frog smoothing: unobstructed ground becomes a direct segment, preserving exact endpoints", () => {
    const ground = new FrogGround(grid(5, 5), 16, { x: 8, y: 8 }), from = { x: 8, y: 8 }, to = { x: 72, y: 56 };
    assert.ok(ground.route(from, to).length > 2);
    assert.deepEqual(ground.travelRoute(from, to), [from, to]);
    const halfway = frogRoutePosition(ground.travelRoute(from, to), 0.5);
    assert.equal(halfway.x, 40); assert.equal(halfway.y, 32);
});

test("frog smoothing: a diagonal may not cut even the corner of a blocked tile", () => {
    const ground = new FrogGround(grid(3, 3).filter(point => point.x !== 24 || point.y !== 8), 16, { x: 8, y: 8 });
    assert.deepEqual(ground.travelRoute({ x: 8, y: 8 }, { x: 24, y: 24 }), [{ x: 8, y: 8 }, { x: 8, y: 24 }, { x: 24, y: 24 }]);
});

test("frog routes and smoothing: thin authored collision between free cell centers cannot be crossed", () => {
    const blocker = { x: 15.5, y: 0, width: 1, height: 32 };
    const ground = new FrogGround(grid(5, 4), 16, { x: 8, y: 8 }, [blocker]);
    for (const path of [ground.route({ x: 8, y: 8 }, { x: 40, y: 8 }), ground.travelRoute({ x: 8, y: 8 }, { x: 40, y: 8 })]) {
        assert.deepEqual(path[0], { x: 8, y: 8 }); assert.deepEqual(path.at(-1), { x: 40, y: 8 });
        assert.ok(path.some(point => point.y >= 40));
        for (let i = 1; i < path.length; i += 1) {
            const from = path[i - 1], to = path[i];
            if (Math.min(from.x, to.x) <= 16 && Math.max(from.x, to.x) >= 16) {
                const t = (16 - from.x) / (to.x - from.x), crossingY = from.y + (to.y - from.y) * t;
                assert.ok(crossingY > 32);
            }
        }
    }
    const divided = new FrogGround(grid(5, 4), 16, { x: 8, y: 8 }, [{ ...blocker, height: 64 }]);
    assert.ok(divided.points.every(point => point.x < 16));
});

test("frog pace: minimum 1.1s, gentle 2.5 tiles/s, and longer routes are never accelerated by a maximum-duration cap", () => {
    for (const path of [[], [{ x: 8, y: 8 }], [{ x: 8, y: 8 }, { x: 24, y: 8 }]]) assert.equal(frogTravelDuration(path), FROG_MOTION.minDurationMs);
    const path = [{ x: 8, y: 8 }, { x: 168, y: 8 }];
    assert.equal(frogTravelDuration(path), 4000);
    assert.equal(frogTravelDuration(path.map(point => ({ x: point.x * 2, y: point.y * 2 })), 32), 4000);
    assert.equal(frogTravelDuration([{ x: 8, y: 8 }, { x: 328, y: 8 }]), 8000);
    assert.ok(length(path) / (frogTravelDuration(path) / 1000) <= 16 * FROG_MOTION.tilesPerSecond);
    assert.deepEqual(frogRoutePosition(path, -1), { x: 8, y: 8, dx: 160, dy: 0, traveled: 0 });
    assert.equal(frogRoutePosition(path, 2).x, 168);
});
