import { ASSET_KEYS } from "../common/assets";

export type WorldMapTileset = {
    name: string;
    assetKey: string;
};

export type WorldMapLayers = {
    ground: string;
    water?: string;
    deep_water?: string;
    shallow_water?: string;
    waterfall_stream?: string;
    collision?: string;
};

export type WorldMapObjectLayer = {
    name: string;
    type: WorldObjectType;
};

export type WorldObjectType =
    | "tree"
    | "rock"
    | "bush"
    | "npc"
    | "chest";

export type WorldMapAnimationDefinition = {
    layer: string;
    animationKey: string;
};

export type WorldMapDefinition = {
    key: string;

    tilesets: WorldMapTileset[];

    layers: WorldMapLayers;

    objectLayers?: string[];

    animations?: WorldMapAnimationDefinition[];
};