export const ASSET_PACK_KEYS = {
  MAIN: 'MAIN',
} as const;

export const ASSET_KEYS = {
  PLAYER: 'PLAYER',
  PLAYERTMP: 'PLAYERTMP',
  PLAYER_WALK: 'PLAYER_WALK',
  PLAYER_AXE: 'PLAYER_AXE',
  POT: 'POT',
  POT_BREAK: 'POT_BREAK',
  SPIDER: 'SPIDER',
  WISP: 'WISP',
  DROW: 'DROW',
  DAGGER: 'DAGGER',
  DUNGEON_1_BACKGROUND: 'DUNGEON_1_BACKGROUND',
  DUNGEON_1_FOREGROUND: 'DUNGEON_1_FOREGROUND',
  DUNGEON_1_LEVEL: 'DUNGEON_1_LEVEL',
  COLLISION: 'COLLISION',
  DUNGEON_OBJECTS: 'DUNGEON_OBJECTS',
  ENEMY_DEATH: 'ENEMY_DEATH',
  UI_DIALOG: 'UI_DIALOG',
  UI_ICONS: 'UI_ICONS',
  UI_CURSOR: 'UI_CURSOR',
  WORLD_BACKGROUND: 'WORLD_BACKGROUND',
  WORLD_FOREGROUND: 'WORLD_FOREGROUND',
  WORLD_LEVEL: 'WORLD_LEVEL',
  WORLD_TILESET: 'WORLD_TILESET',
  WORLD_TILESET1: 'WORLD_TILESET1',
  WORLD_MAP: 'WORLD_MAP',
  WORLD_MAP2: 'WORLD_MAP2',
  HUD_NUMBERS: 'HUD_NUMBERS',
  FONT_PRESS_START_2P: 'FONT_PRESS_START_2P',

  //
  WORLD_SUMMER_GRASS: 'WORLD_SUMMER_GRASS',
  WORLD_SUMMER_GRASS_WATER: 'WORLD_SUMMER_GRASS_WATER',
  WORLD_WATER: 'WORLD_WATER',
  WORLD_WATERFALL: 'WORLD_WATERFALL',
  WORLD_SUMMER_CLIFF: 'WORLD_SUMMER_CLIFF',
  WORLD_ALL_PROPS_SEASON: 'WORLD_ALL_PROPS_SEASON',
  WORLD_MAHOGANY_TREE: 'WORLD_MAHOGANY_TREE',
  MAPLE_TREE: 'MAPLE_TREE',

  //TERAIN
  WATERFALL_ANIMATION: 'WATERFALL_ANIMATION',

  //OBJECTS
  MAHOGANY_ANIMATION: 'MAHOGANY_ANIMATION',
  WOOD_LOG_ANIMATION: 'WOOD_LOG_ANIMATION',
  WATER_PROPS_SUMMER_ANIMATION: 'WATER_PROPS_SUMMER_ANIMATION',

  //SFX
  CHOPPING_WOOD: 'CHOPPING_WOOD',
  AXE_SWING: 'AXE_SWING',
  TREE_FALLING: 'TREE_FALLING',
  POPPING: 'POPPING',
} as const;

export const PLAYER_ANIMATION_TMP_KEYS = {
  WALK_DOWN: 'player_walk_down',
  WALK_UP: 'player_walk_up',
  WALK_SIDE: 'player_walk_side',
  IDLE_DOWN: 'player_idle_down',
  IDLE_UP: 'player_idle_up',
  IDLE_SIDE: 'player_idle_side',
  IDLE_HOLD_DOWN: 'player_hand_in_air_down',
  IDLE_HOLD_UP: 'player_hand_in_air_up',
  IDLE_HOLD_SIDE: 'player_hand_in_air_side',
  WALK_HOLD_DOWN: 'player_walk_hand_in_air_down',
  WALK_HOLD_UP: 'player_walk_hand_in_air_up',
  WALK_HOLD_SIDE: 'player_walk_hand_in_air_side',
  LIFT_DOWN: 'player_open_chest_down',
  LIFT_UP: 'player_open_chest_up',
  LIFT_SIDE: 'player_open_chest_side',
  HURT_DOWN: 'player_hit_down',
  HURT_UP: 'player_hit_up',
  HURT_SIDE: 'player_hit_side',
  DIE_DOWN: 'player_die_down',
  DIE_UP: 'player_die_up',
  DIE_SIDE: 'player_die_side',
  SWORD_1_ATTACK_DOWN: 'player_atk_1_down',
  SWORD_1_ATTACK_UP: 'player_atk_1_up',
  SWORD_1_ATTACK_SIDE: 'player_atk_1_side',
} as const;

export const PLAYER_ANIMATION_KEYS = {
  IDLE_DOWN: 'player1_idle_down',
  IDLE_UP: 'player1_idle_up',
  IDLE_SIDE: 'player1_idle_side',
  WALK_DOWN: 'walk_forward',
  WALK_UP: 'walk_back',
  WALK_SIDE: 'walk_side',
  FRONT_IDLE_AXE: 'front_idle_axe',
  FRONT_SWING_AXE: 'front_swing_axe',
  BACK_IDLE_AXE: 'back_idle_axe',
  BACK_SWING_AXE: 'back_swing_axe',
  SIDE_IDLE_AXE: 'side_idle_axe',
  SIDE_SWING_AXE: 'side_swing_axe',
} as const;


export const SPIDER_ANIMATION_KEYS = {
  WALK: 'spider_walk',
  HIT: 'spider_hit',
  DEATH: ASSET_KEYS.ENEMY_DEATH,
} as const;

export const DROW_ANIMATION_KEYS = {
  WALK_DOWN: 'drow_walk_down',
  WALK_UP: 'drow_walk_up',
  WALK_LEFT: 'drow_walk_left',
  WALK_RIGHT: 'drow_walk_right',
  IDLE_DOWN: 'drow_idle_down',
  IDLE_UP: 'drow_idle_up',
  IDLE_SIDE: 'drow_idle_right',
  HIT: 'drow_hit',
  ATTACK_DOWN: 'drow_atk_down',
  ATTACK_UP: 'drow_atk_up',
  ATTACK_SIDE: 'drow_atk_right',
} as const;

export const WISP_ANIMATION_KEYS = {
  IDLE: 'wisp_idle',
} as const;

export const CHARACTER_ANIMATIONS = {
  IDLE_DOWN: 'IDLE_DOWN',
  IDLE_UP: 'IDLE_UP',
  IDLE_LEFT: 'IDLE_LEFT',
  IDLE_RIGHT: 'IDLE_RIGHT',
  WALK_DOWN: 'WALK_DOWN',
  WALK_UP: 'WALK_UP',
  WALK_LEFT: 'WALK_LEFT',
  WALK_RIGHT: 'WALK_RIGHT',
  IDLE_HOLD_DOWN: 'IDLE_HOLD_DOWN',
  IDLE_HOLD_UP: 'IDLE_HOLD_UP',
  IDLE_HOLD_LEFT: 'IDLE_HOLD_LEFT',
  IDLE_HOLD_RIGHT: 'IDLE_HOLD_RIGHT',
  WALK_HOLD_DOWN: 'WALK_HOLD_DOWN',
  WALK_HOLD_UP: 'WALK_HOLD_UP',
  WALK_HOLD_LEFT: 'WALK_HOLD_LEFT',
  WALK_HOLD_RIGHT: 'WALK_HOLD_RIGHT',
  LIFT_DOWN: 'LIFT_DOWN',
  LIFT_UP: 'LIFT_UP',
  LIFT_LEFT: 'LIFT_LEFT',
  LIFT_RIGHT: 'LIFT_RIGHT',
  HURT_DOWN: 'HURT_DOWN',
  HURT_UP: 'HURT_UP',
  HURT_LEFT: 'HURT_LEFT',
  HURT_RIGHT: 'HURT_RIGHT',
  DIE_DOWN: 'DIE_DOWN',
  DIE_UP: 'DIE_UP',
  DIE_LEFT: 'DIE_LEFT',
  DIE_RIGHT: 'DIE_RIGHT',
} as const;

export const CHEST_FRAME_KEYS = {
  BIG_CHEST_CLOSED: 'big_chest_closed.png',
  SMALL_CHEST_CLOSED: 'chest_closed.png',
  BIG_CHEST_OPEN: 'big_chest_open.png',
  SMALL_CHEST_OPEN: 'chest_open.png',
} as const;

export const DOOR_FRAME_KEYS = {
  TRAP_LEFT: 'trap_left.png',
  TRAP_RIGHT: 'trap_right.png',
  TRAP_UP: 'trap_up.png',
  TRAP_DOWN: 'trap_down.png',
  BOSS_LEFT: 'boss_left.png',
  BOSS_RIGHT: 'boss_right.png',
  BOSS_UP: 'boss_up.png',
  BOSS_DOWN: 'boss_down.png',
  LOCK_LEFT: 'lock_left.png',
  LOCK_RIGHT: 'lock_right.png',
  LOCK_UP: 'lock_up.png',
  LOCK_DOWN: 'lock_down.png',
} as const;

export const BUTTON_FRAME_KEYS = {
  FLOOR_SWITCH: 'floor_switch.png',
  PLATE_SWITCH: 'plate_switch.png',
} as const;

export const CHEST_REWARD_TO_TEXTURE_FRAME = {
  SMALL_KEY: 119,
  BOSS_KEY: 121,
  MAP: 117,
  COMPASS: 118,
  NOTHING: 126,
} as const;

export const HEART_ANIMATIONS = {
  LOSE_LAST_HALF: 'heart_lose_last_half',
  LOSE_FIRST_HALF: 'heart_lost_first_half',
};

export const HEART_TEXTURE_FRAME = {
  NONE: '15',
  FULL: '10',
  EMPTY: '14',
  HALF: '12',
} as const;

export const MAHOGANY_ANIMATION_KEYS = {
    MAHOGANY_TREE_SMALL_ANIMATION: 'mahogany_tree_small',
    MAHOGANY_TREE_MEDIUM_ANIMATION: 'mahogany_tree_medium',
    MAHOGANY_TREE_LARGE_ANIMATION: 'mahogany_tree_large',
    MAHOGANY_NO_LEAF_ANIMATION: 'no_leaf_mahogany',
    MAHOGANY_DARK_GREEN_TREE_LARGE_ANIMATION: 'dark_green_mahogany_tree_large'
} as const;

export const WATERFALL_ANIMATION_KEYS = {
  SUMMER_WATERFALL_ANIMATION: 'summer_waterfal',
}

export const WATER_PROPS_SUMMER_ANIMATION_KEYS = {
  WHITE_LOTUS: 'white_lotus',
  WATER_STONE4: 'water_stone4',
  BLUE_LOTUS: 'blue_lotus',
  ORANGE_LOTUS: 'orange_lotus',
  WATER_STONE1: 'water_stone1',
  LOTUS_LEAF1: 'lotus_leaf1',
  WATER_STONE2: 'water_stone2',
  LOTUS_LEAF2: 'lotus_leaf2',
  WATER_STONE3: 'water_stone3',
  LOTUS_FLOWER: 'lotus_flower',
  WATER_GRASS1: 'water_grass1',
  WATER_GRASS2: 'water_grass2',
  WATER_LAVENDER_FLOAT: 'water_lavender_float',
  WATER_LAVENDER: 'water_lavender',
}

export const WOOD_LOG_ANIMATION_KEYS = {
  LIGHT_ROUND_LOG: 'light_round_log'
}