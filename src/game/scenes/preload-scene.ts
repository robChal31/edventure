import { ASSET_KEYS, ASSET_PACK_KEYS } from "../common/assets";
import { SCENE_KEYS } from "./scene-keys";
import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({
            key: SCENE_KEYS.PRELOAD_SCENE,
        });
    }

    public preload(): void {
        this.load.pack(ASSET_PACK_KEYS.MAIN, 'assets/data/assets.json');
    }

    public create(): void {
        this.#createAnimations();
        this.scene.start(SCENE_KEYS.GAME_SCENE);
    }

    #createAnimations(): void {
        // this.anims.createFromAseprite(ASSET_KEYS.PLAYER);
        this.anims.createFromAseprite(ASSET_KEYS.PLAYER);
        this.anims.createFromAseprite(ASSET_KEYS.PLAYER_WALK);
        this.anims.createFromAseprite(ASSET_KEYS.PLAYER_AXE);
        this.anims.createFromAseprite(ASSET_KEYS.MAHOGANY_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WOOD_LOG_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WATERFALL_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WATER_PROPS_SUMMER_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.BOAT_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.CANOE_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WATER_STONE_RIPPLE_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WATER_STONE_RIPPLE2_ANIMATION);
        this.anims.createFromAseprite(ASSET_KEYS.WATER_STONE_RIPPLE3_ANIMATION);
    }
}