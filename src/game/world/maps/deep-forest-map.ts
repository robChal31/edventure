import { ASSET_KEYS } from "@/game/common/assets";
import { ALTAR_ANIMATIONS } from "@/game/activities/forest-serenade/serenade-assets";
import type { WorldMapDefinition } from "../world-map-definition";

/** The author's original forest, altar platform and stairs; no procedural replacement map. */
export const DEEP_FOREST_MAP: WorldMapDefinition = {
    key: ASSET_KEYS.DEEP_FOREST_MAP,
    soundtrack: null,
    tilesets: [
        { name: "deep_forest_grass", assetKey: ASSET_KEYS.DEEP_FOREST_GRASS },
        { name: "deep_forest_cliff", assetKey: ASSET_KEYS.DEEP_FOREST_CLIFF },
        { name: "wizard_house", assetKey: ASSET_KEYS.WIZARD_HOUSE },
        { name: "deep_forest_tree", assetKey: ASSET_KEYS.DEEP_FOREST_TREE },
        { name: "altar", assetKey: ASSET_KEYS.ALTAR },
        { name: "road", assetKey: ASSET_KEYS.ROAD },
        { name: "all_props_season", assetKey: ASSET_KEYS.ALL_PROPS_SEASON },
        { name: "stone_column", assetKey: ASSET_KEYS.STONE_COLUMN },
        { name: "bushes", assetKey: ASSET_KEYS.BUSHES },
        { name: "root", assetKey: ASSET_KEYS.ROOT },
        { name: "fantasy_mushroom", assetKey: ASSET_KEYS.FANTASY_MUSHROOM },
        { name: "shadow", assetKey: ASSET_KEYS.FARM_SHADOW },
    ],
    layers: { ground: "deep_forest_grass", collision: ["deep_forest_cliff", "deep_forest_hill"] },
    spawn: { x: 488, y: 184, facing: "up" },
    objectLayers: [
        "wizard_house", "bushes_tree", "dark_bushes_tree", "dark_bushes_tree_flower1",
        "green_deep_forest_tree", "cyan_deep_forest_tree", "pink_deep_forest_tree", "teal_deep_forest_tree",
        "large_green_deep_forest_tree", "large_pink_deep_forest_tree", "large_cyan_deep_forest_tree",
        "bloomed_cyan_deep_forest_tree", "bloomed_pink_deep_forest_tree", "stone_column", "broken_stone_column",
        "red_fantasy_mushroom", "pink_fantasy_mushroom",
    ],
    animations: [{ layer: "altar", animationKey: ALTAR_ANIMATIONS.IDLE, collidable: true }],
};
