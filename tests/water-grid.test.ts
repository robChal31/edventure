import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
    CELL_BRIDGE,
    CELL_WATER,
    WaterGrid,
    type Footprint,
} from "../src/game/world/water/water-grid";
import { BEACH_MAP } from "../src/game/world/maps/beach-map";
import {
    getOverWaterLayerNames,
    getWaterLayerNames,
} from "../src/game/world/world-map-definition";
import { FISHING_CONFIG } from "../src/game/activities/fishing/fishing-config";

const CELL = 16;

/** Small deterministic PRNG so the sampling tests are reproducible. */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

/** "." land · "W" water · "B" bridge over water. */
function gridFrom(rows: string[]): WaterGrid {
    return WaterGrid.fromSource({
        cols: rows[0].length,
        rows: rows.length,
        cellWidth: CELL,
        cellHeight: CELL,
        hasWater: (c, r) => rows[r][c] === "W" || rows[r][c] === "B",
        hasOverWater: (c, r) => rows[r][c] === "B",
    });
}

const LAKE = gridFrom([
    "..........",
    ".WWWWWWWW.",
    ".WWWWWWWW.",
    ".WWWBBWWW.",
    ".WWWBBWWW.",
    ".WWWWWWWW.",
    ".WWWWWWWW.",
    "..........",
]);

const center = (col: number, row: number) => ({ x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 });
const FISH: Footprint = { halfWidth: 6, halfHeight: 4 };

function assertFootprintInOpenWater(grid: WaterGrid, x: number, y: number, fp: Footprint) {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
        const col = grid.colAt(x + dx * fp.halfWidth);
        const row = grid.rowAt(y + dy * fp.halfHeight);
        assert.equal(grid.isOpenCell(col, row), true, `fish corner at cell ${col},${row} is not open water`);
        assert.equal(grid.kindAt(col, row), CELL_WATER);
    }
}

test("surface probe: water, land, bridge, outside", () => {
    let p = center(2, 2);
    assert.equal(LAKE.surfaceAt(p.x, p.y), "water");
    p = center(0, 0);
    assert.equal(LAKE.surfaceAt(p.x, p.y), "land");
    p = center(4, 3);
    assert.equal(LAKE.surfaceAt(p.x, p.y), "bridge");
    assert.equal(LAKE.surfaceAt(-4, 20), "outside");
    assert.equal(LAKE.surfaceAt(20, 10_000), "outside");
});

test("surface probe: the painted-sand band of shore tiles is not water", () => {
    // Cell (1,1) touches land on its left/top: its outer edge is sand.
    assert.equal(LAKE.surfaceAt(1 * CELL + 2, 1 * CELL + 8), "shore");
    assert.equal(LAKE.surfaceAt(1 * CELL + 8, 1 * CELL + 2), "shore");
    assert.equal(LAKE.surfaceAt(1 * CELL + 12, 1 * CELL + 12), "water");
    // Next to a bridge is still water (no sand is painted there).
    assert.equal(LAKE.surfaceAt(3 * CELL + 15, 3 * CELL + 8), "water");
});

test("open water excludes cells next to land and bridges", () => {
    assert.equal(LAKE.isOpenCell(1, 1), false); // next to land
    assert.equal(LAKE.isOpenCell(2, 2), true);
    assert.equal(LAKE.isOpenCell(3, 3), false); // next to bridge
    assert.equal(LAKE.isOpenCell(4, 3), false); // bridge itself
    assert.equal(LAKE.isOpenCell(0, 0), false);
});

test("random fish points are always fully inside open water", () => {
    const random = seeded(7);
    for (let i = 0; i < 300; i++) {
        const point = LAKE.randomFishPoint(FISH, random);
        assert.ok(point, "expected a fish point");
        assertFootprintInOpenWater(LAKE, point.x, point.y, FISH);
    }
});

test("fish cannot swim across a bridge", () => {
    const left = center(2, 3);
    const right = center(7, 3);
    assert.equal(LAKE.isSwimPathClear(left, right, FISH), false);
    assert.equal(LAKE.isSwimPathClear(center(2, 2), center(2, 5), FISH), true);
});

test("objects in the water block fish", () => {
    const grid = gridFrom([
        "........",
        ".WWWWWW.",
        ".WWWWWW.",
        ".WWWWWW.",
        ".WWWWWW.",
        "........",
    ]);
    assert.equal(grid.isOpenCell(3, 2), true);
    grid.blockRect(3 * CELL + 2, 2 * CELL + 2, 4, 4); // e.g. a rock
    assert.equal(grid.isOpenCell(3, 2), false);
    assert.equal(grid.isBlockedCell(3, 2), true);
    assert.equal(grid.isOpenCell(2, 3), true);
});

test("nearest fish point never lands outside open water", () => {
    const nextToBridge = center(3, 3);
    const point = LAKE.nearestFishPoint(nextToBridge, FISH, 18);
    assert.ok(point);
    assertFootprintInOpenWater(LAKE, point.x, point.y, FISH);
    assert.equal(LAKE.nearestFishPoint(center(0, 0), FISH, 4), null);
});

// ─────────────────────────────────────────
// The real beach map, with the real BEACH_MAP layer definition
// ─────────────────────────────────────────

type TiledLayer = { name: string; type: string; data?: number[] };
type TiledMap = { width: number; height: number; tilewidth: number; tileheight: number; layers: TiledLayer[] };

function loadBeach(): { grid: WaterGrid; map: TiledMap } {
    const file = join(process.cwd(), "public/assets/images/levels/beach/beach_map.json");
    const map = JSON.parse(readFileSync(file, "utf8")) as TiledMap;
    const layer = (name: string) => {
        const found = map.layers.find((l) => l.name === name && l.type === "tilelayer");
        assert.ok(found?.data, `layer ${name} missing from beach_map.json`);
        return found.data;
    };

    const water = getWaterLayerNames(BEACH_MAP.layers).map(layer);
    const over = getOverWaterLayerNames(BEACH_MAP.layers).map(layer);
    const at = (data: number[], c: number, r: number) => data[r * map.width + c] !== 0;

    const grid = WaterGrid.fromSource({
        cols: map.width,
        rows: map.height,
        cellWidth: map.tilewidth,
        cellHeight: map.tileheight,
        hasWater: (c, r) => water.some((data) => at(data, c, r)),
        hasOverWater: (c, r) => over.some((data) => at(data, c, r)),
    });

    return { grid, map };
}

test("beach: BEACH_MAP declares both water layers and the bridge", () => {
    assert.deepEqual(getWaterLayerNames(BEACH_MAP.layers).sort(), ["deep_water", "shallow_water"]);
    assert.deepEqual(getOverWaterLayerNames(BEACH_MAP.layers), ["bridge"]);
});

test("beach: fish only ever appear in open water — never on sand or the piers", () => {
    const { grid } = loadBeach();
    assert.ok(grid.openCellCount > 100, "the beach should have plenty of open water");

    const scale = FISHING_CONFIG.fish.scale;
    const fish: Footprint = {
        halfWidth: (16 * scale) / 2 + FISHING_CONFIG.fish.footprintPadding,
        halfHeight: (10 * scale) / 2 + FISHING_CONFIG.fish.footprintPadding,
    };

    const random = seeded(2026);
    for (let i = 0; i < 1000; i++) {
        const point = grid.randomFishPoint(fish, random);
        assert.ok(point);
        assertFootprintInOpenWater(grid, point.x, point.y, fish);
    }

    // And no bridge cell is ever considered open water.
    grid.forEachCell(({ kind, open }) => {
        if (kind === CELL_BRIDGE) assert.equal(open, false);
    });
});

test("beach: casts from the spawn and from the pier are judged correctly", () => {
    const { grid } = loadBeach();
    const spawn = BEACH_MAP.spawn!;
    const land = FISHING_CONFIG.castLanding;

    // The spawn is on sand at the foot of the pier.
    assert.equal(grid.surfaceAt(spawn.x, spawn.y), "land");
    // Facing down from the spawn the bait hits the pier → no fishing.
    assert.equal(grid.surfaceAt(spawn.x + land.down.x, spawn.y + land.down.y), "bridge");

    // Standing on the pier (tile 23/24, row 22) and casting sideways → water.
    const leftLane = center(23, 22);
    const rightLane = center(24, 22);
    assert.equal(grid.surfaceAt(leftLane.x, leftLane.y), "bridge");
    assert.equal(grid.surfaceAt(leftLane.x + land.left.x, leftLane.y + land.left.y), "water");
    assert.equal(grid.surfaceAt(rightLane.x + land.right.x, rightLane.y + land.right.y), "water");
});
