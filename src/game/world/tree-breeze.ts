import Phaser from "phaser";
import { Tree } from "../game-objects/tree";
import type { WorldObject } from "./world-object";

interface BreezeTarget {
    readonly x: number; readonly y: number; readonly active: boolean;
    readonly stage: string; readonly isBusy: boolean;
    breeze(): void;
}

/** Split the original palm atlas frame into canopy and base: trunks/shadows never drift. */
class PalmCanopy implements BreezeTarget {
    readonly stage = "standing";
    readonly isBusy = false;
    #canopy: Phaser.GameObjects.Image;
    #gust?: Phaser.Tweens.Tween;
    constructor(private scene: Phaser.Scene, private image: Phaser.GameObjects.Image) {
        const split = Math.max(1, Math.floor(image.frame.realHeight * 0.64));
        this.#canopy = scene.add.image(image.x, image.y, image.texture.key, image.frame.name)
            .setOrigin(image.originX, image.originY).setScale(image.scaleX, image.scaleY)
            .setCrop(0, 0, image.frame.realWidth, split).setName("palm-canopy");
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
        this.#gust = this.scene.tweens.add({ targets: this.#canopy, x: this.image.x + 1, duration: 470,
            ease: "Sine.inOut", yoyo: true, repeat: 2, onComplete: () => { this.#gust = undefined; } });
    }
    destroy(): void {
        this.#gust?.remove(); this.#canopy.destroy();
        if (this.image.active) this.image.setCrop();
    }
}

/** One small local cluster per gust, staggered and infrequent — not every tree every frame. */
export class TreeBreeze {
    #nextGust: number;
    #pending = new Set<Phaser.Time.TimerEvent>();
    #trees: BreezeTarget[] = [];
    #palms: PalmCanopy[] = [];
    #reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    constructor(private scene: Phaser.Scene, objects: readonly WorldObject[]) {
        this.#nextGust = scene.time.now + Phaser.Math.Between(3500, 7000);
        for (const { gameObject } of objects) {
            if (gameObject instanceof Tree) this.#trees.push(gameObject);
            else if (gameObject instanceof Phaser.GameObjects.Image && /coconut_?tree|coconut_ree/i.test(gameObject.name)) {
                const canopy = new PalmCanopy(scene, gameObject);
                this.#palms.push(canopy); this.#trees.push(canopy);
            }
        }
    }
    update(time: number): void {
        this.#palms.forEach((palm) => palm.sync());
        if (this.#reducedMotion || time < this.#nextGust) return;
        this.#nextGust = time + Phaser.Math.Between(6500, 13000);
        const view = this.scene.cameras.main.worldView;
        const candidates = this.#trees.filter((tree) => tree.active && tree.stage === "standing" && !tree.isBusy && view.contains(tree.x, tree.y));
        if (!candidates.length) return;
        const center = Phaser.Utils.Array.GetRandom(candidates);
        candidates.filter((tree) => Phaser.Math.Distance.Between(tree.x, tree.y, center.x, center.y) < 85)
            .sort((a, b) => a.x - b.x).slice(0, 7).forEach((tree, index) => {
                const timer = this.scene.time.delayedCall(index * 90, () => {
                    this.#pending.delete(timer);
                    if (tree.active) tree.breeze();
                });
                this.#pending.add(timer);
            });
    }
    destroy(): void {
        this.#pending.forEach((timer) => timer.remove()); this.#pending.clear();
        this.#palms.forEach((palm) => palm.destroy()); this.#palms = []; this.#trees = [];
    }
}
