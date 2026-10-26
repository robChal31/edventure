
import { ASSET_KEYS } from "../common/assets";
import { VirtualInputComponent } from "../components/input/virtual-input-component";
import { WORLD_CONFIG } from "../config/world-config";
import { DEBUG_CONFIG } from "../config/debug-config";
import { DEPTH_CONFIG } from "../config/depth-config";
import { Player } from "../game-objects/player/player";
import { ObjectVisibilitySystem } from "../systems/object-visibility-system";
import { WorldMap } from "../world/world-map";
import { WorldObjectLoader } from "../world/world-object-loader";
import { SCENE_KEYS } from "./scene-keys";
import Phaser from "phaser";
import { InteractionSystem } from "../systems/interaction-system";
import { CollisionSystem } from "../systems/collision-system";
import { WorldObjectFactory } from "../world/world-object-factory";
import { WorldObjectRegistry } from "../world/world-object-registry";
import { MapAnimationLoader } from "../world/map-animation-loader";
import { HUB_MAP_ID, MapId, WORLD_MAPS } from "../world/maps/map-registry";
import { WorldMapDefinition } from "../world/world-map-definition";
import type { ActivityController, ActivityPhase, GameEvent, GameOptions } from "../game-options";
import type { Activity, MapObject } from "../activities/activity";
import { ACTIVITY_REGISTRY } from "../activities/activity-registry";
import type { PlayableQuiz } from "@/quiz/types";
import { EQUIPMENT, defaultEquipment, equipmentRoute, equipmentState, isEquipmentId, type EquipmentId, type EquipmentState } from "../equipment/equipment";
import type { PreparedAction } from "../equipment/targeting";
import { TargetMarker } from "../equipment/target-marker";

/** Data passed to `scene.restart()` when travelling between maps. */
type GameSceneData = {
    mapId?: MapId;
    quiz?: PlayableQuiz | null;
};

const TRAVEL_FADE_MS = 450;

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
    #mapSprites: Phaser.GameObjects.Sprite[] = [];
    #activity?: Activity;
    #options?: GameOptions;
    #controller!: ActivityController;
    #equipped: EquipmentId = "axe";
    #phase: ActivityPhase = "idle";
    #overlayOpen = false;
    #equipmentPickerOpen = false;
    #lastEquipmentState = "";
    #marker?: TargetMarker;
    #nameTag?: Phaser.GameObjects.Text;

    // Per-run state (reset in init/create on every map load).
    #mapId: MapId = HUB_MAP_ID;
    #quiz: PlayableQuiz | null = null;
    #isReady = false;
    #isTravelling = false;
    #hasBooted = false;
    #playerBodyDebug?: Phaser.GameObjects.Graphics;

    constructor(options?: GameOptions) {
        super({
            key: SCENE_KEYS.GAME_SCENE,
        });
        this.#options = options;

        this.#controller = {
            startQuiz: (quiz) =>
                this.#travelTo(ACTIVITY_REGISTRY[quiz.activityId].mapId, quiz),
            returnToHub: () => this.#travelTo(HUB_MAP_ID, null),
            primaryAction: () => this.#controls?.pressPrimaryAction(),
            equip: (equipment) => this.#equip(equipment),
            setEquipmentPickerOpen: (open) => {
                if (!this.#isReady) return;
                this.#equipmentPickerOpen = open;
                this.#applyControlsEnabled();
            },
            questionClosed: (id) => this.#activity?.questionClosed?.(id),
            answer: (answer) => this.#activity?.answer(answer),
            restart: () => {
                this.#controls?.reset();
                this.#marker?.hide();
                this.#activity?.restart();
                this.#syncEquipment();
            },
            setVirtualDirection: (dir, pressed) =>
                this.#controls?.setVirtualDirection(dir, pressed),
            setKeyboardEnabled: (enabled) => this.#setKeyboardEnabled(enabled),
        };
    }

    public get controller(): ActivityController {
        return this.#controller;
    }

    // ─────────────────────────────────────────
    // INIT (runs before every create, also after scene.restart)
    // ─────────────────────────────────────────

    public init(data?: GameSceneData): void {
        if (data?.mapId) {
            // Travelling between maps.
            this.#mapId = data.mapId;
            this.#quiz = data.quiz ?? null;
        } else {
            // First boot: open what the React shell asked for.
            this.#quiz = this.#options?.initialQuiz ?? null;
            this.#mapId = this.#quiz
                ? ACTIVITY_REGISTRY[this.#quiz.activityId].mapId
                : (this.#options?.initialMap ?? HUB_MAP_ID);
        }

        this.#activity = undefined;
        this.#mapSprites = [];
        this.#playerBodyDebug = undefined;
        this.#equipped = defaultEquipment(this.#quiz?.activityId);
        this.#phase = "idle";
        this.#overlayOpen = false;
        this.#equipmentPickerOpen = false;
        this.#lastEquipmentState = "";
        this.#marker = undefined;
        this.#nameTag = undefined;
        this.#isReady = false;
        this.#isTravelling = false;
    }

    private get mapDefinition(): WorldMapDefinition {
        return WORLD_MAPS[this.#mapId];
    }

    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────

    public create(): void {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#onShutdown, this);

        this.#initControls();
        this.#initWorld();
        this.#initMapAnimations();
        this.#initObjects();
        this.#initCamera();
        this.#initPlayer();
        this.#initSystems();
        this.#marker = new TargetMarker(this);
        this.#collisionSystem.setup();
        this.#initDebug();

        this.#isReady = true;

        if (!this.#hasBooted) {
            this.#hasBooted = true;
            this.#options?.onEvent({ type: "game:ready" });
        }

        // Announce the map first: the shell resets its overlays on this event,
        // then the activity sends its own HUD / prompt events.
        this.#options?.onEvent({
            type: "map:loaded",
            mapId: this.#mapId,
            activityId: this.#quiz?.activityId ?? null,
            quizId: this.#quiz?.id ?? null,
        });

        this.#initActivity();
        this.#syncEquipment();
        this.cameras.main.fadeIn(TRAVEL_FADE_MS, 0, 0, 0);
    }

    #onShutdown(): void {
        this.#activity?.destroy();
        this.#activity = undefined;
        this.#isReady = false;
        this.#controls?.destroy();
        this.#marker?.destroy();
        this.#nameTag?.destroy();
    }

    // ─────────────────────────────────────────
    // CONTROLS
    // ─────────────────────────────────────────

    #initControls(): void {
        if (!this.input.keyboard) {
            console.warn("Phaser keyboard plugin is not setup properly");
            return;
        }

        this.input.keyboard.manager.enabled = true;
        this.input.keyboard.resetKeys();
        this.#controls = new VirtualInputComponent(this.input.keyboard);
    }

    #setKeyboardEnabled(enabled: boolean): void {
        this.#overlayOpen = !enabled;
        this.#applyControlsEnabled();
    }

    #applyControlsEnabled(): void {
        const allowInput = !this.#overlayOpen && !this.#equipmentPickerOpen && !this.#isTravelling;
        this.#controls?.setEnabled(allowInput);
        this.#player?.setControlsPaused(!allowInput);
        const keyboard = this.input?.keyboard;
        if (keyboard) {
            // Release captures for HTML answers and clear held keys/directions on BOTH transitions.
            keyboard.manager.enabled = allowInput;
            keyboard.resetKeys();
        }
        if (!allowInput) {
            this.#marker?.hide();
            this.#nameTag?.setVisible(false);
        }
        this.#syncEquipment();
    }

    // ─────────────────────────────────────────
    // WORLD
    // ─────────────────────────────────────────

    #initWorld(): void {
        this.#worldMap = new WorldMap(
            this,
            this.mapDefinition
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
                this,
                this.#player,
                this.#worldObjectRegistry.interactables
            );

        this.#collisionSystem = new CollisionSystem(
            this,
            this.#player,
            this.#worldMap,
            this.#worldObjectRegistry.objects,
            this.#mapSprites
        );
    }
    // ─────────────────────────────────────────
    // CAMERA
    // ─────────────────────────────────────────

    #initCamera(): void {
        const worldWidth = this.#worldMap.widthInPixels;
        const worldHeight = this.#worldMap.heightInPixels;

        this.cameras.main.resetFX();
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
        const spawn = this.mapDefinition.spawn;

        const position = spawn
            ? { x: spawn.x * WORLD_CONFIG.scale, y: spawn.y * WORLD_CONFIG.scale }
            : { x: this.#worldMap.widthInPixels / 2, y: this.#worldMap.heightInPixels / 2 };

        this.#player = new Player({
            scene: this,

            position,

            assetKey: ASSET_KEYS.PLAYER,
            frame: 0,
            controls: this.#controls,
            facing: spawn?.facing,

            onPrimaryAction: () => this.#useEquipment(),
        });

        this.#player.setScale(WORLD_CONFIG.scale);
        this.#player.wearAxe(this.#equipped === "axe");
        const name = this.#options?.playerName?.trim();
        if (name) {
            this.#nameTag = this.add.text(position.x, position.y - 18, name, {
                fontFamily: '"Press Start 2P"', fontSize: "7px", color: "#fff8d5", stroke: "#172b25", strokeThickness: 3,
            }).setName("player-name-tag").setOrigin(0.5, 1).setDepth(DEPTH_CONFIG.WORLD_UI).setVisible(false);
        }

        this.cameras.main.startFollow(
            this.#player,
            true,
            0.08,
            0.08
        );
    }

    #equipmentState(): EquipmentState {
        return equipmentState(this.#equipped, {
            phase: this.#phase, overlayOpen: this.#overlayOpen, pickerOpen: this.#equipmentPickerOpen, travelling: this.#isTravelling,
            playerBusy: this.#player?.isActionBusy ?? false, playerLocked: this.#player?.isInputLocked ?? false,
        });
    }

    #syncEquipment(): void {
        const state = this.#equipmentState();
        const signature = JSON.stringify(state);
        if (signature === this.#lastEquipmentState) return;
        this.#lastEquipmentState = signature;
        this.#options?.onEvent({ type: "equipment", ...state });
    }

    #equip(equipment: EquipmentId): void {
        if (!this.#isReady || !isEquipmentId(equipment) || !EQUIPMENT[equipment].available || this.#equipmentState().locked) return;
        this.#controls.reset();
        this.#equipped = equipment;
        this.#player.wearAxe(equipment === "axe");
        this.#marker?.hide();
        this.#syncEquipment();
    }

    #prepareEquipment(): PreparedAction {
        const route = equipmentRoute(this.#equipped, this.#quiz?.activityId ?? null);
        if (route === "axe") return this.#interactionSystem.prepareAxeAction();
        if (route === "activity" && this.#activity) {
            return this.#activity.preparePrimaryAction?.() ?? { target: null, execute: () => this.#activity?.handlePrimaryAction() };
        }
        return { target: null, execute: () => this.#options?.onEvent({
            type: "prompt", message: `${EQUIPMENT[this.#equipped].label}: ${EQUIPMENT[this.#equipped].hint}`,
        }) };
    }

    #useEquipment(): void {
        if (!this.#isReady || !this.#equipmentState().actionEnabled) return;
        const prepared = this.#prepareEquipment();
        this.#marker?.show(prepared.target);
        this.#marker?.pulse();
        this.#controls.reset();
        prepared.execute();
        this.#syncEquipment();
    }

    #onActivityEvent(event: GameEvent): void {
        if (event.type === "phase") {
            this.#phase = event.phase;
            this.#controls.reset();
        }
        this.#options?.onEvent(event);
        this.#syncEquipment();
    }

    #initObjects(): void {
        this.#worldObjectFactory =
            new WorldObjectFactory(this);

        this.#worldObjectLoader =
            new WorldObjectLoader(
                this.mapDefinition,
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
                this.mapDefinition
            );

        this.#mapSprites = this.#mapAnimationLoader.load(
            this.#worldMap.map
        );
    }

    // ─────────────────────────────────────────
    // DEBUG (add ?debug to the URL)
    // ─────────────────────────────────────────

    #initDebug(): void {
        if (DEBUG_CONFIG.collision) {
            this.#collisionSystem.initDebug();

            this.#worldMap.waterLayers.forEach((layer) => {
                const graphics = this.add.graphics();
                graphics.setDepth(DEPTH_CONFIG.DEBUG);
                layer.renderDebug(graphics, {
                    tileColor: null,
                    collidingTileColor: new Phaser.Display.Color(168, 85, 247, 80),
                    faceColor: new Phaser.Display.Color(168, 85, 247, 255),
                });
            });
        }

        if (DEBUG_CONFIG.playerBody) {
            this.#playerBodyDebug = this.add.graphics();
            this.#playerBodyDebug.setDepth(DEPTH_CONFIG.DEBUG);
        }
    }

    #drawPlayerBodyDebug(): void {
        const graphics = this.#playerBodyDebug;
        const body = this.#player.body as Phaser.Physics.Arcade.Body | null;
        if (!graphics || !body) return;

        graphics.clear();
        graphics.lineStyle(1, 0xff0000, 1);
        graphics.strokeRect(body.x, body.y, body.width, body.height);
    }

    // ─────────────────────────────────────────
    // ACTIVITY
    // ─────────────────────────────────────────

    #initActivity(): void {
        if (!this.#quiz) {
            this.#player.setInputLocked(false);
            return;
        }

        const entry = ACTIVITY_REGISTRY[this.#quiz.activityId];

        this.#activity = entry.create({
            scene: this,
            player: this.#player,
            worldMap: this.#worldMap,
            mapObjects: this.#collectMapObjects(),
            quiz: this.#quiz,
            emit: (event) => this.#onActivityEvent(event),
        });

        this.#activity.create();
    }

    #collectMapObjects(): MapObject[] {
        const objects: MapObject[] = [...this.#mapSprites];

        this.#worldObjectRegistry.objects.forEach(({ gameObject }) => {
            if (
                gameObject instanceof Phaser.GameObjects.Sprite ||
                gameObject instanceof Phaser.GameObjects.Image
            ) {
                objects.push(gameObject);
            }
        });

        return objects;
    }

    // ─────────────────────────────────────────
    // TRAVEL
    // ─────────────────────────────────────────

    #travelTo(mapId: MapId, quiz: PlayableQuiz | null): void {
        if (!this.#isReady || this.#isTravelling) return;

        this.#isTravelling = true;
        // Cancel gates/timers immediately, not 450ms later when the fade finishes.
        this.#activity?.destroy();
        this.#activity = undefined;
        this.#controls.setEnabled(false);
        this.#marker?.hide();
        this.#nameTag?.setVisible(false);
        this.#player.setInputLocked(true);
        this.#syncEquipment();
        this.#options?.onEvent({ type: "travel:start", to: mapId });

        this.cameras.main.fadeOut(TRAVEL_FADE_MS, 0, 0, 0);
        this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => {
                const data: GameSceneData = { mapId, quiz };
                this.scene.restart(data);
            }
        );
    }

    // ─────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────
    public update(time: number, delta: number): void {
        if (!this.#isReady) return;

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
        this.#activity?.update(time, delta);
        const state = this.#equipmentState();
        if (this.#overlayOpen || this.#equipmentPickerOpen || this.#isTravelling) this.#marker?.hide();
        else this.#marker?.show(state.actionEnabled ? this.#prepareEquipment().target : null);
        this.#marker?.update(delta);
        const roaming = !state.locked && !this.#equipmentPickerOpen && this.#player.visible;
        this.#nameTag?.setPosition(Math.round(this.#player.x), Math.round(this.#player.y - 18)).setVisible(roaming);
        this.#syncEquipment();
        this.#drawPlayerBodyDebug();
    }
}
