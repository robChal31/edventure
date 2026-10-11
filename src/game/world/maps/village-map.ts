import { ASSET_KEYS, WATER_PROPS_SUMMER_ANIMATION_KEYS, WATERFALL_ANIMATION_KEYS } from "@/game/common/assets";
import { WorldMapDefinition } from "../world-map-definition";

export const VILLAGE_MAP: WorldMapDefinition = {
    key: ASSET_KEYS.WORLD_MAP,

    tilesets: [
        {
            name: "summer_grass",
            assetKey: ASSET_KEYS.WORLD_SUMMER_GRASS,
        },
        {
            name: "summer_grass_water",
            assetKey: ASSET_KEYS.WORLD_SUMMER_GRASS_WATER,
        },
        {
            name: "water",
            assetKey: ASSET_KEYS.WORLD_WATER,
        },
        {
            name: "waterfall",
            assetKey: ASSET_KEYS.WORLD_WATERFALL,
        },
        {
            name: "summer_cliff",
            assetKey: ASSET_KEYS.WORLD_SUMMER_CLIFF,
        },
        {
            name: "all_props_seasons",
            assetKey: ASSET_KEYS.ALL_PROPS_SEASON,
        },
        {
            name: "mahogany_tree",
            assetKey: ASSET_KEYS.MAHOGANY_TREE,
        },
    ],

    layers: {
        ground: "ground",
        water: "water",
    },

    objectLayers: [
        "mahogany_tree_large",
        "mahogany_tree_medium",
        "mahogany_tree_small",
        "no_leaf_mahogany",
        "dark_green_mahogany_tree_large",
        "water_lavender",
        "waterfall_stream",
        "white_lotus",
        "blue_lotus",
        "orange_lotus",
        "lotus_leaf1",
        "lotus_leaf2",
        "lotus_flower",
        "water_stone1",
        "water_stone2",
        "water_stone3",
        "water_stone4",
        "water_grass1",
        "water_grass2",
    ],

    animations: [
        {
            layer: "waterfall_stream",
            animationKey: WATERFALL_ANIMATION_KEYS.SUMMER_WATERFALL_ANIMATION,
        },
        {
            layer: "water_lavender",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_LAVENDER,
        },
        {
            layer: "white_lotus",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WHITE_LOTUS,
        },
        {
            layer: "blue_lotus",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.BLUE_LOTUS,
        },
        {
            layer: "orange_lotus",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.ORANGE_LOTUS,
        },
        {
            layer: "lotus_leaf1",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.LOTUS_LEAF1,
        },
        {
            layer: "lotus_leaf2",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.LOTUS_LEAF2,
        },
        {
            layer: "lotus_flower",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.LOTUS_FLOWER,
        },
        {
            layer: "water_stone1",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_STONE1,
        },
        {
            layer: "water_stone2",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_STONE2,
        },
        {
            layer: "water_stone3",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_STONE3,
        },
        {
            layer: "water_stone4",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_STONE4,
        },
        {
            layer: "water_grass1",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_GRASS1,
        },
        {
            layer: "water_grass2",
            animationKey: WATER_PROPS_SUMMER_ANIMATION_KEYS.WATER_GRASS2,
        },
    ],
};