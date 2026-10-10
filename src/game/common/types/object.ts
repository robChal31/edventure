import { MAHOGANY_ANIMATION_KEYS } from "../assets";
import { FootprintConfig } from "../types";

export type TreeDefinition = {
    chopCount: number;
    dropCount: number;
    tiles: number[][];
    footprint: FootprintConfig;
}

export type TreeDefinitions = {
    mahogany_tree_small: TreeDefinition;
    mahogany_tree_medium: TreeDefinition;
    mahogany_tree_large: TreeDefinition;
    chopped_tree: TreeDefinition;
    no_leaf_mahogany: TreeDefinition;
    dark_green_mahogany_tree_large: TreeDefinition;
};


export type TiledObject = {
    gid?: number;
    height: number;
    id: number;
    name: string;
    rotation: number;
    type: string;
    visible: boolean;
    width: number;
    x: number;
    y: number;
}

export type TreeAnimationKey =
    | typeof MAHOGANY_ANIMATION_KEYS.MAHOGANY_TREE_SMALL_ANIMATION
    | typeof MAHOGANY_ANIMATION_KEYS.MAHOGANY_TREE_MEDIUM_ANIMATION
    | typeof MAHOGANY_ANIMATION_KEYS.MAHOGANY_TREE_LARGE_ANIMATION
    | typeof MAHOGANY_ANIMATION_KEYS.MAHOGANY_NO_LEAF_ANIMATION
    | typeof MAHOGANY_ANIMATION_KEYS.MAHOGANY_DARK_GREEN_TREE_LARGE_ANIMATION