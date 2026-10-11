import Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import {
    TreeAnimationKey,
    TreeDefinitions,
} from "../common/types/object";
import { WORLD_CONFIG } from "../config/world-config";
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
        switch (type) {
            case "mahogany_tree_small":
            case "mahogany_tree_medium":
            case "mahogany_tree_large":
            case "no_leaf_mahogany":
            case "dark_green_mahogany_tree_large":
                return this.#createTree(
                    x,
                    y,
                    type as keyof TreeDefinitions,
                    type as TreeAnimationKey
                );

            default:
                if (gid == null || !map) {
                    return null;
                }
                return this.#createStaticObject(
                    x,
                    y,
                    gid,
                    map
                );
        }
    }

    #createTree(
        x: number,
        y: number,
        variant: keyof TreeDefinitions,
        animationKey: TreeAnimationKey
    ): WorldObject | null {
        const definitions: TreeDefinitions =
            this.scene.cache.json.get(
                "MAHOGANY_TREE_DEFINITIONS"
            );

        const treeDefinition = definitions[variant];

        if (!treeDefinition) {
            console.error(
                `Tree definition not found: ${variant}`
            );
            return null;
        }

        const tree = new Tree(
            this.scene,
            ASSET_KEYS.MAHOGANY_TREE,
            x * WORLD_CONFIG.scale,
            y * WORLD_CONFIG.scale,
            WORLD_CONFIG.scale,
            treeDefinition,
            animationKey,
            definitions.chopped_tree
        );

        return {
            gameObject: tree,
            interactable: tree,
            collidable: tree,
            visible: tree,
            depthSortable: tree,
        };
    }

    #createStaticObject(
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

        return {
            gameObject: image,
            visible: image,
            depthSortable: image,
        };
    }
}