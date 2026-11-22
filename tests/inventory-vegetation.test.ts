import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { addItem, EMPTY_INVENTORY, isItemId, readInventoryItems } from "../src/game/inventory/inventory";
import { collectItem, inventoryStore, sanitizeInventory } from "../src/lms/repositories/inventory-repository";
import { BushLifecycle, BUSH_CHOPS } from "../src/game/game-objects/bush-lifecycle";
import { BREEZE_CONFIG } from "../src/game/world/breeze-config";
import FormSelect from "../src/components/ui/form-select";

const storage = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
before(() => Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
} }));
after(() => { if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window"); });

test("inventory: pickups make immutable, finite integer stacks of real items only", () => {
    assert.ok(isItemId("wood")); assert.equal(isItemId("__proto__"), false); assert.equal(isItemId("frogs"), false);
    assert.deepEqual(addItem(EMPTY_INVENTORY, "wood"), { wood: 1 }); assert.deepEqual(EMPTY_INVENTORY, { wood: 0 });
    assert.deepEqual(addItem({ wood: 3 }, "wood", 5), { wood: 8 });
    for (const quantity of [0, -1, NaN, Infinity, 1.1]) assert.throws(() => addItem({ wood: 3 }, "wood", quantity));
    assert.throws(() => addItem({ wood: Number.MAX_SAFE_INTEGER }, "wood"));
    for (const raw of [null, {}, { wood: -1 }, { wood: 0.5 }, { wood: "5" }]) assert.equal(readInventoryItems(raw), null);
});

test("inventory: students have separate durable bags, independent of quiz score or map", () => {
    assert.deepEqual(collectItem("josh", "wood", 5), { wood: 5 });
    assert.deepEqual(collectItem("josh", "wood", 1), { wood: 6 });
    assert.deepEqual(collectItem("budi", "wood", 1), { wood: 1 });
    const records = JSON.parse(storage.get("learning-world.lms.inventory.v1")!);
    assert.equal(records.find((entry: { id: string }) => entry.id === "josh").items.wood, 6);
    assert.equal(records.find((entry: { id: string }) => entry.id === "budi").items.wood, 1);
    assert.deepEqual(sanitizeInventory(JSON.parse(JSON.stringify(inventoryStore.get("josh")))), { id: "josh", items: { wood: 6 } });
    assert.equal(sanitizeInventory({ id: "", items: { wood: 5 } }), null); assert.throws(() => collectItem(" ", "wood"));
});

test("inventory: a storage failure is atomic so a world pickup can stay collectible for retry", () => {
    collectItem("quota", "wood", 1);
    const write = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    try {
        assert.throws(() => collectItem("quota", "wood", 1), /QuotaExceededError/);
        assert.deepEqual(inventoryStore.get("quota")?.items, { wood: 1 });
        assert.equal(JSON.parse(storage.get("learning-world.lms.inventory.v1")!).find((entry: { id: string }) => entry.id === "quota").items.wood, 1);
    } finally { window.localStorage.setItem = write; }
    assert.deepEqual(collectItem("quota", "wood", 1), { wood: 2 });
});

test("bushes: three chops clear directly once; no tree/stump stage or repeat drop is possible", () => {
    const bush = new BushLifecycle();
    assert.equal(BUSH_CHOPS, 3); assert.equal(bush.stage, "standing");
    assert.equal(bush.hit(), "shaken"); assert.equal(bush.hit(), "shaken"); assert.equal(bush.stage, "standing");
    assert.equal(bush.hit(), "cleared"); assert.equal(bush.stage, "cleared"); assert.equal(bush.hit(), null);
});

test("vegetation: gusts are substantially more frequent but remain staggered and bounded", () => {
    assert.ok(BREEZE_CONFIG.firstMax < 3500); assert.ok(BREEZE_CONFIG.intervalMax < 6500);
    assert.ok(BREEZE_CONFIG.intervalMin > 1000); assert.ok(BREEZE_CONFIG.maxTargets <= 20); assert.ok(BREEZE_CONFIG.stagger > 0);
    const source = readFileSync("src/game/world/tree-breeze.ts", "utf8");
    assert.ok(source.includes("prefers-reduced-motion")); assert.ok(source.includes("instanceof Bush")); assert.ok(source.includes('"wheat-canopy"'));
});

test("clouds: maps without Tiled cloud data have no fallback generator or scene update", () => {
    const source = readFileSync("src/game/scenes/game-scene.ts", "utf8");
    assert.equal(source.includes("CloudLayer"), false); assert.equal(existsSync("src/game/world/cloud-layer.ts"), false);
    const map = JSON.parse(readFileSync("public/assets/images/levels/deep_forest/deep_forest.tmj", "utf8"));
    assert.equal(map.layers.some((layer: { name: string }) => /cloud/i.test(layer.name)), false);
    assert.equal(map.tilesets.some((tileset: { name: string }) => /cloud/i.test(tileset.name)), false);
});

test("form options: every form uses the third-party controls, not native select/datalist widgets", () => {
    const walk = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${path}/${entry.name}`) : entry.name.endsWith(".tsx") ? [`${path}/${entry.name}`] : []);
    for (const path of [...walk("src/components"), "src/i18n/provider.tsx"]) assert.equal(/<(select|datalist)\b/.test(readFileSync(path, "utf8")), false, path);
    assert.ok(JSON.parse(readFileSync("package.json", "utf8")).dependencies["react-select"]);
});

test("form options: SSR has stable accessible combobox markup and retains grouped/current labels", () => {
    const options = [createElement("option", { value: "", key: "empty" }, "Choose a grade…"),
        createElement("optgroup", { label: "Primary", key: "group" }, createElement("option", { value: 4 }, "Grade 4"))];
    const html = renderToStaticMarkup(createElement(FormSelect, { value: 4, onValueChange: () => {}, "aria-label": "Grade" }, ...options));
    assert.ok(html.includes('role="combobox"')); assert.ok(html.includes('aria-label="Grade"')); assert.ok(html.includes("Grade 4"));
    assert.equal(html.includes("<select"), false);
});

test("profile: the student avatar uses a lossless original player frame rather than a fish icon", () => {
    const original = readFileSync("public/assets/animations/player/idle/Idle-sheet.png");
    const portrait = readFileSync("public/assets/images/ui/josh-portrait.png");
    assert.equal(original.readUInt32BE(16), 128); assert.equal(portrait.readUInt32BE(16), 32); assert.equal(portrait.readUInt32BE(20), 32);
    // The avatar belongs to the student's village profile/login, not a duplicate activity score card.
    for (const path of ["src/components/student/hub/student-badge.tsx", "src/components/student/student-login.tsx"]) {
        const profile = readFileSync(path, "utf8");
        assert.ok(profile.includes("CharacterPortrait")); assert.equal(profile.includes("scoreIcon"), false);
    }
});
