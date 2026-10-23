import {
    ASSET_KEYS,
    WATER_FOUNTAIN_ANIMATION_KEYS,
    WATER_PROPS_SUMMER_ANIMATION_KEYS,
    WATERFALL_ANIMATION_KEYS,
} from "@/game/common/assets";
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
            name: "mahogany_tree",
            assetKey: ASSET_KEYS.MAHOGANY_TREE,
        },
        {
            name: "all_props_seasons",
            assetKey: ASSET_KEYS.ALL_PROPS_SEASON,
        },
        {
            name: "bridge",
            assetKey: ASSET_KEYS.BRIDGE,
        },
        {
            name: "fence",
            assetKey: ASSET_KEYS.FENCE,
        },
        {
            name: "road",
            assetKey: ASSET_KEYS.ROAD,
        },
        {
            name: "path",
            assetKey: ASSET_KEYS.PATH,
        },
        {
            name: "water_box",
            assetKey: ASSET_KEYS.WATER_BOX,
        },
        {
            name: "soil_and_wet_soil",
            assetKey: ASSET_KEYS.SOIL_AND_WET_SOIL,
        },
        {
            name: "Wheat",
            assetKey: ASSET_KEYS.WHEAT,
        },
        {
            name: "tomato",
            assetKey: ASSET_KEYS.TOMATO,
        },
        {
            name: "green_beans",
            assetKey: ASSET_KEYS.GREEN_BEANS,
        },
        {
            name: "cucumber",
            assetKey: ASSET_KEYS.CUCUMBER,
        },
        {
            name: "bell_pepper",
            assetKey: ASSET_KEYS.BELL_PEPPER,
        },
        {
            name: "extra_village_tilesets",
            assetKey: ASSET_KEYS.EXTRA_VILLAGE_TILESETS,
        },
        {
            name: "hay_bales",
            assetKey: ASSET_KEYS.HAY_BALES,
        }
    ],

    layers: {
        ground: "ground_grass",
        water: "water",
    },

    objectLayers: [
        "school",
        "water_lavender",
        "mahogany_tree_small",
        "mahogany_tree_medium",
        "mahogany_tree_large",
        "orange_mahogany_tree_large",
        "dark_green_mahogany_tree_large",
        "chopped_mahogany_tree",
        "no_leaf_mahogany",
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
        "sandbox",
        "water_box",
        "street_lamp",
        "village_sign",
        "playground_slide",
        "swing",
        "seesaw",
        "notice_boards",
        "water_fountain",
        "wooden_bench",
        "bushes_tree",
        "bushes_tree_flower1",
        "bushes_tree_fruit_red",
        "bushes_tree_fruit_green",
        "dark_bushes_tree",
        "dark_bushes_tree_flower1",
        "dark_bushes_tree_fruit_green",
        "bushes_tree_orange",
        "street_lamp_2",
        "cotton_candy_cart",
        "well",
        "ice_cream_cart",
        "house1",
        "house2",
        "blacksmith2",
        "deluxe_barn",
        "deluxe_mill",
        "stones_summer"
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
        {
            layer: "water_fountain",
            animationKey: WATER_FOUNTAIN_ANIMATION_KEYS.WATER_FOUNTAIN,
            collidable: true
        }
    ],
};