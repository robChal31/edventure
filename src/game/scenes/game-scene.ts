
import { ASSET_KEYS } from "../common/assets";
import { VirtualInputComponent } from "../components/input/virtual-input-component";
import { WORLD_CONFIG } from "../config/world-config";
import { Player } from "../game-objects/player/player";
import { ObjectVisibilitySystem } from "../systems/object-visibility-system";
import { WorldMap } from "../world/world-map";
import { WorldObjectLoader } from "../world/world-object-loader";
import { SCENE_KEYS } from "./scene-keys";
import Phaser from "phaser";
import { InteractionSystem } from "../systems/interaction-system";
import { PlayerAction } from "../common/types";
import { CollisionSystem } from "../systems/collision-system";
import { VILLAGE_MAP } from "../world/maps/village-map";
import { WorldObjectFactory } from "../world/world-object-factory";
import { WorldObjectRegistry } from "../world/world-object-registry";
import { MapAnimationLoader } from "../world/map-animation-loader";
import type { ActivityController, GameOptions } from "../game-options";
import { FishingActivity } from "../activities/fishing/fishing-activity";
import { FISHING_CONFIG } from "../activities/fishing/fishing-config";
import { BEACH_MAP } from "../world/maps/beach-map";

export class GameScene extends Phaser.Scene {
    #controls!: VirtualInputComponent;
    #player!: Player;
    #worldObjectLoader!: WorldObjectLoader;
    #worldObjectFactory!: WorldObjectFactory;
    #worldObjectRegistry!: WorldObjectRegistry;
    #worldMap!: WorldMap;
    #objectVisibilitySystem!: ObjectVisibilitySystem;
    #interactionSystem!: InteractionSystem;
    #collisionSystem!: CollisionSystem;
    #mapAnimationLoader!: MapAnimationLoader;
    #activity?: FishingActivity;
    #options?: GameOptions;
    #controller!: ActivityController;

    constructor(options?: GameOptions) {
        super({
            key: SCENE_KEYS.GAME_SCENE,
        });
        this.#options = options;

        this.#controller = {
            cast: () => this.#activity?.attemptCast(),
            answer: (index) => this.#activity?.answer(index),
            restart: () => this.#activity?.restart(),
            setVirtualDirection: (dir, pressed) =>
                this.#controls?.setVirtualDirection(dir, pressed),
        };
    }

    public get controller(): ActivityController {
        return this.#controller;
    }

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────

    public create(): void {
        this.#initControls();
        this.#initWorld();
        this.#initMapAnimations();
        this.#initObjects();
        this.#initCamera();
        this.#initPlayer();
        this.#initDebugPlayer();
        this.#initSystems();
        this.#collisionSystem.setup();

        // Keep the existing collision debug overlay only in free-roam
        // (no quiz) mode; the fishing activity renders a clean view.
        this.#initDebug();
        if (!this.#options?.quiz) {
            this.#initDebug();
        }

        this.#initActivity();

        this.#options?.onEvent({ type: "game:ready" });
    }
    // ─────────────────────────────────────────
    // CONTROLS
    // ─────────────────────────────────────────

    #initControls(): void {
        if (!this.input.keyboard) {
            console.warn("Phaser keyboard plugin is not setup properly");
            return;
        }

        this.#controls = new VirtualInputComponent(this.input.keyboard);
    }

    // ─────────────────────────────────────────
    // WORLD
    // ─────────────────────────────────────────

    #initWorld(): void {
        this.#worldMap = new WorldMap(
            this,
            // VILLAGE_MAP
            BEACH_MAP
        );
    }

    #initSystems(): void {
        this.#objectVisibilitySystem =
            new ObjectVisibilitySystem(
                this.#player,
                this.#worldObjectRegistry.visibleObjects
            );

        this.#interactionSystem =
            new InteractionSystem(
                this.#player,
                this.#worldObjectRegistry.interactables
            );

        this.#collisionSystem = new CollisionSystem(
            this,
            this.#player,
            this.#worldMap,
            this.#worldObjectRegistry.objects
        );
    }
    // ─────────────────────────────────────────
    // CAMERA
    // ─────────────────────────────────────────

    #initCamera(): void {
        const map = this.#worldMap.map;
        const worldWidth = map.widthInPixels * WORLD_CONFIG.scale;
        const worldHeight = map.heightInPixels * WORLD_CONFIG.scale;

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        const applyZoom = () => {
            const zoomX = this.scale.width / worldWidth;
            const zoomY = this.scale.height / worldHeight;

            // COVER — pakai max, TANPA floor
            const zoom = Math.max(zoomX, zoomY);

            this.cameras.main.setZoom(zoom);
        };

        applyZoom();
        this.scale.on("resize", applyZoom);
        this.events.once("shutdown", () => {
            this.scale.off("resize", applyZoom);
        });
    }

    // ─────────────────────────────────────────
    // PLAYER
    // ─────────────────────────────────────────

    #initPlayer(): void {
        const map = this.#worldMap.map;

        let spawnX = (map.widthInPixels * WORLD_CONFIG.scale) / 2;
        let spawnY = (map.heightInPixels * WORLD_CONFIG.scale) / 2;

        // When a quiz activity is active, start beside the river.
        if (this.#options?.quiz) {
            spawnX = FISHING_CONFIG.spawn.x;
            spawnY = FISHING_CONFIG.spawn.y;
        }

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
                this.#handlePlayerInteraction({
                    type: "axe",
                    onMiss: () => {
                        this.sound.play(ASSET_KEYS.AXE_SWING);
                    },
                });
            },

            onInteract: () => {
                this.#activity?.onPlayerInteract();
            },
        });

        this.#player.setScale(WORLD_CONFIG.scale);

        this.cameras.main.startFollow(
            this.#player,
            true,
            0.08,
            0.08
        );
    }

    #handlePlayerInteraction(action: PlayerAction): void {
        this.#interactionSystem.interact(action);
    }

    #initObjects(): void {
        this.#worldObjectFactory =
            new WorldObjectFactory(this);

        this.#worldObjectLoader =
            new WorldObjectLoader(
                // VILLAGE_MAP,
                BEACH_MAP,
                this.#worldObjectFactory
            );

        const objects =
            this.#worldObjectLoader.loadObjects(
                this.#worldMap.map
            );

        this.#worldObjectRegistry =
            new WorldObjectRegistry();

        this.#worldObjectRegistry.registerAll(
            objects
        );
    }

    #initMapAnimations(): void {
        this.#mapAnimationLoader =
            new MapAnimationLoader(
                this,
                // VILLAGE_MAP
                BEACH_MAP
            );

        this.#mapAnimationLoader.load(
            this.#worldMap.map
        );
    }

    #initDebug(): void {
        this.#collisionSystem.initDebug();

        this.#worldMap.waterLayer.renderDebug(
            this.add.graphics(),
            {
                tileColor: null,
                collidingTileColor: new Phaser.Display.Color(168, 85, 247, 80),
                faceColor: new Phaser.Display.Color(168, 85, 247, 255),
            }
        );
    }

    // Di GameScene, setelah #initPlayer()
    #initDebugPlayer(): void {
        const body = this.#player.body as Phaser.Physics.Arcade.Body;
        const graphics = this.add.graphics();
        graphics.setDepth(99999);

        graphics.lineStyle(2, 0xff0000, 1);

        // Render di setiap frame (kalau player gerak, body ikut)
        this.events.on(Phaser.Scenes.Events.UPDATE, () => {
            graphics.clear();
            graphics.lineStyle(2, 0xff0000, 1);
            graphics.strokeRect(
                body.x,
                body.y,
                body.width,
                body.height
            );
        });
    }

    // ─────────────────────────────────────────
    // ACTIVITY
    // ─────────────────────────────────────────

    #initActivity(): void {
        if (!this.#options?.quiz) {
            return;
        }

        this.#activity = new FishingActivity({
            scene: this,
            player: this.#player,
            waterPoints: this.#computeWaterPoints(),
            quiz: this.#options.quiz,
            emit: this.#options.onEvent,
        });

        this.#activity.create();
    }

    #computeWaterPoints(): { x: number; y: number }[] {
        const points: { x: number; y: number }[] = [];
        const layer = this.#worldMap.waterLayer;
        if (!layer) {
            return points;
        }

        const data = layer.layer.data as Phaser.Tilemaps.Tile[][];
        const tw = this.#worldMap.map.tileWidth * WORLD_CONFIG.scale;
        const th = this.#worldMap.map.tileHeight * WORLD_CONFIG.scale;

        data.forEach((row) => {
            row.forEach((tile) => {
                if (tile && tile.index > 0) {
                    points.push({
                        x: tile.x * tw + tw / 2,
                        y: tile.y * th + th / 2,
                    });
                }
            });
        });

        return points;
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    public update(): void {
        // Player: depth = body bottom (kaki)
        const playerBody = this.#player.body as Phaser.Physics.Arcade.Body;
        if (playerBody) {
            this.#player.setDepth(playerBody.bottom);
        }

        // Objects: depth = body bottom (kaki)
        this.#worldObjectRegistry.objects.forEach(({ depthSortable, collidable }) => {
            if (!depthSortable) return;

            const body = collidable?.collisionBody;
            const depthRef = body
                ? body.y + body.height
                : depthSortable.y;  // fallback kalau ga ada body

            depthSortable.setDepth(depthRef);
        });

        this.#objectVisibilitySystem.update();
        this.#activity?.update();
    }
}
