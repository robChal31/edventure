import Phaser from 'phaser';
import { FootprintConfig } from '../common/types';
import { ASSET_KEYS, MAHOGANY_ANIMATION_KEYS } from '../common/assets';
import { TreeDefinition } from '../common/types/object';
import { ItemSpawn } from './item/item_spawn';

export class Tree extends Phaser.GameObjects.Container {
    #animation!: Phaser.GameObjects.Sprite;
    #staticTiles: Phaser.GameObjects.Image[] = [];

    #chopCount = 0;
    #chopLimit: number;
    #treeDefinition: TreeDefinition;
    #choppedTree?: TreeDefinition;
    #isChopping = false;
    #isChopped = false;
    public collisionBody: Phaser.GameObjects.Rectangle | null = null;

    constructor(
        scene: Phaser.Scene,
        image: string,
        x: number,
        y: number,
        scale: number,
        treeDefinition: TreeDefinition,
        choppedTree?: TreeDefinition
    ) {
        super(scene, x, y);

        const tileSize = 16;
        const visualOffsetY = -tileSize;
        const treeHeight = treeDefinition.tiles.length * tileSize;
        this.#choppedTree = choppedTree;
        this.#chopLimit = treeDefinition.chopCount;
        this.#treeDefinition = treeDefinition;
        this.#animation = scene.add.sprite(
            0,
            visualOffsetY - (treeHeight - tileSize),
            ASSET_KEYS.MAHOGANY_ANIMATION
        );

        this.#animation.setOrigin(0, 0);
        this.#animation.setVisible(false);

        this.add(this.#animation);
        this.setScale(scale)
        treeDefinition.tiles.forEach((row, rowIndex) => {
            row.forEach((frame, colIndex) => {
                const tile = scene.add.image(
                    colIndex * tileSize,
                    -rowIndex * tileSize + visualOffsetY,
                    image,
                    frame
                )
                tile.setOrigin(0, 0);
                this.add(tile);
                this.#staticTiles.push(tile);
            })
        })

        scene.add.existing(this);
        const footprints = treeDefinition.footprint;
        if(footprints) {
            const scaledOffsetX = footprints.offsetX * scale;
            const scaledOffsetY = footprints.offsetY * scale;
            const scaledWidth = footprints.width * scale;
            const scaledHeight = footprints.height * scale;

            this.collisionBody = scene.add.rectangle(
                x + scaledOffsetX,
                y + scaledOffsetY,
                scaledWidth,
                scaledHeight
            )

            this.collisionBody.setOrigin(0, 0);
            this.collisionBody.setVisible(false);
            // Tree tidak boleh terdorong oleh player
            scene.physics.add.existing(this.collisionBody, true);
        }
    }

    public playChopAnimation(onComplete?: () => void): void {
        this.#staticTiles.forEach(tile => tile.setVisible(false));

        this.#animation.setVisible(true);

        this.#animation.play(
            MAHOGANY_ANIMATION_KEYS.LIGHT_GREEN
        );

        this.#animation.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE,
            () => {
                this.#animation.stop();
                this.#animation.setVisible(false);

                this.#staticTiles.forEach(tile => tile.setVisible(true));

                onComplete?.();
            }
        );
    }

    public containsPoint(x: number, y: number): boolean {
        return this.collisionBody?.getBounds().contains(x, y) ?? false;
    }

    public chop(): void {
        if (this.#isChopped || this.#isChopping) {
            return;
        }
        this.scene.sound.play(ASSET_KEYS.CHOPPING_WOOD);
        this.#isChopping = true;
        this.#chopCount++;

        this.playChopAnimation(() => {
            this.#isChopping = false;

            if (this.#chopCount >= this.#chopLimit) {
                this.setChopped();
            }
        });
    }

    private setChopped(): void {
        if (!this.#choppedTree) {
            return;
        }
        setTimeout(() => {
            
        }, 1000);
        this.#staticTiles.forEach(tile => tile.destroy());
        this.#staticTiles = [];

        const tiles = this.#choppedTree.tiles;

        const tileSize = 16;
        const visualOffsetY = -tileSize;
        this.scene.sound.play(ASSET_KEYS.TREE_FALLING);
        tiles.forEach((row, rowIndex) => {
            row.forEach((frame, colIndex) => {
                const tile = this.scene.add.image(
                    colIndex * tileSize,
                    -rowIndex * tileSize + visualOffsetY,
                    ASSET_KEYS.WORLD_MAHOGANY_TREE,
                    frame
                );

                tile.setOrigin(0, 0);

                this.add(tile);
                this.#staticTiles.push(tile);
            });
        });

        this.#isChopped = true;
        this.updateCollisionBody(
            this.#choppedTree.footprint
        );

        this.#spawnItems();
    }

    private updateCollisionBody(footprint: FootprintConfig): void {
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

        const body = this.collisionBody.body as Phaser.Physics.Arcade.StaticBody;

        body.setSize(
            scaledWidth,
            scaledHeight
        );

        body.position.set(
            this.x + scaledOffsetX,
            this.y + scaledOffsetY
        );

        body.updateFromGameObject();
    }

    #spawnItems(): void {
        const dropCount = this.#treeDefinition.dropCount;

        if (!this.collisionBody) {
            return;
        }

        const spacing = 10;
        const edgePadding = 32;
        const spawnDistance = 8;

        const treeBounds = this.collisionBody.getBounds();
        const worldBounds = this.scene.physics.world.bounds;

        const directions: ('top' | 'bottom' | 'left' | 'right')[] = [];

        // Tentukan arah yang masih aman dari edge
        if (treeBounds.left > worldBounds.left + edgePadding) {
            directions.push('left');
        }

        if (treeBounds.right < worldBounds.right - edgePadding) {
            directions.push('right');
        }

        if (treeBounds.top > worldBounds.top + edgePadding) {
            directions.push('top');
        }

        if (treeBounds.bottom < worldBounds.bottom - edgePadding) {
            directions.push('bottom');
        }

        // Fallback kalau posisinya sangat dekat semua edge
        if (directions.length === 0) {
            directions.push('bottom');
        }

        const direction = Phaser.Utils.Array.GetRandom(directions);

        let startX = this.x;
        let startY = this.y;

        const clusterWidth = spacing;
        const clusterHeight = Math.ceil(dropCount / 2) * spacing;

        switch (direction) {
            case 'left':
                startX = treeBounds.left - spawnDistance - clusterWidth;
                startY = treeBounds.centerY - clusterHeight / 2;
                break;

            case 'right':
                startX = treeBounds.right + spawnDistance;
                startY = treeBounds.centerY - clusterHeight / 2;
                break;

            case 'top':
                startX = treeBounds.centerX - clusterWidth / 2;
                startY = treeBounds.top - spawnDistance - clusterHeight;
                break;

            case 'bottom':
                startX = treeBounds.centerX - clusterWidth / 2;
                startY = treeBounds.bottom + spawnDistance;
                break;
        }

        // Random sedikit supaya tidak selalu persis di tengah sisi
        const randomOffset = 12;

        if (direction === 'left' || direction === 'right') {
            startY += Phaser.Math.Between(-randomOffset, randomOffset);
        } else {
            startX += Phaser.Math.Between(-randomOffset, randomOffset);
        }

        for (let i = 0; i < dropCount; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;

            const targetX = startX + col * spacing;
            const targetY = startY + row * spacing;

            const spawnX = this.x;
            const spawnY = this.y - 8;

            new ItemSpawn(
                this.scene,
                spawnX,
                spawnY,
                targetX,
                targetY
            );
        }
    }
}