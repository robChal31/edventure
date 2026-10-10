
import { ASSET_KEYS } from "../common/assets";
import { KeyboardComponent } from "../components/input/keyboard-component";
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

export class GameScene extends Phaser.Scene {
    #controls!: KeyboardComponent;
    #player!: Player;
    #worldObjectLoader!: WorldObjectLoader;
    #worldObjectFactory!: WorldObjectFactory;
    #worldObjectRegistry!: WorldObjectRegistry;
    #worldMap!: WorldMap;
    #objectVisibilitySystem!: ObjectVisibilitySystem;
    #interactionSystem!: InteractionSystem;
    #collisionSystem!: CollisionSystem;
    #mapAnimationLoader!: MapAnimationLoader;
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
        this.#initWorld();
        this.#initMapAnimations();
        this.#initObjects();
        this.#initCamera();
        this.#initPlayer();
        this.#initSystems();
        this.#collisionSystem.setup();
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
    // WORLD
    // ─────────────────────────────────────────

    #initWorld(): void {
        this.#worldMap = new WorldMap(
            this,
            VILLAGE_MAP
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

        this.#collisionSystem =
            new CollisionSystem(
                this,
                this.#player,
                this.#worldMap,
                this.#worldObjectRegistry.collidables
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

        const spawnX = (map.widthInPixels * WORLD_CONFIG.scale) / 2;

        const spawnY = (map.heightInPixels * WORLD_CONFIG.scale) / 2;

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
                VILLAGE_MAP,
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
                VILLAGE_MAP
            );

        this.#mapAnimationLoader.load(
            this.#worldMap.map
        );
    }

    #initDebug(): void {
        this.#worldMap.waterLayer.renderDebug(
            this.add.graphics(),
            {
                tileColor: null,
                collidingTileColor: new Phaser.Display.Color(168, 85, 247, 80),
                faceColor: new Phaser.Display.Color(168, 85, 247, 255),
            }
        );
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    public update(): void {
        this.#player.setDepth(9999);
        this.#worldObjectRegistry.objects.forEach(
            ({ depthSortable }) => {
                depthSortable?.setDepth(
                    depthSortable.y
                );
            }
        );

        this.#objectVisibilitySystem.update();
    }
}

