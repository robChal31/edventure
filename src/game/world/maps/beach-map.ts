import { ASSET_KEYS, BOAT_ANIMATION_KEYS, CANOE_ANIMATION_KEYS, WATER_STONE_RIPPLE_ANIMATION_KEYS } from "@/game/common/assets";
import { WorldMapDefinition } from "../world-map-definition";

export const BEACH_MAP: WorldMapDefinition = {
    key: ASSET_KEYS.BEACH_MAP,

    tilesets: [
        { name: "beach", assetKey: ASSET_KEYS.WORLD_BEACH },
        { name: "bridge", assetKey: ASSET_KEYS.BEACH_BRIDGE },
        { name: "tent", assetKey: ASSET_KEYS.TENT },
        { name: "fishman_house", assetKey: ASSET_KEYS.FISHMAN_HOUSE },
        { name: "fish_barrel", assetKey: ASSET_KEYS.FISH_BARREL },
        { name: "fish_crate", assetKey: ASSET_KEYS.FISH_CRATE },
        { name: "coconut_tree", assetKey: ASSET_KEYS.COCONUT_TREE },
        { name: "beach_chair_with_umbrella", assetKey: ASSET_KEYS.BEACH_CHAIR_WITH_UMBRELLA },
        { name: "coconut_ree_hamok", assetKey: ASSET_KEYS.COCONUT_REE_HAMOK },
        { name: "sand_stones", assetKey: ASSET_KEYS.SAND_STONES },
        { name: "sand_stones2", assetKey: ASSET_KEYS.SAND_STONES2 },
        { name: "beach_plates", assetKey: ASSET_KEYS.BEACH_PLATES },
        { name: "wooden_bench", assetKey: ASSET_KEYS.WOODEN_BENCH },
        { name: "fish_caught_on_pole_prop", assetKey: ASSET_KEYS.FISH_CAUGHT_ON_POLE_PROP },
        { name: "street_lamp", assetKey: ASSET_KEYS.STREET_LAMP },
    ],

    layers: {
        ground: "sand",
        // Both water layers block walking and can hold fish / the float.
        shallow_water: "shallow_water",
        deep_water: "deep_water",
        // Piers drawn over the water: walkable, never fishable.
        bridge: "bridge",
    },

    // On the sand at the foot of the right-hand pier (tile 24,17).
    spawn: { x: 392, y: 280, facing: "down" },

    objectLayers: [
        "fishman_house",
        "coconut_tree_medium1",
        "coconut_tree_medium2",
        "coconut_tree_medium3",
        "coconut_tree_medium_flower",
        "coconut_tree_medium_fruit",
        "coconut_tree_large1",
        "coconut_tree_large_flower",
        "coconut_tree_large_fruit",
        "boat",
        "fish_crate",
        "canoe",
        "fish_barrel",
        "tent",
        "fish_tent",
        "beach_chair_with_umbrella",
        "coconut_ree_hamok",
        "water_stone_ripple",
        "water_stone_ripple2",
        "water_stone_ripple3",
        "sand_stones1",
        "sand_stones2",
        "beach_plate",
        "wooden_bench",
        "fish_on_pole",
        "street_lamp",
    ],

    animations: [
        {
            layer: "boat",
            animationKey: BOAT_ANIMATION_KEYS.BOAT,
        },
        {
            layer: "canoe",
            animationKey: CANOE_ANIMATION_KEYS.CANOE,
        },
        {
            layer: "water_stone_ripple",
            animationKey: WATER_STONE_RIPPLE_ANIMATION_KEYS.WATER_STONE_RIPPLE,
        },
        {
            layer: "water_stone_ripple2",
            animationKey: WATER_STONE_RIPPLE_ANIMATION_KEYS.WATER_STONE_RIPPLE2,
        },
        {
            layer: "water_stone_ripple3",
            animationKey: WATER_STONE_RIPPLE_ANIMATION_KEYS.WATER_STONE_RIPPLE3,
        },

    ],
};