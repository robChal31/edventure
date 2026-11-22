import Phaser from "phaser";
import { Tree } from "../game-objects/tree";
import { Bush } from "../game-objects/bush";
import { ASSET_KEYS } from "../common/assets";
import { WORLD_CONFIG } from "../config/world-config";
import { BREEZE_CONFIG } from "./breeze-config";
import type { WorldObject } from "./world-object";
import type { WorldMap } from "./world-map";

interface BreezeTarget {
    readonly x: number; readonly y: number; readonly active: boolean;
    readonly stage: string; readonly isBusy: boolean;
    breeze(): void;
}

/** Split original art: roots, shadows, colliders and depth anchors never drift. */
class PinnedCanopy implements BreezeTarget {
    readonly stage = "standing";
    readonly isBusy = false;
    #canopy: Phaser.GameObjects.Image;
    #gust?: Phaser.Tweens.Tween;
    constructor(private scene: Phaser.Scene, private image: Phaser.GameObjects.Image, private wheat = false) {
        const split = wheat ? Math.max(1, image.frame.realHeight - 3) : Math.max(1, Math.floor(image.frame.realHeight * 0.64));
        this.#canopy = scene.add.image(image.x, image.y, image.texture.key, image.frame.name)
            .setOrigin(image.originX, image.originY).setScale(image.scaleX, image.scaleY)
            .setCrop(0, 0, image.frame.realWidth, split).setName(wheat ? "wheat-canopy" : "tree-canopy");
        image.setCrop(0, split, image.frame.realWidth, image.frame.realHeight - split);
    }
    get x() { return this.image.x; }
    get y() { return this.image.y; }
    get active() { return this.image.active; }
    sync(): void {
        if (!this.image.active) { this.#canopy.setVisible(false); return; }
        this.#canopy.setDepth(this.image.depth + 0.001).setAlpha(this.image.alpha).setVisible(this.image.visible);
    }
    breeze(): void {
        if (!this.active || this.#gust) return;
        this.#gust = this.scene.tweens.add({ targets: this.#canopy, x: this.image.x + 1, duration: this.wheat ? 260 : 380,
            ease: "Sine.inOut", yoyo: true, repeat: 1, onComplete: () => { this.#gust = undefined; } });
    }
    destroy(): void {
        this.#gust?.remove(); this.#canopy.destroy();
        if (this.image.active) this.image.setCrop();
    }
}

/** Tree, bush and wheat gusts share one scheduler, with bounded work and reduced-motion support. */
export class TreeBreeze {
    #nextGust: number;
    #pending = new Set<Phaser.Time.TimerEvent>();
    #targets: BreezeTarget[] = [];
    #canopies: PinnedCanopy[] = [];
    #wheat: { image: Phaser.GameObjects.Image; tile: Phaser.Tilemaps.Tile; alpha: number }[] = [];
    #reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    constructor(private scene: Phaser.Scene, objects: readonly WorldObject[], map?: WorldMap) {
        this.#nextGust = scene.time.now + Phaser.Math.Between(BREEZE_CONFIG.firstMin, BREEZE_CONFIG.firstMax);
        if (this.#reducedMotion) return;
        for (const { gameObject } of objects) {
            if (gameObject instanceof Tree || gameObject instanceof Bush) this.#targets.push(gameObject);
            else if (gameObject instanceof Phaser.GameObjects.Image && /coconut_?tree|coconut_ree|deep_forest_tree/i.test(gameObject.name)) {
                this.#addCanopy(gameObject);
            }
        }
        // Only original wheat tiles are lifted; mixed crop layers keep all their other crops.
        map?.map.layers.forEach((data) => {
            const layer = map.getLayer(data.name);
            if (!layer || layer.visible === false) return;
            layer.forEachTile((tile: Phaser.Tilemaps.Tile) => {
                const tileset = map.map.tilesets.find((set) => /wheat/i.test(set.name) && tile.index >= set.firstgid && tile.index < set.firstgid + set.total);
                if (!tileset || tile.alpha <= 0) return;
                const texture = scene.textures.get(ASSET_KEYS.WHEAT);
                const frame = `breeze-wheat-${tile.index - tileset.firstgid}`;
                const local = tile.index - tileset.firstgid;
                if (!texture.has(frame)) texture.add(frame, 0, (local % tileset.columns) * tileset.tileWidth,
                    Math.floor(local / tileset.columns) * tileset.tileHeight, tileset.tileWidth, tileset.tileHeight);
                const image = scene.add.image(layer.x + tile.pixelX * layer.scaleX, layer.y + (tile.pixelY + tile.height) * layer.scaleY, ASSET_KEYS.WHEAT, frame)
                    .setOrigin(0, 1).setScale(layer.scaleX, layer.scaleY).setDepth(layer.depth).setAlpha(tile.alpha * layer.alpha).setName("wheat-roots");
                image.setFlip(tile.flipX, tile.flipY);
                this.#wheat.push({ image, tile, alpha: tile.alpha });
                tile.alpha = 0;
                this.#addCanopy(image, true);
            });
        });
    }
    #addCanopy(image: Phaser.GameObjects.Image, wheat = false): void {
        const canopy = new PinnedCanopy(this.scene, image, wheat);
        this.#canopies.push(canopy); this.#targets.push(canopy);
    }
    update(time: number): void {
        this.#canopies.forEach((canopy) => canopy.sync());
        if (this.#reducedMotion || time < this.#nextGust) return;
        this.#nextGust = time + Phaser.Math.Between(BREEZE_CONFIG.intervalMin, BREEZE_CONFIG.intervalMax);
        const view = this.scene.cameras.main.worldView;
        const candidates = this.#targets.filter((target) => target.active && target.stage === "standing" && !target.isBusy && view.contains(target.x, target.y));
        if (!candidates.length) return;
        const center = Phaser.Utils.Array.GetRandom(candidates);
        candidates.filter((target) => Phaser.Math.Distance.Between(target.x, target.y, center.x, center.y) < BREEZE_CONFIG.radius * WORLD_CONFIG.scale)
            .sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))
            .slice(0, BREEZE_CONFIG.maxTargets).forEach((target, index) => {
                const timer = this.scene.time.delayedCall(index * BREEZE_CONFIG.stagger, () => {
                    this.#pending.delete(timer);
                    if (target.active) target.breeze();
                });
                this.#pending.add(timer);
            });
    }
    destroy(): void {
        this.#pending.forEach((timer) => timer.remove()); this.#pending.clear();
        this.#canopies.forEach((canopy) => canopy.destroy()); this.#canopies = []; this.#targets = [];
        this.#wheat.forEach(({ image, tile, alpha }) => { image.destroy(); tile.alpha = alpha; }); this.#wheat = [];
    }
}
