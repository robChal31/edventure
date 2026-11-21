import Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import {
    TreeAnimationKey,
    TreeDefinitions,
} from "../common/types/object";
import { WORLD_CONFIG } from "../config/world-config";
import { isCloudLayer, isCloudTile } from "./render-layers";
import { DEPTH_CONFIG } from "../config/depth-config";
import { Tree } from "../game-objects/tree";
import { WorldObject } from "./world-object";

export class WorldObjectFactory {
    constructor(
        private scene: Phaser.Scene
    ) {}

    public create(
        type: string,
        x: number,
        y: number,
        gid?: number,
        map?: Phaser.Tilemaps.Tilemap
    ): WorldObject | null {
        const species = /mahogany/.test(type) ? "mahogany" : /maple/.test(type) ? "maple" : /birch/.test(type) ? "birch" : /pine/.test(type) ? "pine" : null;
        if (species) {
            const definitions: TreeDefinitions | undefined = this.scene.cache.json.get(`${species.toUpperCase()}_TREE_DEFINITIONS`);
            const definition = definitions?.[type];
            if (definition) {
                const texture = ASSET_KEYS[`${species.toUpperCase()}_TREE` as keyof typeof ASSET_KEYS];
                const tree = new Tree(this.scene, texture, x * WORLD_CONFIG.scale, y * WORLD_CONFIG.scale,
                    WORLD_CONFIG.scale, definition, species === "mahogany" ? type as TreeAnimationKey : undefined,
                    definitions?.[`chopped_${species}_tree`]);
                tree.setName(type);
                return { gameObject: tree, interactable: tree, collidable: tree, visible: tree, depthSortable: tree };
            }
        }
        return gid == null || !map ? null : this.#createStaticObject(type, x, y, gid, map);
    }

    #createStaticObject(
        layerName: string,
        x: number,
        y: number,
        rawGid: number,
        map: Phaser.Tilemaps.Tilemap
    ): WorldObject | null {
        const gid = rawGid & 0x1fffffff;
        const tileset = map.tilesets.find(
            (tileset) =>
                gid >= tileset.firstgid &&
                gid < tileset.firstgid + tileset.total
        );

        if (!tileset) {
            console.warn(`Tileset not found for GID: ${gid}`);
            return null;
        }

        const asset = ASSET_KEYS[
            tileset.name.toUpperCase() as keyof typeof ASSET_KEYS
        ];

        if (!asset || !this.scene.textures.exists(asset)) {
            console.warn(`Texture not found for tileset: ${tileset.name}`);
            return null;
        }

        const image = this.scene.add.image(
            x * WORLD_CONFIG.scale,
            y * WORLD_CONFIG.scale,
            asset,
            gid - tileset.firstgid
        );

        image.setOrigin(0, 1);
        image.setScale(WORLD_CONFIG.scale);
        // The Tiled object layer name, e.g. "fishman_house".
        image.setName(layerName);

        if (isCloudLayer(layerName) || isCloudTile(gid, map.tilesets)) return { gameObject: image.setDepth(DEPTH_CONFIG.CLOUDS).setData("atmosphere", true) };

        return {
            gameObject: image,
            visible: image,
            depthSortable: image,
        };
    }
}