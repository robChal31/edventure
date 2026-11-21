import { WorldMapDefinition } from "../world-map-definition";
import { BEACH_MAP } from "./beach-map";
import { VILLAGE_MAP } from "./village-map";
import { FARM_MAP } from "./farm-map";

/**
 * Every map the game can load, by id. Maps themselves are authored in
 * Tiled; this only names them so scenes and activities can refer to them.
 */
export const WORLD_MAPS = {
    village: VILLAGE_MAP,
    beach: BEACH_MAP,
    farm: FARM_MAP,
} as const satisfies Record<string, WorldMapDefinition>;

export type MapId = keyof typeof WORLD_MAPS;

/** Students arrive here and pick quests from the quest board. */
export const HUB_MAP_ID: MapId = "village";

export function isMapId(value: unknown): value is MapId {
    return typeof value === "string" && value in WORLD_MAPS;
}
