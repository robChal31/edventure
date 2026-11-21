import Phaser from "phaser";
import type { FootprintConfig, PlayerAction } from "../common/types";
import { ASSET_KEYS } from "../common/assets";
import type { TreeDefinition, TreeAnimationKey } from "../common/types/object";
import type { Interactable, InteractionContext } from "../common/types/interaction";
import type { Collidable } from "../common/types/collision";
import type { VisibleObject } from "../common/types/world-object";
import { WORLD_CONFIG } from "../config/world-config";
import { DropSystem } from "../components/game-object/item/drop-system";
import { TreeLifecycle } from "./tree-lifecycle";

/** A tree and its stump share one lifecycle; no invisible physics remains after clearing. */
export class Tree extends Phaser.GameObjects.Container implements Interactable, Collidable, VisibleObject {
    #visual: Phaser.GameObjects.Container;
    #animation?: Phaser.GameObjects.Sprite;
    #tiles: Phaser.GameObjects.Image[] = [];
    #lifecycle: TreeLifecycle;
    #busy = false;
    #definition: TreeDefinition;
    #stump: TreeDefinition;
    #texture: string;
    #animationKey?: string;
    #drops: DropSystem;
    #ownedTweens = new Set<Phaser.Tweens.Tween>();
    #breeze?: Phaser.Tweens.Tween;
    public collisionBody: Phaser.GameObjects.Rectangle | null = null;

    constructor(scene: Phaser.Scene, texture: string, x: number, y: number, scale: number,
        definition: TreeDefinition, animationKey?: TreeAnimationKey, stump?: TreeDefinition) {
        super(scene, x, y);
        this.#definition = definition;
        this.#stump = stump ?? definition;
        this.#texture = texture;
        this.#animationKey = animationKey;
        this.#lifecycle = new TreeLifecycle(definition.chopCount, definition.stage === "stump");
        this.#drops = new DropSystem(scene);
        this.setScale(scale);
        this.#visual = scene.add.container(0, 0);
        this.add(this.#visual);
        scene.add.existing(this);
        this.#draw(definition);
        this.#createBody(definition.footprint);
        if (animationKey && scene.anims.exists(animationKey)) {
            this.#animation = scene.add.sprite(0, -definition.tiles.length * WORLD_CONFIG.tileSize, ASSET_KEYS.MAHOGANY_ANIMATION)
                .setOrigin(0, 0).setVisible(false);
            this.#visual.add(this.#animation);
        }
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.#ownedTweens.forEach((tween) => tween.remove());
            this.#ownedTweens.clear();
            this.#breeze?.remove();
            this.collisionBody?.destroy();
            this.collisionBody = null;
        });
    }
    public get stage(): string { return this.#lifecycle.stage; }
    public get isBusy(): boolean { return this.#busy; }
    public canInteract(action: PlayerAction["type"]): boolean {
        return this.active && action === "axe" && this.#lifecycle.stage !== "cleared" && !this.#busy;
    }
    public interact(context: InteractionContext): void { if (context.action.type === "axe") this.chop(); }
    public getInteractionBounds(): Phaser.Geom.Rectangle {
        if (!this.active || !this.collisionBody?.active) return new Phaser.Geom.Rectangle();
        const b = this.collisionBody.getBounds();
        return new Phaser.Geom.Rectangle(b.x - 4, b.y - 4, b.width + 8, b.height + 8);
    }
    public chop(): void {
        if (!this.canInteract("axe")) return;
        this.#stopBreeze();
        this.#busy = true;
        const result = this.#lifecycle.hit();
        if (!result) { this.#busy = false; return; }
        if (this.scene.cache.audio.exists(ASSET_KEYS.CHOPPING_WOOD)) this.scene.sound.play(ASSET_KEYS.CHOPPING_WOOD);
        const finish = () => {
            if (!this.active) return;
            if (result.changed) {
                this.#spawnDrops(result.previous === "stump" ? this.#stump.dropCount : this.#definition.dropCount);
                if (result.stage === "cleared") {
                    // Disable and remove the body immediately; never leave a ghost stump.
                    if (this.collisionBody?.body) (this.collisionBody.body as Phaser.Physics.Arcade.StaticBody).enable = false;
                    this.collisionBody?.destroy();
                    this.collisionBody = null;
                    this.destroy();
                    return;
                }
                if (this.scene.cache.audio.exists(ASSET_KEYS.TREE_FALLING)) this.scene.sound.play(ASSET_KEYS.TREE_FALLING);
                this.#animation?.destroy();
                this.#animation = undefined;
                this.#draw(this.#stump);
                this.#applyFootprint(this.#stump.footprint);
            }
            this.#busy = false;
        };
        if (result.previous === "standing" && this.#animation && this.#animationKey) {
            this.#tiles.forEach((tile) => tile.setVisible(false));
            this.#animation.setVisible(true).play(this.#animationKey);
            this.#animation.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                if (!this.active) return;
                this.#animation?.setVisible(false);
                this.#tiles.forEach((tile) => tile.setVisible(true));
                finish();
            });
        } else {
            this.#tween({ targets: this.#visual, x: 1.5, duration: 65, yoyo: true, repeat: 2,
                onComplete: () => { this.#visual.x = 0; finish(); } });
        }
    }
    /** A gust moves only the canopy art, never its physics footprint or depth anchor. */
    public breeze(strength = 1): void {
        if (!this.active || this.#busy || this.#breeze || this.#lifecycle.stage !== "standing") return;
        const art = this.#tiles.filter((tile) => tile.y < -WORLD_CONFIG.tileSize);
        if (!art.length) return;
        this.#breeze = this.scene.tweens.add({
            targets: art, x: "+=1", duration: 420 / strength, yoyo: true, repeat: 2,
            ease: "Sine.inOut", onComplete: () => { this.#breeze = undefined; },
        });
    }
    #stopBreeze(): void {
        this.#breeze?.remove(); this.#breeze = undefined;
        const definition = this.#lifecycle.stage === "standing" ? this.#definition : this.#stump;
        this.#tiles.forEach((tile, index) => { tile.x = (index % definition.tiles[0].length) * WORLD_CONFIG.tileSize; });
    }
    #draw(definition: TreeDefinition): void {
        this.#tiles.forEach((tile) => tile.destroy()); this.#tiles = [];
        definition.tiles.forEach((row, rowIndex) => row.forEach((frame, colIndex) => {
            const tile = this.scene.add.image(colIndex * WORLD_CONFIG.tileSize, -(rowIndex + 1) * WORLD_CONFIG.tileSize,
                this.#texture, frame).setOrigin(0, 0);
            this.#visual.add(tile); this.#tiles.push(tile);
        }));
    }
    #createBody(footprint: FootprintConfig): void {
        this.collisionBody = this.scene.add.rectangle(0, 0, footprint.width * this.scaleX, footprint.height * this.scaleY)
            .setOrigin(0, 0).setVisible(false);
        this.scene.physics.add.existing(this.collisionBody, true);
        this.#applyFootprint(footprint);
    }
    #applyFootprint(f: FootprintConfig): void {
        const rect = this.collisionBody;
        if (!rect?.body) return;
        rect.setPosition(this.x + f.offsetX * this.scaleX, this.y + f.offsetY * this.scaleY)
            .setSize(f.width * this.scaleX, f.height * this.scaleY);
        (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
    #spawnDrops(count: number): void {
        if (!this.collisionBody) return;
        const bounds = this.collisionBody.getBounds();
        this.#drops.spawn({ count, spawnPosition: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY - 8), bounds });
    }
    #tween(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
        const onComplete = config.onComplete;
        const tween = this.scene.tweens.add({ ...config, onComplete: (...args: Parameters<Phaser.Types.Tweens.TweenOnCompleteCallback>) => {
            this.#ownedTweens.delete(tween);
            if (this.active) onComplete?.(...args);
        } });
        this.#ownedTweens.add(tween);
    }
}
