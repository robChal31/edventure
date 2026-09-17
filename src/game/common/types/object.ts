import { FootprintConfig } from "../types";

export type TreeDefinition = {
    chopCount: number;
    dropCount: number;
    tiles: number[][];
    footprint: FootprintConfig;
}

export type TreeDefinitions = {
    tree_small: TreeDefinition;
    tree_medium: TreeDefinition;
    tree_large: TreeDefinition;
    chopped_tree: TreeDefinition;
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