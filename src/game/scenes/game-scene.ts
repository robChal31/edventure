
import { ASSET_KEYS } from "../common/assets";
import { TreeDefinitions } from "../common/types/object";
import { KeyboardComponent } from "../components/input/keyboard-component";
import { WORLD_CONFIG } from "../config/world-config";
import { Player } from "../game-objects/player/player";
import { Tree } from "../game-objects/tree";
import { SCENE_KEYS } from "./scene-keys";
import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
    #controls!: KeyboardComponent;
    #player!: Player;
    #map!: Phaser.Tilemaps.Tilemap;
    #cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null;
    #waterLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    #trees: Tree[] = [];

    constructor() {
        super({
            key: SCENE_KEYS.GAME_SCENE,
        });
    }

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────

    public create(): void {
        this.#initControls();
        this.#initMap();
        this.#initCamera();
        this.#initPlayer();
        this.#initInput();
        this.#initCollisions();
        this.#initDebug();
    }

    // ─────────────────────────────────────────
    // CONTROLS
    // ─────────────────────────────────────────

    #initControls(): void {
        if (!this.input.keyboard) {
            console.warn("Phaser keyboard plugin is not setup properly");
            return;
        }

        this.#controls = new KeyboardComponent(this.input.keyboard);
    }

    // ─────────────────────────────────────────
    // MAP
    // ─────────────────────────────────────────

    #initMap(): void {
        this.#map = this.make.tilemap({
            key: ASSET_KEYS.WORLD_MAP2,
        });

        // ─────────────────────────────────────────
        // TILESETS
        // ─────────────────────────────────────────

        const summerGrass =
            this.#map.addTilesetImage(
                "summer_grass",
                ASSET_KEYS.WORLD_SUMMER_GRASS
            );

        const summerGrassWater =
            this.#map.addTilesetImage(
                "summer_grass_water",
                ASSET_KEYS.WORLD_SUMMER_GRASS_WATER
            );

        const water =
            this.#map.addTilesetImage(
                "water",
                ASSET_KEYS.WORLD_WATER
            );

        const waterfall =
            this.#map.addTilesetImage(
                "waterfall",
                ASSET_KEYS.WORLD_WATERFALL
            );

        const summerCliff =
            this.#map.addTilesetImage(
                "summer_cliff",
                ASSET_KEYS.WORLD_SUMMER_CLIFF
            );

        const definitions: TreeDefinitions = this.cache.json.get("MAHOGANY_TREE_DEFINITIONS");

        if (!summerGrass || !summerGrassWater || !water || !waterfall || !summerCliff) {
            console.error("Failed to load one or more map tilesets");
            return;
        }

        const tilesets = [
            summerGrass,
            summerGrassWater,
            water,
            waterfall,
            summerCliff,
        ];

        // ─────────────────────────────────────────
        // CREATE MAP LAYERS
        // ─────────────────────────────────────────

        this.#map.layers.forEach(
            (layerData) => {

                const layer =
                    this.#map.createLayer(
                        layerData.name,
                        tilesets,
                        0,
                        0
                    );

                if (!layer) {
                    console.error(
                        "Failed to create layer:",
                        layerData.name
                    );

                    return;
                }

                layer.setScale(
                    WORLD_CONFIG.scale
                );

                if (layerData.name === "water") {
                    this.#waterLayer = layer;
                }
            }
        );

        const treeObjectLayer = this.#map.getObjectLayer("mahogany_tree");

        treeObjectLayer?.objects.forEach((object) => {
            if (object.gid == null || object.x == null || object.y == null) {
                return;
            }
            const tree = new Tree(
                this,
                ASSET_KEYS.WORLD_MAHOGANY_TREE,
                object.x * WORLD_CONFIG.scale,
                object.y * WORLD_CONFIG.scale,
                WORLD_CONFIG.scale,
                definitions.tree_medium,
                definitions.chopped_tree,
            );

            this.#trees.push(tree);
        });

        this.#waterLayer.setCollisionByExclusion([-1]);
        // ─────────────────────────────────────────
        // PHYSICS WORLD BOUNDS
        // ─────────────────────────────────────────

        this.physics.world.setBounds(
            0,
            0,
            this.#map.widthInPixels *
                WORLD_CONFIG.scale,
            this.#map.heightInPixels *
                WORLD_CONFIG.scale
        );
    }

    // ─────────────────────────────────────────
    // CAMERA
    // ─────────────────────────────────────────

    #initCamera(): void {
        this.cameras.main.setBounds(0, 0, this.#map.widthInPixels * WORLD_CONFIG.scale, this.#map.heightInPixels * WORLD_CONFIG.scale);
    }

    // ─────────────────────────────────────────
    // PLAYER
    // ─────────────────────────────────────────

    #initPlayer(): void {
        const spawnX = (this.#map.widthInPixels * WORLD_CONFIG.scale)/2;

        const spawnY = (this.#map.heightInPixels * WORLD_CONFIG.scale)/2;

        this.#player = new Player({
            scene: this,

            position: {
                x: spawnX,
                y: spawnY,
            },

            assetKey: ASSET_KEYS.PLAYER,
            frame: 0,
            controls: this.#controls,

            onAxeAction: () => {
                this.#chopTree();
            },
        });

        this.#player.setScale(WORLD_CONFIG.scale);

        this.#player.setDepth(this.#player.y);

        this.cameras.main.startFollow(
            this.#player,
            true,
            0.08,
            0.08
        );

        this.#player.setCollideWorldBounds(true);
    }

    // ─────────────────────────────────────────
    // INPUT
    // ─────────────────────────────────────────

    #initInput(): void {
        this.#cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    }


    #initCollisions(): void {
        // ★ Collision untuk ground2 (tebing / rintangan)
        const cliffIndexes = [1389, 1391, 1392, 1398, 1399, 1437, 1446, 1464, 1488, 1510, 1512, 1533, 1534];
        cliffIndexes.forEach((index) => {
            this.#waterLayer.setCollision(index);
        });

        // Player vs water
        this.physics.add.collider(this.#player, this.#waterLayer);

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

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────

    public update(): void {
        const speed = 200;

        const body =
            this.#player.body as
                | Phaser.Physics.Arcade.Body
                | null;

        if (
            !body ||
            !this.#cursors
        ) {
            return;
        }

        body.setVelocity(0);

        if (
            this.#cursors.left.isDown
        ) {
            body.setVelocityX(
                -speed
            );
        } else if (
            this.#cursors.right.isDown
        ) {
            body.setVelocityX(
                speed
            );
        }

        if (
            this.#cursors.up.isDown
        ) {
            body.setVelocityY(
                -speed
            );
        } else if (
            this.#cursors.down.isDown
        ) {
            body.setVelocityY(
                speed
            );
        }

        this.#player.setDepth(
            this.#player.y
        );

        this.#trees.forEach((tree) => {
            tree.setDepth(tree.y);

            const treeBounds = tree.getBounds();
            const playerBounds = this.#player.getBounds();

            // Area deteksi dibuat lebih kecil, fokus ke bagian bawah tree
            const overlapLeft = treeBounds.left + 8;
            const overlapRight = treeBounds.right - 8;
            const overlapTop = treeBounds.top + 32;
            const overlapBottom = treeBounds.bottom;

            const playerX = playerBounds.centerX;
            const playerY = playerBounds.bottom;

            const isBehindTree =
                playerX >= overlapLeft &&
                playerX <= overlapRight &&
                playerY >= overlapTop &&
                playerY <= overlapBottom;

            tree.setAlpha(isBehindTree ? 0.5 : 1);
        });
        
    }

    #initDebug(): void {
        this.#waterLayer.renderDebug(
            this.add.graphics(),
            {
                tileColor: 0x00ff00,
                collidingTileColor: 0xff0000,
                faceColor: 0xffffff,
            }
        );
    }

    #chopTree(): void {
        const playerX = this.#player.x;
        const playerY = this.#player.y;

        const chopDistance = 32;

        let targetX = playerX;
        let targetY = playerY;

        switch (this.#player.direction) {
            case "up":
                targetY -= chopDistance;
                break;

            case "down":
                targetY += chopDistance;
                break;

            case "side":
                targetX += this.#player.flipX ? -chopDistance : chopDistance;
                break;
        }

        const targetTree = this.#trees.find(tree =>
            tree.containsPoint(targetX, targetY)
        );

        targetTree ? targetTree?.chop() : this.#player.scene.sound.play(ASSET_KEYS.AXE_SWING);
    }
}

