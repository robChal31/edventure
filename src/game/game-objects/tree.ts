import Phaser from "phaser";
import { DEBUG_CONFIG } from "../config/debug-config";

import { FootprintConfig } from "../common/types";
import {
    ASSET_KEYS,
    MAHOGANY_ANIMATION_KEYS,
} from "../common/assets";
import {
    TreeAnimationKey,
    TreeDefinition,
} from "../common/types/object";
import {
    Interactable,
    InteractionContext,
} from "../common/types/interaction";
import { Collidable } from "../common/types/collision";
import { VisibleObject } from "../common/types/world-object";
import { WORLD_CONFIG } from "../config/world-config";
import { DropSystem } from "../components/game-object/item/drop-system";

export class Tree
    extends Phaser.GameObjects.Container
    implements Interactable, Collidable, VisibleObject
{
    #animation!: Phaser.GameObjects.Sprite;
    #staticTiles: Phaser.GameObjects.Image[] = [];

    #chopCount = 0;
    #chopLimit: number;

    #treeDefinition: TreeDefinition;
    #choppedTree?: TreeDefinition;

    #isChopping = false;
    #isChopped = false;

    #dropSystem: DropSystem;
    #scale: number;
    #treeAnimation: TreeAnimationKey =
        MAHOGANY_ANIMATION_KEYS.MAHOGANY_TREE_SMALL_ANIMATION;

    #interactionDebug?: Phaser.GameObjects.Rectangle;

    public collisionBody: Phaser.GameObjects.Rectangle | null = null;

    constructor(
        scene: Phaser.Scene,
        image: string,
        x: number,
        y: number,
        scale: number,
        treeDefinition: TreeDefinition,
        animationKey: TreeAnimationKey,
        choppedTree?: TreeDefinition,
    ) {
        super(scene, x, y);

        this.#treeDefinition = treeDefinition;
        this.#choppedTree = choppedTree;
        this.#chopLimit = treeDefinition.chopCount;
        this.#treeAnimation = animationKey;
        this.#dropSystem = new DropSystem(scene);

        this.setScale(scale);

        this.#createAnimation(scene);
        this.#createStaticTiles(scene, image, treeDefinition);

        scene.add.existing(this);
        this.#scale = scale;
        this.#createCollisionBody(
            scene,
            treeDefinition.footprint,
        );
    }

    // -------------------------------------------------------------------------
    // Interaction
    // -------------------------------------------------------------------------

    public interact(context: InteractionContext): void {
        if (context.action.type !== "axe") {
            return;
        }

        this.chop();
    }

    public getInteractionBounds(): Phaser.Geom.Rectangle {
        const bounds = this.collisionBody?.getBounds();

        if (!bounds) {
            return new Phaser.Geom.Rectangle();
        }

        const padding = 4;

        return new Phaser.Geom.Rectangle(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + padding * 2,
            bounds.height + padding * 2
        );
    }

    // -------------------------------------------------------------------------
    // Chop
    // -------------------------------------------------------------------------

    public chop(): void {
        if (this.#isChopped || this.#isChopping) {
            return;
        }

        this.scene.sound.play(ASSET_KEYS.CHOPPING_WOOD);

        this.#isChopping = true;
        this.#chopCount++;

        this.#playChopAnimation(() => {
            this.#isChopping = false;

            if (this.#chopCount >= this.#chopLimit) {
                this.#setChopped();
            }
        });
    }

    #playChopAnimation(onComplete?: () => void): void {
        this.#setStaticTilesVisible(false);

        this.#animation.setVisible(true);
        this.#animation.play(this.#treeAnimation);

        this.#animation.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE,
            () => {
                this.#animation.stop();
                this.#animation.setVisible(false);

                this.#setStaticTilesVisible(true);

                onComplete?.();
            }
        );
    }

    #setChopped(): void {
        if (this.#isChopped || !this.#choppedTree) {
            return;
        }

        this.#isChopped = true;

        this.scene.sound.play(ASSET_KEYS.TREE_FALLING);

        const oldTiles = [...this.#staticTiles];

        this.scene.tweens.add({
            targets: oldTiles,
            x: "+=2",
            duration: 60,
            yoyo: true,
            repeat: 2,
            ease: "Sine.inOut",

            onComplete: () => {
                this.#replaceWithChoppedTree(oldTiles);
            },
        });
    }

    #replaceWithChoppedTree(
        oldTiles: Phaser.GameObjects.Image[]
    ): void {
        oldTiles.forEach(tile => tile.destroy());

        this.#staticTiles = [];

        this.#createChoppedTiles();

        this.#applyCollisionFootprint(
            this.#choppedTree!.footprint, this.#scale
        );

        this.#spawnItems();
    }

    // -------------------------------------------------------------------------
    // Visual
    // -------------------------------------------------------------------------

    #createAnimation(scene: Phaser.Scene): void {
        const tileSize = WORLD_CONFIG.tileSize;
        const treeHeight = this.#treeDefinition.tiles.length * tileSize;
        const visualOffsetY = -tileSize;

        this.#animation = scene.add.sprite(
            0,
            visualOffsetY - (treeHeight - tileSize),
            ASSET_KEYS.MAHOGANY_ANIMATION
        );

        this.#animation.setOrigin(0, 0);
        this.#animation.setVisible(false);

        this.add(this.#animation);
    }

    #createStaticTiles(
        scene: Phaser.Scene,
        image: string,
        definition: TreeDefinition
    ): void {
        const tileSize = WORLD_CONFIG.tileSize;
        const visualOffsetY = -tileSize;

        definition.tiles.forEach((row, rowIndex) => {
            row.forEach((frame, colIndex) => {
                const tile = scene.add.image(
                    colIndex * tileSize,
                    -rowIndex * tileSize + visualOffsetY,
                    image,
                    frame
                );

                tile.setOrigin(0, 0);

                this.add(tile);
                this.#staticTiles.push(tile);
            });
        });
    }

    #createChoppedTiles(): void {
        if (!this.#choppedTree) {
            return;
        }

        const tileSize = WORLD_CONFIG.tileSize;
        const visualOffsetY = -tileSize;

        this.#choppedTree.tiles.forEach((row, rowIndex) => {
            row.forEach((frame, colIndex) => {
                const tile = this.scene.add.image(
                    colIndex * tileSize,
                    -rowIndex * tileSize + visualOffsetY - 4,
                    ASSET_KEYS.MAHOGANY_TREE,
                    frame
                );

                tile.setOrigin(0, 0);
                tile.setAlpha(0);
                tile.setScale(0.95);

                this.add(tile);
                this.#staticTiles.push(tile);

                this.scene.tweens.add({
                    targets: tile,
                    y: "+=4",
                    alpha: 1,
                    scale: 1,
                    duration: 180,
                    ease: "Back.out",
                });
            });
        });
    }

    #setStaticTilesVisible(visible: boolean): void {
        this.#staticTiles.forEach(tile => tile.setVisible(visible));
    }

    // -------------------------------------------------------------------------
    // Collision
    // -------------------------------------------------------------------------

    #createCollisionBody(
        scene: Phaser.Scene,
        footprint: FootprintConfig | undefined,
    ): void {
        if (!footprint) {
            return;
        }

        this.collisionBody = scene.add.rectangle(
            this.x,
            this.y,
            footprint.width * this.#scale,
            footprint.height * this.#scale
        );

        this.collisionBody.setOrigin(0, 0);
        this.collisionBody.setVisible(false);

        scene.physics.add.existing(this.collisionBody, true);

        this.#applyCollisionFootprint(footprint, this.#scale);
        this.#createInteractionDebug();
    }

    #applyCollisionFootprint(footprint: FootprintConfig, scale: number): void {
        if (!this.collisionBody?.body) {
            return;
        }

        const scaledOffsetX = footprint.offsetX * this.scaleX;
        const scaledOffsetY = footprint.offsetY * this.scaleY;
        const scaledWidth = footprint.width * this.scaleX;
        const scaledHeight = footprint.height * this.scaleY;

        this.collisionBody.setPosition(
            this.x + scaledOffsetX,
            this.y + scaledOffsetY
        );

        const body =
            this.collisionBody.body as Phaser.Physics.Arcade.StaticBody;

        body.setSize(scaledWidth, scaledHeight);
        body.position.set(
            this.x + scaledOffsetX,
            this.y + scaledOffsetY
        );
        body.updateFromGameObject();
    }

    // -------------------------------------------------------------------------
    // Interaction Debug
    // -------------------------------------------------------------------------

    #createInteractionDebug(): void {
        if (!DEBUG_CONFIG.interaction) {
            return;
        }

        const bounds = this.getInteractionBounds();

        this.#interactionDebug = this.scene.add.rectangle(
            bounds.centerX,
            bounds.centerY,
            bounds.width,
            bounds.height
        );

        this.#interactionDebug.setOrigin(0.5);
        this.#interactionDebug.setStrokeStyle(2);
        this.#interactionDebug.setFillStyle(0x00ff00, 0.15);
    }

    // -------------------------------------------------------------------------
    // Drops
    // -------------------------------------------------------------------------

    #spawnItems(): void {
        if (!this.collisionBody) {
            return;
        }

        this.#dropSystem.spawn({
            count: this.#treeDefinition.dropCount,
            spawnPosition: new Phaser.Math.Vector2(
                this.x,
                this.y - 8
            ),
            bounds: this.collisionBody.getBounds(),
        });
    }
}