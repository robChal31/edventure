/**
 * Render depth bands. Tile layers sit at 0; world objects and the player
 * are y-sorted by their feet (depth = foot y, always well above 2).
 *
 * Fish swim *between* the water tiles and the over-water layers (bridges,
 * piers), so even an animation tween can never draw a fish on top of a
 * bridge plank.
 */
export const DEPTH_CONFIG = {
    GROUND: 0,
    /** Fish shadows under the water surface. */
    UNDERWATER: 1,
    /** Ripples / rings on the water surface. */
    WATER_SURFACE: 1.5,
    /** Tile layers drawn over water: bridges, piers, docks. */
    OVER_WATER: 2,
    /** Things flying through the air (a caught fish, splash drops). */
    AIRBORNE: 9000,
    /** World-space UI: "!" bubbles, floating score text. */
    WORLD_UI: 10000,
    DEBUG: 99999,
} as const;
