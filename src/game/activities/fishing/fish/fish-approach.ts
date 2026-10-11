import type { Footprint, Point } from "@/game/world/water/water-grid";
import type { WaterSurface } from "@/game/world/water/water-surface";
import { FISHING_CONFIG } from "../fishing-config";

export type FishApproach = {
    /** Where the fish appears (open water). */
    start: Point;
    /** Where it stops to bite, as close to the float as open water allows. */
    biteAt: Point;
};

/**
 * Plans how the biting fish reaches the float: both points are inside
 * open water and the straight line between them never crosses land, a
 * bridge or an object. Returns null when the float sits somewhere too
 * narrow (e.g. tight against the pier) — the fish then stays hidden and
 * only bubbles + the splash show the bite.
 */
export function planFishApproach(
    surface: WaterSurface,
    float: Point,
    footprint: Footprint
): FishApproach | null {
    const { approachDistance, maxBiteDistance } = FISHING_CONFIG.fish;

    const biteAt = surface.nearestFishPoint(float, footprint, maxBiteDistance);
    if (!biteAt) return null;

    const start = surface.randomReachablePoint(
        biteAt,
        footprint,
        approachDistance.min,
        approachDistance.max
    );

    return start ? { start, biteAt } : null;
}

/** A short peck from `biteAt` toward the float, if that stays in open water. */
export function planNibble(
    surface: WaterSurface,
    biteAt: Point,
    float: Point,
    footprint: Footprint,
    reach = 3
): Point {
    const dx = float.x - biteAt.x;
    const dy = float.y - biteAt.y;
    const length = Math.hypot(dx, dy);

    if (length < 0.5) return biteAt;

    const step = Math.min(reach, length);
    const peck = {
        x: biteAt.x + (dx / length) * step,
        y: biteAt.y + (dy / length) * step,
    };

    return surface.isSwimPathClear(biteAt, peck, footprint) ? peck : biteAt;
}
