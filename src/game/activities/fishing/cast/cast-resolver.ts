import type { Facing } from "@/game/common/types";
import type { Player } from "@/game/game-objects/player/player";
import type { Point } from "@/game/world/water/water-grid";
import type { SurfaceHit, WaterSurface } from "@/game/world/water/water-surface";
import { FISHING_CONFIG } from "../fishing-config";

export type CastResult = {
    facing: Facing;
    /** Where the float touches down (world px). */
    point: Point;
    hit: SurfaceHit;
    /** Only a float that lands on water starts the fishing challenge. */
    inWater: boolean;
};

/** Where the float will land for the player's current facing. */
export function castLandingPoint(player: Player, facing: Facing): Point {
    const offset = FISHING_CONFIG.castLanding[facing];
    return {
        x: player.x + offset.x * Math.abs(player.scaleX),
        y: player.y + offset.y * Math.abs(player.scaleY),
    };
}

/**
 * Decides, before the throw animation plays, where the float lands and
 * whether that spot is water. The throw is deterministic (the player
 * stands still), so the animation can then show a splash or a miss.
 */
export function resolveCast(player: Player, surface: WaterSurface): CastResult {
    const facing = player.facing;
    const point = castLandingPoint(player, facing);
    const hit = surface.probe(point.x, point.y);

    return {
        facing,
        point,
        hit,
        inWater: hit.kind === "water",
    };
}
