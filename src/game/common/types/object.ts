import { FootprintConfig } from "../types";

export type TreeDefinition = {
    /** Stumps require three additional chops and are then removed. */
    stage?: "standing" | "stump";
    chopCount: number;
    dropCount: number;
    tiles: number[][];
    footprint: FootprintConfig;
}

export type TreeDefinitions = Record<string, TreeDefinition>;


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

export type TreeAnimationKey = string;
