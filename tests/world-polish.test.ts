import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import type Phaser from "phaser";
import { TreeLifecycle, STUMP_CHOPS, LOG_SCALE } from "../src/game/game-objects/tree-lifecycle";
import { resolveTreeObjectType, TREE_SPECIES } from "../src/game/world/tree-object-definition";
import { isCloudLayer, isCloudObject, isCloudTile, normalizeTiledClasses } from "../src/game/world/render-layers";
import { DEPTH_CONFIG } from "../src/game/config/depth-config";
import { WorldObjectRegistry } from "../src/game/world/world-object-registry";
import { completionProgress } from "../src/quiz/completion-progress";
import { FARM_MAP } from "../src/game/world/maps/farm-map";
import { VILLAGE_MAP } from "../src/game/world/maps/village-map";
import type { TreeDefinitions } from "../src/game/common/types/object";

test("trees: preserve five initial chops, then three more chops clear the wood exactly once", () => {
    const tree = new TreeLifecycle(5);
    for (let hit = 1; hit < 5; hit += 1) assert.equal(tree.hit()?.changed, false);
    assert.deepEqual(tree.hit(), { changed: true, previous: "standing", stage: "stump" });
    assert.equal(tree.hits, 0);
    assert.equal(tree.hit()?.changed, false); assert.equal(tree.hit()?.changed, false);
    assert.deepEqual(tree.hit(), { changed: true, previous: "stump", stage: "cleared" });
    assert.equal(tree.hit(), null); assert.equal(STUMP_CHOPS, 3); assert.equal(LOG_SCALE, 0.5);
    for (const invalid of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => new TreeLifecycle(invalid));
});

test("trees: already-authored stumps need exactly three hits, not another standing-tree stage", () => {
    const stump = new TreeLifecycle(5, true);
    assert.equal(stump.stage, "stump"); stump.hit(); stump.hit(); assert.equal(stump.stage, "stump");
    stump.hit(); assert.equal(stump.stage, "cleared");
});

test("trees: all species use real original shadow sheets, valid frames and explicit stump metadata", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8")) as { path: string; files: { key: string; url?: string; frameConfig?: { frameWidth: number; frameHeight: number } }[] }[];
    for (const species of TREE_SPECIES) {
        const key = `${species.toUpperCase()}_TREE`;
        const group = pack.find((entry) => entry.files.some((file) => file.key === key))!;
        const asset = group.files.find((file) => file.key === key)!;
        assert.ok(asset.url?.includes("/Shadow/"));
        const path = `public/${group.path}/${asset.url}`; assert.ok(existsSync(path));
        const png = readFileSync(path); const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
        assert.deepEqual(asset.frameConfig, { frameWidth: 16, frameHeight: 16 });
        const definitions = JSON.parse(readFileSync(`public/assets/data/object/tree/${species}_tree.json`, "utf8")) as TreeDefinitions;
        assert.equal(definitions[`chopped_${species}_tree`].stage, "stump");
        assert.equal(definitions[`chopped_${species}_tree`].chopCount, 3);
        for (const definition of Object.values(definitions)) {
            assert.ok(["standing", "stump"].includes(definition.stage!));
            assert.ok(definition.dropCount >= 1); assert.ok(definition.footprint.width > 0);
            for (const frame of definition.tiles.flat()) assert.ok(Number.isSafeInteger(frame) && frame >= 0 && frame < width * height / 256);
        }
    }
});

test("trees: Tiled classes, property arrays/maps and legacy layer names resolve to the same objects", () => {
    assert.equal(resolveTreeObjectType("decoration", { class: "tree", properties: [{ name: "species", value: "maple" }, { name: "variant", value: "medium" }] }), "maple_tree_medium");
    assert.equal(resolveTreeObjectType("objects", { type: "tree", properties: { species: "birch", stage: "stump" } }), "chopped_birch_tree");
    assert.equal(resolveTreeObjectType("objects", { class: "wood", properties: { species: "pine" } }), "chopped_pine_tree");
    assert.equal(resolveTreeObjectType("mahogany_tree_large", {}), "mahogany_tree_large");
    assert.equal(resolveTreeObjectType("objects", { type: "birch_tree_large" }), "birch_tree_large");
    assert.equal(resolveTreeObjectType("objects", { type: "tree", properties: { species: "__proto__" } }), null);
    assert.equal(resolveTreeObjectType("catching_bugs", { type: "roam_area" }), null);
});

test("clouds: layer/tileset names AND typed tiles in mixed layers always get the top world depth", () => {
    assert.ok(isCloudLayer("CLOUDS")); assert.ok(isCloudLayer("foreground-clouds")); assert.equal(isCloudLayer("ground_grass"), false);
    const ranges = [
        { firstgid: 1, total: 10, name: "ground", tileData: { 3: { type: "CLOUDS" } }, tileProperties: { 5: { renderLayer: "clouds" } } },
        { firstgid: 11, total: 3, name: "Clouds" },
    ];
    for (const index of [4, 6, 11, 13]) assert.equal(isCloudTile(index, ranges), true, String(index));
    for (const index of [-1, 0, 1, 14]) assert.equal(isCloudTile(index, ranges), false, String(index));
    for (const [name, depth] of Object.entries(DEPTH_CONFIG)) if (name !== "CLOUDS" && name !== "DEBUG") assert.ok(DEPTH_CONFIG.CLOUDS > depth);
});

test("Tiled: modern class names remain usable with Phaser's type-based parser", () => {
    const raw = { type: "map", class: "world", tilesets: [{ tiles: [{ id: 0, class: "CLOUDS" }] }], layers: [{ type: "objectgroup", objects: [{ class: "tree", type: "" }] }] };
    normalizeTiledClasses(raw);
    assert.equal(raw.type, "map");
    assert.equal((raw.tilesets[0].tiles[0] as { type?: string }).type, "CLOUDS");
    assert.equal(raw.layers[0].objects[0].type, "tree");
});

test("world cleanup: destroying a tree removes it from every live registry array", () => {
    const registry = new WorldObjectRegistry(); const gameObject = new EventEmitter() as unknown as Phaser.GameObjects.GameObject;
    const object = { gameObject, interactable: { canInteract: () => true, interact: () => {}, getInteractionBounds: () => ({}) as Phaser.Geom.Rectangle },
        collidable: { collisionBody: null }, visible: { getBounds: () => ({}) as Phaser.Geom.Rectangle, setAlpha: () => gameObject } };
    registry.register(object);
    const objects = registry.objects, interactables = registry.interactables, visible = registry.visibleObjects;
    assert.equal(objects.length, 1); gameObject.emit("destroy");
    assert.equal(objects.length, 0); assert.equal(interactables.length, 0); assert.equal(visible.length, 0); assert.equal(registry.collidables.length, 0);
});

test("goal gradient: progress follows completed work, not correct answers, and encourages only near the finish", () => {
    assert.deepEqual(completionProgress(0, 0), { completed: 0, percent: 0, remaining: 0, nearFinish: false });
    assert.equal(completionProgress(0, 1).nearFinish, false);
    assert.equal(completionProgress(2, 8).nearFinish, false);
    assert.equal(completionProgress(6, 8).nearFinish, true);
    assert.equal(completionProgress(8, 8).nearFinish, false);
    assert.equal(completionProgress(99, 8).percent, 100);
});


test("clouds: explicitly typed objects and property tags work outside a cloud-named layer", () => {
    assert.ok(isCloudObject({ class: "CLOUDS" }));
    assert.ok(isCloudObject({ type: "cloud" }));
    assert.ok(isCloudObject({ properties: [{ name: "renderLayer", value: "clouds" }] }));
    assert.ok(isCloudObject({ properties: { renderLayer: "CLOUDS" } }));
    assert.equal(isCloudObject({ type: "tree" }), false);
});

test("maps: all authored choppable tree/wood objects declare resolvable Tiled class/type properties", () => {
    for (const path of ["world/system_map", "farm/barn"]) {
        const raw = JSON.parse(readFileSync(`public/assets/images/levels/${path}.json`, "utf8"));
        let count = 0;
        for (const layer of raw.layers) {
            if (!/mahogany/.test(layer.name)) continue;
            for (const object of layer.objects) {
                const declared = object.class || object.type;
                assert.ok(["tree", "wood"].includes(declared));
                assert.equal(resolveTreeObjectType("any-renamed-layer", object), layer.name);
                const properties = Object.fromEntries(object.properties.map((p: { name: string; value: unknown }) => [p.name, p.value]));
                assert.equal(properties.species, "mahogany");
                assert.equal(properties.stage, declared === "wood" ? "stump" : "standing");
                count += 1;
            }
        }
        assert.ok(count > 0);
    }
});

test("map integration: authored shadows and cloud tiles keep valid preloaded atlas data", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8")) as {
        path: string; files: { key: string; type: string; url?: string; frameConfig?: { frameWidth: number; frameHeight: number } }[];
    }[];
    const assets = pack.flatMap((group) => group.files.map((file) => ({ ...file, path: group.path })));
    const clouds = assets.filter((file) => file.key === "CLOUDS");
    // The incoming image and the PR's spritesheet must never race for the same cache key.
    assert.equal(clouds.length, 1);
    assert.equal(clouds[0].type, "spritesheet");
    assert.deepEqual(clouds[0].frameConfig, { frameWidth: 48, frameHeight: 32 });
    const png = readFileSync(`public/${clouds[0].path}/${clouds[0].url}`);
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    for (const [path, definition] of [["world/system_map", VILLAGE_MAP], ["farm/barn", FARM_MAP]] as const) {
        const raw = JSON.parse(readFileSync(`public/assets/images/levels/${path}.json`, "utf8"));
        const shadow = raw.layers.find((layer: { name: string }) => layer.name === "shadow");
        assert.ok(shadow?.data.some((index: number) => index > 0));
        assert.equal(shadow.data.length, raw.width * raw.height);
        assert.ok(definition.tilesets.some((tileset) => tileset.name === "shadow" && assets.some((asset) => asset.key === tileset.assetKey)));
        for (const layer of raw.layers.filter((layer: { name: string }) => isCloudLayer(layer.name))) {
            const tileset = raw.tilesets.find((tileset: { name: string }) => isCloudLayer(tileset.name));
            assert.ok(definition.tilesets.some((entry) => entry.name === tileset.name && entry.assetKey === "CLOUDS"));
            assert.equal(tileset.imagewidth, width); assert.equal(tileset.imageheight, height);
            assert.equal(tileset.tilecount, Math.floor(width / tileset.tilewidth) * Math.floor(height / tileset.tileheight));
            const indices = layer.data.filter((index: number) => index > 0);
            assert.ok(indices.length > 0);
            for (const index of indices) assert.ok(isCloudTile(index, [{ ...tileset, total: tileset.tilecount }]));
        }
    }
});
