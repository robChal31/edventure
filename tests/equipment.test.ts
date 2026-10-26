import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type Phaser from "phaser";
import type { Player } from "../src/game/game-objects/player/player";
import type { Interactable } from "../src/game/common/types/interaction";
import { EQUIPMENT, INVENTORY_SLOTS, defaultEquipment, equipmentRoute, equipmentState, isEquipmentId, type EquipmentContext } from "../src/game/equipment/equipment";
import { selectObjectTarget, tileInFront } from "../src/game/equipment/targeting";
import { TARGET_CORNER_SIZE, targetCornerPositions } from "../src/game/equipment/target-marker-layout";
import { InteractionSystem } from "../src/game/systems/interaction-system";
import { ActionLatch } from "../src/game/components/input/action-latch";
import { InputComponent } from "../src/game/components/input/input-component";
import { QuestionCloseGate } from "../src/game/activities/catching-bugs/question-close-gate";

const roaming: EquipmentContext = { phase: "idle", overlayOpen: false, travelling: false, playerBusy: false, playerLocked: false };

test("equipment: map defaults do not prevent selecting tools; unimplemented tools have no route", () => {
    assert.equal(defaultEquipment(), "axe");
    assert.equal(defaultEquipment(null), "axe");
    assert.equal(defaultEquipment("fishing"), "rod");
    assert.equal(defaultEquipment("catching_bugs"), "net");
    for (const activity of [null, "fishing", "catching_bugs"] as const) {
        assert.equal(equipmentRoute("axe", activity), "axe");
        assert.equal(equipmentRoute("shovel", activity), "unavailable");
        assert.equal(equipmentRoute("log", activity), "unavailable");
        assert.equal(equipmentRoute("net", activity), activity === "catching_bugs" ? "activity" : "unavailable");
        assert.equal(equipmentRoute("rod", activity), activity === "fishing" ? "activity" : "unavailable");
    }
    for (const id of Object.keys(EQUIPMENT)) assert.equal(isEquipmentId(id), true);
    for (const id of [null, undefined, "toString", "__proto__", "hammer", 1]) assert.equal(isEquipmentId(id), false);
    assert.equal(EQUIPMENT.shovel.available, false);
    assert.equal(EQUIPMENT.log.available, false);
});

test("equipment: action/modal/travel locks switching, while the rod can still reel during waiting", () => {
    assert.deepEqual(equipmentState("net", roaming), { equipped: "net", locked: false, actionEnabled: true });
    for (const patch of [{ overlayOpen: true }, { travelling: true }, { playerBusy: true }, { playerLocked: true }]) {
        assert.deepEqual(equipmentState("net", { ...roaming, ...patch }), { equipped: "net", locked: true, actionEnabled: false });
    }
    for (const phase of ["netting", "answering", "closing-question", "catching", "escaped", "complete", "round-transition", "casting", "bite", "reeling"]) {
        const state = equipmentState("rod", { ...roaming, phase });
        assert.equal(state.locked, true, phase);
        assert.equal(state.actionEnabled, false, phase);
    }
    // Opening the mini picker pauses world actions, not the equipment choices themselves.
    assert.deepEqual(equipmentState("net", { ...roaming, pickerOpen: true }), { equipped: "net", locked: false, actionEnabled: false });
    const waiting = { ...roaming, phase: "waiting", playerBusy: true };
    assert.deepEqual(equipmentState("rod", waiting), { equipped: "rod", locked: true, actionEnabled: true });
    assert.equal(equipmentState("rod", { ...waiting, overlayOpen: true }).actionEnabled, false);
    assert.equal(equipmentState("axe", waiting).actionEnabled, false);
    assert.equal(equipmentState("shovel", roaming).actionEnabled, false);
});

test("input: keyboard aliases collapse into one intent; repeated, disabled and stale presses are discarded", () => {
    const latch = new ActionLatch();
    latch.press(); // F
    latch.press(); // Space in the same frame
    assert.equal(latch.consume(), true);
    assert.equal(latch.consume(), false);
    latch.press(true); // Native repeat while held.
    assert.equal(latch.consume(), false);
    latch.press();
    latch.reset();
    assert.equal(latch.consume(), false);
    latch.setEnabled(false);
    latch.press();
    assert.equal(latch.consume(), false);
    latch.setEnabled(true);
    assert.equal(latch.consume(), false);
    latch.press();
    assert.equal(latch.consume(), true);
});

test("input: overlay/reset releases movement and a queued primary action", () => {
    const input = new InputComponent();
    input.isUpDown = true;
    input.isRightDown = true;
    input.pressPrimaryAction();
    input.setEnabled(false);
    assert.equal(input.isUpDown, false);
    assert.equal(input.isRightDown, false);
    input.pressPrimaryAction();
    input.setEnabled(true);
    assert.equal(input.isPrimaryActionJustDown, false);
    assert.equal(input.isUpDown, false);
    assert.equal(input.isRightDown, false);
    input.isDownDown = true;
    input.pressPrimaryAction();
    input.reset();
    assert.equal(input.isDownDown, false);
    assert.equal(input.isPrimaryActionJustDown, false);
});

test("targeting: axe selects a reachable, available footprint IN FRONT, never a closer tree behind", () => {
    const behind = { object: "behind", valid: true, bounds: { x: 98, y: 102, width: 4, height: 4 } };
    const ahead = { object: "ahead", valid: true, bounds: { x: 96, y: 80, width: 8, height: 8 } };
    const farther = { object: "farther", valid: true, bounds: { x: 96, y: 65, width: 8, height: 8 } };
    const chopped = { object: "chopped", valid: false, bounds: { x: 98, y: 93, width: 4, height: 4 } };
    assert.equal(selectObjectTarget({ x: 100, y: 100 }, "up", 16, [behind, farther, ahead, chopped])?.object, "ahead");
    assert.equal(selectObjectTarget({ x: 100, y: 100 }, "down", 16, [behind, ahead])?.object, "behind");
    assert.equal(selectObjectTarget({ x: 100, y: 100 }, "up", 4, [ahead, chopped]), null);
    assert.equal(selectObjectTarget({ x: 100, y: 100 }, "up", 16, [behind]), null);
    assert.equal(selectObjectTarget({ x: 100, y: 100 }, "left", 16, [ahead]), null);
});

test("targeting: prepared axe execution uses the marked object, not a fresh closest-object search", () => {
    const hits: string[] = [];
    let misses = 0;
    let available = true;
    const bounds = { x: 96, y: 80, width: 8, height: 8 };
    const makeObject = (name: string, y: number): Interactable => ({
        getInteractionBounds: () => ({ ...bounds, y }) as Phaser.Geom.Rectangle,
        canInteract: () => available,
        interact: () => { hits.push(name); },
    });
    const front = makeObject("front", 80);
    const behind = makeObject("behind", 106);
    const player = { x: 100, y: 100, facing: "up", swingAxe: (hit: () => void) => hit() };
    const scene = { sound: { play: () => { misses += 1; } } };
    const interaction = new InteractionSystem(scene as unknown as Phaser.Scene, player as unknown as Player, [behind, front]);
    const prepared = interaction.prepareAxeAction();
    assert.deepEqual(prepared.target?.bounds, bounds);
    assert.equal(prepared.target?.status, "valid");
    player.facing = "down";
    prepared.execute();
    assert.deepEqual(hits, ["front"]);
    assert.equal(misses, 0);
    available = false;
    prepared.execute(); // Tree began chopping before execution: no second hit.
    assert.deepEqual(hits, ["front"]);
    assert.equal(misses, 1);
});

test("targeting: an out-of-reach candidate stays white and an axe swing cannot hit it", () => {
    let hits = 0;
    let swings = 0;
    const object: Interactable = {
        getInteractionBounds: () => ({ x: 96, y: 68, width: 8, height: 8 }) as Phaser.Geom.Rectangle,
        interact: () => { hits += 1; },
    };
    const player = { x: 100, y: 100, facing: "up", swingAxe: (hit: () => void) => { swings += 1; hit(); } };
    const scene = { sound: { play: () => {} } };
    const prepared = new InteractionSystem(scene as unknown as Phaser.Scene, player as unknown as Player, [object]).prepareAxeAction();
    assert.equal(prepared.target?.status, "candidate");
    prepared.execute();
    assert.equal(swings, 1);
    assert.equal(hits, 0);
});

test("targeting: future tile projection snaps once; it performs no build or terrain action", () => {
    const origin = { x: 42.5, y: 57.9 };
    assert.deepEqual(tileInFront(origin, "up", 16), { x: 32, y: 32, width: 16, height: 16 });
    assert.deepEqual(tileInFront(origin, "down", 16), { x: 32, y: 64, width: 16, height: 16 });
    assert.deepEqual(tileInFront(origin, "left", 16), { x: 16, y: 48, width: 16, height: 16 });
    assert.deepEqual(tileInFront(origin, "right", 16), { x: 48, y: 48, width: 16, height: 16 });
});

test("modal receipt: result effects wait for the exact token and run only once", () => {
    const gate = new QuestionCloseGate();
    let effects = 0;
    const id = gate.request(() => { effects += 1; });
    assert.equal(effects, 0);
    gate.acknowledge(id + 1);
    assert.equal(effects, 0);
    gate.acknowledge(id);
    gate.acknowledge(id);
    assert.equal(effects, 1);
});

test("modal receipt: restart/travel and replacement requests invalidate old or cross-scene callbacks", () => {
    const first = new QuestionCloseGate();
    const nextScene = new QuestionCloseGate();
    let effects = 0;
    const stale = first.request(() => { effects += 100; });
    first.cancel();
    const current = first.request(() => { effects += 1; });
    const other = nextScene.request(() => { effects += 10; });
    assert.notEqual(stale, current);
    assert.notEqual(current, other);
    first.acknowledge(stale);
    nextScene.acknowledge(current);
    assert.equal(effects, 0);
    const replaced = first.request(() => { effects += 2; });
    first.acknowledge(current);
    assert.equal(effects, 0);
    first.acknowledge(replaced);
    nextScene.acknowledge(other);
    assert.equal(effects, 12);
});

test("equipment art: every icon/slot/marker is an existing original sheet", () => {
    for (const tool of Object.values(EQUIPMENT)) {
        const path = `public${tool.icon.url}`;
        assert.ok(existsSync(path), tool.id);
        const png = readFileSync(path);
        assert.equal(png.readUInt32BE(16), tool.icon.width);
        assert.equal(png.readUInt32BE(20), tool.icon.height);
    }
    assert.ok(existsSync(`public${INVENTORY_SLOTS}`));
    const marker = readFileSync("public/assets/images/farm asset pack/UI/Extras.png");
    assert.equal(marker.readUInt32BE(16), 368);
    assert.equal(marker.readUInt32BE(20), 128);
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8")) as { files: { key: string; url?: string }[] }[];
    assert.equal(pack.flatMap((group) => group.files).find((file) => file.key === "UI_TARGET_MARKERS")?.url, "UI/Extras.png");
});

test("marker layout: a tiny cast point stays exactly centered before/during/after the native-corner pulse", () => {
    const bounds = { x: 355, y: 371, width: 8, height: 8 }; // landing = (359, 375)
    assert.equal(TARGET_CORNER_SIZE, 8);
    for (const expansion of [0, 0.2, 1, 1.7, 2, 0]) {
        const corners = targetCornerPositions(bounds, expansion);
        assert.equal((corners[0].x + corners[1].x + TARGET_CORNER_SIZE) / 2, 359);
        assert.equal((corners[0].y + corners[2].y + TARGET_CORNER_SIZE) / 2, 375);
        assert.ok(corners.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y)));
    }
    const small = targetCornerPositions(bounds);
    const large = targetCornerPositions(bounds, 2);
    assert.equal(small[1].x + TARGET_CORNER_SIZE - small[0].x, 26);
    assert.equal(large[1].x + TARGET_CORNER_SIZE - large[0].x, 30);
});

test("marker layout: large object bounds expand the corner positions, never the pixel strokes", () => {
    const corners = targetCornerPositions({ x: 100, y: 200, width: 48, height: 32 });
    assert.deepEqual(corners, [{ x: 97, y: 197 }, { x: 143, y: 197 }, { x: 97, y: 227 }, { x: 143, y: 227 }]);
    const fractional = { x: 100.23, y: 200.71, width: 16, height: 12 };
    const points = targetCornerPositions(fractional);
    assert.ok(Math.abs((points[0].x + points[1].x + TARGET_CORNER_SIZE) / 2 - fractional.x - fractional.width / 2) <= 0.5);
    assert.ok(Math.abs((points[0].y + points[2].y + TARGET_CORNER_SIZE) / 2 - fractional.y - fractional.height / 2) <= 0.5);
});
