// game-scene.ts
import { ASSET_KEYS } from "../common/assets";
import { TreeDefinitions } from "../common/types/object";
import { KeyboardComponent } from "../components/input/keyboard-component";
import { WORLD_CONFIG } from "../config/world-config";
import { Tree } from "../game-objects/tree";
import { Player } from "../game-objects/player/player";
import { SCENE_KEYS } from "./scene-keys";
import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
    // ─── Private Properties ───
    #controls!: KeyboardComponent;
    #player!: Player;
    #map!: Phaser.Tilemaps.Tilemap;
    #cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null;
    #trees: Tree[] = [];
    // Layers
    #ground1Layer!: Phaser.Tilemaps.TilemapLayer;
    #ground2Layer!: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super({ key: SCENE_KEYS.GAME_SCENE });
    }

    // ─── Lifecycle ───
    public create(): void {
        this.#initControls();
        this.#initMap();
        this.#initCamera();
        this.#initPlayer();
        this.#initCollisions();
        this.#initInput();
    }

    // ─── Initialization Methods ───
    #initControls(): void {
        if (!this.input.keyboard) {
            console.warn("Phaser keyboard plugin is not setup properly");
            return;
        }
        this.#controls = new KeyboardComponent(this.input.keyboard);
    }

    #initMap(): void {
        this.#map = this.make.tilemap({ key: "WORLD_MAP" });

        const tileset = this.#map.addTilesetImage("tileSet", ASSET_KEYS.WORLD_TILESET1);
        if (!tileset) {
            console.error("Tileset 'tileSet' not found!");
            return;
        }

        // Ground layers
        this.#ground1Layer = this.#map.createLayer("ground1", tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.#ground2Layer = this.#map.createLayer("ground2", tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.#ground1Layer.setScale(WORLD_CONFIG.scale);
        this.#ground2Layer.setScale(WORLD_CONFIG.scale);
        // Set world bounds (physics & camera)
        this.physics.world.setBounds(0, 0, this.#map.widthInPixels * WORLD_CONFIG.scale, this.#map.heightInPixels * WORLD_CONFIG.scale);

        const definitions: TreeDefinitions = this.cache.json.get(
            "MAPLE_TREE_DEFINITIONS"
        );

        new Tree(
            this,
            'MAPLE_TREE',
            838,
            480,
            1,
            definitions.tree_small.tiles,
            definitions.tree_small.footprint,
        );

        new Tree(
            this,
            'MAPLE_TREE',
            870,
            380,
            2,
            definitions.tree_medium.tiles,
            definitions.tree_medium.footprint,
        );
        new Tree(
            this,
            'MAPLE_TREE',
            770,
            380,
            1,
            definitions.tree_large.tiles,
            definitions.tree_large.footprint,
        );
        new Tree(
            this,
            'MAPLE_TREE',
            870,
            480,
            1,
            definitions.tree_medium.tiles,
            definitions.tree_medium.footprint,
        );

        new Tree(
            this,
            'MAPLE_TREE',
            912,
            480,
            1,
            definitions.tree_large.tiles,
            definitions.tree_large.footprint,
        );
        new Tree(
            this,
            'MAPLE_TREE',
            932,
            480,
            2,
            definitions.chopped_tree.tiles,
            definitions.chopped_tree.footprint,
        );

        const collisionTree = new Tree(
            this,
            'MAPLE_TREE',
            944,
            480,
            2,
            definitions.tree_large.tiles,
            definitions.tree_large.footprint,
        );
        new Tree(
            this,
            'MAPLE_TREE',
            976,
            480,
            1,
            definitions.tree_large.tiles,
            definitions.tree_large.footprint,
        );
        new Tree(
            this,
            'MAPLE_TREE',
            1008,
            480,
            3,
            definitions.chopped_tree.tiles,
            definitions.chopped_tree.footprint,
        );

        this.#trees.push(collisionTree);
    }

    #initCamera(): void {
        this.cameras.main.setBounds(0, 0, this.#map.widthInPixels * WORLD_CONFIG.scale, this.#map.heightInPixels * WORLD_CONFIG.scale);
    }

    #initPlayer(): void {
        const spawnX = this.#map.widthInPixels / 2;
        const spawnY = this.#map.heightInPixels / 2;

        this.#player = new Player({
            scene: this,
            position: { x: spawnX, y: spawnY },
            assetKey: ASSET_KEYS.PLAYER,
            frame: 0,
            controls: this.#controls,
        });

        this.#player.setScale(WORLD_CONFIG.scale);

        // Camera follow player (smooth)
        this.cameras.main.startFollow(this.#player, true, 0.08, 0.08);
    }

    #initCollisions(): void {
        // ★ Collision untuk ground2 (tebing / rintangan)
        const cliffIndexes = [213, 228, 237, 238, 239, 240];
        cliffIndexes.forEach((index) => {
            this.#ground2Layer.setCollision(index);
        });

        // Player vs ground2
        this.physics.add.collider(this.#player, this.#ground2Layer);


        this.#trees.forEach((tree) => {
            if (tree.collisionBody) {
                this.physics.add.collider(
                    this.#player,
                    tree.collisionBody
                );
            }
        });

        // Opsional: Player vs world bounds (biar ga keluar map)
        this.#player.setCollideWorldBounds(true);
    }

    #initInput(): void {
        this.#cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    }

    // ─── Update Loop ───
    public update(): void {
        const speed = 200;
        const body = this.#player.body as Phaser.Physics.Arcade.Body | null;
        if (!body || !this.#cursors) return;

        // Reset velocity
        body.setVelocity(0);

        // Movement
        if (this.#cursors.left.isDown) {
            body.setVelocityX(-speed);
        } else if (this.#cursors.right.isDown) {
            body.setVelocityX(speed);
        }

        if (this.#cursors.up.isDown) {
            body.setVelocityY(-speed);
        } else if (this.#cursors.down.isDown) {
            body.setVelocityY(speed);
        }

        this.#player.setDepth(this.#player.y);

        this.#trees.forEach((tree) => {
            tree.setDepth(tree.y);
        });
    }
}