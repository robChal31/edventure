import type { Facing } from "../common/types";

export type WorldMapTileset = {
    name: string;
    assetKey: string;
};

/**
 * Names of the Tiled layers that have a gameplay role.
 *
 * Every layer listed as water (`water`, `deep_water`, `shallow_water`)
 * blocks walking and is a valid place for fish and for the fishing float.
 * `bridge` layers are walkable surfaces drawn over water (piers, docks):
 * water underneath them is NOT fishable.
 */
export type WorldMapLayers = {
    ground: string;
    water?: string;
    deep_water?: string;
    shallow_water?: string;
    waterfall_stream?: string;
    bridge?: string;
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
    collidable?: boolean;
};

/** Where the player appears, in map pixels (before WORLD_CONFIG.scale). */
export type WorldMapSpawn = {
    x: number;
    y: number;
    facing?: Facing;
};

export type WorldMapDefinition = {
    key: string;

    tilesets: WorldMapTileset[];

    layers: WorldMapLayers;

    objectLayers?: string[];

    animations?: WorldMapAnimationDefinition[];

    /** Defaults to the centre of the map. */
    spawn?: WorldMapSpawn;
};

/** All layer names that count as water for this map. */
export function getWaterLayerNames(layers: WorldMapLayers): string[] {
    return [layers.water, layers.shallow_water, layers.deep_water].filter(
        (name): name is string => Boolean(name)
    );
}

/** Walkable layers drawn over water (never fishable). */
export function getOverWaterLayerNames(layers: WorldMapLayers): string[] {
    return [layers.bridge].filter((name): name is string => Boolean(name));
}
