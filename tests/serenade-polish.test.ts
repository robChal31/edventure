import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type Phaser from "phaser";
import { altarHillBounds, distanceFromHill, FrogGround, FROG_NEIGHBORHOOD, type FrogPoint } from "../src/game/activities/forest-serenade/frog-layout";
import { SerenadeNotes } from "../src/game/activities/forest-serenade/serenade-notes";
import { ASSET_KEYS } from "../src/game/common/assets";
import { playSerenadeFinale, SERENADE_FINALE_DURATION_MS, SERENADE_FINALE_NOTES } from "../src/game/common/audio/serenade-music";
import { getActivity } from "../src/quiz/activities";
import { hasTranslation } from "../src/i18n/translate";

const hill = { x: 416, y: 64, width: 144, height: 96 }, start = { x: 480, y: 128, width: 32, height: 32 };
const grid: FrogPoint[] = Array.from({ length: 800 }, (_, i) => ({ x: i % 40 * 16 + 8, y: Math.floor(i / 40) * 16 + 8 }));

test("serenade hill: derive the actual Tiled footprint without changing terrain or closing the wider stairs", () => {
    const map = JSON.parse(readFileSync("public/assets/images/levels/deep_forest/deep_forest.tmj", "utf8"));
    const rim = map.layers.find((layer: { name: string }) => layer.name === "deep_forest_hill").data
        .flatMap((tile: number, i: number) => tile ? [{ x: i % map.width * 16 + 8, y: Math.floor(i / map.width) * 16 + 8 }] : []);
    assert.deepEqual(altarHillBounds(rim, 16, { x: 490, y: 103 }), hill);
    assert.deepEqual(altarHillBounds([...rim, { x: 8, y: 8 }], 16, { x: 490, y: 103 }), hill);
    assert.deepEqual(altarHillBounds(rim.map((point: FrogPoint) => ({ x: point.x * 2, y: point.y * 2 })), 32, { x: 980, y: 206 }), { x: 832, y: 128, width: 288, height: 192 });
    assert.equal(altarHillBounds([], 16, { x: 490, y: 103 }), null);
});

test("serenade locality: 2–4 tile scatter and fixed hill-circle slots do not follow the player", () => {
    const a = new FrogGround(grid, 16, { x: 488, y: 184 }), b = new FrogGround(grid, 16, { x: 120, y: 280 });
    assert.deepEqual(a.scatter(35, hill), b.scatter(35, hill));
    assert.deepEqual(a.gathering(35, hill, start), b.gathering(35, hill, start));
    for (const count of [1, 5, 7, 35, 2000]) {
        const homes = a.scatter(count, hill), slots = a.gathering(count, hill, start);
        assert.equal(homes.length, count); assert.equal(slots.length, count);
        for (const home of homes) assert.ok(distanceFromHill(home, hill) >= 16 * FROG_NEIGHBORHOOD.scatterMinTiles && distanceFromHill(home, hill) <= 16 * FROG_NEIGHBORHOOD.scatterMaxTiles);
        for (const point of slots) assert.ok(distanceFromHill(point, hill) > 0 && distanceFromHill(point, hill) <= 16 * FROG_NEIGHBORHOOD.gatheringMaxTiles);
    }
    assert.equal(new Set(a.gathering(35, hill, start).map(p => `${p.x},${p.y}`)).size, 35);
    assert.deepEqual(a.scatter(0, hill), []); assert.deepEqual(a.gathering(0, hill), []);
    assert.deepEqual(new FrogGround([], 16, start).gathering(5, hill), []);
});

test("serenade locality: small maps fall back to a nearby safe cell rather than losing question frogs", () => {
    const ground = new FrogGround([{ x: 8, y: 8 }, { x: 24, y: 8 }], 16, { x: 8, y: 8 });
    assert.equal(ground.scatter(7, { x: 24, y: 8, width: 32, height: 32 }).length, 7);
    assert.equal(ground.gathering(7, { x: 24, y: 8, width: 32, height: 32 }).length, 7);
});

test("serenade note art: preload the supplied original Flute/Fx.png as native 32px frames", () => {
    const pack = JSON.parse(readFileSync("public/assets/data/assets.json", "utf8"));
    const assets = pack.flatMap((group: { path: string; files: { key: string; url?: string; frameConfig?: { frameWidth: number; frameHeight: number } }[] }) => group.files.map(file => ({ ...file, path: group.path })));
    const matches = assets.filter((file: { key: string }) => file.key === ASSET_KEYS.FLUTE_NOTES); assert.equal(matches.length, 1);
    const file = matches[0]; assert.equal(file.url, "Character/Character/PNG/22. Flute/Fx.png");
    assert.deepEqual(file.frameConfig, { frameWidth: 32, frameHeight: 32 });
    const png = readFileSync(`public/${file.path}/${file.url}`); assert.equal(png.readUInt32BE(16), 576); assert.equal(png.readUInt32BE(20), 32);
});

class NoteSprite {
    active = true; visible = true; x = 488; y = 144; name = ""; tintMode = 0; destroyed = false; pauses = 0; resumes = 0;
    plays: unknown[] = []; data: Record<string, unknown> = {};
    anims = { pause: () => { this.pauses++; }, resume: () => { this.resumes++; } };
    setName(name: string) { this.name = name; return this; }
    setDepth() { return this; } setScale() { return this; } setTint() { return this; }
    setTintMode(mode: number) { this.tintMode = mode; return this; }
    setData(data: Record<string, unknown>) { this.data = data; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    play(config: unknown) { this.plays.push(config); return this; }
    destroy() { this.active = false; this.destroyed = true; }
}
function noteScene() {
    const sprites: NoteSprite[] = [];
    const scene = { add: { sprite: () => { const sprite = new NoteSprite(); sprites.push(sprite); return sprite; } },
        cameras: { main: { worldView: { contains: (x: number, y: number) => x >= 0 && x <= 640 && y >= 0 && y <= 320 } } } };
    return { scene: scene as unknown as Phaser.Scene, sprites };
}
const source = (sprite: NoteSprite) => sprite as unknown as Phaser.GameObjects.Sprite;

test("serenade notes: reuse one FX sprite per musician, cull offscreen and clean up destroyed sources", () => {
    const { scene, sprites } = noteScene(), notes = new SerenadeNotes(scene, false), player = new NoteSprite(), frog = new NoteSprite();
    notes.follow("player", source(player), "player"); notes.follow("player", source(player), "player");
    notes.follow("frog-3", source(frog), "frog", 3);
    assert.equal(sprites.length, 2); assert.equal(sprites[0].plays.length, 1); assert.equal(sprites[1].tintMode, 1);
    assert.equal(sprites[1].name, "serenade-notes-frog-3");
    frog.x = 999; notes.update(); assert.equal(sprites[1].visible, false); assert.equal(sprites[1].pauses, 1);
    frog.x = 488; notes.update(); assert.equal(sprites[1].visible, true); assert.ok(sprites[1].resumes > 0);
    frog.active = false; notes.update(); assert.equal(sprites[1].destroyed, true);
    notes.stop("player"); notes.stop("player"); notes.clear(); assert.ok(sprites.every(sprite => sprite.destroyed));
});

test("serenade notes: reduced motion keeps a stationary original note rather than a flashing animation", () => {
    const { scene, sprites } = noteScene(), notes = new SerenadeNotes(scene, true);
    notes.follow("player", source(new NoteSprite()), "player"); notes.update();
    assert.equal(sprites.length, 1); assert.equal(sprites[0].plays.length, 0); assert.equal(sprites[0].visible, true);
    assert.equal(sprites[0].data.reducedMotion, true); notes.clear(); assert.equal(sprites[0].destroyed, true);
});

class TestOscillator {
    type = "sine"; onended: (() => void) | null = null; disconnected = false; pitch = 0;
    starts: number[] = []; stops: (number | undefined)[] = [];
    frequency = { setValueAtTime: (frequency: number) => { this.pitch = frequency; } };
    connect(node: unknown) { return node; }
    start(at: number) { this.starts.push(at); }
    stop(at?: number) { this.stops.push(at); }
    disconnect() { this.disconnected = true; }
}
class TestGain {
    disconnected = false;
    gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    connect(node: unknown) { return node; } disconnect() { this.disconnected = true; }
}
function testAudio() {
    const voices: TestOscillator[] = [], gains: TestGain[] = [];
    const audio = { state: "running", currentTime: 10, destination: {},
        createOscillator: () => { const voice = new TestOscillator(); voices.push(voice); return voice; },
        createGain: () => { const gain = new TestGain(); gains.push(gain); return gain; } };
    return { audio: audio as unknown as AudioContext, voices, gains };
}

test("serenade finale: one short original phrase ends within four seconds, independent of score or frog count", () => {
    assert.ok(SERENADE_FINALE_DURATION_MS >= 3500 && SERENADE_FINALE_DURATION_MS <= 4000);
    assert.ok(SERENADE_FINALE_NOTES.length > 10 && SERENADE_FINALE_NOTES.length <= 32);
    for (const note of SERENADE_FINALE_NOTES) {
        assert.ok(note.at >= 0 && note.duration > 0.1 && note.frequency > 100 && note.frequency < 2200);
        assert.ok(note.gain > 0 && note.gain < 0.06);
        assert.ok((note.at + note.duration + 0.05) * 1000 < SERENADE_FINALE_DURATION_MS);
    }
});

test("serenade finale: schedule the full phrase once, disconnect ended voices and cancel all remaining notes idempotently", () => {
    const { audio, voices, gains } = testAudio(), cancel = playSerenadeFinale(audio);
    assert.equal(voices.length, SERENADE_FINALE_NOTES.length);
    assert.equal(voices[0].pitch, SERENADE_FINALE_NOTES[0].frequency); assert.equal(voices[0].starts[0], 10.025);
    voices[0].onended?.(); assert.equal(voices[0].disconnected, true);
    cancel(); cancel(); assert.equal(voices[0].stops.length, 1);
    assert.ok(voices.slice(1).every(voice => voice.stops.length === 2 && voice.disconnected));
    assert.ok(gains.every(gain => gain.disconnected));
});

test("serenade finale: missing/closed/failing audio is optional, never a completion dependency", () => {
    assert.doesNotThrow(() => playSerenadeFinale(null)());
    assert.doesNotThrow(() => playSerenadeFinale({ state: "closed" } as AudioContext)());
    const { audio, voices } = testAudio(); audio.createGain = () => { throw new Error("Audio unavailable"); };
    assert.doesNotThrow(() => playSerenadeFinale(audio)()); assert.ok(voices.every(voice => voice.starts.length === 0));
});

test("serenade polish: all revised guide, status and completion cues have Indonesian translations", () => {
    const activity = getActivity("forest_serenade");
    for (const message of [activity.tagline, activity.guide.goal, ...activity.guide.steps, ...Object.values(activity.copy.status),
        "Your frog is joining the altar circle!", "All questions answered! Enjoy a short forest song."]) assert.ok(hasTranslation(message), message);
});
