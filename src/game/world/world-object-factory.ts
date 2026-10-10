import Phaser from "phaser";
import { ASSET_KEYS } from "../common/assets";
import { TreeAnimationKey, TreeDefinitions } from "../common/types/object";
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
        y: number
    ): WorldObject | null {
        switch (type) {
            case "mahogany_tree_small":
                return this.#createTree(
                    x,
                    y,
                    "mahogany_tree_small",
                    type
                );

            case "mahogany_tree_medium":
                return this.#createTree(
                    x,
                    y,
                    "mahogany_tree_medium",
                    type
                );

            case "mahogany_tree_large":
                return this.#createTree(
                    x,
                    y,
                    "mahogany_tree_large",
                    type
                );

            case "no_leaf_mahogany":
                return this.#createTree(
                    x,
                    y,
                    "no_leaf_mahogany",
                    type
            )

            case "dark_green_mahogany_tree_large":
                return this.#createTree(
                    x,
                    y,
                    "dark_green_mahogany_tree_large",
                    type
                );

            default:
                // console.warn(
                //     `Unknown world object type: ${type}`
                // );

                return null;
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

        const treeDefinition =
            definitions[variant];

        if (!treeDefinition) {
            console.error(
                `Tree definition not found: ${variant}`
            );

            return null;
        }

        const tree = new Tree(
            this.scene,
            ASSET_KEYS.WORLD_MAHOGANY_TREE,
            x * WORLD_CONFIG.scale,
            y * WORLD_CONFIG.scale,
            WORLD_CONFIG.scale,
            treeDefinition,
            animationKey,
            definitions.chopped_tree,
        );

        return {
            gameObject: tree,
            interactable: tree,
            collidable: tree,
            visible: tree,
            depthSortable: tree,
        };
    }
}