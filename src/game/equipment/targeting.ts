import type { Facing } from "@/game/common/types";

export type Point = { x: number; y: number };
export type TargetBounds = Point & { width: number; height: number };
export type ActionTarget = {
    id?: string;
    kind: "object" | "point" | "tile";
    status: "candidate" | "valid" | "invalid";
    bounds: TargetBounds;
};
export type PreparedAction = { target: ActionTarget | null; execute: () => void };

export function isInFront(origin: Point, point: Point, facing: Facing): boolean {
    switch (facing) {
        case "up": return point.y < origin.y;
        case "down": return point.y > origin.y;
        case "left": return point.x < origin.x;
        case "right": return point.x > origin.x;
    }
}

/** Object tools resolve a real interaction footprint, not a decorative canopy. */
export function selectObjectTarget<T>(
    origin: Point,
    facing: Facing,
    range: number,
    candidates: readonly { object: T; bounds: TargetBounds; valid: boolean }[]
): { object: T; bounds: TargetBounds } | null {
    let nearest: { object: T; bounds: TargetBounds } | null = null;
    let nearestDistance = Infinity;
    for (const candidate of candidates) {
        if (!candidate.valid) continue;
        const b = candidate.bounds;
        const point = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        if (!isInFront(origin, point, facing)) continue;
        const dx = Math.max(b.x - origin.x, 0, origin.x - b.x - b.width);
        const dy = Math.max(b.y - origin.y, 0, origin.y - b.y - b.height);
        if (Math.hypot(dx, dy) > range) continue;
        const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
        if (distance < nearestDistance) {
            nearest = candidate;
            nearestDistance = distance;
        }
    }
    return nearest;
}

/** Future tile tools can reuse this projection; this does not modify any terrain. */
export function tileInFront(origin: Point, facing: Facing, tileSize: number): TargetBounds {
    const x = Math.floor(origin.x / tileSize) + (facing === "left" ? -1 : facing === "right" ? 1 : 0);
    const y = Math.floor(origin.y / tileSize) + (facing === "up" ? -1 : facing === "down" ? 1 : 0);
    return { x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize };
}
