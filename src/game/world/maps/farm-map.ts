import { ASSET_KEYS } from "@/game/common/assets";
import type { WorldMapDefinition } from "../world-map-definition";

/** Existing 40 × 20 Tiled farm. Question counts never resize this map. */
export const FARM_MAP: WorldMapDefinition = {
    key: ASSET_KEYS.FARM_MAP,
    tilesets: [
        { name: "summer_grass", assetKey: ASSET_KEYS.WORLD_SUMMER_GRASS },
        { name: "summer_grass_water", assetKey: ASSET_KEYS.WORLD_SUMMER_GRASS_WATER },
        { name: "summer_cliff", assetKey: ASSET_KEYS.WORLD_SUMMER_CLIFF },
        { name: "water_ground", assetKey: ASSET_KEYS.WORLD_WATER },
        { name: "fence", assetKey: ASSET_KEYS.FENCE },
        { name: "deluxe_barn", assetKey: ASSET_KEYS.DELUXE_BARN },
        { name: "mahogany_tree_small", assetKey: ASSET_KEYS.MAHOGANY_TREE },
        { name: "mahogany_tree", assetKey: ASSET_KEYS.MAHOGANY_TREE },
        { name: "all_ props_seasons", assetKey: ASSET_KEYS.ALL_PROPS_SEASON },
        { name: "road", assetKey: ASSET_KEYS.ROAD },
        { name: "shadow", assetKey: ASSET_KEYS.FARM_SHADOW },
        { name: "hay_bales", assetKey: ASSET_KEYS.HAY_BALES },
        { name: "soil", assetKey: ASSET_KEYS.SOIL_AND_WET_SOIL },
        { name: "wheat", assetKey: ASSET_KEYS.WHEAT },
        { name: "bushes", assetKey: ASSET_KEYS.BUSHES },
    ],
    layers: { ground: "ground_grass", water: "water" },
    // Inside the fence, immediately above the crop field.
    spawn: { x: 264, y: 88, facing: "down" },
    objectLayers: [
        "barn",
        "mahogany_tree_small",
        "mahogany_tree_medium",
        "chopped_mahogany_tree",
        "mahogany_tree_large",
        "orange_mahogany_tree_large",
        "bushes_tree",
        "bushes_tree_flower1",
        "bushes_tree_fruit_green",
        "bushes_tree_fruit_red",
        "dark_bushes_tree",
    ],
};
